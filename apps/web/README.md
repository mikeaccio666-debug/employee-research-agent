# @portrait/web

The Portrait web app: Next.js 16 (App Router) + React 19 + TypeScript, Tailwind CSS 4, and the
design system in `packages/ui` (`@portrait/ui`). Screens are implemented from the Claude Design
canvas "页面 v2" (design system v0.2, 身高线 × 晨光). The `/design` page lists every artboard and
links to its route.

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build        # turbo → next build
pnpm typecheck
```

The backend is arriving in steps (see `docs/architecture.md`). Step 1 adds Supabase sign-in (email
code and Google), the accounts schema, handles, visibility and the public `/@handle` page; other
screens still show the canvas's fixture data (`lib/data`), and composers answer with an honest "not connected" note (`lib/preview.ts`).

## Supabase (step 1)

Without `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (see `.env.example`)
everything still runs and `/login` says sign-in is not set up. To switch it on:

1. **Schema.** Run `supabase/migrations/*.sql` in order (Supabase dashboard → SQL Editor, or
   `supabase db push` with the CLI). It creates `profiles` (handle, name, generated alias,
   visibility; new people start anonymous), one draft `portraits` row per person, row-level
   security so both stay private to their owner, and the `public_portraits` view, the only
   public read.
2. **Email code.** Authentication → Sign In / Providers → Email: on. Authentication → Emails →
   "Magic Link": add `{{ .Token }}` to the template so the email carries the 6-digit code (the
   link in it also works, on the same browser).
3. **Google.** In Google Cloud Console create an OAuth client (Web application) with the
   redirect URI `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`; paste its client ID and
   secret into Authentication → Sign In / Providers → Google.
4. **URLs.** Authentication → URL Configuration: Site URL = the production URL; Redirect URLs =
   `https://YOUR-DOMAIN/auth/callback`, `https://*-YOUR-VERCEL-TEAM.vercel.app/auth/callback`
   (previews) and `http://localhost:3000/auth/callback`.
5. **Vercel.** Add the two `NEXT_PUBLIC_…` variables to the project and redeploy (they are read at
   build time).

`proxy.ts` refreshes the session on each request; `/auth/callback` turns Google's or the email
link's one-time code into the session; `/auth/signout` (POST) ends it.

### Accounts in the screens

- **Who is signed in.** `useViewer()` (`lib/supabase/use-viewer.ts`) reads the session in the
  browser, so static pages stay static. The left nav's footer shows the person (and `@handle`)
  with Sign out; public headers swap "Log in" for "Your studio".
- **Settings and publish.** `/settings/privacy` and `/studio/publish` send signed-out people to
  `/login` and back (`accountFor` in `lib/supabase/server.ts`). Visibility saves as it changes;
  "Your link" claims or changes the handle; publishing sets the visibility and the portrait's
  status. The writes are Server Actions in `lib/account-actions.ts`; RLS and the column grants
  in the migration are what limit them. Sensitive-field levels are still example data.
- **`/@handle`.** The canvas's `lin` and `maya` stay; any other handle is read from the
  `public_portraits` view with a cookie-less client (`lib/supabase/public.ts`), so the page is
  cached and refreshed when someone publishes or changes visibility. Only Public portraits show
  there; link-only pages need the view widened first.

## The studio agent (step 2)

Signed in, `/studio` is the person's own portrait: a conversation with the agent on the left and
the portrait it draws on the right. Without a model key the studio still loads and says the agent
isn't connected; without Supabase it stays the canvas's Lin example.

1. **Schema.** Run `supabase/migrations/20261022000000_agent_conversations.sql` after step 1's. It
   adds `conversations`, `conversation_messages` (append-only: people read and add to their own,
   nobody edits) and `model_calls`, plus `portraits.published_spec`. The `public_portraits` view
   now reads `published_spec`, so drafts, rejected lines and the chat quotes behind each line never
   leave the studio.
