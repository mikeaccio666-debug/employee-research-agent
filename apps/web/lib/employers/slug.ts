// The address of a company page, /c/<slug>, from the company's name as postings spell it.

/** Legal endings that say nothing about which company it is. */
const LEGAL = new Set(['inc', 'incorporated', 'llc', 'ltd', 'limited', 'corp', 'corporation', 'co', 'company', 'plc', 'gmbh', 'ag', 'sa', 'bv', 'pty', 'lp', 'llp']);

const plain = (text: string) =>
  text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’.]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

/**
 * "Acme Analytics, Inc." reads `acme-analytics`. A name with no Latin letters or digits falls back
 * to the hiring system account, then to `company`. Always matches the `employers.slug` check.
 */
export function slugBase(name: string, tenant = ''): string {
  let words = plain(name);
  while (words.length > 1 && LEGAL.has(words[words.length - 1]!)) words = words.slice(0, -1);
  if (!words.length) words = plain(tenant);
  const slug = words.join('-').slice(0, 60).replace(/-+$/, '');
  return slug || 'company';
}

/** The first free slug: the base, then `-2`, `-3` and so on. */
export async function freeSlug(base: string, taken: (slug: string) => Promise<boolean> | boolean): Promise<string> {
  if (!(await taken(base))) return base;
  for (let n = 2; n < 10_000; n++) {
    const next = `${base}-${n}`;
    if (!(await taken(next))) return next;
  }
  throw new Error(`no free slug for ${base}`);
}
