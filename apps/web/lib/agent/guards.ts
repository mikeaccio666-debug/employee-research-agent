// Checks on what a portrait line says, beyond its quote being real (lib/agent/tools.ts): numbers
// must come from the quote, filler words are refused, and a skill level the person never claimed
// is marked as the agent's reading. docs/agent-design.md §2.6 and §5.4.

const EN_UNITS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const EN_SCALES: Record<string, number> = { hundred: 100, thousand: 1000, million: 1_000_000 };
const ZH_DIGITS: Record<string, number> = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const ZH_SCALES: Record<string, number> = { 十: 10, 百: 100, 千: 1000, 万: 10_000 };

/** A run of Chinese numerals ("三", "十二", "两百", "三千五百") as a number. */
function chinese(run: string): number | null {
  let total = 0;
  let section = 0;
  let digit: number | null = null;
  for (const ch of run) {
    if (ch in ZH_DIGITS) digit = ZH_DIGITS[ch]!;
    else if (ch === '万') {
      total = (total + section + (digit ?? 0)) * 10_000;
      section = 0;
      digit = null;
    } else if (ch in ZH_SCALES) {
      section += (digit ?? 1) * ZH_SCALES[ch]!;
      digit = null;
    } else return null;
  }
  return total + section + (digit ?? 0);
}

/** English number words ("three", "twenty five", "two hundred") as numbers. */
function english(text: string): number[] {
  const out: number[] = [];
  let current: number | null = null;
  for (const word of text.toLowerCase().split(/[^a-z]+/)) {
    if (word in EN_UNITS) current = (current ?? 0) + EN_UNITS[word]!;
    else if (word in EN_SCALES && current !== null) current *= EN_SCALES[word]!;
    else if (word === 'a' || word === 'and') continue;
    else if (current !== null) {
      out.push(current);
      current = null;
    }
  }
  if (current !== null) out.push(current);
  return out;
}

/**
 * Every number written in the text: in digits, and unless `digitsOnly`, in English words or
 * Chinese numerals too.
 */
export function numbersIn(text: string, digitsOnly = false): Set<number> {
  const out = new Set<number>();
  for (const m of text.matchAll(/(\d+(?:[.,]\d+)*)\s*([kKmM](?![a-zA-Z])|[万千])?/g)) {
    const n = Number(m[1]!.replace(/,(?=\d{3}\b)/g, '').replace(',', '.'));
    if (!Number.isFinite(n)) continue;
    out.add(n);
    const scale = { k: 1000, K: 1000, m: 1_000_000, M: 1_000_000, 万: 10_000, 千: 1000 }[m[2] ?? ''] as number | undefined;
    if (scale) out.add(n * scale);
  }
  if (digitsOnly) return out;
  for (const n of english(text)) out.add(n);
  for (const m of text.matchAll(/[零〇一二两三四五六七八九十百千万]+/g)) {
    const n = chinese(m[0]);
    if (n !== null) out.add(n);
  }
  return out;
}

/**
 * The numbers a line states in digits that its quotes don't, in any form ("3 months" is backed by
 * "三个月" or "three months"). Words in the line ("one of the first") aren't counted.
 */
export function unquotedNumbers(statement: string, quotes: string[]): number[] {
  const said = new Set(quotes.flatMap((q) => [...numbersIn(q)]));
  return [...numbersIn(statement, true)].filter((n) => !said.has(n));
}

// Filler that says nothing without a story (docs/agent-design.md §5.4).
const FILLER = [
  'passionate',
  'detail-oriented',
  'detail oriented',
  'team player',
  'hard-working',
  'hardworking',
  'results-driven',
  'results driven',
  'self-starter',
  'self starter',
  'go-getter',
  'fast learner',
  'quick learner',
  'synergy',
  '热爱技术',
  '学习能力强',
  '抗压能力强',
  '团队精神',
  '积极主动',
  '认真负责',
];

/** The filler phrases in a line, if any. */
export const fillerIn = (text: string) => FILLER.filter((f) => text.toLowerCase().includes(f));

// Words that rate how good someone is at something.
const LEVEL = /\b(expert|advanced|proficient|fluent|strong|deep|senior|mastery|skilled)\b|精通|熟练|擅长|资深/i;

/** A skill level the line claims that the quote doesn't. */
export function unclaimedLevel(statement: string, quote: string): boolean {
  return LEVEL.test(statement) && !LEVEL.test(quote);
}
