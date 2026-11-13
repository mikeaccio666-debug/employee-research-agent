import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { emptySpec } from '@/lib/portrait/spec';
import { groundsFor, recent, RESUME_TOOL_DEFS, runResumeTool, stateBlock, type ToolContext } from '@/lib/resume/agent';
import { getText, revert, touched, type Change } from '@/lib/resume/changes';
import { readResume } from '@/lib/agent/sources';
import { letterPdf } from '@/lib/resume/doc-pdf';
import { docDocx } from '@/lib/resume/docx';
import { defaultStyle, emptyLetter, exampleDoc, type ResumeDoc } from '@/lib/resume/doc';
import type { Row } from '@/lib/agent/store';

// The assistant beside the résumé editor (lib/resume/agent.ts): its tools change the page, refuse
// facts nobody gave, and every change can be put back on its own (lib/resume/changes.ts).

const ctx = (said: string[] = []): ToolContext => {
  const doc = exampleDoc();
  return { doc, style: defaultStyle(), letter: emptyLetter(), grounds: groundsFor(doc, emptySpec(), said, []) };
};
const experience = (doc: ResumeDoc) => doc.sections.find((s) => s.kind === 'experience')!;
const call = (c: ToolContext, name: string, args: unknown) => runResumeTool(name, JSON.stringify(args), c);

describe('résumé assistant tools', () => {
  it('rewords a bullet and records how to put it back', () => {
    const c = ctx();
    const bullet = experience(c.doc).entries[0]!.bullets[0]!;
    const out = call(c, 'rewrite', { id: bullet.id, field: 'text', text: 'Built weekly metrics from event data for three product teams and checked them.' });
    assert.match(out.output, /^Done/);
    assert.equal(getText(out.doc, { id: bullet.id, field: 'text' }), 'Built weekly metrics from event data for three product teams and checked them.');
    assert.equal(out.changes.length, 1);
    assert.match(out.changes[0]!.note, /Sample Harbor Lab/);
    const back = revert(out, out.changes[0]!.change);
    assert.ok('doc' in back);
    assert.equal(getText(back.doc, { id: bullet.id, field: 'text' }), bullet.text);
  });

  it('refuses a number nobody gave, and takes one the person said in chat', () => {
    const c = ctx();
    const bullet = experience(c.doc).entries[0]!.bullets[0]!;
    const wrong = call(c, 'rewrite', { id: bullet.id, field: 'text', text: 'Built weekly metrics for 3 teams, cutting reporting time 40%.' });
    assert.match(wrong.output, /^Not done: 40/);
    assert.equal(wrong.doc, c.doc);
    const told = ctx(['it cut the reporting time by about 40%']);
    const id = experience(told.doc).entries[0]!.bullets[0]!.id;
    const right = call(told, 'rewrite', { id, field: 'text', text: 'Built weekly metrics for 3 teams, cutting reporting time about 40%.' });
    assert.match(right.output, /^Done/);
  });

  it('refuses filler and organisations nobody named', () => {
    const c = ctx();
    const exp = experience(c.doc);
    assert.match(call(c, 'add_bullet', { entry: exp.entries[0]!.id, after: null, text: 'Passionate team player.' }).output, /filler/);
    const made = call(c, 'add_entry', { section: exp.id, title: 'Google', subtitle: 'Analyst', place: '', start: '', end: '', text: '', bullets: [] });
    assert.match(made.output, /isn’t a name the person gave/);
    const told = ctx(['I also volunteered at Riverside Food Bank']);
    const ok = call(told, 'add_entry', {
      section: experience(told.doc).id,
      title: 'Riverside Food Bank',
      subtitle: 'Volunteer',
      place: '',
      start: '',
      end: '',
      text: '',
      bullets: ['Sorted donations for the weekend pantry.'],
    });
    assert.match(ok.output, /^Done/);
    assert.equal(experience(ok.doc).entries.at(-1)!.title, 'Riverside Food Bank');
  });

  it('moves, removes and puts back', () => {
    const c = ctx();
    const sections = c.doc.sections.map((s) => s.id);
    const moved = call(c, 'move', { id: sections[2], to: 0 });
    assert.equal(moved.doc.sections[0]!.id, sections[2]);
    const back = revert(moved, moved.changes[0]!.change);
    assert.ok('doc' in back);
    assert.deepEqual(back.doc.sections.map((s) => s.id), sections);

    const exp = experience(c.doc);
    const gone = call(c, 'remove', { id: exp.id });
    assert.ok(!gone.doc.sections.some((s) => s.id === exp.id));
    const again = revert(gone, gone.changes[0]!.change);
    assert.ok('doc' in again);
    assert.deepEqual(again.doc, c.doc);
  });

  it('undo leaves words the person typed since', () => {
    const c = ctx();
    const id = experience(c.doc).entries[0]!.bullets[0]!.id;
    const out = call(c, 'rewrite', { id, field: 'text', text: 'Checked weekly metrics from event data for three product teams.' });
    const change = out.changes[0]!.change as Change;
    const typed = { ...out.doc, sections: out.doc.sections.map((s) => ({ ...s, entries: s.entries.map((e) => ({ ...e, bullets: e.bullets.map((b) => (b.id === id ? { ...b, text: 'My own words' } : b)) })) })) };
    const back = revert({ ...out, doc: typed }, change);
    assert.ok('error' in back);
  });

  it('sets the page and puts it back', () => {
    const c = ctx();
    const out = call(c, 'set_page', { template: 'compact', font: 'keep', size: 10, align: 'keep', fit_one_page: 'keep' });
    assert.equal(out.style.template, 'compact');
    assert.equal(out.style.size, 10);
    const back = revert(out, out.changes[0]!.change);
    assert.ok('style' in back);
    assert.deepEqual(back.style, c.style);
  });

  it('refuses ids that are not on the page and the person’s name', () => {
    const c = ctx();
    assert.match(call(c, 'rewrite', { id: 'blt_zzzzzzzz', field: 'text', text: 'x' }).output, /no blt_zzzzzzzz/);
    assert.match(call(c, 'rewrite', { id: 'name', field: 'text', text: 'Someone' }).output, /theirs to change/);
    assert.match(call(c, 'nope', {}).output, /no tool/);
  });

  it('shows the model every id, and keeps only recent turns', () => {
    const c = ctx();
    const block = stateBlock(c.doc, c.style, c.letter, { name: 'Default', target: 'Data analyst', fit: { onePage: true, overflowLines: null, size: 10.5 } });
    for (const s of c.doc.sections) assert.ok(block.includes(`[${s.id}]`));
    assert.ok(block.includes('(for: Data analyst)'));
    const rows: Row[] = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, role: i % 2 ? 'assistant' : 'user', items: [], body: 'x', created_at: '' }));
    const kept = recent(rows);
    assert.equal(kept.filter((r) => r.role === 'user').length, 10);
    assert.equal(kept[0]!.role, 'user');
  });

  it('defines tools strict mode can take: every property required, no extras', () => {
    for (const t of RESUME_TOOL_DEFS) {
      const p = t.parameters as { properties: Record<string, unknown>; required: string[]; additionalProperties: boolean };
      assert.deepEqual([...p.required].sort(), Object.keys(p.properties).sort(), t.name);
      assert.equal(p.additionalProperties, false, t.name);
    }
  });
});

