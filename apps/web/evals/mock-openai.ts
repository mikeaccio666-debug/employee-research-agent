import http from 'node:http';

// A scripted stand-in for OpenAI's Responses API, so the eval runner can be checked end to end
// without a key or any spend (`pnpm --filter @portrait/web eval:dry`). It answers the three kinds
// of call the runner makes: the studio agent (streamed, with tools), the simulated person, and the
// judge. The numbers it reports mean nothing.

const PORT = Number(process.env.MOCK_PORT || 3299);
let n = 0;

type Input = { role?: string; type?: string; content?: string | { type: string; text: string }[] }[];

const usage = { input_tokens: 1000, output_tokens: 50, total_tokens: 1050, input_tokens_details: { cached_tokens: 600 }, output_tokens_details: { reasoning_tokens: 0 } };
const message = (text: string) => ({
  type: 'message',
  id: `msg_${n}`,
  role: 'assistant',
  status: 'completed',
  content: [{ type: 'output_text', text, annotations: [] }],
});

/** The person's own words in the newest message, without the blocks the app adds. */
function lastSaid(input: Input): string {
  const last = [...input].reverse().find((i) => i.role === 'user');
  if (!last) return '';
  if (typeof last.content === 'string') return last.content;
  return last.content?.find((c) => !c.text.startsWith('<'))?.text ?? '';
}

function agentOutput(input: Input) {
  const last = input.at(-1)!;
  if (last.type === 'function_call_output') return [message('Added that to your portrait. What came of it?')];
  const said = lastSaid(input);
  const quote = said.split(/\s+/).slice(0, 4).join(' ');
  if (!quote) return [message('Tell me more?')];
  return [
    {
      type: 'function_call',
      id: `fc_${n}`,
      call_id: `call_${n}`,
      name: 'upsert_claim',
      status: 'completed',
      arguments: JSON.stringify({
        id: null,
        layer: 'experience',
        kind: 'project',
        title: `Thing ${n}`,
        org: null,
        when: null,
        statement: said.slice(0, 200) || 'Something they did.',
        basis: 'stated',
        quote,
      }),
    },
  ];
}

function plainOutput(instructions: string, input: string): string {
  if (instructions.includes('role-playing')) return 'I built it myself, about two years ago.';
  if (instructions.includes('You grade')) {
    const ids = [...input.matchAll(/- (clm_[a-z0-9]+)/g)].map((m) => m[1]);
    const facts = [...input.matchAll(/^(\d+)\. /gm)].length;
    return JSON.stringify({
      lines: ids.map((id, i) => ({ id, verdict: i === 0 ? 'overstated' : 'supported', why: 'mock' })),
      facts: Array.from({ length: Math.max(1, facts) }, (_, i) => ({ n: i + 1, covered: i % 2 === 0 })),
      ...(input.includes('Check: ') ? { check: { passed: true, why: 'mock' } } : {}),
    });
  }
  return 'Notes: the person shared their background.';
}

const sse = (res: http.ServerResponse, obj: Record<string, unknown>) => res.write(`event: ${obj.type}\ndata: ${JSON.stringify(obj)}\n\n`);

http
  .createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      if (req.method !== 'POST' || !req.url?.endsWith('/responses')) return void res.writeHead(404).end();
      const r = JSON.parse(body);
      n++;
      const base = { id: `resp_${n}`, object: 'response', created_at: 0, model: r.model, output: [] as unknown[] };
      if (!r.stream) {
        const text = plainOutput(r.instructions ?? '', typeof r.input === 'string' ? r.input : JSON.stringify(r.input));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return void res.end(JSON.stringify({ ...base, status: 'completed', output: [message(text)], output_text: text, usage }));
      }
      const output = agentOutput(r.input);
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      sse(res, { type: 'response.created', sequence_number: 0, response: { ...base, status: 'in_progress' } });
      let seq = 1;
      for (const item of output) {
        if (item.type === 'message') {
          const text = (item as ReturnType<typeof message>).content[0]!.text;
          for (const word of text.split(/(?<= )/)) {
            sse(res, { type: 'response.output_text.delta', sequence_number: seq++, item_id: item.id, output_index: 0, content_index: 0, delta: word });
          }
        }
      }
      sse(res, { type: 'response.completed', sequence_number: seq, response: { ...base, status: 'completed', output, usage } });
      res.end();
    });
  })
  .listen(PORT, '127.0.0.1', () => console.log(`mock OpenAI on ${PORT}`));
