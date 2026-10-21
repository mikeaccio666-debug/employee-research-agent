import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { emptySpec, headlineWithout, publishedSpec, readSpec, type Claim, type Spec } from '@/lib/portrait/spec';
import { numbersIn, unquotedNumbers } from '@/lib/agent/guards';
import { plan } from '@/lib/agent/planner';
import { parseSkill, SKILLS } from '@/lib/agent/skills';
import { findQuote, runTool, TOOL_DEFS, type Grounds } from '@/lib/agent/tools';
import { resumeFrom, resumeText } from '@/lib/resume/model';
import { resumePdf } from '@/lib/resume/pdf';

// The rules the studio agent's tools enforce (lib/agent/tools.ts), checked without a model.
// Run with `pnpm --filter @portrait/web test`.

const at = (minutes: number) => new Date(Date.UTC(2026, 9, 21, 9, minutes)).toISOString();
const SOURCE_ID = '7f2c1c1e-8d1f-4b8e-9a51-2a0f3b4c5d6e';

const grounds = (...said: string[]): Grounds => ({
  said: said.map((text, i) => ({ id: i + 1, text, at: at(i * 10) })),
  sources: [{ id: SOURCE_ID, kind: 'resume', name: 'cv.pdf', url: null, pages: [{ page: 2, text: 'Led the CSA Campus Marketplace rebuild (Next.js)' }] }],
});

const upsert = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    id: null,
    layer: 'experience',
    kind: 'project',
    title: 'Campus Marketplace',
    org: 'UC San Diego',
    when: '2025',
    statement: 'Built Campus Marketplace, now used by 300 students.',
    basis: 'stated',
    quote: '300 students use it',
    ...over,
  });

const claim = (over: Partial<Claim> = {}): Claim => ({
  id: 'clm_aaaaaaaaaa',
  layer: 'experience',
  kind: 'project',
  title: 'Campus Marketplace',
  org: null,
  when: null,
  statement: 'Built Campus Marketplace, now used by 300 students.',
  basis: 'stated',
  status: 'draft',
  pinned: false,
  evidence: [{ source: 'chat', messageId: 1, quote: '300 students use it' }],
  createdBy: 'agent',
  updatedAt: at(5),
  ...over,
});

const withClaims = (...claims: Claim[]): Spec => ({ ...emptySpec(), rev: 3, claims });

describe('findQuote', () => {
  it('finds a quote in the person’s messages, newest first', async () => {
    const g = grounds('I built a marketplace; 300 students use it', 'yes 300 students use it now');
    assert.deepEqual(findQuote('300 students use it', g), { source: 'chat', messageId: 2, quote: '300 students use it' });
  });

  it('ignores case, spacing and curly quotes, never wording', async () => {
    const g = grounds('I said “it’s   FAST”');
    assert.ok(findQuote('"it\'s fast"', g));
    assert.equal(findQuote('it is fast', g), null);
  });

  it('finds a quote in a shared document, with its page', async () => {
    assert.deepEqual(findQuote('Campus Marketplace rebuild', grounds('hi')), {
      source: 'resume',
      sourceId: SOURCE_ID,
      page: 2,
      quote: 'Campus Marketplace rebuild',
    });
  });
});