describe('cover letter and Word', () => {
  const letterArgs = (paragraphs: string[]) => ({ date: '', to: 'Hiring team, Acme Corp', greeting: 'Dear hiring team,', paragraphs, closing: 'Sincerely,' });

  it('writes the letter, refuses numbers nobody gave, and undoes it whole', () => {
    const c = ctx();
    const bad = call(c, 'write_letter', letterArgs(['I grew revenue 300% at Sample Harbor Lab.']));
    assert.match(bad.output, /^Not done: 300/);
    const out = call(c, 'write_letter', letterArgs(['I build weekly metrics from event data for three product teams.', 'I would like to do the same at Acme.']));
    assert.match(out.output, /^Done/);
    assert.equal(out.letter.paragraphs.length, 2);
    assert.equal(out.changes[0]!.note, 'Wrote your cover letter');
    assert.equal(touched(out.changes[0]!.change).length, 2);
    const back = revert(out, out.changes[0]!.change);
    assert.ok('letter' in back);
    assert.deepEqual(back.letter, c.letter);
    // A second pass keeps the ids of paragraphs it didn't change, so only the new one is marked.
    const again = call({ ...c, letter: out.letter }, 'write_letter', letterArgs([out.letter.paragraphs[0]!.text, 'I’d like to bring that to Acme’s analytics team.']));
    assert.equal(again.letter.paragraphs[0]!.id, out.letter.paragraphs[0]!.id);
    assert.equal(touched(again.changes[0]!.change).length, 1);
  });

  it('makes a letter PDF and Word files that read back in order', async () => {
    const doc = exampleDoc();
    const letter = { ...emptyLetter(), to: 'Hiring team, Acme Corp', paragraphs: [{ id: 'par_aaaaaaaa', text: 'I check every number twice.' }, { id: 'par_bbbbbbbb', text: '我也会说中文。' }] };
    const pdf = await readResume(await letterPdf(doc, letter, defaultStyle()), 'letter.pdf');
    assert.ok(pdf.ok);
    const text = pdf.pages.map((x) => x.text).join('\n');
    for (const want of ['Lin Zhou', 'Hiring team, Acme Corp', 'Dear hiring team,', 'I check every number twice.', '我也会说中文', 'Sincerely,']) assert.ok(text.includes(want), want);
    assert.ok(text.indexOf('Dear hiring team') < text.indexOf('I check every number'));

    const word = await readResume(await docDocx(doc, defaultStyle(), 1), 'resume.docx');
    assert.ok(word.ok);
    const w = word.pages.map((x) => x.text).join('\n');
    for (const want of ['Lin Zhou', 'WORK EXPERIENCE', 'Sample Harbor Lab', 'Built and checked weekly metrics']) assert.ok(w.includes(want), want);
    assert.ok(!w.includes('555-0142'), 'hidden phone stays off');
    assert.ok(w.indexOf('EDUCATION') < w.indexOf('WORK EXPERIENCE'));

    const wordLetter = await readResume(await docDocx(doc, defaultStyle(), 1, letter), 'letter.docx');
    assert.ok(wordLetter.ok);
    assert.ok(wordLetter.pages.map((x) => x.text).join('\n').includes('I check every number twice.'));
  });
});
