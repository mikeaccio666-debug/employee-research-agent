import { z } from 'zod';
import { LAYERS, LIMITS, SECTIONS, SECTION_LABEL, SECTION_OF, type Claim, type Evidence, type Spec } from '@/lib/portrait/spec';
import type { Source } from './sources';

// The tools the studio agent draws the portrait with (docs/agent-design.md §11.2, the step 2 cut).
// Every call is checked here before it touches the spec; a refused call comes back to the model
// as the tool's output in plain words so it can correct itself. Who the portrait belongs to is
// decided by the server session, never by an argument.

/**
 * Where evidence quotes may come from: the person's messages in this conversation, and the
 * résumés and links they shared.
 */
/** The person's messages: id, words, and when they were sent. */
export type Said = { id: number; text: string; at: string }[];
export type Grounds = { said: Said; sources: Source[] };

export type ToolResult = {
  spec: Spec;
  /** Sent back to the model. */
  output: string;
  /** For the thread's receipt and the canvas highlight; absent when nothing changed. */
  change?: { claimId?: string; note: string; dashed: boolean };
};

const nullableString = (max: number, description: string) => ({
  type: ['string', 'null'],
  maxLength: max,
  description,
});

/** JSON-schema definitions in the shape both OpenAI's and Anthropic's tool APIs take. */
export const TOOL_DEFS = [
  {
    name: 'upsert_claim',
    description:
      'Add one line to the portrait, or rewrite one you added earlier (pass its id). Every line rests on a quote from the person’s own messages or from a document they shared. New and rewritten lines are drafts until the person confirms them on the page.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'layer', 'kind', 'title', 'org', 'when', 'statement', 'basis', 'quote'],
      properties: {
        id: nullableString(24, 'The claim id to rewrite, or null for a new line.'),
        layer: {
          type: 'string',
          enum: [...LAYERS],
          description:
            'identity: school, year, location, availability. experience: one internship, project, role or activity. capability: a skill and how well. trait: how they work or what drives them. intent: what they are looking for. narrative: a one-line story the other lines support.',
        },
        kind: {
          type: 'string',
          maxLength: LIMITS.kind,
          description: 'A short tag: project, internship, research, club, skill, work_style, motivation, role_pref, location, availability …',
        },
        title: nullableString(LIMITS.title, 'For experience: its name ("Campus Marketplace"). Otherwise null.'),
        org: nullableString(LIMITS.org, 'For experience: where ("UC San Diego CSA"). Otherwise null.'),
        when: nullableString(LIMITS.when, 'For experience: when, as the person said it ("2025 — now"). Otherwise null.'),
        statement: {
          type: 'string',
          maxLength: LIMITS.statement,
          description:
            'The line as it reads on the page, in the page’s language (English unless the person asks otherwise). Specific, no filler; numbers, titles and scope exactly as the person said them.',
        },
        basis: {
          type: 'string',
          enum: ['stated', 'inferred'],
          description: 'stated: the person said it. inferred: you read it from their stories (skill levels, traits); say so when you tell them.',
        },
        quote: {
          type: 'string',
          maxLength: LIMITS.quote,
          description:
            'Words copied exactly, in their original language, from one of the person’s messages or from a <source> document they shared, that back this line. A short phrase is enough.',
        },
      },
    },
  },
  {
    name: 'remove_claim',
    description: 'Take a draft line off the portrait (one you added that turned out wrong). Confirmed lines are the person’s to remove.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['id'],
      properties: { id: { type: 'string', maxLength: 24 } },
    },
  },
  {
    name: 'set_headline',
    description:
      'Write the one-line headline under the name (≤ 12 English words): specific, no clichés, resting on lines already on the portrait. It is a draft until the person confirms it.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['text', 'claim_ids'],
      properties: {
        text: { type: 'string', maxLength: LIMITS.headline },
        claim_ids: { type: 'array', items: { type: 'string', maxLength: 24 }, minItems: 1, maxItems: 8 },
      },
    },
  },
  {
    name: 'move_section',
    description: 'Move a section of the page to a new position (0 is first), when the person asks.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['section', 'position'],
      properties: {
        section: { type: 'string', enum: [...SECTIONS] },
        position: { type: 'integer', minimum: 0, maximum: SECTIONS.length - 1 },
      },
    },
  },
] as const;

export type ToolName = (typeof TOOL_DEFS)[number]['name'];

