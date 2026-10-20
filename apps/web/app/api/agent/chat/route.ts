import { z } from 'zod';
import { agentEnv, agentFor, canSwitchModel, DAILY_MESSAGES, PROVIDERS } from '@/lib/agent/env';
import {
  linksIn,
  loadSources,
  readLink,
  readResume,
  RESUME_BUCKET,
  saveSource,
  sourceBlock,
  sourceError,
  type Source,
} from '@/lib/agent/sources';
import { append, conversationFor, history, loadPortrait, sentToday } from '@/lib/agent/store';
import { runTurn, unansweredToolCalls, userItems, type Attachment, type TurnEvent } from '@/lib/agent/turn';
import { supabaseServer } from '@/lib/supabase/server';

// POST /api/agent/chat — one message to the studio agent, answered as a stream of server-sent
// events (docs/architecture.md §7.2): source.read, source.failed, message.delta, portrait.patch,
// message.done, error. A message may come with a résumé the browser already uploaded to storage,
// and any links in it are read too; both reach the model as <source> blocks.

export const dynamic = 'force-dynamic';
// A turn with a few tool calls can take a while; within Vercel's limits for the plan.
export const maxDuration = 120;

const Body = z
  .object({
    message: z.string().trim().max(4000).default(''),
    /** A résumé in the `sources` bucket, under the person's own folder. */
    resume: z.object({ path: z.string().max(400), name: z.string().trim().min(1).max(200) }).optional(),
    /** A provider other than the default, for people allowed to switch (AGENT_ADMIN_EMAILS). */
    provider: z.enum(PROVIDERS).optional(),
  })
  .refine((b) => b.message || b.resume);

const json = (status: number, code: string, message: string) =>
  Response.json({ error: { code, message } }, { status });

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  if (!supabase) return json(503, 'not_configured', 'Sign-in isn’t set up here yet.');
  if (!agentEnv) return json(503, 'agent_not_configured', 'The agent isn’t connected yet. Your message wasn’t sent.');
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json(401, 'signed_out', 'You’re signed out. Sign in again to keep talking.');

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json(400, 'bad_message', 'That message is empty or too long (4,000 characters at most).');
  const { message: text, resume, provider } = parsed.data;
  const agent = provider && canSwitchModel(user.email) ? agentFor(provider) : agentEnv;
  if (!agent) return json(503, 'agent_not_configured', 'That model isn’t connected here. Your message wasn’t sent.');
  // Storage rules keep people to their own folder too; this keeps a wrong path from even trying.
  if (resume && !(resume.path.startsWith(`${user.id}/`) && !resume.path.includes('..'))) {
    return json(400, 'bad_file', 'That file isn’t yours to share.');
  }

  let conversationId: string;
  try {
    conversationId = (await conversationFor(supabase, user.id, true))!;
  } catch {
    return json(500, 'no_conversation', 'Couldn’t open your conversation. Try again in a moment.');
  }
  if ((await sentToday(supabase, conversationId)) >= DAILY_MESSAGES) {
    return json(429, 'daily_limit', 'That’s today’s limit for the agent. Your portrait is saved; pick it up tomorrow.');
  }

  const encoder = new TextEncoder();
  let seq = 0;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // If the person closes the tab mid-turn, the stream is gone but the turn still finishes and
      // saves, so the history never stops between a tool call and its result.
      let open = true;
      const emit = (e: TurnEvent) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(`id: ${++seq}\nevent: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`));
        } catch {
          open = false;
        }
      };
      let messageId: number | null = null;
      try {
        // Read what the person shared first, so the model gets it with their message.
        const blocks: string[] = [];
        const attachments: Attachment[] = [];
        const took = (s: Source) => {
          blocks.push(sourceBlock(s));
          attachments.push({ kind: s.kind, name: s.name });
          emit({ event: 'source.read', data: { kind: s.kind, name: s.name } });
        };
        const failed = (name: string, why: string) => {
          blocks.push(sourceError(name, why));
          emit({ event: 'source.failed', data: { name, message: why } });
        };
        if (resume) {
          const { data: file } = await supabase.storage.from(RESUME_BUCKET).download(resume.path);
          const read = file ? await readResume(new Uint8Array(await file.arrayBuffer()), resume.name) : null;
          if (read?.ok) took(await saveSource(supabase, user.id, read, resume.path));
          else failed(resume.name, read ? read.error.replace(/\.$/, '') : 'the upload didn’t arrive');
        }
        for (const link of linksIn(text)) {
          const read = await readLink(link);
          if (read.ok) took(await saveSource(supabase, user.id, read, null));
          else failed(link, read.error);
        }

        const [before, portrait, sources] = await Promise.all([
          history(supabase, conversationId),
          loadPortrait(supabase, user.id),
          loadSources(supabase, user.id),
        ]);
        const unanswered = unansweredToolCalls(before, agent);
        if (unanswered.length) await append(supabase, conversationId, 'tool', unanswered, null);
        const items = userItems(text, portrait.spec, before, agent, { blocks, attachments });
        messageId = await append(supabase, conversationId, 'user', items, text);
        const rows = await history(supabase, conversationId);
        await runTurn({ agent, supabase, ownerId: user.id, conversationId, rows, sources, spec: portrait.spec, emit });
      } catch (e) {
        console.error('agent turn failed', { messageId, error: e instanceof Error ? e.message : e });
        emit({
          event: 'error',
          data: {
            code: 'turn_failed',
            retryable: true,
            message: messageId ? 'Something went wrong on my side. Your message is saved; try again.' : 'Something went wrong on my side. Try again.',
          },
        });
      }
      if (open) controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
