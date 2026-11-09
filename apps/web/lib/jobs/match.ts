import type { Claim, Preferences, Spec } from '@/lib/portrait/spec';
import type { EmploymentType, JobPosting } from './types';

// Job recommendations v0 (docs/jobs.md): which postings fit a person, and why, read only from what
// they confirmed in the studio and the preferences the agent saved. No model call, so it costs
// nothing and runs on every page load. The rule the portrait follows holds here too: every reason
// points at something real, a line the person confirmed and the words in the posting it matched,
// so a reason can always be checked and never says more than both texts do.

export const DISMISS_REASONS = ['role', 'seniority', 'location', 'company', 'pay', 'other'] as const;
export type DismissReason = (typeof DISMISS_REASONS)[number];
export const JOB_ACTIONS = ['saved', 'dismissed', 'applied'] as const;
export type JobAction = (typeof JOB_ACTIONS)[number];

/** What the person did with a posting before (job_actions). */
export type Feedback = { jobId: string; action: JobAction; reason: DismissReason | null; company: string };

export type Reason =
  /** The title is a role they said they're looking for, or close to one (`close`: most of its words). */
  | { kind: 'role'; role: string; close: boolean }
  /** A confirmed line of theirs, and the words of the posting it matched. */
  | { kind: 'claim'; claimId: string; statement: string; term: string; quote: string }
  /** It fits a preference: remote, internship, a city. */
  | { kind: 'pref'; text: string };

export type Recommendation = {
  job: JobPosting;
  score: number;
  reasons: Reason[];
  /** Something to check before applying, quoted from the posting. */
  caution: string | null;
  action: JobAction | null;
};

export type Recommendations = {
  items: Recommendation[];
  /** Postings their preferences ruled out (type, place, work mode). */
  filteredOut: number;
  /** Nothing to match on yet: no confirmed lines and no roles. */
  needsPortrait: boolean;
};

const STOP = new Set(
  `a an and are as at be been but by can could did do does for from had has have he her his how i if in into is it its me my of on or our out over she so than that the their them then there these they this those to too up us very was we were what when where which who why will with would you your
  about across after all also am any around because before being both each etc every few further get got just many more most much must new no not now off once one only other own per same should since some such through under until upon via while within without yet
  able ability work worked working works team teams role roles job jobs company companies years year time help helped helping make made using use used based lead led part including well strong good great best high highly across various multiple different day week month first new real
  experience experienced skills skill knowledge looking responsible responsibilities requirements required preferred plus bonus opportunity opportunities candidate candidates people person
  hours hour saving save saved minutes days weeks months monthly weekly daily quarterly test testing tests science business process processes support stakeholders cross functional
  student students intern interns internship internships graduate graduating university college degree senior junior manager managers lead analysis model models drop cut built build building led owned own`
    .split(/\s+/)
    .filter(Boolean),
);
/** Short words that do carry meaning in a posting. */
const SHORT = new Set(['sql', 'aws', 'gcp', 'api', 'ios', 'go', 'ai', 'ml', 'ux', 'ui', 'bi', 'qa', 'r', 'c', 'c++', 'c#', 'etl', 'seo', 'crm', 'erp', 'gtm', 'b2b', 'saas', 'cpa', 'cfa', 'phd', 'mba', 'llm', 'nlp', 'gpu', 'pm']);

