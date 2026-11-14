import { AlignmentType, BorderStyle, Document, LevelFormat, Packer, Paragraph, TabStopType, TextRun, type IRunOptions } from 'docx';
import { dates, hasHeadLine, MARGIN, metrics, PAPER, shown, shownContacts, type FontId, type ResumeDoc, type ResumeLetter, type ResumeStyle } from './doc';

// A version from the résumé editor as a Word file (PRD COACH-12), for people who finish their
// résumé elsewhere or are asked for .docx. Same order, words and spacing as the page and the PDF
// (lib/resume/doc-pdf.ts), as real Word paragraphs: headings, a right tab for the dates, Word's
// own bullets. Word sets it in the font the stand-in was drawn to match (Arial for Arimo and so
// on), which every copy of Word has.

const WORD_FONT: Record<FontId, string> = {
  arimo: 'Arial',
  carlito: 'Calibri',
  atkinson: 'Atkinson Hyperlegible',
  tinos: 'Times New Roman',
  gelasio: 'Georgia',
};

const INK = '18181B';
const MUTED = '55555C';
// Word measures type in half-points and space in twentieths of a point.
const half = (pt: number) => Math.round(pt * 2);
const twip = (pt: number) => Math.round(pt * 20);

function build(resume: ResumeDoc, style: ResumeStyle, scale: number, letter: ResumeLetter | null) {
  const m = metrics(style, scale);
  const paper = PAPER[style.paper];
  const margin = MARGIN[style.template];
  const head = style.template === 'compact' ? AlignmentType.LEFT : AlignmentType.CENTER;
  const body = style.align === 'justify' ? AlignmentType.JUSTIFIED : AlignmentType.LEFT;
  const run = (text: string, o: IRunOptions = {}) => new TextRun({ text, size: half(m.size), color: INK, ...o });
  // Exact line height, as on the page; `before` is the gap above the paragraph.
  const line = (lead: number, before = 0) => ({ spacing: { line: twip(lead), lineRule: 'exact' as const, before: twip(before), after: 0 } });
  const right = twip(paper.width - 2 * margin);

  const out: Paragraph[] = [];
  if (resume.name) out.push(new Paragraph({ alignment: head, ...line(m.name * 1.2), children: [run(resume.name, { bold: true, size: half(m.name) })] }));
  if (resume.title) out.push(new Paragraph({ alignment: head, ...line(m.lead * 1.1), children: [run(resume.title, { size: half(m.size * 1.1) })] }));
  const contacts = shownContacts(resume).map((c) => c.value.trim());
  if (contacts.length) out.push(new Paragraph({ alignment: head, ...line(m.lead * 0.95), children: [run(contacts.join(' | '), { size: half(m.size * 0.95), color: MUTED })] }));

  if (letter) {
    let gap = m.sectionGap * 1.5;
    const block = (text: string, align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT) => {
      if (!text.trim()) return;
      out.push(new Paragraph({ alignment: align, ...line(m.lead, gap), children: [run(text)] }));
      gap = m.lead;
    };
    block(letter.date);
    block(letter.to);
    block(letter.greeting);
    for (const [i, x] of letter.paragraphs.filter((p) => p.text.trim()).entries()) {
      if (i > 0) gap = m.lead * 0.6;
      block(x.text, body);
    }
    gap = m.lead;
    block(letter.closing);
    if (resume.name) {
      gap = m.lead * 2;
      block(resume.name);
    }
  } else {
    for (const section of shown(resume)) {
      out.push(
        new Paragraph({
          ...line(m.heading * 1.3, m.sectionGap),
          keepNext: true,
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: INK, space: 1 } },
          children: [run(section.heading.toUpperCase(), { bold: true, size: half(m.heading) })],
        }),
      );
      let first = true;
      for (const e of section.entries) {
        const gap = first ? 2.5 : m.entryGap;
        first = false;
        if (section.kind === 'summary') {
          out.push(new Paragraph({ alignment: body, ...line(m.lead, gap), children: [run(e.text)] }));
        } else if (section.kind === 'skills') {
          out.push(new Paragraph({ alignment: body, ...line(m.lead, gap), children: [...(e.title ? [run(`${e.title}: `, { bold: true })] : []), run(e.text)] }));
        } else if (hasHeadLine(section.kind)) {
          const rest = [e.subtitle, e.place].map((x) => x.trim()).filter(Boolean);
          const when = dates(e);
          out.push(
            new Paragraph({
              ...line(m.lead, gap),
              keepNext: true,
              tabStops: [{ type: TabStopType.RIGHT, position: right }],
              children: [
                run(e.title, { bold: true }),
                ...(rest.length ? [run(`${e.title ? ' | ' : ''}${rest.join(' | ')}`)] : []),
                ...(when ? [run(`\t${when}`)] : []),
              ],
            }),
          );
          if (e.text) out.push(new Paragraph({ alignment: body, ...line(m.lead), children: [run(e.text, { color: MUTED })] }));
        }
        for (const b of e.bullets) {
          if (!b.text.trim()) continue;
          out.push(new Paragraph({ alignment: body, ...line(m.lead), numbering: { reference: 'bullets', level: 0 }, children: [run(b.text)] }));
        }
      }
    }
  }

  return new Document({
    creator: 'Skystep',
    title: `${resume.name || 'Résumé'}: ${letter ? 'cover letter' : 'résumé'}`,
    styles: { default: { document: { run: { font: WORD_FONT[style.font], size: half(m.size), color: INK } } } },
    numbering: {
      config: [
        {
          reference: 'bullets',
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '•',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: twip(m.size * 1.3), hanging: twip(m.size * 0.91) } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: twip(paper.width), height: twip(paper.height) },
            margin: { top: twip(margin), bottom: twip(margin), left: twip(margin), right: twip(margin) },
          },
        },
        children: out,
      },
    ],
  });
}

/** The résumé, or its cover letter, as .docx bytes, at the scale the page fits at. */
export async function docDocx(resume: ResumeDoc, style: ResumeStyle, scale: number, letter: ResumeLetter | null = null): Promise<Uint8Array> {
  const buffer = await Packer.toBuffer(build(resume, style, scale, letter));
  return new Uint8Array(buffer);
}
