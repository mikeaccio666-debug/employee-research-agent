# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router) + TypeScript, deployed on Vercel; Supabase (Postgres, Auth, Storage, Realtime); Claude API for the agent. Deploy target (Vercel) chosen by the founders; the rest is proposed in `docs/architecture.md`. No application code exists yet.

## Users

- **Talent (primary):** college students and new grads in North America, including many international students (often Chinese) who are less confident presenting themselves in English. They want a page that truly represents them and to be found by the right people, without writing a résumé from scratch. Mostly open shared links on phones; build their profile on laptops.
- **Startups:** founders and first recruiters at early-stage startups (pre-seed to Series B, ≤150 people) hiring their first engineers and interns. Very little time; review candidates in batches on laptops.
- **Insiders:** users who found a job and verified their employment; they network, host coffee chats, and refer people.

## Product Purpose

An always-available AI agent that interviews a person and draws them as a unique, evidence-backed portrait page at `{domain}/@handle`. It keeps them company through the job search (résumé, growth advice). Startups describe who they need in plain language and the same agent finds, explains and connects them with people. Success means two-sided connections that actually happen: accepted requests and completed coffee chats.

## Positioning

Every claim on a portrait links to its source (the person's own words, a résumé page, a link). People are discovered by evidence and work rather than pedigree, and can be discovered anonymously before choosing to reveal who they are. Today's job seekers become tomorrow's insiders who refer the next cohort.

## Operating Context

- Talent: chat with the agent (left) while their portrait updates live (right); share the link; post to a feed under their name or an alias; RSVP to startup events; coffee chats.
- Startups: describe a role by chat or pasted JD; review a ranked "contact sheet" of candidates with reasons; send connection requests; host recurring online talks and AMAs.
- Insiders: receive recommended, verified job seekers (paid); coffee chats; mark referrals; two-way reviews after coffee chats.

## Capabilities and Constraints

- English-first UI with Simplified Chinese; the agent replies in the user's language; portraits can be English, Chinese or bilingual.
- New users default to "anonymous · discoverable"; anonymous data must never leak identity.
- Never collect, infer or use protected attributes (age, gender, ethnicity, etc.). AI recommends and explains; humans decide.
- Membership on both sides; the referral subscription buys vetting, packaging and introductions, never a referral itself.
- Undecided: brand name and domain; final visual direction (being re-explored, see `docs/design-brief.md` §12.5).

## Brand Commitments

Working codename "Portrait" (placeholder). Voice: warm, direct and curious with talent; crisp and honest with startups; no hype, no flattery, no "AI-powered" clichés. Chat uses the conventional left/right layout (agent left, user right). No signature glyph. Real-name users may optionally add a profile photo and a short voice or video intro; photos are hidden in anonymous mode and by default in startups' candidate lists, and never used for matching.

## Evidence on Hand

None yet: no real users, testimonials, customers, metrics or press. Use clearly labeled fictional examples only (Lin, Maya, Alex, Jordan, Northwind) and never present them as real.

## Product Principles

1. Consent first: portraits only contain what the person provided or authorized; they own and control it.
2. Evidence over adjectives: everything is traceable; polish wording, never inflate.
3. Always able to talk: the agent is reachable on every page and remembers the person.
4. Seen before known: anonymous discovery, identity revealed only by mutual consent.
5. Integrity can be checked: reviews only after real coffee chats, with a right to dispute.

## Accessibility & Inclusion

WCAG 2.2 AA; full keyboard support; screen-reader-friendly streaming chat; respect `prefers-reduced-motion`; correct Chinese/English mixed typesetting; public portrait pages must perform well on mobile.
