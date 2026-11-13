// Browser side of /api/voice: send one recording, get its words back (or an Error to show).

export async function dictate(audio: Blob): Promise<string> {
  const form = new FormData();
  form.append('audio', audio, 'speech');
  let res: Response;
  try {
    res = await fetch('/api/voice', { method: 'POST', body: form });
  } catch {
    throw new Error('I couldn’t reach the server. Check your connection and try again.');
  }
  const body = (await res.json().catch(() => null)) as { text?: string; error?: { message?: string } } | null;
  if (!res.ok || typeof body?.text !== 'string') {
    throw new Error(body?.error?.message || 'I couldn’t turn that into text. Try again, or type it.');
  }
  return body.text;
}
