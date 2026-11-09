// Builds lib/jobs/sample-jobs.json: a sample job catalog for the Jobs page until talent-data-hub's
// read API is live (docs/jobs.md). It reads postings that talent-data-hub already recorded from
// employers' own job boards (its connector fixtures), so this script makes no network request.
//
//   node scripts/jobs-sample.mjs /path/to/talent-data-hub
//
// Output follows lib/jobs/types.ts (JobPosting), the consumer view of talent-data-hub's JobRecord v1.
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const hub = process.argv[2];
if (!hub || !existsSync(join(hub, 'packages/connectors'))) {
  console.error('usage: node scripts/jobs-sample.mjs /path/to/talent-data-hub');
  process.exit(1);
}
const out = join(dirname(fileURLToPath(import.meta.url)), '../lib/jobs/sample-jobs.json');
const DESCRIPTION_CHARS = 3000;

// Boards in the sample, with the employer's name and domain as they publish them.
const BOARDS = [
  { system: 'greenhouse', tenant: 'billcom', company: 'BILL', domain: 'bill.com' },
  { system: 'greenhouse', tenant: 'intercom', company: 'Intercom', domain: 'intercom.com' },
  { system: 'greenhouse', tenant: 'newsbreak', company: 'NewsBreak', domain: 'newsbreak.com' },
  { system: 'greenhouse', tenant: 'psiquantum', company: 'PsiQuantum', domain: 'psiquantum.com' },
  { system: 'ashby', tenant: 'ramp', company: 'Ramp', domain: 'ramp.com' },
  { system: 'ashby', tenant: 'sierra', company: 'Sierra', domain: 'sierra.ai' },
  { system: 'ashby', tenant: 'skydio', company: 'Skydio', domain: 'skydio.com' },
  { system: 'lever', tenant: 'palantir', company: 'Palantir', domain: 'palantir.com' },
  { system: 'lever', tenant: 'tri', company: 'Toyota Research Institute', domain: 'tri.global' },
];

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–', hellip: '…', bull: '•' };
const decode = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENTITIES[e.toLowerCase()] ?? m;
  });
const text = (html) =>
  decode(
    decode(html ?? '')
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<\/(p|div|li|h[1-6]|ul|ol|br)>|<br\s*\/?>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
const cap = (s) => (s.length > DESCRIPTION_CHARS ? `${s.slice(0, DESCRIPTION_CHARS).replace(/\s+\S*$/, '')} …` : s);

const COUNTRY = { US: 'US', USA: 'US', 'United States': 'US', Canada: 'CA', UK: 'GB', 'United Kingdom': 'GB', GB: 'GB', Ireland: 'IE', Germany: 'DE', France: 'FR', Japan: 'JP', Australia: 'AU', Singapore: 'SG', 'South Korea': 'KR', India: 'IN', Netherlands: 'NL', Spain: 'ES', Switzerland: 'CH', Israel: 'IL' };
function location(asPublished, country = null) {
  const parts = asPublished.split(',').map((p) => p.trim()).filter(Boolean);
  // "San Francisco, CA" is a US state code, not Canada.
  const region = parts.length >= 2 && /^[A-Z]{2}$/.test(parts[1]) ? parts[1] : null;
  const named = COUNTRY[parts.at(-1)] ?? null;
  const c = country ? (COUNTRY[country] ?? (country.length === 2 ? country.toUpperCase() : null)) : named;
  return { as_published: asPublished, country: c ?? (region ? 'US' : null), region, city: parts.length >= 2 ? parts[0] : null };
}
const workplace = (s) => {
  const v = String(s ?? '').toLowerCase();
  return v.includes('remote') ? 'remote' : v.includes('hybrid') ? 'hybrid' : v.includes('site') || v === 'onsite' ? 'on_site' : 'unknown';
};
const employment = (s) => {
  const v = String(s ?? '').toLowerCase().replace(/[^a-z]/g, '');
  const normalized = v.includes('intern') ? 'internship' : v.includes('full') ? 'full_time' : v.includes('part') ? 'part_time' : v.includes('contract') ? 'contract' : v.includes('temp') ? 'temporary' : 'unknown';
  return { as_published: s ? String(s) : null, normalized };
};
// A pay range written in the text ("$211.4K – $290.6K", "$45 and $65/hour"). Never estimated.
function salaryFrom(published) {
  if (!published) return [];
  const m = published.match(/\$\s?([\d,.]+)\s?([kK])?\s*(?:–|-|to|and)\s*\$\s?([\d,.]+)\s?([kK])?/);
  if (!m) return [{ as_published: published, min: null, max: null, currency: null, period: null, source: 'description_text' }];
  const n = (v, k) => Number(v.replace(/,/g, '')) * (k ? 1000 : 1);
  const min = n(m[1], m[2]);
  const max = n(m[3], m[4] ?? m[2]);
  const period = /hour|\/hr/i.test(published) ? 'hour' : max >= 1000 ? 'year' : null;
  return [{ as_published: m[0], min: Math.min(min, max), max: Math.max(min, max), currency: 'USD', period, source: 'description_text' }];
}

function boardBodies(board) {
  const dir = join(hub, 'packages/connectors', board.system, 'fixtures', board.tenant);
  const recordedAt = JSON.parse(readFileSync(join(dir, 'case.json'), 'utf8')).recordedAt;
  const bodies = readdirSync(join(dir, 'bodies'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(dir, 'bodies', f), 'utf8')));
  return { recordedAt, bodies };
}

