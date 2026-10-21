import { visibleClaims, type Claim, type Spec } from '@/lib/portrait/spec';

// The résumé made from a portrait (PRD COACH-01): a plain, single-column document an applicant
// tracking system can read. Only confirmed lines go on it, in the person's own wording; a résumé
// the agent tailored for a role picks and orders those lines, nothing more. Work authorization,
// notes and search preferences never reach it.

export type ResumeEntry = {
  /** "Campus Marketplace" */
  title: string | null;
  /** "UC San Diego CSA" */
  org: string | null;
  /** "2025 — now" */
  when: string | null;
  bullets: string[];
};

export type ResumeSection = { heading: string; entries: ResumeEntry[] };

export type Resume = {
  name: string;
  /** Email, page link: whatever the person can be reached at. */
  contact: string[];
  /** The confirmed headline, if any. */
  summary: string | null;
  /** The role it was tailored for, or null for the full résumé. */
  target: string | null;
  sections: ResumeSection[];
};

const PROJECT = /^(project|side_project|hackathon|portfolio|open_source)$/;
const ACTIVITY = /^(club|activity|volunteer|leadership|society|competition|teaching|ta)$/;

/** Which résumé section an experience line belongs in, by its kind. */
const sectionOf = (c: Claim) => (PROJECT.test(c.kind) ? 'Projects' : ACTIVITY.test(c.kind) ? 'Activities' : 'Experience');

const ORDER = ['Summary', 'Experience', 'Projects', 'Activities', 'Skills', 'Background'];

/**
 * The résumé for a portrait. `plan` is the agent's selection for one role (its order wins inside
 * each section); without one, every confirmed line goes on in the portrait's order.
 */
export function resumeFrom(spec: Spec, who: { name: string; contact: string[] }, tailored = false): Resume {
  const confirmed = visibleClaims(spec);
  const plan = tailored ? spec.resume : null;
  const lines = plan ? plan.claims.map((id) => confirmed.find((c) => c.id === id)).filter((c): c is Claim => !!c) : confirmed;

  const sections = new Map<string, ResumeEntry[]>();
  const add = (heading: string, entry: ResumeEntry) => sections.set(heading, [...(sections.get(heading) ?? []), entry]);

  const narrative = lines.filter((c) => c.layer === 'narrative').map((c) => c.statement);
  for (const c of lines) {
    if (c.layer === 'experience') add(sectionOf(c), { title: c.title, org: c.org, when: c.when, bullets: [c.statement] });
  }
  const skills = lines.filter((c) => c.layer === 'capability').map((c) => c.statement);
  if (skills.length) add('Skills', { title: null, org: null, when: null, bullets: skills });
  const background = lines.filter((c) => c.layer === 'identity').map((c) => c.statement);
  if (background.length) add('Background', { title: null, org: null, when: null, bullets: background });
  if (narrative.length) add('Summary', { title: null, org: null, when: null, bullets: narrative });

  // The headline only when it and the lines it rests on are confirmed, as on the published page.
  const h = spec.headline;
  const summary = h && h.status === 'confirmed' && h.claims.every((id) => confirmed.some((c) => c.id === id)) ? h.text : null;

  return {
    name: who.name,
    contact: who.contact.filter(Boolean),
    summary,
    target: plan?.target ?? null,
    sections: ORDER.filter((heading) => sections.has(heading)).map((heading) => ({ heading, entries: sections.get(heading)! })),
  };
}

/** The résumé as plain text: what the PDF holds, for tests and for the agent to check. */
export function resumeText(r: Resume): string {
  const out = [r.name, r.contact.join(' · ')];
  if (r.summary) out.push('', r.summary);
  for (const s of r.sections) {
    out.push('', s.heading.toUpperCase());
    for (const e of s.entries) {
      const head = [e.title, e.org].filter(Boolean).join(', ');
      if (head || e.when) out.push([head, e.when].filter(Boolean).join(' — '));
      for (const b of e.bullets) out.push(`• ${b}`);
    }
  }
  return out.filter((l, i) => l || out[i - 1]).join('\n');
}
