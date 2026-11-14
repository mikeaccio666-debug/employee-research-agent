import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readResume } from '@/lib/agent/sources';
import { emptySpec, type Claim, type Spec } from '@/lib/portrait/spec';
import { defaultStyle, docFromPortrait, docText, exampleDoc, MAX, readDoc, ResumeDoc, shown, type ResumeDoc as Doc } from '@/lib/resume/doc';
import { docPdf, fitScale } from '@/lib/resume/doc-pdf';
import * as edit from '@/lib/resume/edit';

// The résumé editor's model (lib/resume/doc.ts, edit.ts) and its PDF (doc-pdf.ts).

const claim = (over: Partial<Claim>): Claim => ({
  id: 'clm_aaaaaaaaaa',
  layer: 'experience',
  kind: 'internship',
  title: null,
  org: null,
  when: null,
  statement: 'x',
  basis: 'stated',
  status: 'confirmed',
  pinned: false,
  evidence: [],
  createdBy: 'agent',
  updatedAt: '2026-11-13T00:00:00.000Z',
  ...over,
});

const spec = (): Spec => ({
  ...emptySpec(),
  claims: [
    claim({ id: 'clm_exp1aaaaaa', title: 'Backend intern', org: 'ByteDance', when: 'Jun 2025 — now', statement: 'Cut P99 latency from 800ms to 200ms.' }),
    claim({ id: 'clm_exp2aaaaaa', title: 'Backend intern', org: 'ByteDance', when: 'Jun 2025 — now', statement: 'Moved the order service to Go.' }),
    claim({ id: 'clm_prj1aaaaaa', kind: 'project', title: 'Campus Marketplace', statement: 'Built Campus Marketplace, now used by 300 students.' }),
    claim({ id: 'clm_drf1aaaaaa', status: 'draft', title: 'Hackathon', statement: 'Won a hackathon.' }),
    claim({ id: 'clm_skl1aaaaaa', layer: 'capability', kind: 'skill', statement: 'Go, Java, Redis' }),
    claim({ id: 'clm_rej1aaaaaa', status: 'rejected', layer: 'capability', kind: 'skill', statement: 'Rust' }),
  ],
  headline: { text: 'Backend intern who cut latency fourfold', claims: ['clm_exp1aaaaaa'], status: 'confirmed', alternatives: [] },
  preferences: { ...emptySpec().preferences, roles: ['Backend engineer'], workAuth: 'F-1, will need sponsorship' },
});

const who = { name: 'Maya Chen', email: 'maya@example.com', link: null };

describe('résumé editor: a first version from the portrait', () => {
  it('holds only confirmed lines, groups one role’s lines, and never work authorization', () => {
    const doc = docFromPortrait(spec(), who);
    const text = docText(doc);
    assert.match(text, /^Maya Chen\nBackend engineer\nmaya@example.com/);
    assert.match(text, /PROFESSIONAL SUMMARY\nBackend intern who cut latency fourfold/);
    assert.match(text, /WORK EXPERIENCE\nByteDance \| Backend intern {4}Jun 2025 – Present\n• Cut P99[^\n]*\n• Moved the order service to Go\./);
    assert.match(text, /PROJECTS\nCampus Marketplace/);
    assert.match(text, /SKILLS\nSkills: Go, Java, Redis/);
    assert.doesNotMatch(text, /hackathon|Rust|F-1|sponsorship/i);
    // Empty sections stay in the version, to fill in, but off the page.
    assert.ok(doc.sections.some((s) => s.kind === 'certifications'));
    assert.ok(!shown(doc).some((s) => s.kind === 'certifications'));
  });

  it('keeps one organisation in one entry, and puts sentence-like skills under Highlights', () => {
    const s: Spec = {
      ...emptySpec(),
      claims: [
        claim({ id: 'clm_org0000001', org: '蔓藤', title: 'Founder', statement: 'Founder of 蔓藤.' }),
        claim({ id: 'clm_org0000002', org: '蔓藤', title: 'Team management', statement: 'Managed team members at 蔓藤.' }),
        claim({ id: 'clm_org0000003', org: '蔓藤', title: 'Engineering guidance', statement: 'Guided a colleague through merging pull requests.' }),
        claim({ id: 'clm_org0000004', org: 'Quest Abroad', title: 'Marketing Manager', when: '2025 — 2026', statement: 'Automated pricing research.' }),
        claim({ id: 'clm_org0000005', org: 'Quest Abroad', title: 'Analyst', when: '2023 — 2024', statement: 'Wrote weekly reports.' }),
        claim({ id: 'clm_cap0000001', layer: 'capability', kind: 'skill', statement: 'Python' }),
        claim({ id: 'clm_cap0000002', layer: 'capability', kind: 'skill', statement: 'Implemented dev/prod Supabase separation, versioned SQL migrations, and CI/CD.' }),
      ],
    };
    const doc = docFromPortrait(s, who);
    const work = doc.sections.find((x) => x.kind === 'experience')!.entries;
    assert.equal(work.filter((e) => e.title === '蔓藤').length, 1);
    assert.equal(work.find((e) => e.title === '蔓藤')!.subtitle, 'Founder');
    assert.equal(work.find((e) => e.title === '蔓藤')!.bullets.length, 3);
    // Different dates at the same place are different stints.
    assert.equal(work.filter((e) => e.title === 'Quest Abroad').length, 2);
    const text = docText(doc);
    assert.match(text, /HIGHLIGHTS\n• Implemented dev\/prod Supabase separation, versioned SQL migrations, and CI\/CD\./);
    assert.match(text, /SKILLS\nSkills: Python$/m);
  });

  it('starts blank from an empty portrait', () => {
    const doc = docFromPortrait(emptySpec(), who);
    assert.equal(shown(doc).length, 0);
    assert.equal(doc.name, 'Maya Chen');
  });
});

