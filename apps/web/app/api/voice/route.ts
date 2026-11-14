import { conversationFor, logCall } from '@/lib/agent/store';
import { reportError } from '@/lib/observability/report';
import { supabaseServer } from '@/lib/supabase/server';
import { audioName, MAX_BYTES, transcribe, VOICE_DAILY, VOICE_MODEL, voiceKey } from '@/lib/voice/transcribe';

// POST /api/voice — one recording from the message box (multipart, field `audio`), answered with
// the words in it: { text }. The words go back into the box for the person to read and fix; nothing
// is sent to the agent from here, and the audio is not kept. Each use is logged in model_calls
// (stop_reason voice:started) and counted against VOICE_DAILY.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const STOP = 'voice';

const json = (status: number, code: string, message: string) => Response.json({ error: { code, message } }, { status });

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  if (!supabase) return json(503, 'not_configured', 'Sign-in isn’t set up here yet.');
  const key = voiceKey();
  if (!key) return json(503, 'voice_not_configured', 'Voice isn’t set up on this deployment. Type your message instead.');
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json(401, 'signed_out', 'You’re signed out. Sign in again to talk.');

  const form = await req.formData().catch(() => null);
  const audio = form?.get('audio');
  if (!(audio instanceof Blob) || !audio.size) return json(400, 'no_audio', 'I didn’t get any sound. Try again.');
  if (audio.size > MAX_BYTES) return json(413, 'too_long', 'That recording is too long. Keep it under two minutes.');
  const name = audioName(audio.type);
  if (!name) return json(415, 'bad_audio', 'Your browser recorded in a format I can’t read. Type your message instead.');

  const conversationId = await conversationFor(supabase, user.id, true).catch(() => null);
  if (!conversationId) return json(500, 'no_conversation', 'Couldn’t start that. Try again in a moment.');
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await supabase
    .from('model_calls')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .eq('stop_reason', `${STOP}:started`)
    .gte('created_at', since);
  if ((count ?? 0) >= VOICE_DAILY) return json(429, 'daily_limit', 'That’s all the voice messages for today. You can still type.');
  // Counted before the call, so recordings sent at once from several tabs can't all slip past the cap.
  await logCall(supabase, conversationId, { provider: 'openai', model: VOICE_MODEL, stop_reason: `${STOP}:started`, error: null });

  const began = Date.now();
  try {
    const out = await transcribe(key, new Uint8Array(await audio.arrayBuffer()), name, AbortSignal.timeout(45_000));
    await logCall(supabase, conversationId, {
      provider: 'openai',
      model: out.model,
      latency_ms: Date.now() - began,
      stop_reason: `${STOP}_answer`,
      error: null,
    });
    if (!out.text) return json(422, 'nothing_heard', 'I couldn’t make out any words. Try again a little closer to the mic.');
    return Response.json({ text: out.text });
  } catch (e) {
    reportError('voice transcription failed', e, { bytes: audio.size, type: audio.type });
    await logCall(supabase, conversationId, {
      provider: 'openai',
      model: VOICE_MODEL,
      latency_ms: Date.now() - began,
      stop_reason: `${STOP}_failed`,
      error: e instanceof Error ? e.message.slice(0, 300) : 'failed',
    });
    return json(502, 'voice_failed', 'I couldn’t turn that into text. Try again, or type it.');
  }
}
