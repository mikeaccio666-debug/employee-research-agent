import OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Spec } from '@/lib/portrait/spec';
import { agentEnv } from './env';
import { OPENER, STUDIO_INSTRUCTIONS } from './prompt';
import { append, logCall, saveSpec, type Receipt, type Row } from './store';
import { TOOL_DEFS, runTool, snapshot, type Said } from './tools';

// One turn of the studio conversation (docs/architecture.md §4.1): the person's message goes to
// the model with the history and the portrait as it stands; text streams back as it is written;
// each tool call is checked and applied to the portrait, its result goes back to the model, and
// the loop runs until the model answers without calling a tool. Everything the model returns is
// appended to the history verbatim and replayed next turn.

export type TurnEvent =
  | { event: 'message.delta'; data: { text: string } }
  | { event: 'portrait.patch'; data: { ops: { op: 'replace'; path: ''; value: Spec }[]; receipt: Receipt } }
  | { event: 'message.done'; data: { messageId: number | null } }
  | { event: 'error'; data: { code: string; retryable: boolean; message: string } };

type Item = Record<string, unknown>;

// Enough for "add three lines, set the headline, then answer"; a model stuck in a loop stops here.
const MAX_STEPS = 8;

const reasoningModel = (model: string) => /^(gpt-5|o\d)/.test(model) && !model.includes('chat');

/**
 * OpenAI's strict mode refuses some JSON-schema keywords (string lengths among them); the limits
 * still hold, because runTool checks every argument before it is used.
 */
function forStrictMode(schema: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(schema, (key, value) => (key === 'maxLength' || key === 'minLength' ? undefined : value)));
}

/** Provider items exactly as stored, minus the receipts we keep beside them. */
function replay(rows: Row[]): Item[] {
  return rows.flatMap((row) => (row.items as Item[]).map(({ receipt: _receipt, ...item }) => item));
}

export async function runTurn({
  supabase,
  ownerId,
  conversationId,
  rows,
  spec: start,
  emit,
  signal,
}: {
  supabase: SupabaseClient;
  ownerId: string;
  conversationId: string;
  /** The whole history, ending with the person's new message. */
  rows: Row[];
  spec: Spec;
  emit: (e: TurnEvent) => void;
  signal?: AbortSignal;
}) {
  if (!agentEnv) throw new Error('The agent is not set up');
  const env = agentEnv;
  const client = new OpenAI({ apiKey: env.apiKey, baseURL: env.baseURL });
  const said: Said = rows.filter((r) => r.role === 'user').map((r) => ({ id: r.id, text: r.body ?? '' }));
  let spec = start;

  // The portrait's state goes in as a developer message just before the newest message, so the
  // stable prefix (instructions, tools, older history) stays cacheable and old snapshots don't pile up.
  const past = replay(rows.slice(0, -1));
  const latest = replay(rows.slice(-1));
  const state: Item = { role: 'developer', content: snapshot(spec) };
  let input: Item[] = [{ role: 'assistant', content: OPENER }, ...past, state, ...latest];
  let lastId: number | null = null;

  for (let step = 0; step < MAX_STEPS; step++) {
    const began = Date.now();
    const reasoning = reasoningModel(env.model);
    let response: OpenAI.Responses.Response | null = null;
    let failure: string | null = null;
    try {
      const stream = await client.responses.create(
        {
          model: env.model,
          instructions: STUDIO_INSTRUCTIONS,
          input: input as unknown as OpenAI.Responses.ResponseInput,
          tools: TOOL_DEFS.map((t) => ({
            type: 'function' as const,
            name: t.name,
            description: t.description,
            parameters: forStrictMode(t.parameters),
            strict: true,
          })),
          tool_choice: 'auto',
          parallel_tool_calls: true,
          // History is ours (append-only in Postgres), so nothing is kept on OpenAI's side; reasoning
          // comes back encrypted so it can be replayed next turn.
          store: false,
          ...(reasoning ? { include: ['reasoning.encrypted_content' as const] } : {}),
          ...(reasoning && env.effort ? { reasoning: { effort: env.effort } } : {}),
          stream: true,
        },
        { signal },
      );
      for await (const ev of stream) {
        if (ev.type === 'response.output_text.delta') emit({ event: 'message.delta', data: { text: ev.delta } });
        else if (ev.type === 'response.completed' || ev.type === 'response.incomplete') response = ev.response;
        else if (ev.type === 'response.failed') failure = ev.response.error?.message ?? 'The model failed';
        else if (ev.type === 'error') failure = ev.message;
      }
    } catch (e) {
      failure = e instanceof Error ? e.message : String(e);
    }

    await logCall(supabase, conversationId, {
      provider: env.provider,
      model: env.model,
      input_tokens: response?.usage?.input_tokens ?? null,
      output_tokens: response?.usage?.output_tokens ?? null,
      cached_tokens: response?.usage?.input_tokens_details?.cached_tokens ?? null,
      latency_ms: Date.now() - began,
      stop_reason: response ? (response.incomplete_details?.reason ?? response.status) : 'failed',
      error: failure,
    });
    if (!response) throw new Error(failure ?? 'The model returned nothing');

    const output = response.output as unknown as Item[];
    // Streamed responses don't carry the SDK's output_text convenience; read the message items.
    const text =
      output
        .filter((i) => i.type === 'message')
        .flatMap((i) => (i.content as { type: string; text?: string }[]).filter((c) => c.type === 'output_text'))
        .map((c) => c.text ?? '')
        .join('')
        .trim() || null;
    lastId = await append(supabase, conversationId, 'assistant', output, text);

    const calls = output.filter((i) => i.type === 'function_call') as { call_id: string; name: string; arguments: string }[];
    if (!calls.length) break;

    const results: Item[] = [];
    for (const call of calls) {
      const result = runTool(call.name, call.arguments, spec, said);
      spec = result.spec;
      const item: Item = { type: 'function_call_output', call_id: call.call_id, output: result.output };
      if (result.change) {
        item.receipt = result.change;
        emit({ event: 'portrait.patch', data: { ops: [{ op: 'replace', path: '', value: spec }], receipt: result.change } });
      }
      results.push(item);
    }
    // The portrait is saved before the tool results are, so a crash never leaves the history
    // claiming a change the page doesn't have.
    if (spec !== start) await saveSpec(supabase, ownerId, spec);
    await append(supabase, conversationId, 'tool', results, null);
    input = [...input, ...output, ...results.map(({ receipt: _receipt, ...item }) => item)];
  }

  emit({ event: 'message.done', data: { messageId: lastId } });
  return spec;
}
