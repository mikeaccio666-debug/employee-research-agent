# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router) + TypeScript in `apps/web`, deployed on Vercel; Supabase (Postgres, Auth, Storage); our own agent harness on the official OpenAI and Anthropic SDKs. Design system in `packages/ui` (`@portrait/ui`), described in `DESIGN.md`.

## Users

- **New grads and students:** college students and recent graduates, many of them international students (often Chinese) who are less confident presenting themselves in English. Thin work history; they need real practice and evidence, not a padded résumé.
- **Experienced career changers:** white-collar people who were laid off or want to change direction (for example audit to product, lab to software). Long history that does not translate to the new field; they need direction, translation and human introductions.
- **People already in a job:** users who found work keep a monthly record of wins, see passive opportunities on their own terms, and later give back as insiders and mentors.
- **Mentors:** experienced people at large companies who offer paid one-hour sessions and reviews. Referrals are always free and never sold.
- **Companies:** founders and recruiters, mostly early-stage startups, who describe who they need in plain language and review candidates in batches on laptops.

Job seekers mostly open shared links on phones and build their page on laptops. The product is English-first with Simplified Chinese.

## Product Purpose

A long-term career agent that makes people believable and seen by real humans. It interviews a person and draws them as an evidence-backed page at `{domain}/@handle`, plans the next steps with them ("write it first, then make it true"), lets new grads earn evidence through simulated and real work, and introduces people to mentors and companies with both sides' consent. Success means real outcomes: interviews, completed coffee chats and mentor sessions, offers, and people who stay through their next career turn.

## Positioning

Every claim links to its source, and evidence climbs a ladder: said, simulation done, mentor reviewed, employer confirmed, real job. People are found by what they have done rather than by pedigree, can be discovered anonymously first, and are introduced by humans instead of mass auto-applying. The product stays useful after the job is found, across seven career stages: explore, search, first 90 days, growing while employed, passive opportunities, the next turn, and giving back.

## Operating Context

- Job seekers: talk to the agent (or drop a résumé or link) while their page grows live; confirm or reject each drafted line; follow a growth plan; do simulated "first week" work; book mentor sessions; share their link; join a small cohort with a weekly check-in.
- Mentors and insiders: receive vetted requests, run paid sessions and reviews, give free referrals, leave two-way reviews after real conversations.
- Companies: describe a role by chat or a pasted job description; review a ranked contact sheet of candidates with reasons; send connection requests; host talks.

## Capabilities and Constraints

- English-first UI with Simplified Chinese; the agent replies in the user's language; pages can be English, Chinese or bilingual.
- New users default to "anonymous · discoverable"; anonymous data must never leak identity.
- Never collect, infer or use protected attributes (age, gender, ethnicity, etc.). AI recommends and explains; humans decide.
- The agent never sends anything outward (messages, applications, introductions) without the person confirming it.
- Referrals are never sold; mentors are paid for sessions and reviews only.

## Brand Commitments

Company name Skystep, Chinese name 青云步; the logo is three steps rising into a cloud in teal (#0E7C7B, #19A7A3, #7FD6D2), files in the project's brand folder. The AI model is named Tadu (踏渡). The code package is still called `@portrait/ui`. Voice: warm, direct and curious with job seekers; crisp and honest with companies; no hype, no flattery, no "AI-powered" clichés. Chat uses the conventional layout (agent left, person right). Real-name users may optionally add a profile photo and a short voice or video intro; photos are hidden in anonymous mode and by default in companies' candidate lists, and never used for matching.

## Evidence on Hand

No public users, testimonials, customers or press yet. Production is used by the founder for testing. Use clearly labelled fictional examples only (Lin, Maya, Alex, Jordan, Northwind) and never present them as real.

## Product Principles

1. Consent first: pages only contain what the person provided or authorised; they own and control it.
2. Evidence over adjectives: everything is traceable; polish wording, never inflate.
3. Draft, then confirm: every agent output starts as a pencil draft the person confirms, edits or drops.
4. Always able to talk: the agent is reachable on every page and remembers the person.
5. Seen before known: anonymous discovery, identity revealed only by mutual consent.
6. Integrity can be checked: reviews only after real conversations, with a right to dispute.

## Accessibility & Inclusion

WCAG 2.2 AA; full keyboard support; screen-reader-friendly streaming chat; respect `prefers-reduced-motion`; correct Chinese/English mixed typesetting; public pages must perform well on mobile.
