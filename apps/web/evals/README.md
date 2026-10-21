# Studio agent evals

How we know whether a change to the studio agent (prompt, tools, checks, model, thinking level)
made it better or worse, instead of guessing from a few manual chats.

## What runs

| Command | What it does | Cost |
| --- | --- | --- |
| `pnpm --filter @portrait/web test` | The tool rules in `lib/agent/tools.ts`: quotes must be real, rejected lines stay out, pinned lines are asked about, and so on. No model. | Free |
| `pnpm --filter @portrait/web eval:dry` | The whole eval runner against a scripted stand-in for OpenAI (`mock-openai.ts`). Checks the plumbing; the scores mean nothing. | Free |
| `pnpm --filter @portrait/web eval` | Real simulated interviews (below). Needs `OPENAI_API_KEY` and/or `ANTHROPIC_API_KEY`. | Real money |

`eval` takes:

- `--models openai:gpt-6.1-sol,openai:gpt-6-luna,anthropic:claude-sonnet-5-5:high` (provider, model, optional thinking level)
- `--set smoke` (4 personas, the default), `--set all` (12), or persona ids
- `--turns 10`, `--effort medium`, `--concurrency 4`, `--out evals/out`

## How an interview is scored

Each persona in `personas.ts` has a private truth: who they are, how they talk, and the facts a good
interview should get onto the portrait. A cheap model (`EVAL_SIMULATOR`, default
`openai:gpt-6-luna`) plays the person from that truth. The real `runTurn` interviews them, with the
real tools and checks, against an in-memory store (`memory.ts`). A judge model (`EVAL_JUDGE`,
default `openai:gpt-6.1-sol`) then reads what the person said and shared and grades the portrait:

- **Fact recall**: share of the persona's facts some line states. Target ≥ 85%.
- **Made up**: lines nothing the person said or shared backs. Target ≤ 1%.
- **Overstated**: lines whose number, scope or level is stronger than what was said.
- **Checks passed**: personas that test one rule (résumé prompt injection, vague numbers, visa
  questions, "skip") pass or fail it.

The runner also counts refused tool calls, replies with more than one question, turns until the
portrait has three lines, cost per interview, and turn time. Each run writes `report.md` and
`results.json` (every transcript and grade) under `--out`.

Costs use the prices in `run.ts` (Sol's from third-party price lists); models without one show "no price". Add or correct prices with
`EVAL_PRICES='{"gpt-6.1-sol":{"input":1,"cached":0.1,"output":8}}'` (dollars per million tokens).

## In GitHub Actions

`.github/workflows/agent-evals.yml`: every pull request that touches the agent runs `test` and
`eval:dry`, then, if the repository has an `OPENAI_API_KEY` secret, the smoke set on `gpt-6.1-sol`
twice: on the base branch's agent and on the pull request's, so the summary shows before and
after. A full run is by hand: Actions → Agent evals → Run workflow. Results land in the run's
summary and as a downloadable artifact.

`--label` names a run in its report heading.

## Adding a persona

Add one to `personas.ts`. Keep facts atomic (one thing per line) and true to how the person would
say them. When a persona tests one rule, say so in `tests`; the judge grades it.
