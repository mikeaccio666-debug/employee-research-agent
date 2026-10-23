import type { Claim, Headline, Spec } from './spec';

// The portrait's version history (PRD STU-10): portraits_versions keeps the spec after every
// change (supabase/migrations/20261025000000_portrait_versions.sql). These read two neighbouring
// versions as one change, say it in a line, and take it back without touching later changes.

export type MadeBy = 'agent' | 'person' | 'undo';

export type Version = { id: number; rev: number; madeBy: MadeBy; at: string; spec: Spec };

/** One version as the studio lists it: what changed, and whether it can be undone on its own. */
export type VersionEntry = { id: number; rev: number; madeBy: MadeBy; at: string; summary: string; undoable: boolean };

// Key order differs between jsonb and the parsed spec, so compare with sorted keys.
const canon = (v: unknown): string =>
  v === null || v === undefined
    ? 'null'
    : Array.isArray(v)
      ? `[${v.map(canon).join(',')}]`
      : typeof v === 'object'
        ? `{${Object.keys(v)
            .sort()
            .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
            .map((k) => `${JSON.stringify(k)}:${canon((v as Record<string, unknown>)[k])}`)
            .join(',')}}`
        : JSON.stringify(v);
const same = (a: unknown, b: unknown) => canon(a) === canon(b);

const byId = (claims: Claim[]) => new Map(claims.map((c) => [c.id, c]));

// The parts of a line its page shows; the person's answer is counted apart.
const wording = (c: Claim) => [c.statement, c.title, c.org, c.when, c.layer, c.kind];

const quote = (text: string) => `“${text.length > 48 ? `${text.slice(0, 47)}…` : text}”`;

/** What happened between two versions, in a short line ("Added 2 lines · confirmed “Led …”"). */
export function describeChange(before: Spec | null, after: Spec): string {
  const was = byId(before?.claims ?? []);
  const now = byId(after.claims);
  const added: Claim[] = [];
  const reworded: Claim[] = [];
  const confirmed: Claim[] = [];
  const rejected: Claim[] = [];
  const removed: Claim[] = [];
  for (const c of after.claims) {
    const old = was.get(c.id);
    if (!old) added.push(c);
    else {
      if (!same(wording(old), wording(c))) reworded.push(c);
      // A line the person rewrote is confirmed by the rewrite; saying both would repeat it.
      else if (old.status !== c.status && c.status === 'confirmed') confirmed.push(c);
      if (old.status !== c.status && c.status === 'rejected') rejected.push(c);
    }
  }
  for (const c of before?.claims ?? []) if (!now.has(c.id)) removed.push(c);

  const parts: string[] = [];
  const say = (verb: string, list: Claim[]) => {
    if (list.length === 1) parts.push(`${verb} ${quote(list[0]!.statement)}`);
    else if (list.length > 1) parts.push(`${verb} ${list.length} lines`);
  };
  say('Added', added);
  say('Reworded', reworded);
  say('Confirmed', confirmed);
  say('Removed', [...rejected, ...removed]);
  const h0 = before?.headline ?? null;
  const h1 = after.headline;
  if (!same(h0?.text, h1?.text)) parts.push(h1 ? `Headline ${quote(h1.text)}` : 'Removed the headline');
  else if (h0 && h1 && h0.status !== h1.status && h1.status === 'confirmed') parts.push('Confirmed the headline');
  if (!same(before?.order, after.order)) parts.push('Reordered sections');
  return parts.length ? parts.join(' · ') : 'Small change';
}

/**
 * Takes back one change (from `before` to `after`) out of the current spec, leaving every later
 * change alone: a line or the headline only goes back when it is still exactly as that change
 * left it. `skipped` counts the parts that changed again since, which stay as they are now.
 */
export function revertChange(before: Spec | null, after: Spec, current: Spec): { spec: Spec; skipped: number } {
  const was = byId(before?.claims ?? []);
  const then = byId(after.claims);
  let skipped = 0;

  // Every line the change touched: added, changed or removed.
  const touched = new Set<string>();
  for (const c of after.claims) if (!same(was.get(c.id), c)) touched.add(c.id);
  for (const c of before?.claims ?? []) if (!then.has(c.id)) touched.add(c.id);

  let claims = [...current.claims];
  for (const id of touched) {
    const left = then.get(id);
    const at = claims.findIndex((c) => c.id === id);
    const now = at >= 0 ? claims[at] : undefined;
    if (!same(now, left)) {
      skipped++;
      continue;
    }
    const back = was.get(id);
    if (back && at >= 0) claims[at] = back;
    else if (back) claims.push(back);
    else claims = claims.filter((c) => c.id !== id);
  }

  let headline: Headline | null = current.headline;
  if (!same(before?.headline, after.headline)) {
    if (same(current.headline, after.headline)) headline = before?.headline ?? null;
    else skipped++;
  }
  // A headline never rests on a line that is gone or turned down.
  const kept = new Set(claims.filter((c) => c.status !== 'rejected').map((c) => c.id));
  if (headline && !headline.claims.every((id) => kept.has(id))) headline = null;

  let order = current.order;
  if (!same(before?.order, after.order)) {
    if (same(current.order, after.order) && before) order = before.order;
    else if (before) skipped++;
  }

  return { spec: { ...current, rev: current.rev + 1, claims, headline, order }, skipped };
}

/** Brings the page back to an earlier version; the agent's notes and the search preferences stay. */
export function restoreVersion(version: Spec, current: Spec): Spec {
  return { ...current, rev: current.rev + 1, claims: version.claims, headline: version.headline, order: version.order };
}

/** The list the studio shows, newest first. The oldest kept version has nothing to undo against. */
export function entries(versions: Version[]): VersionEntry[] {
  const oldestFirst = [...versions].sort((a, b) => a.id - b.id);
  return oldestFirst
    .map((v, i) => {
      const prev = i > 0 ? oldestFirst[i - 1]!.spec : null;
      return {
        id: v.id,
        rev: v.rev,
        madeBy: v.madeBy,
        at: v.at,
        summary: i === 0 ? 'Earliest kept version' : describeChange(prev, v.spec),
        undoable: i > 0,
      };
    })
    .reverse();
}