describe('upsert_claim', () => {
  it('adds a draft line backed by the quote', async () => {
    const r = await runTool('upsert_claim', upsert(), emptySpec(), grounds('I built it and 300 students use it'));
    assert.match(r.output, /^Added clm_/);
    assert.equal(r.spec.claims.length, 1);
    assert.equal(r.spec.claims[0]!.status, 'draft');
    assert.equal(r.spec.rev, 1);
  });

  it('refuses a quote the person never said', async () => {
    const r = await runTool('upsert_claim', upsert({ quote: '3000 students use it' }), emptySpec(), grounds('300 students use it'));
    assert.match(r.output, /^Not done: the quote is not/);
    assert.equal(r.spec.claims.length, 0);
  });

  it('refuses arguments that are not JSON or break the schema', async () => {
    assert.match((await runTool('upsert_claim', '{nope', emptySpec(), grounds('x'))).output, /not valid JSON/);
    assert.match((await runTool('upsert_claim', upsert({ layer: 'hobby' }), emptySpec(), grounds('300 students use it'))).output, /invalid arguments/);
  });

  it('does not add the same line twice', async () => {
    const r = await runTool('upsert_claim', upsert(), withClaims(claim()), grounds('300 students use it'));
    assert.match(r.output, /already on the portrait as clm_aaaaaaaaaa/);
  });

  it('keeps a rejected line out unless the person asks again in a later message', async () => {
    const spec = withClaims(claim({ status: 'rejected', updatedAt: at(5) }));
    // The quote is from message 1 (minute 0), sent before the rejection (minute 5).
    assert.match((await runTool('upsert_claim', upsert(), spec, grounds('300 students use it'))).output, /rejected this line/);
    // Message 2 (minute 10) came after it: the line comes back as a draft.
    const back = await runTool('upsert_claim', upsert(), spec, grounds('hello', 'put it back: 300 students use it'));
    assert.match(back.output, /^Updated clm_aaaaaaaaaa/);
    assert.equal(back.spec.claims[0]!.status, 'draft');
  });

  it('asks before changing a pinned line', async () => {
    const r = await runTool('upsert_claim', upsert({ id: 'clm_aaaaaaaaaa' }), withClaims(claim({ pinned: true })), grounds('300 students use it'));
    assert.match(r.output, /wrote this line themselves/);
  });

  it('sends a changed confirmed line back to draft', async () => {
    const r = await runTool(
      'upsert_claim',
      upsert({ id: 'clm_aaaaaaaaaa', statement: 'Built and runs Campus Marketplace for 300 students.' }),
      withClaims(claim({ status: 'confirmed' })),
      grounds('300 students use it'),
    );
    assert.equal(r.spec.claims[0]!.status, 'draft');
  });
});

describe('remove_claim and set_headline', () => {
  it('removes only drafts, and the headline that rested on them', async () => {
    const spec = { ...withClaims(claim()), headline: { text: 'Builds for campus', claims: ['clm_aaaaaaaaaa'], status: 'draft' as const, alternatives: [] } };
    const r = await runTool('remove_claim', JSON.stringify({ id: 'clm_aaaaaaaaaa' }), spec, grounds('x'));
    assert.equal(r.spec.claims.length, 0);
    assert.equal(r.spec.headline, null);
    const kept = await runTool('remove_claim', JSON.stringify({ id: 'clm_aaaaaaaaaa' }), withClaims(claim({ status: 'confirmed' })), grounds('x'));
    assert.match(kept.output, /only draft lines/);
  });

  it('needs the headline’s lines to be on the portrait', async () => {
    const r = await runTool('set_headline', JSON.stringify({ options: [{ text: 'Builds for campus', claim_ids: ['clm_missing000'] }] }), withClaims(claim()), grounds('x'));
    assert.match(r.output, /aren’t on the portrait/);
  });
});