const words = (s: string) => s.toLowerCase().match(/[a-z0-9][a-z0-9+#.]*[a-z0-9+#]|[a-z0-9]/g) ?? [];
const meaningful = (w: string) => !STOP.has(w) && !/^\d+$/.test(w) && (w.length >= 3 || SHORT.has(w));
/** "engineers" and "engineering" meet "engineer"; "analytics" meets "analytic". Enough for titles. */
// Plural, then -ing, then -er, in turn, so all of engineer, engineers and engineering end at "engine".
const stem = (w: string) => {
  const x = w.replace(/s$/, '').replace(/ing$/, '').replace(/er$/, '');
  return x.length >= 3 ? x : w;
};

/** Single words and two-word phrases, as found in a text. */
function terms(text: string): Set<string> {
  const ws = words(text);
  const out = new Set<string>();
  ws.forEach((w, i) => {
    if (!meaningful(w)) return;
    out.add(w);
    const next = ws[i + 1];
    if (next !== undefined && meaningful(next)) out.add(`${w} ${next}`);
  });
  return out;
}

type Indexed = { job: JobPosting; terms: Set<string>; titleStems: Set<string>; text: string };
// `terms` and `text` are the description's: a title says what the job is (that's the role), the
// description says what it needs (that's where their lines should meet it).
type Catalog = { jobs: Indexed[]; df: Map<string, number> };
const catalogs = new WeakMap<JobPosting[], Catalog>();

/** Each posting's terms, and in how many postings each term occurs: rare words say more. */
function index(jobs: JobPosting[]): Catalog {
  const hit = catalogs.get(jobs);
  if (hit) return hit;
  const df = new Map<string, number>();
  const indexed = jobs.map((job) => {
    const text = job.description;
    const t = terms(text);
    for (const w of t) df.set(w, (df.get(w) ?? 0) + 1);
    return { job, terms: t, titleStems: new Set(words(job.title).map(stem)), text };
  });
  const catalog = { jobs: indexed, df };
  catalogs.set(jobs, catalog);
  return catalog;
}

const ABBREVIATIONS: Record<string, string> = {
  swe: 'software engineer',
  sde: 'software engineer',
  pm: 'product manager',
  apm: 'product manager',
  ds: 'data scientist',
  da: 'data analyst',
  mle: 'machine learning engineer',
  ml: 'machine learning',
  ux: 'ux designer',
  ui: 'ui designer',
  qa: 'quality engineer',
  sre: 'site reliability engineer',
  bd: 'business development',
};
/** Words a role name can drop: levels and filler. "Manager" or "intern" define the role, so they stay. */
const ROLE_STOP = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'for', 'in', 'at', 'to', 'senior', 'sr', 'junior', 'jr', 'i', 'ii', 'iii', 'iv', 'role', 'roles', 'job', 'position']);
const roleWords = (role: string) =>
  words(ABBREVIATIONS[role.trim().toLowerCase()] ?? role)
    .flatMap((w) => words(ABBREVIATIONS[w] ?? w))
    .filter((w) => !ROLE_STOP.has(w))
    .map(stem);

/** 1: every word of the role is in the title; 0.5: most are, including its last ("analyst"). */
function roleFit(role: string, title: Set<string>): number {
  const ws = roleWords(role);
  if (!ws.length) return 0;
  const found = ws.filter((w) => title.has(w)).length;
  if (found === ws.length) return 1;
  return found / ws.length >= 0.5 && title.has(ws.at(-1)!) ? 0.5 : 0;
}

/** The sentence of the posting a term sits in, cut to fit a card. */
export function quoteAround(text: string, term: string, max = 180): string | null {
  const lower = text.toLowerCase();
  const re = new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9+#])`, 'i');
  const m = re.exec(lower);
  if (!m) return null;
  const at = m.index + (m[1]?.length ?? 0);
  const start = Math.max(0, ...['.', '\n', '•', ';'].map((c) => lower.lastIndexOf(c, at) + 1));
  const ends = ['.', '\n', '•', ';'].map((c) => lower.indexOf(c, at + term.length)).filter((i) => i >= 0);
  const end = ends.length ? Math.min(...ends) : text.length;
  let quote = text.slice(start, end).trim();
  if (quote.length > max) {
    const from = Math.max(0, at - start - Math.floor((max - term.length) / 2));
    quote = `${from > 0 ? '…' : ''}${quote.slice(from, from + max).trim()}…`;
  }
  return quote;
}