const UpsertArgs = z.object({
  id: z.string().nullable(),
  layer: z.enum(LAYERS),
  kind: z.string().trim().min(1).max(LIMITS.kind),
  title: z.string().trim().max(LIMITS.title).nullable(),
  org: z.string().trim().max(LIMITS.org).nullable(),
  when: z.string().trim().max(LIMITS.when).nullable(),
  statement: z.string().trim().min(1).max(LIMITS.statement),
  basis: z.enum(['stated', 'inferred']),
  quote: z.string().trim().min(1).max(LIMITS.quote),
});
const RemoveArgs = z.object({ id: z.string() });
const HeadlineArgs = z.object({ text: z.string().trim().min(1).max(LIMITS.headline), claim_ids: z.array(z.string()).min(1).max(8) });
const MoveArgs = z.object({ section: z.enum(SECTIONS), position: z.number().int().min(0).max(SECTIONS.length - 1) });

// Quotes are matched loosely on case, spacing and curly quotes, never on wording.
const fold = (s: string) =>
  s
    .normalize('NFKC')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/** Where a quote was copied from (the person's newest message first, then their newest source), or null. */
export function findQuote(quote: string, { said, sources }: Grounds): Evidence | null {
  const q = fold(quote);
  if (!q) return null;
  for (let i = said.length - 1; i >= 0; i--) {
    if (fold(said[i]!.text).includes(q)) return { source: 'chat', messageId: said[i]!.id, quote };
  }
  for (let i = sources.length - 1; i >= 0; i--) {
    const s = sources[i]!;
    const page = s.pages.find((p) => fold(p.text).includes(q));
    if (page) return { source: s.kind, sourceId: s.id, page: page.page, quote };
  }
  return null;
}

const newId = () => `clm_${Math.random().toString(36).slice(2, 12).padEnd(10, '0')}`;

const label = (c: Pick<Claim, 'layer' | 'title' | 'statement'>) => {
  const section = SECTION_OF[c.layer];
  const where = section ? SECTION_LABEL[section] : 'Beside your name';
  return `${where} — ${c.title ?? truncate(c.statement, 48)}`;
};
const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

const refuse = (spec: Spec, why: string): ToolResult => ({ spec, output: `Not done: ${why}` });

function parseArgs<T>(schema: z.ZodType<T>, raw: string): T | string {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return 'the arguments were not valid JSON.';
  }
  const parsed = schema.safeParse(json);
  return parsed.success ? parsed.data : `invalid arguments (${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}).`;
}

