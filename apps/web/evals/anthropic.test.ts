import assert from 'node:assert/strict';
import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';
import { anthropicAdapter } from '@/lib/agent/providers/anthropic';
import type { Adapter, Item } from '@/lib/agent/providers/types';

// The Claude adapter against a stand-in for the Messages API on localhost: what goes out on the
// wire (API version, key, request body) and how the answers are read back. The agent evals need an
// ANTHROPIC_API_KEY to reach Claude, so without this nothing checked the Claude path before an
// SDK upgrade reached production.

type Seen = { headers: IncomingHttpHeaders; body: Record<string, unknown> };
type StreamEvent = { type: string } & Record<string, unknown>;

const usage = { input_tokens: 20, output_tokens: 3, cache_read_input_tokens: 5, cache_creation_input_tokens: 0 };
const message = (content: unknown[], stop_reason: string | null) => ({
  id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content, stop_reason, stop_sequence: null, usage,
});

/** A streamed answer: a sentence, then a call to the `note` tool. */
const TOOL_CALL_STREAM: StreamEvent[] = [
  { type: 'message_start', message: message([], null) },
  { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
  { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Let me note that.' } },
  { type: 'content_block_stop', index: 0 },
  { type: 'content_block_start', index: 1, content_block: { type: 'tool_use', id: 'toolu_1', name: 'note', input: {} } },
  { type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: '{"text":"Ask about Redis"}' } },
  { type: 'content_block_stop', index: 1 },
  { type: 'message_delta', delta: { stop_reason: 'tool_use', stop_sequence: null }, usage: { output_tokens: 12 } },
  { type: 'message_stop' },
];

/** A streamed answer that is only text. */
const TEXT_STREAM: StreamEvent[] = [
  { type: 'message_start', message: message([], null) },
  { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
  { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Noted.' } },
  { type: 'content_block_stop', index: 0 },
  { type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 2 } },
  { type: 'message_stop' },
];

describe('the Claude adapter on the wire', () => {
  let server: Server;
  let claude: Adapter;
  const seen: Seen[] = [];
  const streams: StreamEvent[][] = [];

  before(async () => {
    server = createServer((req, res) => {
      let raw = '';
      req.on('data', (chunk) => (raw += chunk));
      req.on('end', () => {
        const body = JSON.parse(raw) as Record<string, unknown>;
        seen.push({ headers: req.headers, body });
        if (!body.stream) {
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify(message([{ type: 'text', text: 'A summary.' }], 'end_turn')));
          return;
        }
        res.writeHead(200, { 'content-type': 'text/event-stream' });
        for (const event of streams.shift() ?? []) res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
        res.end();
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    claude = anthropicAdapter({ provider: 'anthropic', apiKey: 'sk-ant-test', model: 'claude-opus-5-5', effort: 'medium', baseURL: `http://127.0.0.1:${port}` });
  });

  after(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it('reads an image with one plain call', async () => {
    const out = await claude.see('Describe it.', { mime: 'image/png', data: 'iVBORw0KGgo=' });
    assert.equal(out.text, 'A summary.');
    assert.deepEqual(seen.at(-1)!.body.messages, [
      { role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'iVBORw0KGgo=' } }] },
    ]);
  });

  it('summarizes text with one plain call', async () => {
    const out = await claude.summarize('Summarize.', 'They led a team of four.');
    assert.equal(out.text, 'A summary.');
    assert.equal(out.log.cached_tokens, 5);
    assert.deepEqual(seen.at(-1)!.body.messages, [{ role: 'user', content: 'They led a team of four.' }]);
  });

  it('streams a turn, reads its tool call, and replays it with the result unchanged', async () => {
    streams.push(TOOL_CALL_STREAM, TEXT_STREAM);
    const history: Item[] = claude.user('I cut checkout latency by 40%', []);
    let streamed = '';
    const first = await claude.step(history, (t) => (streamed += t));
    assert.equal(streamed, 'Let me note that.');
    assert.equal(first.text, 'Let me note that.');
    assert.deepEqual(first.calls, [{ id: 'toolu_1', name: 'note', input: '{"text":"Ask about Redis"}' }]);
    assert.equal(first.log.stop_reason, 'tool_use');
    assert.equal(first.declined, false);
    assert.equal(first.cutOff, false);

    const sent = seen.at(-1)!.body;
    assert.equal(sent.fallbacks, 'default');
    assert.match(String(seen.at(-1)!.headers['anthropic-beta']), /server-side-fallback-2026-07-01/);
    assert.ok((sent.tools as { strict?: boolean }[]).every((t) => t.strict === true));

    history.push(...first.items, ...claude.results([{ call: first.calls[0]!, output: 'Saved.', failed: false }]));
    const second = await claude.step(history, () => {});
    assert.equal(second.text, 'Noted.');
    assert.deepEqual(second.calls, []);
    assert.deepEqual(seen.at(-1)!.body.messages, [
      { role: 'user', content: [{ type: 'text', text: 'I cut checkout latency by 40%' }] },
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Let me note that.' },
          { type: 'tool_use', id: 'toolu_1', name: 'note', input: { text: 'Ask about Redis' } },
        ],
      },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'Saved.', is_error: false }] },
    ]);
  });

  it('sends API version 2026-10-21, the key as a bearer token, and no sampling settings', () => {
    assert.equal(seen.length, 4);
    for (const { headers, body } of seen) {
      assert.equal(headers['anthropic-version'], '2026-10-21');
      assert.equal(headers.authorization, 'Bearer sk-ant-test');
      assert.equal(headers['x-api-key'], undefined);
      for (const key of ['temperature', 'top_p', 'top_k']) assert.equal(key in body, false, key);
      assert.equal(body.model, 'claude-opus-5-5');
      assert.deepEqual(body.output_config, { effort: 'medium' });
    }
  });
});