describe('résumé editor: changes', () => {
  it('adds, moves and removes bullets without touching the old doc', () => {
    const before = exampleDoc();
    const exp = before.sections.find((s) => s.kind === 'experience')!;
    const entry = exp.entries[0]!;
    const [added, id] = edit.addBullet(before, exp.id, entry.id, entry.bullets[0]!.id);
    assert.ok(id);
    assert.equal(exp.entries[0]!.bullets.length, 2, 'old doc unchanged');
    const bullets = (d: Doc) => d.sections.find((s) => s.id === exp.id)!.entries[0]!.bullets.map((b) => b.id);
    assert.deepEqual(bullets(added), [entry.bullets[0]!.id, id, entry.bullets[1]!.id]);
    const moved = edit.moveBullet(added, exp.id, entry.id, id, 0);
    assert.deepEqual(bullets(moved)[0], id);
    assert.deepEqual(bullets(edit.removeBullet(moved, exp.id, entry.id, id)), bullets(before));
  });

  it('hides a contact or a section from the page but keeps it in the version', () => {
    const doc = exampleDoc();
    const phone = doc.contacts.find((c) => c.kind === 'phone')!;
    assert.doesNotMatch(docText(doc), /555/, 'the example hides its phone');
    assert.match(docText(edit.setContact(doc, phone.id, { hidden: false })), /555/);
    const skills = doc.sections.find((s) => s.kind === 'skills')!;
    const hidden = edit.setSection(doc, skills.id, { hidden: true });
    assert.doesNotMatch(docText(hidden), /SKILLS/);
    assert.equal(hidden.sections.length, doc.sections.length);
  });

  it('refuses what is too long to save, and reads anything malformed as empty', () => {
    const doc = exampleDoc();
    doc.sections[0]!.entries[0]!.text = 'x'.repeat(MAX.text + 1);
    assert.equal(ResumeDoc.safeParse(doc).success, false);
    assert.deepEqual(readDoc({ sections: 'nope' }).sections, []);
  });
});

describe('résumé editor: PDF', () => {
  it('reads back in order, Chinese included', async () => {
    const doc = exampleDoc();
    doc.name = 'Lin Zhou 周琳';
    const bytes = await docPdf(doc, defaultStyle());
    const read = await readResume(bytes, 'cv.pdf');
    assert.ok(read.ok, JSON.stringify(read));
    assert.equal(read.pages.length, 1);
    const text = read.pages[0]!.text;
    assert.match(text, /周琳/);
    assert.ok(text.indexOf('PROFESSIONAL SUMMARY') < text.indexOf('WORK EXPERIENCE'));
    assert.match(text, /Built and checked weekly metrics/);
    assert.doesNotMatch(text, /555/, 'a hidden contact stays off the PDF');
  });

  it('shrinks to one page when asked, never below 9pt, and says when that is not enough', async () => {
    const doc = exampleDoc();
    const exp = doc.sections.find((s) => s.kind === 'experience')!;
    const more = (n: number) => {
      const d = structuredClone(doc);
      const e = d.sections.find((s) => s.id === exp.id)!;
      for (let k = 0; k < n; k++)
        e.entries.push({
          ...e.entries[0]!,
          id: `ent_more${k}aaa`,
          bullets: Array.from({ length: 5 }, (_, i) => ({ id: `blt_m${k}x${i}aaa`, text: `Shipped thing ${i} at company ${k}, used every week by several teams across the org.` })),
        });
      return d;
    };
    const style = defaultStyle();
    assert.deepEqual(await fitScale(doc, style), { scale: 1, pages: 1 });
    const fits = await fitScale(more(5), style);
    assert.equal(fits.pages, 1);
    assert.ok(fits.scale < 1 && fits.scale >= 9 / style.size);
    const off = await fitScale(more(5), { ...style, fitOnePage: false });
    assert.equal(off.pages, 2);
    const tooMuch = await fitScale(more(12), style);
    assert.ok(tooMuch.pages > 1);
    assert.equal(tooMuch.scale, 9 / style.size);
  });
});