/** Runs one tool call against the spec. Never throws for bad input; the model gets the reason. */
export function runTool(name: string, rawArgs: string, spec: Spec, grounds: Grounds, now = new Date()): ToolResult {
  const at = now.toISOString();
  switch (name) {
    case 'upsert_claim': {
      const args = parseArgs(UpsertArgs, rawArgs);
      if (typeof args === 'string') return refuse(spec, args);
      const evidence = findQuote(args.quote, grounds);
      if (!evidence) {
        return refuse(spec, 'the quote is not in the person’s messages or the documents they shared. Copy the words exactly, or ask them first.');
      }
      const fields = {
        layer: args.layer,
        kind: args.kind,
        title: args.title || null,
        org: args.org || null,
        when: args.when || null,
        statement: args.statement,
        basis: args.basis,
      };
      // A rejected line comes back only when the person asks for it again: the quote is from a
      // message they sent after rejecting it.
      const askedAgain = (c: Claim) => {
        const message = evidence.source === 'chat' ? grounds.said.find((m) => m.id === evidence.messageId) : undefined;
        return !!message && Date.parse(message.at) > Date.parse(c.updatedAt);
      };
      const NOT_AGAIN = 'the person rejected this line. Bring it back only if they ask for it again in a new message, quoting that message.';
      const same = args.id ? undefined : spec.claims.find((c) => fold(c.statement) === fold(args.statement));
      if (args.id || (same?.status === 'rejected' && askedAgain(same))) {
        const old = same ?? spec.claims.find((c) => c.id === args.id);
        if (!old) return refuse(spec, `there is no line ${args.id}.`);
        if (old.pinned) return refuse(spec, 'the person wrote this line themselves. Ask before changing it.');
        if (old.status === 'rejected' && !askedAgain(old)) return refuse(spec, NOT_AGAIN);
        const updated: Claim = {
          ...old,
          ...fields,
          // A changed line goes back to the person, even if they had confirmed the old wording.
          status: 'draft',
          evidence: [...old.evidence.filter((e) => e.quote !== evidence.quote), evidence].slice(-10),
          updatedAt: at,
        };
        const next = { ...spec, rev: spec.rev + 1, claims: spec.claims.map((c) => (c.id === old.id ? updated : c)) };
        return {
          spec: next,
          output: `Updated ${old.id}. It is a draft until the person confirms it.`,
          change: { claimId: old.id, note: `Changed ${label(updated)}`, dashed: true },
        };
      }
      if (same?.status === 'rejected') return refuse(spec, NOT_AGAIN);
      if (same) return refuse(spec, `this line is already on the portrait as ${same.id}. Pass that id to change it.`);
      if (spec.claims.length >= LIMITS.claims) return refuse(spec, 'the portrait is full. Remove or merge lines first.');
      const claim: Claim = { id: newId(), ...fields, status: 'draft', pinned: false, evidence: [evidence], createdBy: 'agent', updatedAt: at };
      return {
        spec: { ...spec, rev: spec.rev + 1, claims: [...spec.claims, claim] },
        output: `Added ${claim.id} as a draft. The person confirms it on the page.`,
        change: { claimId: claim.id, note: `Added to ${label(claim)}`, dashed: claim.basis === 'inferred' },
      };
    }
    case 'remove_claim': {
      const args = parseArgs(RemoveArgs, rawArgs);
      if (typeof args === 'string') return refuse(spec, args);
      const old = spec.claims.find((c) => c.id === args.id);
      if (!old) return refuse(spec, `there is no line ${args.id}.`);
      if (old.status !== 'draft' || old.pinned) {
        return refuse(spec, 'only draft lines you added can be removed. Ask the person to remove it on the page.');
      }
      const headline = spec.headline?.claims.includes(old.id) ? null : spec.headline;
      return {
        spec: { ...spec, rev: spec.rev + 1, headline, claims: spec.claims.filter((c) => c.id !== old.id) },
        output: `Removed ${old.id}.${headline === spec.headline ? '' : ' The headline rested on it and was removed too.'}`,
        change: { note: `Removed ${label(old)}`, dashed: false },
      };
    }
    case 'set_headline': {
      const args = parseArgs(HeadlineArgs, rawArgs);
      if (typeof args === 'string') return refuse(spec, args);
      const missing = args.claim_ids.filter((id) => !spec.claims.some((c) => c.id === id && c.status !== 'rejected'));
      if (missing.length) return refuse(spec, `these lines aren’t on the portrait: ${missing.join(', ')}.`);
      if (args.text.split(/\s+/).length > 14) return refuse(spec, 'keep the headline to 12 words or fewer.');
      return {
        spec: { ...spec, rev: spec.rev + 1, headline: { text: args.text, claims: args.claim_ids, status: 'draft' } },
        output: 'Headline set as a draft. The person confirms it on the page.',
        change: { note: `Headline — ${truncate(args.text, 48)}`, dashed: true },
      };
    }
    case 'move_section': {
      const args = parseArgs(MoveArgs, rawArgs);
      if (typeof args === 'string') return refuse(spec, args);
      const order = spec.order.filter((s) => s !== args.section);
      order.splice(args.position, 0, args.section);
      return {
        spec: { ...spec, rev: spec.rev + 1, order },
        output: `Moved ${args.section} to position ${args.position}.`,
        change: { note: `${SECTION_LABEL[args.section]} moved to position ${args.position + 1}`, dashed: false },
      };
    }
    default:
      return refuse(spec, `there is no tool called ${name}.`);
  }
}

/** The portrait as the model sees it at the start of each turn: compact, ids included. */
export function snapshot(spec: Spec): string {
  const lines = spec.claims.map((c) => {
    const where = [c.title, c.org, c.when].filter(Boolean).join(' · ');
    const flags = [c.status, c.basis, c.pinned ? 'pinned' : null].filter(Boolean).join(', ');
    return `- ${c.id} [${c.layer}/${c.kind}; ${flags}]${where ? ` ${where}:` : ''} ${c.statement}`;
  });
  return [
    'The portrait right now (rejected lines are kept so you don’t propose them again unless the person asks):',
    `Headline: ${spec.headline ? `${spec.headline.text} (${spec.headline.status})` : 'none yet'}`,
    `Section order: ${spec.order.join(', ')}`,
    lines.length ? lines.join('\n') : '(no lines yet)',
  ].join('\n');
}
