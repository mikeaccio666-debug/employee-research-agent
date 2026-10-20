import { z } from 'zod';
import { agentEnv, DAILY_MESSAGES } from '@/lib/agent/env';
import { append, conversationFor, history, loadPortrait, sentToday } from '@/lib/agent/store';
import { runTurn, type TurnEvent } from '@/lib/agent/turn';
import { supabaseServer } from '@/lib/supabase/server';

// POST /api/agent/chat — one message to the studio agent, answered as a stream of server-sent
// events (docs/architecture.md §7.2): message.delta, portrait.patch, message.done, error.

export const dynamic = 'force-dynamic';
// A turn with a few tool calls can take a while; within Vercel's limits for the plan.
export const maxDuration = 120;

const Body = z.object({ message: z.string().trim().min(1).max(4000) });

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

  let conversationId: string;
  try {
    conversationId = (await conversationFor(supabase, user.id, true))!;
  } catch {
    return json(500, 'no_conversation', 'Couldn’t open your conversation. Try again in a moment.');
  }
  if ((await sentToday(supabase, conversationId)) >= DAILY_MESSAGES) {
    return json(429, 'daily_limit', 'That’s today’s limit for the agent. Your portrait is saved; pick it up tomorrow.');
  }

  const text = parsed.data.message;
  const messageId = await append(supabase, conversationId, 'user', [{ role: 'user', content: text }], text);
  const [rows, portrait] = await Promise.all([history(supabase, conversationId), loadPortrait(supabase, user.id)]);

  const encoder = new TextEncoder();
  let seq = 0;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (e: TurnEvent) =>
        controller.enqueue(encoder.encode(`id: ${++seq}\nevent: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`));
      try {
        await runTurn({ supabase, ownerId: user.id, conversationId, rows, spec: portrait.spec, emit, signal: req.signal });
      } catch (e) {
        console.error('agent turn failed', { messageId, error: e instanceof Error ? e.message : e });
        emit({
          event: 'error',
          data: { code: 'turn_failed', retryable: true, message: 'Something went wrong on my side. Your message is saved; try again.' },
        });
      }
      controller.close();
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
