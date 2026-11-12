---
name: Skystep 青云步
description: A career agent that draws you as an evidence-backed page and keeps marking your growth, like pencil lines on a doorframe.
colors:
  wall: "oklch(0.935 0.016 215)"
  wall-2: "oklch(0.905 0.020 215)"
  trim: "oklch(0.982 0.018 88)"
  warm: "oklch(0.935 0.055 82)"
  chalk: "oklch(0.875 0.100 78)"
  on-chalk: "oklch(0.270 0.035 240)"
  ink: "oklch(0.270 0.035 240)"
  ink-2: "oklch(0.420 0.030 240)"
  ink-3: "oklch(0.495 0.025 240)"
  edge: "oklch(0.580 0.030 240)"
  me: "oklch(0.50 0.10 168)"
  me-wash: "oklch(0.93 0.035 168)"
  sky-1: "oklch(0.532 0.088 194)"
  sky-2: "oklch(0.660 0.109 192)"
  sky-3: "oklch(0.770 0.095 192)"
  night-wall: "oklch(0.245 0.030 250)"
  night-wall-2: "oklch(0.210 0.028 250)"
  night-trim: "oklch(0.300 0.025 1)"
  night-warm: "oklch(0.350 0.033 1)"
  night-chalk: "oklch(0.820 0.110 80)"
  night-ink: "oklch(0.950 0.018 85)"
  night-ink-2: "oklch(0.830 0.020 85)"
  night-ink-3: "oklch(0.730 0.020 85)"
  night-edge: "oklch(0.570 0.025 250)"
typography:
  name:
    fontFamily: "Atkinson Hyperlegible Next, Noto Sans SC, sans-serif"
    fontSize: "clamp(4rem, 1.4rem + 7.2vw, 10rem)"
    fontWeight: 800
    lineHeight: 0.88
    letterSpacing: "-0.05em"
  display:
    fontFamily: "Atkinson Hyperlegible Next, Noto Sans SC, sans-serif"
    fontSize: "clamp(2.5rem, 1.6rem + 4vw, 5.5rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Atkinson Hyperlegible Next, Noto Sans SC, sans-serif"
    fontSize: "clamp(2rem, 1.5rem + 1.4vw, 2.5rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Atkinson Hyperlegible Next, Noto Sans SC, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  subtitle:
    fontFamily: "Atkinson Hyperlegible Next, Noto Sans SC, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.28
  body:
    fontFamily: "Atkinson Hyperlegible Next, Noto Sans SC, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.6
  body-small:
    fontFamily: "Atkinson Hyperlegible Next, Noto Sans SC, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  meta:
    fontFamily: "Atkinson Hyperlegible Next, Noto Sans SC, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.45
  label:
    fontFamily: "Atkinson Hyperlegible Next, Noto Sans SC, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.4
  hand:
    fontFamily: "Shantell Sans, LXGW WenKai, Noto Sans SC, cursive"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  xs: "2px"
  sm: "3px"
  md: "4px"
  lg: "6px"
  full: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "6": "24px"
  "8": "32px"
  "12": "48px"
  "16": "64px"
  "24": "96px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.wall}"
    rounded: "{rounded.md}"
    padding: "0 18px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.trim}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 18px"
    height: "44px"
  button-wall:
    backgroundColor: "{colors.wall-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 18px"
    height: "44px"
  chip:
    backgroundColor: "{colors.trim}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "42px"
  chip-on:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.wall}"
    rounded: "{rounded.md}"
  input:
    backgroundColor: "{colors.trim}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
    height: "44px"
  panel:
    backgroundColor: "{colors.trim}"
    rounded: "{rounded.md}"
    padding: "22px"
  band:
    backgroundColor: "{colors.chalk}"
    textColor: "{colors.on-chalk}"
    rounded: "{rounded.sm}"
    padding: "1px 6px"
  user-message:
    backgroundColor: "{colors.trim}"
    textColor: "{colors.ink}"
    padding: "12px 16px"
  receipt:
    backgroundColor: "{colors.wall-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "40px"
---

# Design System: Skystep 青云步

Source of truth: `packages/ui/src/styles/system.css` (tokens and classes) and `packages/ui/src/index.ts` (React primitives). The interactive boards live at `/design` in the web app. This file describes them; when the two disagree, the code wins and this file gets fixed.

## Overview

**Creative North Star: "The Doorframe" (门框上的身高线)**

A family marks a child's height on a doorframe: a pencil line, a date in handwriting, and the next line a little higher. Skystep treats a career the same way. Every page is a wall with a ruler down its left edge; each thing a person has done is a firm pencil mark with its date and its source; what they are about to do is a dashed mark the agent drew and the person has not confirmed yet. The brand name says the same thing: 青云步 is a staircase climbing into the clouds, one evidenced step at a time.

