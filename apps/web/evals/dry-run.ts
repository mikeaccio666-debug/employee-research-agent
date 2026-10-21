// The eval runner against the scripted stand-in (evals/mock-openai.ts): checks the plumbing for
// free, in CI or before a real run. The scores it prints mean nothing.

process.env.MOCK_PORT ||= '3299';
process.env.OPENAI_API_KEY = 'mock';
process.env.OPENAI_BASE_URL = `http://127.0.0.1:${process.env.MOCK_PORT}/v1`;
delete process.env.ANTHROPIC_API_KEY;
process.env.EVAL_PRICES ||= JSON.stringify({ 'gpt-6.1-sol': { input: 1, cached: 0.1, output: 8 } });
process.argv.push('--turns', '3', '--out', process.env.EVAL_OUT || 'evals/out/dry');

void (async () => {
  await import('./mock-openai');
  const { done } = await import('./run');
  const results = await done;
  const broken = results.filter((r) => r.error || r.judgeError || !r.toolCalls);
  for (const r of broken) console.error(`dry run: ${r.persona} broke: ${r.error ?? r.judgeError ?? 'no tool calls'}`);
  process.exit(broken.length ? 1 : 0);
})();
