import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';
import { audioName, transcribe, VOICE_MODEL } from '@/lib/voice/transcribe';

// Speech to text against a stand-in for OpenAI's /audio/transcriptions on localhost: the model and
// file name that go out, the words that come back, and the fall-back to the older model when the
// account doesn't have the newer one.

type Seen = { model: string | null; filename: string | null; prompt: string | null };
const seen: Seen[] = [];
let missing = new Set<string>();
let server: Server;
let baseURL = '';

/** The value of one multipart field, and the filename on the file part. */
function field(body: string, name: string) {
  const m = body.match(new RegExp(`name="${name}"(?:; filename="([^"]*)")?\\r\\n(?:[^\\r\\n]+\\r\\n)*\\r\\n([^]*?)\\r\\n--`));
  return m ? { filename: m[1] ?? null, value: m[2] } : null;
}

before(async () => {
  server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('latin1');
      const model = field(body, 'model')?.value ?? null;
      seen.push({ model, filename: field(body, 'file')?.filename ?? null, prompt: field(body, 'prompt')?.value ?? null });
      res.setHeader('content-type', 'application/json');
      if (req.url !== '/audio/transcriptions') {
        res.statusCode = 404;
        return res.end('{}');
      }
      if (model && missing.has(model)) {
        res.statusCode = 404;
        return res.end(JSON.stringify({ error: { message: `The model ${model} does not exist`, type: 'invalid_request_error', code: 'model_not_found' } }));
      }
      res.end(JSON.stringify({ text: '  我在 PwC 做了三年 audit，现在想转 product。 ' }));
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

describe('voice', () => {
  it('names recordings by the type the browser gives', () => {
    assert.equal(audioName('audio/webm;codecs=opus'), 'speech.webm');
    assert.equal(audioName('audio/mp4'), 'speech.m4a');
    assert.equal(audioName('AUDIO/OGG; codecs=opus'), 'speech.ogg');
    assert.equal(audioName('video/mp4'), null);
    assert.equal(audioName(''), null);
  });

  it('sends the recording to the transcription model and trims the words', async () => {
    seen.length = 0;
    missing = new Set();
    const out = await transcribe({ apiKey: 'test', baseURL }, new Uint8Array([1, 2, 3]), 'speech.webm');
    assert.equal(out.text, '我在 PwC 做了三年 audit，现在想转 product。');
    assert.equal(out.model, VOICE_MODEL);
    const [call] = seen;
    assert.equal(seen.length, 1);
    assert.equal(call?.model, VOICE_MODEL);
    assert.equal(call?.filename, 'speech.webm');
    assert.match(call?.prompt ?? '', /Chinese and English/);
  });

  it('falls back to gpt-4o-transcribe when the account lacks the newer model', async () => {
    seen.length = 0;
    missing = new Set([VOICE_MODEL]);
    const out = await transcribe({ apiKey: 'test', baseURL }, new Uint8Array([1]), 'speech.m4a');
    assert.equal(out.model, 'gpt-4o-transcribe');
    assert.deepEqual(
      seen.map((s) => s.model),
      [VOICE_MODEL, 'gpt-4o-transcribe'],
    );
  });

  it('gives up when neither model is there', async () => {
    missing = new Set([VOICE_MODEL, 'gpt-4o-transcribe']);
    await assert.rejects(transcribe({ apiKey: 'test', baseURL }, new Uint8Array([1]), 'speech.m4a'));
  });
});