The colour is "晨光" (morning light): a cool painted wall, cream trim, a single gold chalk highlight and blue-black pencil. At night ("夜") the wall turns deep blue, the trim soft wine, and the ink chalk-white. Density is calm and editorial: one line first, more only when asked. Motion explains cause and effect only; nothing bounces.

**Key Characteristics:**
- A ruler on the left edge of every page; growth is drawn as pencil marks, never as progress bars or badges.
- One highlight colour (gold chalk) for "now" and "just changed"; everything else is ink on wall.
- Handwriting (Shantell Sans / 霞鹜文楷) only for dates, margin notes and the person's own quoted words.
- Every claim carries a footnote to its source; inferred text is underlined dashed until confirmed.
- Flat surfaces separated by tone (wall, wall-2, trim), not shadows or hairline boxes.

## Colors

Cool wall, warm trim, one gold accent, and blue-black ink; the brand teal lives only in the logo mark.

### Primary
- **Gold Chalk** (`chalk`): the only highlight. Marks "now", text that just changed (the `band` sweep), the selected footnote, the context tag in the composer, and the source message a block grew from. Text on it uses **On-Chalk Ink** (`on-chalk`).

### Secondary
- **Skystep Teal steps** (`sky-1`, `sky-2`, `sky-3`): the three steps of the 青云步 mark, taken from the logo (#0E7C7B, #19A7A3, #7FD6D2). In light mode the top step is darkened slightly (`sky-3`) so the cloud stays visible on the wall. Night mode lifts all three. Used for the brand mark only.

### Tertiary
- **Person Colour** (`me`, `me-wash`): the default accent of a person's own portrait. Each portrait can pick its own hue; the platform never uses it for controls, and it is never the brand teal.

### Neutral
- **Morning Wall** (`wall`): page background.
- **Shaded Wall** (`wall-2`): sunk areas, the agent column, secondary buttons, receipts.
- **Cream Trim** (`trim`): raised panels, inputs, the person's own chat bubbles, selected blocks.
- **Warm Trim** (`warm`): hover on trim surfaces.
- **Pencil Ink** (`ink`, `ink-2`, `ink-3`): text in three steps; `ink-3` is the lightest allowed for text and still passes 4.5:1 on the wall.
- **Edge** (`edge`): control borders (inputs, switches), 3:1 or better.

### Named Rules
**The One Chalk Rule.** Gold chalk marks at most one "now" and the things that just changed. If two things on a screen are chalked at rest, one of them is wrong.

**The Brand Is Not a Person Rule.** Teal is the company's mark; `me` is the person's colour. They never stand in for each other.

## Typography

**Body Font:** Atkinson Hyperlegible Next (with Noto Sans SC for Chinese)
**Hand Font:** Shantell Sans (with LXGW WenKai / 霞鹜文楷 for Chinese)

**Character:** A highly legible sans carries everything that must be read; a warm handwriting carries what a person or a pencil would write in the margin. The pairing reads like a tidy wall with notes pencilled on it.

### Hierarchy
- **Name** (800, clamp(4rem, 1.4rem + 7.2vw, 10rem), 0.88): a person's name at the top of their page; once per page.
- **Display** (800, clamp(2.5rem, 1.6rem + 4vw, 5.5rem), 1): landing and section openers.
- **Headline** (700, clamp(2rem, 1.5rem + 1.4vw, 2.5rem), 1.1): page titles.
- **Title** (700, 28px, 1.2) and **Subtitle** (700, 20px, 1.28): sections and blocks.
- **Body** (400, 17px, 1.6): reading text; Chinese paragraphs use 1.8 (`.zh`). Keep English to about 60–72 characters per line and Chinese to 32–38.
- **Body small** (15px, 1.5) and **Meta** (500, 13px, 1.45): secondary lines.
- **Label** (700, 13px, 1.4, ink-2): small headings above lists. Never uppercase, never letter-spaced.
- **Hand** (500, 14–18px): dates, margin notes, quoted words.

### Named Rules
**The Scale Rule.** Use the type classes (`t-name` … `t-xs`, `lab`, `hand`). A new fixed pixel size in a page stylesheet needs a reason in a comment.

**The No Fake Italic Rule.** Chinese has no italic. Emphasis is weight or a chalk band.

## Layout

A 12-column grid with 24px gutters inside a container of at most 1440px (`.wrap`: 96px left padding to clear the ruler, 64px right). Breakpoints: 761px, 901px, 1181px and 1441px; at 760px and below the ruler and section marks hide, the grid collapses to one column and side padding drops to 16px. Spacing steps on a 4px base: 4, 8, 12, 16, 24, 32, 48, 64, 96. Working screens (studio, grow) split into a talk column (wall-2, left) and a canvas (wall, right) with the ruler between them.

### Named Rules
**The One Line First Rule.** Every block shows its most informative line; the rest grows in place (`Grow`, `ExpandRow`) instead of opening a page or a dialog.

## Elevation & Depth

Flat. Depth comes from tone: wall-2 sits behind, wall is the page, trim is raised. There are no box shadows on surfaces; the only inset shadows are a 2px ink ring on a selected option and the keyboard key outline. A dragged block lifts by scaling to 1.01 and turning 0.4 degrees, not by casting a shadow.

### Named Rules
**The Flat-By-Default Rule.** If something needs to stand out, change its tone or draw a pencil mark next to it. Do not add a shadow.

## Shapes

Gently squared corners: 4px for buttons, inputs, chips and panels; 2–3px for small marks; 6px for chat bubbles, with the corner nearest the speaker kept at 2px. Full rounding only for the switch and status dots. Pencil marks are hand-drawn SVG strokes (round caps, 2.2–3.2px) that draw themselves left to right; the footnote circle is slightly irregular, like a pencil ring.

## Components

### Buttons
- **Shape:** gently squared (4px), 44px tall (36px small), 15px bold label.
- **Primary:** ink background, wall text. One per view.
- **Secondary / Wall:** trim or wall-2 background, ink text.
- **Quiet:** no background, 2px underline.
- **Press:** scales to 0.98 on the spring curve; disabled is 45% opacity.

### Chips
- **Style:** trim background, 42px tall (32px small); selected chips turn ink with wall text.
- **Use:** choices the agent offers, filters, quick replies in the composer.

### Cards / Containers
- **Panel:** trim, 4px corners, 22px padding, no border, no shadow.
- **Frame (contact sheet):** trim; circled with a pencil ring when chosen, struck through with a pencil line when passed (struck frames stay at 0.8 opacity so text keeps 4.5:1).

### Inputs / Fields
- **Style:** trim background, 2px edge border, 4px corners, 44px tall.
- **Focus:** border turns ink; every focusable element also gets a 3px ink outline offset by 3px.
- **Error:** bold ink text with a leading cross, never red alone.

### Navigation
- Public pages: wordmark left (mark + "Skystep", 19–22px, 800), a few underlined text links right.
- Signed in: a narrow text rail on desktop with the ruler behind it; a scrolling text tab bar on phones. The agent opens from every page (⌘J).

### Conversation
- Agent messages sit on the wall with no bubble; the person's messages are trim bubbles on the right.
- **Receipt:** a wall-2 row under an agent message that says what changed on the page ("Drafted a growth plan · 4 items"), with a short pencil stroke and an Undo. Hovering it lights the block it changed.
- **Status line:** a pencil stroke that writes and unwrites itself while the agent works. No spinners.
- **Context tag:** a chalk tag in the composer naming the block being edited.

### Evidence marks (signature)
- **Footnote button:** a numbered pencil ring after a claim; opens the source card (quote, where it came from, when).
- **Basis marks:** filled dot = shown, open dot = said, dashed dot = inferred, tick = verified.
- **Pending:** inferred text is underlined dashed until the person says Right.

### Brand mark
- `Mark` and `Wordmark` in `@portrait/ui`: three steps and a cloud in `sky-1..3`, followed by "Skystep" (or 青云步 on Chinese-only surfaces).

## Do's and Don'ts

### Do:
- **Do** start every page from the wall, the ruler and one line per block.
- **Do** use the spring curve (`--spring`, a critically damped curve with no overshoot) with the duration tokens: 120ms press, 240ms small, 380ms pencil draw, 420ms medium, 520ms settle, 640ms large.
- **Do** make content grow from where it came from (`withViewTransition`, view-transition name `grow`).
- **Do** give every motion a `prefers-reduced-motion` fallback: no movement, 150ms fades.
- **Do** check both 晨 and 夜, and both English and Chinese, before calling a screen done.

### Don't:
- **Don't** use shadows, gradients, glow or glass on surfaces.
- **Don't** use sparkles or "magic" symbols for AI; the agent's work is shown as pencil.
- **Don't** use progress bars, stars, points or badges for growth or ratings; use pencil marks, tallies and evidence.
- **Don't** put the brand teal on buttons, links or highlights.
- **Don't** use thick coloured stripes on the side of cards (the expand line `.gl` is a 2px pencil line).
- **Don't** set uppercase, letter-spaced labels or one coloured word in a headline.
