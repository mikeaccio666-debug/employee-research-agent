# Jobs for job seekers

PRD §7.19 (JOB-01 to JOB-13). This file is how the Jobs page works and what it needs from
talent-data-hub. Roadmap and competitor comparison: the "求职端路线图" doc
(https://claude.ai/artifact/Ng8ugF9JawS1t3rZ5h2pWC).

## v0 (this change)

- `/jobs` ranks open postings for the signed-in person. Signed out (previews without Supabase) it
  shows Lin Zhou's, the example person of the other boards (`lib/jobs/example.ts`).
- Ranking (`lib/jobs/match.ts`) reads only the portrait's **confirmed** lines and the preferences
  the agent saved with `set_preferences`. No model call, so it costs nothing.
  - Hard filters: job type, work mode, places (remote postings pass a place filter when remote is
    acceptable). The page says how many postings the filters left out.
  - Role: every word of a wanted role in the title (40 points), or most words including the last,
    "close to" (20). Without roles, past job titles count for less.
  - Lines: each confirmed line (not identity, not intent) counts once, by its rarest word or
    two-word phrase that the description shares. Words in more than a fifth of postings are too
    common to cite. A posting with no role and no line of theirs is never recommended; when they
    named roles, a posting for another role needs two of their lines.
  - Early career (wants an internship, or a confirmed line says student): senior titles drop.
  - Fresh postings rise a little; postings up for half a year sink a little.
  - Same company and title in several cities shows once.
- Each card has at most three reasons. A line reason shows the person's confirmed line and the
  sentence of the posting that holds the matched word, with the word in bold. Tests check that the
  cited line is confirmed and the quoted words are in the posting (`evals/jobs.test.ts`).
- Work authorization: when theirs needs sponsorship and the posting says it won't sponsor, the card
  quotes that sentence. Work authorization only filters and warns; it never shows on the page.
- Actions (`job_actions`, migration `20261109000000_job_actions.sql`): save, not for me (with a
  reason), applied (set when they open the employer's apply link). Dismissed postings stay hidden;
  "not this company" hides the company. The saved list keeps the title, company and link as they
  were. The posting is looked up again on the server before anything is stored.

## Where postings come from

`lib/jobs/source.ts` has one interface and two sources. `JOBS_SOURCE` picks one; without it, `thd`
when `THD_API_URL` is set, else `sample`.

- `sample`: 1,224 postings from 9 employers (Ramp, Intercom, Palantir, Skydio, Sierra, BILL,
  NewsBreak, PsiQuantum, Toyota Research Institute) that talent-data-hub recorded from their own
  Greenhouse, Ashby and Lever boards on 5 to 8 November 2026, from its connector fixtures. Built by
  `node apps/web/scripts/jobs-sample.mjs <talent-data-hub checkout>`, which makes no network request.
  The page says it is a sample and that some may have closed.
- `thd`: talent-data-hub's read API, with our own consumer key. It does not exist yet (its plan's
  layer 5). Its records are JobRecord v1; `lib/jobs/thd.ts` reads them, and unknown values in the
  contract's open sets read as `unknown`.

## What we ask talent-data-hub for

Proposed shape; talent-data-hub decides. Bearer key per consumer, JobRecord v1 bodies.

1. `GET /v1/jobs?status=open&q=&country=&workplace_type=&employment_type=&updated_since=&limit=&cursor=`
   returns `{ jobs: JobRecord[], next_cursor }`. `include=description` adds `description.html`.
   Repeated parameters mean "any of". `q` searches title and description. This is the one we need
   first.
2. `GET /v1/jobs/{id}?include=description` returns one JobRecord, closed ones included (so a saved
   posting can say it closed).
3. The event stream (`job.upserted`, `job.verified`, `job.closed`, `job.removed`) by webhook or
   cursor, so we can keep a mirror and drop closed postings from recommendations.

## Next (JOB-07 onward)

Mirror open postings into our database from the event stream and add embeddings; rerank with a
small model that writes the reasons and is checked against the same rule (quotes must exist); daily
recommendations through the studio agent; the application tracker; mentors and insiders on cards.