describe('guards on what a line says', () => {
  it('reads numbers in digits, words and Chinese numerals', () => {
    assert.deepEqual([...numbersIn('1,200 users in 3 months, 2k downloads')].sort((a, b) => a - b), [2, 3, 1200, 2000]);
    assert.ok(numbersIn('three months').has(3));
    assert.ok(numbersIn('三个月').has(3));
    assert.ok(numbersIn('两百多人').has(200));
    assert.ok(numbersIn('三千五百').has(3500));
  });

  it('finds numbers the quote doesn’t hold', () => {
    assert.deepEqual(unquotedNumbers('Interned for 3 months', ['实习了三个月']), []);
    assert.deepEqual(unquotedNumbers('500+ followers', ['大概几百个人关注']), [500]);
    // A month name backs its number, so dates can be written either way.
    assert.deepEqual(unquotedNumbers('2027 年 5 月毕业', ['expected May 2027']), []);
    assert.deepEqual(unquotedNumbers('2024 年 6 月到 9 月', ['Jun 2024 – Sep 2024']), []);
    // Number words in the line itself aren't counted.
    assert.deepEqual(unquotedNumbers('One of the first members', ['joined early']), []);
  });

  it('refuses a number the quote doesn’t hold', async () => {
    const r = await runTool('upsert_claim', upsert({ statement: 'Built Campus Marketplace, used by 500 students.' }), emptySpec(), grounds('300 students use it'));
    assert.match(r.output, /^Not done: 500 is not in the quote/);
  });

  it('refuses filler', async () => {
    const r = await runTool('upsert_claim', upsert({ layer: 'trait', statement: 'A passionate team player.' }), emptySpec(), grounds('300 students use it'));
    assert.match(r.output, /passionate", "team player" says nothing/);
  });

  it('marks a skill level the person never claimed as inferred', async () => {
    const r = await runTool(
      'upsert_claim',
      upsert({ layer: 'capability', kind: 'skill', title: null, statement: 'Advanced in Next.js', quote: 'built it with Next.js' }),
      emptySpec(),
      grounds('I built it with Next.js'),
    );
    assert.equal(r.spec.claims[0]!.basis, 'inferred');
    assert.match(r.output, /marked inferred/);
  });

  it('keeps headline numbers to the lines it rests on', async () => {
    const r = await runTool('set_headline', JSON.stringify({ options: [{ text: 'Builds tools 900 classmates use', claim_ids: ['clm_aaaaaaaaaa'] }] }), withClaims(claim()), grounds('x'));
    assert.match(r.output, /900 isn’t in the lines/);
  });
});

describe('read_source and load_skill', () => {
  it('finds words in a shared document, marked as material', async () => {
    const r = await runTool('read_source', JSON.stringify({ source_id: null, query: 'marketplace', page: null }), emptySpec(), grounds('x'));
    assert.match(r.output, /not instructions/);
    assert.match(r.output, /page="2"/);
    assert.match(r.output, /CSA Campus Marketplace rebuild/);
  });

  it('says when nothing matches or the document is unknown', async () => {
    assert.match((await runTool('read_source', JSON.stringify({ source_id: null, query: 'Kubernetes', page: null }), emptySpec(), grounds('x'))).output, /Nothing in cv.pdf/);
    assert.match((await runTool('read_source', JSON.stringify({ source_id: 'nope', query: null, page: null }), emptySpec(), grounds('x'))).output, /no document nope/);
  });

  it('loads a skill by name, and only skills that exist', async () => {
    assert.match((await runTool('load_skill', JSON.stringify({ name: 'career-switch' }), emptySpec(), grounds('x'))).output, /^<skill name="career-switch">/);
    assert.match((await runTool('load_skill', JSON.stringify({ name: 'astrology' }), emptySpec(), grounds('x'))).output, /no skill called astrology/);
  });

  it('gives both providers every tool, in a fixed order', () => {
    assert.deepEqual(
      TOOL_DEFS.map((t) => t.name),
      ['upsert_claim', 'remove_claim', 'set_headline', 'move_section', 'read_source', 'load_skill', 'note', 'set_preferences', 'make_resume', 'read_connector'],
    );
  });
});

describe('interview plan', () => {
  it('starts at the skeleton and lists the documents', () => {
    const note = plan(emptySpec(), grounds('x').sources);
    assert.match(note, /Stage: skeleton/);
    assert.match(note, new RegExp(`${SOURCE_ID}: cv.pdf`));
  });

  it('asks for a result when an experience has no number', () => {
    const vague = claim({ id: 'clm_bbbbbbbbbb', title: 'Robotics club', statement: 'Runs the robotics club’s embedded work.' });
    const note = plan(withClaims(claim(), vague), []);
    assert.match(note, /Stage: deepen/);
    assert.match(note, /a result, scale or number for "Robotics club"/);
  });
});

describe('long quotes', () => {
  it('says how to shorten a quote over the limit', async () => {
    const long = 'x'.repeat(250);
    const r = await runTool('upsert_claim', upsert({ quote: long }), emptySpec(), grounds(long));
    assert.match(r.output, /keep it to 200 characters or fewer/);
  });
});

describe('skills', () => {
  it('loads every SKILL.md under lib/agent/skills, sorted by name', () => {
    const names = SKILLS.map((s) => s.name);
    assert.deepEqual(names, [...names].sort());
    for (const n of ['business', 'career-switch', 'design', 'international-student', 'research', 'software-engineering']) assert.ok(names.includes(n), n);
    for (const s of SKILLS) assert.ok(s.description.length > 20 && s.body.length > 200, s.name);
  });

  it('reads front matter, quoted or not, and refuses a file without it', () => {
    const s = parseSkill('---\nname: pdf-resume\ndescription: "Use when: they want a PDF"\ntools: [generate_resume, read_source]\n---\n\nSteps.\n');
    assert.deepEqual(s, { name: 'pdf-resume', description: 'Use when: they want a PDF', body: 'Steps.', tools: ['generate_resume', 'read_source'] });
    assert.throws(() => parseSkill('Steps only'), /no front matter/);
    assert.throws(() => parseSkill('---\nname: Bad Name\ndescription: x\n---\nbody'), /lowercase/);
  });
});

describe('note', () => {
  const add = (text: string, spec = emptySpec()) => runTool('note', JSON.stringify({ add: text, close: null }), spec, grounds('x'));

  it('keeps notes off the page and out of rev, and lists them in the plan', async () => {
    const r = await add('ask about the hackathon win');
    assert.match(r.output, /^Noted as nte_/);
    assert.equal(r.spec.rev, 0);
    assert.equal(r.change, undefined);
    assert.match(plan(r.spec, []), /ask about the hackathon win/);
    assert.deepEqual(publishedSpec(r.spec).notes, []);
  });

  it('closes a note by id, and only one that exists', async () => {
    const { spec } = await add('check the internship dates');
    const id = spec.notes[0]!.id;
    const closed = await runTool('note', JSON.stringify({ add: null, close: id }), spec, grounds('x'));
    assert.equal(closed.spec.notes.length, 0);
    assert.match((await runTool('note', JSON.stringify({ add: null, close: 'nte_nope000000' }), spec, grounds('x'))).output, /no open note/);
  });

  it('caps open notes', async () => {
    let spec = emptySpec();
    for (let i = 0; i < 12; i++) spec = (await add(`note ${i}`, spec)).spec;
    assert.match((await add('one more', spec)).output, /Close one/);
  });

  it('reads a stored spec from before notes existed', () => {
    const { notes, ...old } = emptySpec();
    assert.deepEqual(readSpec(old).notes, []);
  });
});

describe('headline options', () => {
  const opts = (...texts: string[]) => JSON.stringify({ options: texts.map((text) => ({ text, claim_ids: ['clm_aaaaaaaaaa'] })) });
  const critic = (verdicts: { n: number; ok: boolean; why?: string }[]) => async () => JSON.stringify({ verdicts });

  it('shows the first as the draft and offers the others', async () => {
    const r = await runTool('set_headline', opts('Builds tools 300 students use', 'Turns campus chores into software', 'Ships for real users'), withClaims(claim()), grounds('x'));
    assert.equal(r.spec.headline?.text, 'Builds tools 300 students use');
    assert.deepEqual(r.spec.headline?.alternatives.map((a) => a.text), ['Turns campus chores into software', 'Ships for real users']);
    assert.match(r.output, /2 other options/);
  });

  it('drops options that fail the checks or the critic, and says why', async () => {
    const r = await runTool(
      'set_headline',
      opts('A passionate builder', 'Builds tools 300 students use', 'Engineer who loves code'),
      withClaims(claim()),
      grounds('x'),
      undefined,
      critic([{ n: 1, ok: true }, { n: 2, ok: false, why: 'could describe anyone' }]),
    );
    assert.equal(r.spec.headline?.text, 'Builds tools 300 students use');
    assert.deepEqual(r.spec.headline?.alternatives, []);
    assert.match(r.output, /passionate.*cliché/);
    assert.match(r.output, /could describe anyone/);
  });

  it('refuses when nothing passes, and lets headlines through when the critic fails', async () => {
    const none = await runTool('set_headline', opts('Builds tools'), withClaims(claim()), grounds('x'), undefined, critic([{ n: 1, ok: false, why: 'generic' }]));
    assert.match(none.output, /^Not done: no headline passed/);
    const broken = await runTool('set_headline', opts('Builds tools'), withClaims(claim()), grounds('x'), undefined, async () => 'not json');
    assert.equal(broken.spec.headline?.text, 'Builds tools');
  });

  it('keeps alternatives off the published page and drops ones resting on a removed line', async () => {
    const two = claim({ id: 'clm_bbbbbbbbbb', status: 'confirmed' });
    const spec: Spec = {
      ...withClaims(claim({ status: 'confirmed' }), two),
      headline: { text: 'A', claims: ['clm_bbbbbbbbbb'], status: 'confirmed', alternatives: [{ text: 'B', claims: ['clm_aaaaaaaaaa'] }] },
    };
    assert.deepEqual(publishedSpec(spec).headline?.alternatives, []);
    assert.deepEqual(headlineWithout(spec.headline, 'clm_aaaaaaaaaa')?.alternatives, []);
    assert.equal(headlineWithout(spec.headline, 'clm_bbbbbbbbbb'), null);
  });
});

describe('search preferences', () => {
  const prefs = (over: Record<string, unknown> = {}) =>
    JSON.stringify({ roles: null, job_types: null, locations: null, work_modes: null, start: null, work_auth: null, quote: '', ...over });
  const g = grounds('I want analog IC design jobs in the Bay Area or remote, from June 2026. I am on F-1 and will need sponsorship.');

  it('saves what they said without touching the page', async () => {
    const spec = withClaims(claim());
    const r = await runTool(
      'set_preferences',
      prefs({ roles: ['analog IC design'], locations: ['Bay Area'], work_modes: ['remote'], start: 'June 2026', quote: 'analog IC design jobs in the Bay Area or remote, from June 2026' }),
      spec,
      g,
    );
    assert.match(r.output, /^Saved/);
    assert.equal(r.spec.rev, spec.rev);
    assert.deepEqual(r.spec.preferences.roles, ['analog IC design']);
    assert.equal(r.spec.preferences.start, 'June 2026');
    assert.equal(r.spec.preferences.evidence.length, 1);
    assert.ok(r.change);
    // null leaves a field; a later call adds to the rest.
    const r2 = await runTool('set_preferences', prefs({ work_auth: 'F-1, will need sponsorship', quote: 'I am on F-1 and will need sponsorship' }), r.spec, g);
    assert.deepEqual(r2.spec.preferences.roles, ['analog IC design']);
    assert.equal(r2.spec.preferences.workAuth, 'F-1, will need sponsorship');
  });

  it('refuses without a real quote, with nothing to save, or with a date they never said', async () => {
    const spec = emptySpec();
    assert.match((await runTool('set_preferences', prefs({ roles: ['PM'], quote: 'I want PM jobs' }), spec, g)).output, /not in the person/);
    assert.match((await runTool('set_preferences', prefs({ quote: 'Bay Area' }), spec, g)).output, /at least one/);
    assert.match((await runTool('set_preferences', prefs({ start: 'June 2027', quote: 'from June 2026' }), spec, g)).output, /2027 is not in the quote/);
  });

  it('keeps work authorization off the page and out of the published spec', async () => {
    const said = grounds('I am on F-1 and will need sponsorship');
    const r = await runTool('upsert_claim', upsert({ layer: 'intent', kind: 'role_pref', title: null, org: null, when: null, statement: 'Will need visa sponsorship', quote: 'will need sponsorship' }), emptySpec(), said);
    assert.match(r.output, /work authorization/);
    assert.equal(r.spec.claims.length, 0);
    const saved = await runTool('set_preferences', prefs({ work_auth: 'F-1, will need sponsorship', quote: 'I am on F-1 and will need sponsorship' }), emptySpec(), said);
    assert.equal(publishedSpec(saved.spec).preferences.workAuth, null);
    // Club sponsorship is not work authorization.
    const club = await runTool('upsert_claim', upsert({ statement: 'Raised sponsorship for the hackathon from 300 students', quote: '300 students use it' }), emptySpec(), grounds('300 students use it'));
    assert.match(club.output, /^Added/);
  });

  it('reads old specs without preferences, and the plan lists them', async () => {
    const old = readSpec({ rev: 1, headline: null, order: [], claims: [], notes: [] });
    assert.deepEqual(old.preferences.roles, []);
    const r = await runTool('set_preferences', prefs({ roles: ['analog IC design'], quote: 'analog IC design jobs' }), old, g);
    assert.match(plan(r.spec, []), /roles: analog IC design/);
  });
});

describe('résumé', () => {
  const who = { name: 'Maya Chen', contact: ['maya@example.com', ''] };
  const spec = (): Spec => ({
    ...withClaims(
      claim({ id: 'clm_exp1aaaaaa', status: 'confirmed', title: 'Backend intern', org: 'ByteDance', when: 'Summer 2025', kind: 'internship', statement: 'Cut P99 latency from 800ms to 200ms.' }),
      claim({ id: 'clm_prj1aaaaaa', status: 'confirmed', kind: 'project', statement: 'Built Campus Marketplace, now used by 300 students.' }),
      claim({ id: 'clm_drf1aaaaaa', status: 'draft', title: 'Hackathon', statement: 'Won a hackathon.' }),
      claim({ id: 'clm_skl1aaaaaa', status: 'confirmed', layer: 'capability', kind: 'skill', title: null, statement: 'Go, Java, Redis' }),
      claim({ id: 'clm_rej1aaaaaa', status: 'rejected', layer: 'capability', kind: 'skill', title: null, statement: 'Rust' }),
    ),
    headline: { text: 'Backend intern who cut latency fourfold', claims: ['clm_exp1aaaaaa'], status: 'confirmed', alternatives: [] },
    preferences: { ...emptySpec().preferences, workAuth: 'F-1, will need sponsorship' },
  });

  it('holds only confirmed lines, in sections, and never work authorization', () => {
    const text = resumeText(resumeFrom(spec(), who));
    assert.match(text, /^Maya Chen\nmaya@example.com/);
    assert.match(text, /Backend intern who cut latency fourfold/);
    assert.match(text, /EXPERIENCE\nBackend intern, ByteDance — Summer 2025\n• Cut P99/);
    assert.match(text, /PROJECTS\nCampus Marketplace/);
    assert.match(text, /SKILLS\n• Go, Java, Redis/);
    assert.doesNotMatch(text, /hackathon|Rust|F-1|sponsorship/i);
  });

  it('make_resume tailors with confirmed lines only, and leaves the full one alone', async () => {
    const s = spec();
    const draft = await runTool('make_resume', JSON.stringify({ target: 'Backend intern at Stripe', claim_ids: ['clm_drf1aaaaaa'] }), s, grounds());
    assert.match(draft.output, /is a draft/);
    const full = await runTool('make_resume', JSON.stringify({ target: null, claim_ids: null }), s, grounds());
    assert.equal(full.spec.resume, null);
    assert.ok(full.change);
    const r = await runTool('make_resume', JSON.stringify({ target: 'Backend intern at Stripe', claim_ids: ['clm_skl1aaaaaa', 'clm_exp1aaaaaa'] }), s, grounds());
    assert.match(r.output, /2 lines \(1 confirmed lines left out\)/);
    const tailored = resumeFrom(r.spec, who, true);
    assert.equal(tailored.target, 'Backend intern at Stripe');
    assert.deepEqual(tailored.sections.map((x) => x.heading), ['Experience', 'Skills']);
    assert.equal(publishedSpec(r.spec).resume, null);
    const none = await runTool('make_resume', JSON.stringify({ target: null, claim_ids: null }), emptySpec(), grounds());
    assert.match(none.output, /no experience on the portrait is confirmed/);
  });

  it('renders a PDF, Chinese included', async () => {
    const r = resumeFrom(spec(), who);
    r.sections[0]!.entries[0]!.org = '字节跳动 ByteDance';
    const bytes = await resumePdf(r);
    assert.equal(Buffer.from(bytes.slice(0, 5)).toString(), '%PDF-');
    assert.ok(bytes.length < 200_000, `${bytes.length} bytes: fonts should be subset`);
  });
});
