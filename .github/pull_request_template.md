## What changes and why

<!-- What the person will notice, and why it's worth doing. -->

## Risk

<!-- Pick one. The levels are defined in docs/release.md. -->

- [ ] Low: docs, copy, tests, or a change behind a flag that is off
- [ ] Medium: a user-facing change, a new API route, an agent prompt, tool or model change
- [ ] High: a database migration, sign-in or permissions (RLS), deleting data, money, or an env var or secret change

## How it was checked

<!-- Commands run, what was tried in a browser or preview, eval results. -->

## Rollback

<!--
How to undo this if it breaks production: turn off a flag, Vercel Instant Rollback, or Revert.
With a migration: can the previous deployment still run against the new schema? (Add first, remove later.)
-->

## Before merging

<!-- Anything done by hand: SQL to run, env vars to set in Vercel, settings to change. "Nothing" if none. -->
