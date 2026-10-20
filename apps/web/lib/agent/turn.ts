import type { SupabaseClient } from '@supabase/supabase-js';
import type { Spec } from '@/lib/portrait/spec';
import type { AgentEnv, Provider } from './env';
import { anthropicAdapter } from './providers/anthropic';
import { openaiAdapter } from './providers/openai';
import type { Adapter, Item } from './providers/types';
import { append, logCall, saveSpec, type Attachment, type Receipt, type Row } from './store';
import type { Source, SourceKind } from './sources';
import { runTool, snapshot, type Said } from './tools';

// One turn of the studio conversation (docs/architecture.md §4.1): the person's message goes to
// the model with the history and the portrait as it stands; text streams back as it is written;
// each tool call is checked and applied to the portrait, its result goes back to the model, and
// the loop runs until the model answers without calling a tool.
//
// The history is append-only. Every stored item is marked with the provider that wrote it
// (`via`). Rows from the provider in use are replayed verbatim, so its reasoning and caching carry
// over; rows another provider wrote are replayed as plain text (the person's words and the
// replies), so the deployment can switch models and old conversations carry on.

export type TurnEvent =
  | { event: 'message.delta'; data: { text: string } }
  | { event: 'portrait.patch'; data: { ops: { op: 'replace'; path: ''; value: Spec }[]; receipt: Receipt } }
  | { event: 'source.read'; data: { kind: SourceKind; name: string } }
  | { event: 'source.failed'; data: { name: string; message: string } }
  | { event: 'message.done'; data: { messageId: number | null } }
  | { event: 'error'; data: { code: string; retryable: boolean; message: string } };


/** Our own notes on a stored item. They never go to the model. */
type Notes = { via?: Provider; receipts?: Receipt[]; snapshotRev?: number; attachments?: Attachment[] };

const STATE_TAG = '<portrait_state>';

// Enough for "add three lines, set the headline, then answer"; a model stuck in a loop stops here.
const MAX_STEPS = 8;

const ADAPTERS: Record<Provider, (env: AgentEnv) => Adapter> = { openai: openaiAdapter, anthropic: anthropicAdapter };

const using = (env: AgentEnv) => ({ env, adapter: ADAPTERS[env.provider](env) });

/** Marks items as written for this provider, with our notes on the first one. */
const stored = (items: Item[], via: Provider, notes: Notes = {}): Item[] =>
  items.map((item, i) => ({ ...item, ...(i === 0 ? notes : {}), via }));

const native = (row: Row, via: Provider) => row.items.length > 0 && (row.items as Notes[]).every((i) => i.via === via);

/** The history as the provider in use reads it. */
function replay(rows: Row[], via: Provider, adapter: Adapter): Item[] {
  return rows.flatMap((row) => {
    if (native(row, via)) {
      return (row.items as (Item & Notes)[]).map(({ via: _v, receipts: _r, snapshotRev: _s, attachments: _a, ...item }) => item);
    }
    // Another provider's turn: its words stay, its tool calls (already applied) don't.
    if (row.role === 'tool') return [];
    const text = row.role === 'user' ? userText(row) : row.body;
    return text ? [adapter.text(row.role, text)] : [];
  });
}

/**
 * What the person sent, with the documents the app added to it: every text block of the stored
 * message except an old portrait state, whichever provider's format it is in.
 */
function userText(row: Row): string | null {
  const content = (row.items[0] as { content?: unknown } | undefined)?.content;
  if (!Array.isArray(content)) return row.body;
  return (
    (content as { text?: unknown }[])
      .map((b) => (typeof b.text === 'string' ? b.text : ''))
      .filter((t) => t && !t.startsWith(STATE_TAG))
      .join('\n\n') || row.body
  );
}

/**
 * A turn that stopped between a tool call and its result (a crash, a refusal, a cut-off answer)
 * leaves calls the API expects an answer to. They get one, appended before the next message.
 */
export function unansweredToolCalls(rows: Row[], agent: AgentEnv): Item[] {
  const { env, adapter } = using(agent);
  const last = rows.at(-1);
  if (!last || last.role !== 'assistant' || !native(last, env.provider)) return [];
  const open = adapter.calls(last.items as Item[]);
  if (!open.length) return [];
  const output = 'Not done: the turn ended before this ran. Nothing changed.';
  return stored(adapter.results(open.map((call) => ({ call, output, failed: true }))), env.provider);
}