const postings = new Map();
for (const board of BOARDS) {
  const { recordedAt, bodies } = boardBodies(board);
  for (const body of bodies) {
    const list = Array.isArray(body) ? body : Array.isArray(body.jobs) ? body.jobs : [];
    for (const j of list) {
      let p;
      if (board.system === 'greenhouse') {
        if (!j.title || !j.absolute_url) continue;
        const description = text(j.content);
        p = {
          external_id: String(j.id),
          title: j.title.trim(),
          locations: [location(j.location?.name ?? 'Unknown')],
          workplace_type: workplace(j.location?.name),
          employment_type: employment(null),
          posted_at: j.first_published ?? null,
          salary: salaryFrom(description.match(/\$[\d,.]+\s?[kK]?\s*(?:–|-|to)\s*\$[\d,.]+\s?[kK]?[^\n]{0,40}/)?.[0]),
          description,
          posting_url: j.absolute_url,
          apply_url: j.absolute_url,
        };
      } else if (board.system === 'ashby') {
        if (j.isListed === false || !j.title) continue;
        const locs = [j.location, ...(j.secondaryLocations ?? []).map((s) => s.location)].filter(Boolean);
        p = {
          external_id: j.id,
          title: j.title.trim(),
          locations: locs.map((l) => location(l)),
          workplace_type: workplace(j.workplaceType ?? (j.isRemote ? 'remote' : null)),
          employment_type: employment(j.employmentType),
          posted_at: j.publishedAt ?? null,
          salary: j.shouldDisplayCompensationOnJobPostings ? salaryFrom(j.compensation?.compensationTierSummary) : [],
          description: j.descriptionPlain ? j.descriptionPlain.trim() : text(j.descriptionHtml),
          posting_url: j.jobUrl,
          apply_url: j.applyUrl ?? j.jobUrl,
        };
      } else {
        if (!j.text || !j.hostedUrl) continue;
        const lists = (j.lists ?? []).map((l) => `${l.text}\n${text(l.content)}`).join('\n\n');
        const description = [j.descriptionPlain, lists, j.additionalPlain].filter(Boolean).join('\n\n').trim();
        p = {
          external_id: j.id,
          title: j.text.trim(),
          locations: (j.categories?.allLocations ?? [j.categories?.location]).filter(Boolean).map((l) => location(l, j.country)),
          workplace_type: workplace(j.workplaceType),
          employment_type: employment(j.categories?.commitment),
          posted_at: j.createdAt ? new Date(Number(j.createdAt)).toISOString() : null,
          salary: j.salaryRange
            ? [{ as_published: null, min: j.salaryRange.min, max: j.salaryRange.max, currency: j.salaryRange.currency ?? null, period: j.salaryRange.interval?.includes('hour') ? 'hour' : 'year', source: 'structured' }]
            : salaryFrom(j.additionalPlain?.match(/\$[\d,.]+\s?[kK]?\s*(?:–|-|to|and)\s*\$[\d,.]+[^\n.]{0,20}/)?.[0]),
          description,
          posting_url: j.hostedUrl,
          apply_url: j.applyUrl ?? j.hostedUrl,
        };
      }
      const id = `sample:${board.system}:${board.tenant}:${p.external_id}`;
      postings.set(id, {
        id,
        title: p.title,
        company: { name: board.company, domain: board.domain },
        locations: p.locations,
        workplace_type: p.workplace_type,
        employment_type: p.employment_type,
        posted_at: p.posted_at,
        salary: p.salary,
        description: cap(p.description),
        source: { system: board.system, tenant: board.tenant, posting_url: p.posting_url, apply_url: p.apply_url },
        last_verified_at: recordedAt,
      });
    }
  }
}

const jobs = [...postings.values()].sort((a, b) => a.id.localeCompare(b.id));
writeFileSync(out, `${JSON.stringify({ source: 'talent-data-hub connector fixtures', jobs })}\n`);
console.log(`${jobs.length} postings from ${BOARDS.length} boards → ${out}`);
