# The employer layer

PRD §7.5 (CO-09 to CO-16), delivery steps E0 to E5 in §12. Design and the talent-data-hub
integration plan: the "Skystep 企业端设计 v1" doc (https://claude.ai/artifact/JzZv6hX6ijur6XF4vWGuzk).

## E0 (this change): tables and a sync that follows the contract

Nothing a person sees changes. This lays down where "which company is this" lives and how a
company's postings stay current, tested on records shaped like talent-data-hub's contract.

### Why the company lives on our side

talent-data-hub's public job record has no company entity. A posting carries a company name and
the hiring system account it was read from (`source.system` + `source.tenant`, e.g. `greenhouse` +
`acmeanalytics`); `company.domain` is always null. So we keep three tables
(`supabase/migrations/20261113000000_employers.sql`):

- `employers`: a company as people know it, with the address of its page (`slug`), a
  `domain_hint` that is only a lead, and a `verified_domain` written only when a reviewer approves
  a claim. `state` is `unclaimed`, `claimed` or `hidden` (a takedown).
- `employer_boards`: one hiring system account and the employer it belongs to. A link is `auto`
  (made on first sight, one board to one employer) or `reviewed` (a person confirmed it). A board
  marked `staffing` or `multi_brand` is not one employer's hiring, so its postings are kept
  without an employer until a person sorts them out.
- `jobs`: the postings we keep, open and closed, as talent-data-hub's JobRecord v1 without the
  description body. Not a copy of talent-data-hub: only boards we follow. Broad search goes to
  talent-data-hub's own search service.

Row-level security is on with no policies: only server jobs with the service role read or write
these tables. Pages will get their own read paths when they exist (E1).

### How a board stays current

`lib/employers/sync.ts`, `syncBoard`. We list one board in full through the read API
(`lib/jobs/thd-api.ts`, `GET /v1/jobs?source=&tenant=`), then compare.

- A listed posting that is new, has a higher revision, or was verified more recently is saved. A
  held posting is never replaced by an older revision, whether the copy came from the listing or
  from a lookup by id.
- A posting that closed stays, as closed. How long roles stay open and which ones reopen is what a
  dossier reads.
- A held posting the listing no longer has is asked about by id. 410 (the employer opted out or
  asked for removal) deletes it; so does 404. Tables that later cite postings must reference `jobs`
  with `on delete cascade`, so what was derived from a removed posting goes with it.
- If the listing fails or does not end, nothing is written. An incomplete read proves nothing.
- A run asks about at most 200 missing postings, the ones we have gone longest without hearing of
  first. Each one asked about is saved, touched (`fetched_at`) or deleted, so the next run starts
  with the others. The board is not marked checked until all were asked about.
- A stored record is kept under 12,000 bytes of JSON so it always fits the column: first with fewer
  locations, then with only the fields we read and long texts cut, and it says so in `truncated`.
  The link to the posting is never cut; a posting whose link is too long to keep whole is skipped,
  not taken for gone.
- Whose a posting is follows its board. When a person corrects a board's employer or marks it
  `staffing` or `multi_brand`, a trigger moves every posting the board already holds.

`lib/employers/slug.ts` turns a company name into a page address.

### What is not here yet

- **Nothing runs it.** There is no Supabase adapter for `EmployerStore`, no scheduled job and no
  service-role key in the app. They come with E1, once talent-data-hub's read API is deployed and
  Mike has issued Skystep a key (`THD_API_URL`, `THD_API_KEY`).
- **The seed employer registry** (141,508 employers from US Department of Labor filings, in
  talent-data-hub's repository) is not imported. That waits for Mike's yes.
- **Saved and applied postings** (`job_actions`) keep their own snapshot of title, company and
  link. When a posting is removed, that snapshot has to go too; how the tracker shows it afterwards
  is the job-seeker side's decision.
- **The 30-company evaluation set** for dossier accuracy needs real postings, so it follows the
  read API.
- `lib/jobs/source.ts` still has the first guess at the read API (`body.jobs`, keyword search,
  limit 500). It is unused while `THD_API_URL` is unset; the real shape is in `lib/jobs/thd-api.ts`.