const LOCATION_ALIASES: Record<string, string[]> = {
  us: ['united states', 'usa', 'us'],
  usa: ['united states', 'usa', 'us'],
  'united states': ['united states', 'usa', 'us'],
  美国: ['united states', 'usa', 'us'],
  uk: ['united kingdom', 'london', 'uk', 'gb'],
  英国: ['united kingdom', 'london', 'uk', 'gb'],
  加拿大: ['canada'],
  纽约: ['new york', 'nyc'],
  nyc: ['new york', 'nyc'],
  旧金山: ['san francisco'],
  sf: ['san francisco'],
  西雅图: ['seattle'],
  波士顿: ['boston'],
  洛杉矶: ['los angeles'],
  伦敦: ['london'],
  新加坡: ['singapore'],
  'bay area': ['san francisco', 'palo alto', 'mountain view', 'san jose', 'sunnyvale', 'redwood city', 'menlo park', 'san mateo', 'oakland', 'los altos', 'foster city', 'south san francisco', 'bay area'],
  湾区: ['san francisco', 'palo alto', 'mountain view', 'san jose', 'sunnyvale', 'redwood city', 'menlo park', 'san mateo', 'oakland', 'los altos', 'foster city', 'south san francisco', 'bay area'],
};
const COUNTRY_OF: Record<string, string> = { 'united states': 'US', usa: 'US', us: 'US', 'united kingdom': 'GB', uk: 'GB', gb: 'GB', canada: 'CA' };

function placeFits(job: JobPosting, place: string): boolean {
  const p = place.trim().toLowerCase();
  const names = LOCATION_ALIASES[p] ?? [p];
  return job.locations.some((l) => {
    const where = `${l.as_published} ${l.city ?? ''} ${l.region ?? ''}`.toLowerCase();
    return names.some((n) => (n.length <= 3 ? new RegExp(`\\b${n}\\b`).test(where) : where.includes(n)) || (COUNTRY_OF[n] && l.country === COUNTRY_OF[n]));
  });
}

const TYPE_OF: Record<Preferences['jobTypes'][number], EmploymentType[]> = {
  internship: ['internship'],
  'full-time': ['full_time'],
  'part-time': ['part_time'],
  contract: ['contract', 'temporary'],
};
const MODE_OF: Record<Preferences['workModes'][number], JobPosting['workplace_type']> = { onsite: 'on_site', hybrid: 'hybrid', remote: 'remote' };
const MODE_LABEL: Record<JobPosting['workplace_type'], string> = { on_site: 'On site', hybrid: 'Hybrid', remote: 'Remote', unknown: '' };