/**
 * The person's message as stored. The portrait's current state rides along whenever it changed
 * since the model last saw it (the person confirmed or rejected lines, or another provider was
 * in use); the model's own changes it already knows from the tool results.
 */
export function userItems(
  text: string,
  spec: Spec,
  rows: Row[],
  agent: AgentEnv,
  shared: { blocks: string[]; attachments: Attachment[] } = { blocks: [], attachments: [] },
): Item[] {
  const { env, adapter } = using(agent);
  const seen = rows
    .filter((r) => native(r, env.provider))
    .flatMap((r) => r.items as Notes[])
    .reduce<number | null>((rev, i) => (typeof i.snapshotRev === 'number' ? i.snapshotRev : rev), null);
  const notes: Notes = shared.attachments.length ? { attachments: shared.attachments } : {};
  if (seen === spec.rev) return stored(adapter.user(text, shared.blocks), env.provider, notes);
  const state = `${STATE_TAG}\n${snapshot(spec)}\n</portrait_state>`;
  return stored(adapter.user(text, [...shared.blocks, state]), env.provider, { ...notes, snapshotRev: spec.rev });
}

export type { Attachment };

export async function runTurn({
  agent,
  supabase,
  ownerId,
  conversationId,
  rows,
  sources,
  spec: start,
  emit,
  signal,
}: {
  agent: AgentEnv;
  supabase: SupabaseClient;
  ownerId: string;
  conversationId: string;
  /** The whole history, ending with the person's new message. */
  rows: Row[];
  /** The résumés and links the person shared, which lines may quote too. */
  sources: Source[];
  spec: Spec;
  emit: (e: TurnEvent) => void;
  signal?: AbortSignal;
}) {
  const { env, adapter } = using(agent);
  const said: Said = rows.filter((r) => r.role === 'user').map((r) => ({ id: r.id, text: r.body ?? '' }));
  let spec = start;
  const history = replay(rows, env.provider, adapter);
  let lastId: number | null = null;

  for (let step = 0; step < MAX_STEPS; step++) {
    const began = Date.now();
    let answer: Awaited<ReturnType<Adapter['step']>>;
    try {
      answer = await adapter.step(history, (text) => emit({ event: 'message.delta', data: { text } }), signal);
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      await logCall(supabase, conversationId, {
        provider: env.provider,
        model: env.model,
        latency_ms: Date.now() - began,
        stop_reason: 'failed',
        error,
      });
      throw e;
    }
    await logCall(supabase, conversationId, { provider: env.provider, ...answer.log, latency_ms: Date.now() - began, error: null });

    lastId = await append(supabase, conversationId, 'assistant', stored(answer.items, env.provider), answer.text);
    history.push(...answer.items);

    if (answer.declined) {
      emit({
        event: 'error',
        data: { code: 'declined', retryable: false, message: 'I can’t help with that one. Tell me about something else you’ve done.' },
      });
      break;
    }
    // No tools to run, or a reply cut off mid-call (never run a truncated input): the turn ends.
    // Calls left without an answer are closed before the next message (unansweredToolCalls).
    if (!answer.calls.length || answer.cutOff) break;

    const results = [];
    const receipts: Receipt[] = [];
    for (const call of answer.calls) {
      const result = runTool(call.name, call.input, spec, { said, sources });
      spec = result.spec;
      if (result.change) {
        receipts.push(result.change);
        emit({ event: 'portrait.patch', data: { ops: [{ op: 'replace', path: '', value: spec }], receipt: result.change } });
      }
      results.push({ call, output: result.output, failed: result.output.startsWith('Not done') });
    }
    // The portrait is saved before the tool results are, so a crash never leaves the history
    // claiming a change the page doesn't have.
    if (spec !== start) await saveSpec(supabase, ownerId, spec);
    const answers = adapter.results(results);
    // The model knows its own changes from the results, so the portrait it has seen moves on too.
    await append(supabase, conversationId, 'tool', stored(answers, env.provider, { receipts, snapshotRev: spec.rev }), null);
    history.push(...answers);
  }

  emit({ event: 'message.done', data: { messageId: lastId } });
  return spec;
}
