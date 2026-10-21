import { z } from 'zod';

// The portrait the agent draws (docs/agent-design.md §2 and §6.1, cut down for step 2). It lives
// in portraits.spec as JSON: a list of claims, each one line of the page with the person's own
// words behind it, plus a headline and the order of the sections. The agent edits it only through
// the tools in lib/agent/tools.ts; the person confirms or rejects each line in the studio.

export const LAYERS = ['identity', 'experience', 'capability', 'trait', 'intent', 'narrative'] as const;
export type Layer = (typeof LAYERS)[number];

export const SECTIONS = ['story', 'experience', 'strengths', 'working-style', 'intent'] as const;
export type Section = (typeof SECTIONS)[number];

/** Where a layer's lines go on the page. Identity lines sit beside the name instead of a section. */
export const SECTION_OF: Record<Layer, Section | null> = {
  identity: null,
  experience: 'experience',
  capability: 'strengths',
  trait: 'working-style',
  intent: 'intent',
  narrative: 'story',
};

export const SECTION_LABEL: Record<Section, string> = {
  story: 'Story',
  experience: 'Experience',
  strengths: 'Good at',
  'working-style': 'How they work',
  intent: 'Looking for',
};

export const LIMITS = {
  statement: 280,
  title: 80,
  org: 80,
  when: 40,
  kind: 40,
  quote: 200,
  headline: 120,
  claims: 80,
  note: 200,
  notes: 12,
} as const;

const Evidence = z.union([
  z.object({
    source: z.literal('chat'),
    /** conversation_messages.id of the person's message the quote was found in. */
    messageId: z.number().int(),
    quote: z.string().max(LIMITS.quote),
  }),
  z.object({
    /** A résumé or link the person shared (lib/agent/sources.ts). */
    source: z.enum(['resume', 'website', 'github']),
    sourceId: z.string().uuid(),
    /** The PDF page the quote is on; null for documents without pages. */
    page: z.number().int().nullable(),
    quote: z.string().max(LIMITS.quote),
  }),
]);
export type Evidence = z.infer<typeof Evidence>;

const Claim = z.object({
  id: z.string().regex(/^clm_[a-z0-9]{6,20}$/),
  layer: z.enum(LAYERS),
  kind: z.string().min(1).max(LIMITS.kind),
  statement: z.string().min(1).max(LIMITS.statement),
  title: z.string().max(LIMITS.title).nullable(),
  org: z.string().max(LIMITS.org).nullable(),
  when: z.string().max(LIMITS.when).nullable(),
  /** stated: the person said it. inferred: the agent read it from their stories; they must confirm. */
  basis: z.enum(['stated', 'inferred']),
  status: z.enum(['draft', 'confirmed', 'rejected']),
  /** The person wrote or changed this line themselves; the agent must ask before touching it. */
  pinned: z.boolean(),
  evidence: z.array(Evidence).max(10),
  createdBy: z.enum(['agent', 'user']),
  updatedAt: z.string(),
});
export type Claim = z.infer<typeof Claim>;

const Headline = z.object({
  text: z.string().min(1).max(LIMITS.headline),
  /** The lines that back it: a headline is never a fact of its own. */
  claims: z.array(z.string()).min(1).max(8),
  status: z.enum(['draft', 'confirmed']),
});
export type Headline = z.infer<typeof Headline>;

/** Something the agent wants to come back to ("ask what the Kafka work was for"). Never shown. */
const Note = z.object({
  id: z.string().regex(/^nte_[a-z0-9]{6,20}$/),
  text: z.string().min(1).max(LIMITS.note),
  at: z.string(),
});
export type Note = z.infer<typeof Note>;

export const Spec = z.object({
  rev: z.number().int().nonnegative(),
  headline: Headline.nullable(),
  order: z.array(z.enum(SECTIONS)),
  claims: z.array(Claim).max(LIMITS.claims),
  /** The agent's open notes to itself. Not part of the page, so they don't move rev. */
  notes: z.array(Note).max(LIMITS.notes).default([]),
});
export type Spec = z.infer<typeof Spec>;

export const emptySpec = (): Spec => ({ rev: 0, headline: null, order: [...SECTIONS], claims: [], notes: [] });

/** The stored spec, or an empty one (a new portrait is `{}`; anything malformed starts over clean). */
export function readSpec(raw: unknown): Spec {
  const parsed = Spec.safeParse(raw);
  if (!parsed.success) return emptySpec();
  const spec = parsed.data;
  // Keep every section in the order exactly once, whatever an older spec held.
  const order = [...new Set(spec.order)];
  for (const s of SECTIONS) if (!order.includes(s)) order.push(s);
  return { ...spec, order };
}

/** Lines the page may show: confirmed ones. Drafts stay in the studio until the person says yes. */
export const visibleClaims = (spec: Spec) => spec.claims.filter((c) => c.status === 'confirmed');

/** Lines still waiting for the person in the studio. */
export const toConfirm = (spec: Spec) =>
  spec.claims.filter((c) => c.status === 'draft').length + (spec.headline?.status === 'draft' ? 1 : 0);

/**
 * What the public page gets when the person publishes: confirmed lines without the chat quotes
 * behind them, the headline only if it and every line it rests on are confirmed, and none of the
 * agent's notes.
 */
export function publishedSpec(spec: Spec): Spec {
  const claims = visibleClaims(spec).map((c) => ({ ...c, evidence: [] }));
  const ids = new Set(claims.map((c) => c.id));
  const h = spec.headline;
  const headline = h && h.status === 'confirmed' && h.claims.every((id) => ids.has(id)) ? h : null;
  return { rev: spec.rev, headline, order: spec.order, claims, notes: [] };
}

/** Lines grouped into the page's sections, in the person's order, with empty sections left out. */
export function sectionsOf(claims: Claim[], order: Section[]) {
  return order
    .map((section) => ({ section, claims: claims.filter((c) => SECTION_OF[c.layer] === section) }))
    .filter((s) => s.claims.length > 0);
}