const SENIOR = /\b(senior|sr\.?|staff|principal|lead|director|head of|vp|vice president|manager|architect)\b/i;
const EARLY = /\b(intern|internship|new grad|graduate|junior|entry[- ]level|associate|early career|apprentice|university)\b/i;
const STUDENT = /\b(student|graduat|university|college|bootcamp|class of|undergrad|master'?s|phd candidate)/i;
const NO_SPONSOR = /(not |in)eligible for (visa |immigration )?sponsorship|(not|unable to|cannot|can't|won't|will not|does not|do not)\s+(be able to\s+)?(offer|provide|support|sponsor)[^.\n]{0,40}(sponsor|visa)|without (the need for )?(current or future )?(visa )?sponsorship|no (visa )?sponsorship/i;
const NEEDS_SPONSOR = /sponsor|visa|f-?1|\bopt\b|\bcpt\b|h-?1b|\bstem\b|担保|签证/i;
// They said they need none ("no sponsorship needed", "don't require sponsorship", 不需要).
const NEGATED_NEED = /\b(don'?t|doesn'?t|won'?t|do not|does not|will not|not)\s+(need|require)[^.,;]{0,15}sponsor|\b(no|without)\b[^.,;]{0,15}sponsor|sponsorship (is )?not (needed|required)|不需要|无需/i;
// A status that needs none, but only when it is affirmative and about the US ("Not a US citizen" or "Indian citizen" is not).
const AUTHORIZED = /green card|permanent resident|\b(u\.?s\.?|american)\s+citizen|绿卡|美国公民/i;
const NOT_AUTHORIZED = /\bnot\s+(an?\s+)?((u\.?s\.?|american)\s+)?(citizen|green card|permanent resident)|非美国公民|没有绿卡/i;
// Words that say sponsorship is needed; these win over a status line.
const EXPLICIT_NEED = /\bf-?1\b|\bh-?1b\b|\bopt\b|\bcpt\b|\bneeds?\b[^.,;]{0,15}sponsor|\brequires?\b[^.,;]{0,15}sponsor|需要(签证|担保)/i;
function needsSponsorship(workAuth: string | null | undefined): boolean {
  if (!workAuth || !NEEDS_SPONSOR.test(workAuth) || NEGATED_NEED.test(workAuth)) return false;
  if (EXPLICIT_NEED.test(workAuth)) return true;
  return !(AUTHORIZED.test(workAuth) && !NOT_AUTHORIZED.test(workAuth));
}

/** Confirmed lines worth matching: what they did and can do, not what they want. */
const matchable = (c: Claim) => c.status === 'confirmed' && c.layer !== 'intent';

export function recommend(
  spec: Spec,
  jobs: JobPosting[],
  feedback: Feedback[],
  opts: { now: Date; limit?: number },
): Recommendations {
  const prefs = spec.preferences;
  const claims = spec.claims.filter(matchable);
  const catalog = index(jobs);
  const n = Math.max(catalog.jobs.length, 1);
  const idf = (t: string) => Math.log(n / Math.max(catalog.df.get(t) ?? 1, 1));
  // A term in more than a quarter of postings ("product", "data") says too little to cite.
  const rare = (t: string) => (catalog.df.get(t) ?? 0) > 0 && (catalog.df.get(t) ?? 0) <= n / 5;

  // What they did, not titles they held (a title meets titles: that's the role) or who they are
  // ("student" is in every internship).
  const claimTerms = claims.filter((c) => c.layer !== 'identity').map((c) => ({ claim: c, terms: [...terms(c.statement)].filter(rare) }));
  const roles = prefs.roles.length ? prefs.roles : [];
  // Without roles, the titles they held hint at what they'd do next, weighed less.
  const pastTitles = roles.length ? [] : [...new Set(claims.filter((c) => c.layer === 'experience' && c.title).map((c) => c.title!))];
  const early = prefs.jobTypes.includes('internship') || claims.some((c) => (c.layer === 'identity' || c.layer === 'experience') && STUDENT.test(c.statement));
  const needsSponsor = needsSponsorship(prefs.workAuth);

  const byJob = new Map(feedback.map((f) => [f.jobId, f]));
  const hiddenCompanies = new Set(feedback.filter((f) => f.action === 'dismissed' && f.reason === 'company').map((f) => f.company.toLowerCase()));
  const allowedTypes = prefs.jobTypes.flatMap((t) => TYPE_OF[t]);
  const placePrefs = prefs.locations.filter((l) => !/^remote$|^远程$/i.test(l.trim()));
  const saidRemote = prefs.locations.length > placePrefs.length;
  // "Remote" given as their only place means remote only, not anywhere.
  const allowedModes: JobPosting['workplace_type'][] = prefs.workModes.length
    ? prefs.workModes.map((m) => MODE_OF[m])
    : saidRemote && !placePrefs.length
      ? ['remote']
      : [];
  const remoteOk = !allowedModes.length || allowedModes.includes('remote') || saidRemote;

  let filteredOut = 0;
  const items: Recommendation[] = [];
  for (const { job, terms: jobTerms, titleStems, text } of catalog.jobs) {
    const fb = byJob.get(job.id);
    if (fb?.action === 'dismissed' || hiddenCompanies.has(job.company.name.toLowerCase())) continue;

    const type = job.employment_type.normalized;
    const mode = job.workplace_type;
    const typeOk = !allowedTypes.length || type === 'unknown' || allowedTypes.includes(type);
    const modeOk = !allowedModes.length || mode === 'unknown' || allowedModes.includes(mode);
    const placeOk = !placePrefs.length || placePrefs.some((p) => placeFits(job, p)) || (mode === 'remote' && remoteOk);
    if (!typeOk || !modeOk || !placeOk) {
      filteredOut++;
      continue;
    }

    const reasons: Reason[] = [];
    let score = 0;

    let roleFitted = 0;
    const role = roles.map((r) => ({ r, fit: roleFit(r, titleStems) })).sort((a, b) => b.fit - a.fit)[0];
    if (role && role.fit > 0) {
      roleFitted = role.fit;
      score += 40 * role.fit;
      reasons.push({ kind: 'role', role: role.r, close: role.fit < 1 });
    } else {
      const past = pastTitles.map((t) => ({ t, fit: roleFit(t, titleStems) })).sort((a, b) => b.fit - a.fit)[0];
      if (past && past.fit > 0) {
        roleFitted = past.fit;
        score += 15 * past.fit;
        reasons.push({ kind: 'role', role: past.t, close: past.fit < 1 });
      }
    }

    // Each confirmed line counts once, by its rarest word the posting shares; the best three count.
    const claimHits = claimTerms
      .map(({ claim, terms: ts }) => {
        // A two-word phrase ("data science") says more than either word.
        const weight = (t: string) => idf(t) * (t.includes(' ') ? 1.5 : 1);
        const best = ts.filter((t) => jobTerms.has(t)).sort((a, b) => weight(b) - weight(a) || b.length - a.length)[0];
        return best ? { claim, term: best, weight: weight(best) } : null;
      })
      .filter((h): h is NonNullable<typeof h> => h !== null)
      .sort((a, b) => b.weight - a.weight);
    for (const h of claimHits.slice(0, 3)) score += Math.min(14, h.weight * 3);
    for (const h of claimHits.slice(0, 2)) {
      const quote = quoteAround(text, h.term);
      if (quote) reasons.push({ kind: 'claim', claimId: h.claim.id, statement: h.claim.statement, term: h.term, quote });
    }

    // Nothing of theirs in it: not a recommendation, however fresh. When they named roles, a
    // posting for another role needs two of their lines in it to stay.
    if (!reasons.length) continue;
    if (roles.length && !roleFitted) {
      if (claimHits.length < 2) continue;
      score -= 15;
    }

    if (early) {
      if (SENIOR.test(job.title) && !EARLY.test(job.title)) score -= 30;
      else if (EARLY.test(job.title) && (roleFitted || !roles.length)) {
        score += 10;
        reasons.push({ kind: 'pref', text: 'Early-career role' });
      }
    }
    if (allowedModes.length && mode !== 'unknown') reasons.push({ kind: 'pref', text: `${MODE_LABEL[mode]}, as you asked` });
    else if (placePrefs.length) {
      const p = placePrefs.find((x) => placeFits(job, x));
      if (p) reasons.push({ kind: 'pref', text: `In ${p}, where you want to be` });
    }
    if (allowedTypes.length && type !== 'unknown') reasons.push({ kind: 'pref', text: type === 'internship' ? 'An internship, as you asked' : 'The kind of job you asked for' });

    const posted = job.posted_at ? Date.parse(job.posted_at) : NaN;
    const ageDays = Number.isNaN(posted) ? null : (opts.now.getTime() - posted) / 86_400_000;
    if (ageDays !== null && ageDays <= 14) score += 8;
    else if (ageDays !== null && ageDays <= 30) score += 4;
    // Still open, but up for half a year or more: often an evergreen posting with less behind it.
    else if (ageDays !== null && ageDays > 180) score -= 5;
    if (job.salary.some((s) => s.min !== null || s.as_published)) score += 2;

    let caution: string | null = null;
    if (needsSponsor) {
      const m = NO_SPONSOR.exec(text);
      if (m) caution = `It may not sponsor a visa: “${quoteAround(text, m[0].toLowerCase()) ?? m[0]}”`;
    }

    items.push({ job, score: Math.round(score), reasons: reasons.slice(0, 3), caution, action: fb?.action ?? null });
  }

  items.sort((a, b) => b.score - a.score || (b.job.posted_at ?? '').localeCompare(a.job.posted_at ?? ''));
  // The same role posted for several cities shows once, at its best place.
  const seen = new Set<string>();
  const unique = items.filter((i) => {
    const key = `${i.job.company.name}\n${i.job.title}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return {
    items: unique.slice(0, opts.limit ?? 30),
    filteredOut,
    needsPortrait: !claims.length && !roles.length,
  };
}
