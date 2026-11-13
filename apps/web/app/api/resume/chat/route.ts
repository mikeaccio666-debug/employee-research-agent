import { z } from 'zod';
import { agentEnv, agentFor, canSwitchModel, DAILY_MESSAGES, dailyMessagesFor, PROVIDERS, type Effort } from '@/lib/agent/env';
import { loadSources } from '@/lib/agent/sources';
import { append, conversationFor, history, loadPortrait, sentToday } from '@/lib/agent/store';
import { stored, unansweredToolCalls, using } from '@/lib/agent/turn';
import { groundsFor, portraitBlock, RESUME_KIT, runResumeTurn, stateBlock, type ResumeTurnEvent } from '@/lib/resume/agent';
import { ResumeDoc, ResumeLetter, ResumeStyle } from '@/lib/resume/doc';
import { supabaseServer } from '@/lib/supabase/server';
import { reportError } from '@/lib/observability/report';

// POST /api/resume/chat — one message to the assistant beside the résumé editor, answered as
// server-sent events: message.delta, resume.change (the page after each round of changes, with
// a receipt per change), message.done, error. The editor sends the version as it is on screen,
// saved or not; the changes come back to the editor, which keeps them until the person saves.

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const Body = z.object({
  message: z.string().trim().min(1).max(8000),
  /** The version open in the editor (null for one not saved yet). */
  version: z.string().uuid().nullable(),
  name: z.string().max(60),
  target: z.string().max(120),
  doc: ResumeDoc,
  style: ResumeStyle,
  letter: ResumeLetter,
  fit: z.object({ onePage: z.boolean(), overflowLines: z.number().int().min(0).max(999).nullable(), size: z.number().min(1).max(20) }),
  provider: z.enum(PROVIDERS).optional(),
  model: z.string().max(100).optional(),
  effort: z.string().max(20).optional(),
});

const json = (status: number, code: string, message: string) => Response.json({ error: { code, message } }, { status });

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  if (!supabase) return json(503, 'not_configured', 'Sign-in isn’t set up here yet.');
  if (!agentEnv) return json(503, 'agent_not_configured', 'The assistant isn’t connected here yet. Your message wasn’t sent.');
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json(401, 'signed_out', 'You’re signed out. Sign in again to keep going.');

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json(400, 'bad_message', 'That message is empty or too long (8,000 characters at most).');
  const { message: text, version, name, target, doc, style, letter, fit, provider, model, effort } = parsed.data;
  const agent = canSwitchModel(user.email) ? agentFor(provider ?? agentEnv.provider, { model, effort: effort as Effort | undefined }) : agentEnv;
  if (!agent) return json(503, 'agent_not_configured', 'That model isn’t connected here. Your message wasn’t sent.');

  let conversationId: string;
  try {
    conversationId = (await conversationFor(supabase, user.id, true, 'resume'))!;
  } catch {
    return json(500, 'no_conversation', 'Couldn’t open the conversation. Try again in a moment.');
  }
  if ((await sentToday(supabase, user.id)) >= DAILY_MESSAGES) {
    return json(429, 'daily_limit', 'That’s today’s limit for the assistant. Your résumé is all yours to edit; pick it up tomorrow.');
  }
  const cap = dailyMessagesFor(agent.provider);
  if (cap !== null && (await sentToday(supabase, user.id, agent.provider)) >= cap) {
    return json(429, 'model_daily_limit', 'That’s today’s limit for this model. Switch to the other one, or pick it up tomorrow.');
  }

  const encoder = new TextEncoder();
  let seq = 0;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const emit = (e: ResumeTurnEvent) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(`id: ${++seq}\nevent: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`));
        } catch {
          open = false;
        }
      };
      let messageId: number | null = null;
      try {
        const [before, portrait, sources] = await Promise.all([history(supabase, conversationId), loadPortrait(supabase, user.id), loadSources(supabase, user.id)]);
        const unanswered = unansweredToolCalls(before, agent);
        if (unanswered.length) await append(supabase, conversationId, 'tool', unanswered, null);

        // The page as it is now, and the facts it may use, ride on every message: the person edits
        // between messages, and older messages drop out of what the model reads (lib/resume/agent.ts).
        const { env, adapter } = using(agent, RESUME_KIT);
        const lines = portraitBlock(portrait.spec);
        const extras = [stateBlock(doc, style, letter, { name, target, fit }), ...(lines ? [lines] : [])];
        const items = stored(adapter.user(text, extras), env);
        messageId = await append(supabase, conversationId, 'user', items, text);

        const rows = await history(supabase, conversationId);
        const said = rows.filter((r) => r.role === 'user').map((r) => r.body ?? '');
        const grounds = groundsFor(doc, portrait.spec, said, sources);
        await runResumeTurn({ agent, supabase, conversationId, rows, doc, style, letter, grounds, version, emit });
      } catch (e) {
        reportError('resume turn failed', e, { messageId });
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
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' },
  });
}
