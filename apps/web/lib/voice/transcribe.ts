import OpenAI, { toFile } from 'openai';

// Speech to text for the message box: the person talks, the words land in the box, and they read
// and fix them before sending. The audio is sent to OpenAI's transcription endpoint and dropped
// right after; nothing of it is stored. Server-only.

/** The newest transcription model, unless VOICE_MODEL names another. */
export const VOICE_MODEL = process.env.VOICE_MODEL || 'gpt-transcribe';
/** Used when the model above isn't available on the account (gpt-4o-transcribe retires in 2027). */
const FALLBACK_MODEL = 'gpt-4o-transcribe';
/** Transcriptions one person may make in a day (VOICE_DAILY). Each clip is two minutes at most. */
export const VOICE_DAILY = Number(process.env.VOICE_DAILY || 60);
/** The longest clip, in seconds; the browser stops recording here. */
export const MAX_SECONDS = 120;
/** Two minutes of compressed speech is well under 2 MB; Vercel refuses bodies over 4.5 MB. */
export const MAX_BYTES = 4 * 1024 * 1024;

/** The recorder formats browsers produce, and the file name the API needs to recognise each. */
const EXTENSIONS: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
};

/** The file name for a recording, from its type ("audio/webm;codecs=opus" → speech.webm), or null if not audio we take. */
export function audioName(type: string): string | null {
  const ext = EXTENSIONS[(type.split(';')[0] ?? '').trim().toLowerCase()];
  return ext ? `speech.${ext}` : null;
}

// Mixed Chinese and English is common here; saying so keeps the model from translating one into the other.
const PROMPT = 'The speaker may switch between Chinese and English mid-sentence. Write each word in the language it was spoken.';

export type VoiceKey = { apiKey: string; baseURL?: string };

/** The key for transcription: the deployment's OpenAI key, whichever provider the agent uses. */
export const voiceKey = (): VoiceKey | null =>
  process.env.OPENAI_API_KEY ? { apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL || undefined } : null;

/** The words in one recording, and the model that heard them. */
export async function transcribe(key: VoiceKey, bytes: Uint8Array, name: string, signal?: AbortSignal) {
  const client = new OpenAI({ apiKey: key.apiKey, baseURL: key.baseURL, maxRetries: 1 });
  const run = async (model: string) => {
    const file = await toFile(bytes, name);
    const out = await client.audio.transcriptions.create({ file, model, prompt: PROMPT, response_format: 'json' }, { signal });
    return { text: out.text.trim(), model };
  };
  try {
    return await run(VOICE_MODEL);
  } catch (e) {
    // An account without the newer model answers 404 (or 400 model_not_found): try the older one once.
    const missing = e instanceof OpenAI.APIError && (e.status === 404 || e.code === 'model_not_found');
    if (!missing || VOICE_MODEL === FALLBACK_MODEL) throw e;
    return await run(FALLBACK_MODEL);
  }
}