2. **Model.** Set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` (server-only) in Vercel. With both,
   `AGENT_PROVIDER` picks one (default `openai`). `OPENAI_MODEL`, `ANTHROPIC_MODEL`, `AGENT_EFFORT`,
   the `*_BASE_URL`s and `AGENT_DAILY_MESSAGES` are optional (see `.env.example`). Changing them
   needs a redeploy, not new code. With both keys set, people pick the model above the message
   box, message by message (`AGENT_MODEL_SWITCHER`: `everyone` by default, `admins` for
   `AGENT_ADMIN_EMAILS` only, or `off`). `AGENT_DAILY_MESSAGES_OPENAI` / `_ANTHROPIC` cap each
   model per person per day on top of `AGENT_DAILY_MESSAGES`. Within a provider, people also pick
   the model (`OPENAI_MODELS` / `ANTHROPIC_MODELS`, comma-separated, default first; OpenAI offers
   GPT-6.1 Sol and GPT-6 Luna, Claude Opus, Sonnet and Haiku by default) and how hard it thinks (Quick, Balanced, Deep). History
   written by another model is replayed as plain text, since reasoning is tied to its model.
3. **Long conversations.** Once the part the model reads verbatim passes about
   `AGENT_CONTEXT_TOKENS` (24,000), everything but the last six messages is condensed into notes
   by a cheaper model (`OPENAI_SUMMARY_MODEL` / `ANTHROPIC_SUMMARY_MODEL`, default `gpt-6-luna` /
   `claude-haiku-5-5`). The notes ride on the person's next message; the model then reads the
   notes, the recent messages and the portrait's state. Stored history is never rewritten, the
   thread still shows every message, and quotes are still checked against all of them.

How a turn works (`app/api/agent/chat/route.ts` → `lib/agent/turn.ts`): the person's message is
saved, the model gets the instructions (`lib/agent/prompt.ts`), the history replayed verbatim and
the portrait as it stands, and answers as server-sent events (`message.delta`, `portrait.patch`,
`message.done`, `error`). It changes the portrait only through four tools (`lib/agent/tools.ts`):
`upsert_claim`, `remove_claim`, `set_headline`, `move_section`. Each call is checked before it
touches `portraits.spec`: every line must quote the person's own messages, drafts the person
rejected can't come back, pinned lines are theirs. Refusals go back to the model in plain words.

Each provider lives in `lib/agent/providers/`. Every stored history item is marked with the
provider that wrote it: that provider gets it back verbatim (its reasoning and cache carry over),
the other gets the plain text of the conversation, so switching providers keeps old conversations
going.

The portrait (`lib/portrait/spec.ts`) is a list of claims (one line of the page each, with its
layer, basis and status), a headline and the section order. New lines are drafts, dashed in the
studio with **Right / Not right** under them (`lib/portrait-actions.ts`). Publishing copies the
confirmed lines, without their quotes, to `published_spec`; after that the studio offers **Update
page** whenever the draft moves ahead. `/@handle` renders the published copy
(`components/portrait/SpecSections.tsx`).

## Résumés and links (step 3)

In the studio, **Attach** takes a PDF or Word (.docx) résumé up to 10 MB, and any link pasted in a
message is read too: a GitHub profile through GitHub's API (`GITHUB_TOKEN` optional, for rate
limits), any other public page as plain text. LinkedIn can't be read; the agent asks for the
profile's PDF export instead.

**Connected apps** (Notion first) let the agent search and read someone's own pages over MCP,
read-only. Below the page in the studio, **Connect** signs them in to the app with OAuth (we
register with the app's MCP server on the fly, so there is no app to set up on its side); the
agent's `read_connector` tool then calls only the allow-listed search and fetch tools
(`lib/connectors/catalog.ts`). A page it reads becomes one of their sources, so lines quote it
like a résumé. Tokens are sealed with `CONNECTOR_KEY` (`lib/connectors/seal.ts`) in the
`connections` table; **Disconnect** deletes them. Without `CONNECTOR_KEY` the studio hides it.

1. **Schema.** Run `supabase/migrations/20261023000000_sources.sql`. It adds `sources` (what was
   read, page by page; people read, add and remove their own, nobody edits) and a private
   `sources` storage bucket where each person can only touch their own folder.
2. The browser uploads the file straight to storage (Vercel functions cap request bodies at
   4.5 MB), then `POST /api/agent/chat` gets its path, reads it (`lib/agent/sources.ts`: `unpdf`
   for PDFs, `mammoth` for DOCX), saves the text and hands it to the model as a `<source>` block.
   Lines drawn from it must quote it word for word; the evidence records the source and page.
3. Links are fetched only if they resolve to public addresses (rechecked on every redirect), at
   most 2 MB and 8 seconds. Everything read is data for the model, never instructions.

## Where things live

| Path | What |
|---|---|
| `packages/ui/src/styles/system.css` | The canvas's shared stylesheet, ported verbatim (tokens, type, every component class). |
| `packages/ui/src/styles/extras.css` | Patterns the canvas repeats per board (`.kbd`, `.linklike`). |
| `packages/ui/src/components/*` | React primitives over those classes (Button, Chip, Composer, Footnoted, Frame …). |
| `app/globals.css` | Tailwind (theme + utilities, **no preflight**) and the token mapping. |
| `components/shell` | `AppShell` + `ShellMain`: the signed-in left-nav shell. |
| `components/agent` | `AgentPanel`: the always-on agent (Talk button, ⌘J, slides in from the right). |
| `components/workspace` | `Workspace`: chat beside a live canvas (studio, brief, event create, grow). |
| `components/chrome.tsx` | `PublicHeader` (public pages), `FlowBar` (focused flows). |
| `lib/routes.ts` | Every screen's URL, and the board list for `/design`. |
| `lib/nav.ts` | Left-nav sets: talent, company, insider. |
| `lib/data/cast.ts` | The fictional cast (Lin, Maya, Alex, Jordan, Northwind). |

Portraits live at `/@handle`; `next.config.ts` rewrites that to `app/u/[handle]` because folders
starting with `@` are parallel routes.

## Styling rules

Three layers, in cascade order: `base` (tokens, resets) → `components` (design classes and
screen CSS modules) → `utilities` (Tailwind). Later layers win regardless of specificity.

1. **Design classes first.** Type (`t-name t-d t-h1 t-h2 t-h3 t-body t-s t-xs lab hand hcn zh b
   c2 c3 num`), layout (`wrap g12 panel sunk`), marks (`ruler smark mark band pend fn bm tally
   tick`), controls (`btn chip seg sw inp opt slot`), folds (`grow gl ln land xrow`), conversation
   (`thread m-a m-u rcpt status cmp ctx`), editing (`blk br grip note`), contact sheet (`frm must`).
   Prefer the React primitive when one exists.
2. **Tailwind for layout and one-off spacing**, translating the canvas's inline styles:
   `style="margin-top: 22px"` → `mt-[22px]` (or `mt-5.5`), `grid-column: 1 / span 9` →
   `col-[1/span_9]`, `font-size: 20px` → `text-[20px]`, `letter-spacing:-0.02em` →
   `tracking-[-0.02em]`. Colours are tokens only: `bg-wall bg-wall-2 bg-trim bg-warm bg-chalk
   text-ink text-ink-2 text-ink-3 text-on-chalk border-edge text-new bg-me-wash`; fonts `font-sans
   font-hand font-hand-cn`; easing `ease-spring`. Breakpoints match the canvas: `max-sm:` = phone
   (≤760px), `max-md:` ≤900px, `max-lg:` ≤1180px.
   The utilities `grow` and `ring` are switched off (those names are design classes); use `flex-1`.
3. **A CSS module per screen** for the rules in a board's `<style>` block. Start the file with
   `@layer theme, base, components, utilities;` and wrap the rules in `@layer components { … }`
   so they keep the canvas's specificity against the design classes. Inside a module:
   - class names are local (`s.card`); refer to design classes with `:global(.ruler)`;
   - keyframe names are scoped, so `animation: pv-land` does **not** reach the global keyframes.
     Either put the global class on the element (`land`, `draw`, `band sweep`, `ln` inside an
     open `grow`) or copy the `@keyframes` into the module.
4. Inline `style={{…}}` only for values computed at runtime (drag transforms, CSS variables).
5. No Tailwind preflight: elements keep browser defaults plus the canvas reset, exactly as the
   boards were drawn. `<body>` carries `.pv`, so a board's root `<div class="{{root}}">` becomes a
   plain wrapper (`min-h-screen relative overflow-hidden` …) without `pv`.

### Theme

Every page is light 晨 by default and follows the system into dark 夜 (`prefers-color-scheme`,
pure CSS, no script and no theme switch). Never hard-code a theme on a screen; only the
design-system reference pages pin one half of a light/dark comparison with
`<div className="pv dark">` or `<div className="pv light">`. The canvas's "wine" tweak variables equal the
defaults in `system.css` and need no code.

### Motion

The spring is `var(--spring)`; durations `--t-press 120 · --t-s 240 · --t-draw 380 · --t-m 420 ·
--t-settle 520 · --t-l 640`. Reduced motion is handled in `system.css`; in JS, check
`prefersReducedMotion()`. The canvas's `vt(fn)` helper is `withViewTransition(() => setState(…))`.

## Porting a board

1. Read the board (`*.dc.html`). Markup sits between `</helmet>` and `</x-dc>`; screen CSS is the
   `<style>` in `<helmet>`; behaviour is the `DCLogic` class (initial `state`, `renderVals`).
2. `page.tsx` stays a server component: `export const metadata = { title: '<board <title>>' }` and
   render the screen. Put interactive parts in a `'use client'` component next to it.
3. `{{holes}}` become props/state; `<sc-if>` → conditionals; `<sc-for>` → `.map` with keys.
   Mirror the board's interactions (toggles, grow-in-place, keyboard shortcuts, view transitions).
4. Copy is verbatim — English and Chinese, curly quotes, `·`, `—`, `›`. Keep `lang="zh-CN"` where
   the board sets it. The cast is fictional; never present it as real.
5. Keep the board's ARIA. Buttons are `<button type="button">`; navigation is `next/link`.
   Links to other boards (`href="V2-S06….dc.html"`) map through `routes`; `href="#"` goes to the
   most sensible screen or an in-page anchor.

### Shells

```tsx
<AppShell nav={companyNav} active="hire" footer="Sam Okafor · Northwind"
  agent={{ context: '07A night-heron', caption: 'Same conversation as your Brief studio · today', thread: <>…</> }}>
  <ShellMain className={s.main}>…</ShellMain>
</AppShell>
```

`ShellMain` is the page column (`padding: 28px 40px 64px`); it makes room when the agent panel
opens. Every signed-in page gets the agent (Talk ⌘J) unless the board carries its own
conversation (`agent={false}`). `useShell().openAgent({ focus: true })` opens it from page content
with the cursor in its message box. Boards drawn with the panel open pass `defaultOpen`; it opens
on screens wider than 900px only.

```tsx
<Workspace top={…} talk={…} composer={<Composer … />} canvasLabel="Your portrait, live" resizable
  mobile={{ status: 'Anonymous · discoverable', canvasNote: 'Preview · as the public sees it' }}>
  …canvas…
</Workspace>
```

Public pages use `<PublicHeader>`; focused flows use `<FlowBar left right>`.

## Checking your work

- `npx tsc --noEmit -p tsconfig.json` from `apps/web`.
- Screens at 1440 × 900 and 390 × 844, with the system in light and in dark mode, and with reduced motion.
