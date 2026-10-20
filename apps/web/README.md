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
code and Google) and the accounts schema; screens still show the canvas's fixture data
(`lib/data`), and composers answer with an honest "not connected" note (`lib/preview.ts`).

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
