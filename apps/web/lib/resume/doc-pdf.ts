import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as fontkit from 'fontkit';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { compatFontkit, FONTS_DIR } from './pdf';
import { dates, hasHeadLine, metrics, minScale, PAPER, shown, shownContacts, type FontId, type ResumeDoc, type ResumeStyle } from './doc';

// A version from the résumé editor as a PDF, laid out the way the editor's page shows it
// (components/resume/ResumePage.tsx): same fonts, sizes, spacing and margins, real text in reading
// order. With fit to one page on, the type and spacing shrink step by step until it fits, never
// below the floor in lib/resume/doc.ts. Characters the chosen font lacks (Chinese) fall back to
// Noto Sans SC one by one.

const INK = rgb(0.07, 0.07, 0.08);
const MUTED = rgb(0.35, 0.35, 0.38);

type Face = { pdf: PDFFont; cover: fontkit.Font };
type Faces = { regular: Face; bold: Face; cjk: Face };

const files = new Map<string, { bytes: Buffer; cover: fontkit.Font }>();
function file(name: string) {
  let f = files.get(name);
  if (!f) {
    const bytes = readFileSync(path.join(FONTS_DIR, name));
    f = { bytes, cover: fontkit.create(bytes) as fontkit.Font };
    files.set(name, f);
  }
  return f;
}

async function embed(doc: PDFDocument, font: FontId): Promise<Faces> {
  doc.registerFontkit(compatFontkit as never);
  const face = async (name: string): Promise<Face> => {
    const f = file(name);
    return { pdf: await doc.embedFont(f.bytes, { subset: true }), cover: f.cover };
  };
  const [regular, bold, cjk] = await Promise.all([face(`${font}-400.woff`), face(`${font}-700.woff`), face('noto-sans-sc-400.woff')]);
  return { regular, bold, cjk };
}

type Piece = { text: string; font: PDFFont; width: number };
/** A word (or one CJK character, or a space) in one weight, split by the face that can draw it. */
type Token = { pieces: Piece[]; width: number; space: boolean };
type Line = { tokens: Token[]; width: number };
type Span = { text: string; bold?: boolean };

// Words break at spaces; Chinese, Japanese and Korean characters break anywhere.
const TOKENS = /[　-鿿가-힯＀-￯]|[^\s　-鿿가-힯＀-￯]+|\s+/g;

function tokenize(spans: Span[], faces: Faces, size: number): Token[] {
  const out: Token[] = [];
  for (const span of spans) {
    const face = span.bold ? faces.bold : faces.regular;
    for (const raw of span.text.replace(/[\t\r\n]+/g, ' ').match(TOKENS) ?? []) {
      if (/^\s+$/.test(raw)) {
        const w = face.pdf.widthOfTextAtSize(' ', size);
        out.push({ pieces: [{ text: ' ', font: face.pdf, width: w }], width: w, space: true });
        continue;
      }
      const pieces: Piece[] = [];
      for (const ch of raw) {
        const cp = ch.codePointAt(0)!;
        const f = face.cover.hasGlyphForCodePoint(cp) ? face : faces.cjk.cover.hasGlyphForCodePoint(cp) ? faces.cjk : null;
        if (!f) continue;
        const last = pieces[pieces.length - 1];
        if (last?.font === f.pdf) last.text += ch;
        else pieces.push({ text: ch, font: f.pdf, width: 0 });
      }
      for (const p of pieces) p.width = p.font.widthOfTextAtSize(p.text, size);
      if (pieces.length) out.push({ pieces, width: pieces.reduce((w, p) => w + p.width, 0), space: false });
    }
  }
  return out;
}

/** Tokens broken into lines at most `max` wide; spaces at a break are dropped. */
function wrap(tokens: Token[], max: number): Line[] {
  const lines: Line[] = [];
  let cur: Token[] = [];
  let width = 0;
  const flush = () => {
    while (cur.length && cur[cur.length - 1]!.space) width -= cur.pop()!.width;
    if (cur.length) lines.push({ tokens: cur, width });
    cur = [];
    width = 0;
  };
  for (const t of tokens) {
    if (t.space && !cur.length) continue;
    if (!t.space && cur.length && width + t.width > max) flush();
    cur.push(t);
    width += t.width;
  }
  flush();
  return lines;
}

type Align = 'left' | 'center' | 'justify';

class Layout {
  pages: PDFPage[] = [];
  page!: PDFPage;
  y = 0;
  constructor(
    private doc: PDFDocument | null,
    private paper: { width: number; height: number },
    private margin: number,
  ) {
    this.newPage();
  }
  get width() {
    return this.paper.width - 2 * this.margin;
  }
  get left() {
    return this.margin;
  }
  /** Pages used so far (a dry run counts without drawing). */
  count = 0;
  private newPage() {
    this.count += 1;
    if (this.doc) {
      this.page = this.doc.addPage([this.paper.width, this.paper.height]);
      this.pages.push(this.page);
    }
    this.y = this.paper.height - this.margin;
  }
  room(h: number) {
    if (this.y - h < this.margin - 0.5) this.newPage();
  }
  drawTokens(tokens: Token[], x: number, size: number, color = INK, extraPerSpace = 0) {
    for (const t of tokens) {
      if (!t.space && this.doc) {
        let px = x;
        for (const p of t.pieces) {
          this.page.drawText(p.text, { x: px, y: this.y, size, font: p.font, color });
          px += p.width;
        }
      }
      x += t.width + (t.space ? extraPerSpace : 0);
    }
  }
  /** A wrapped paragraph; the first line may carry a bullet hanging in the indent. */
  paragraph(tokens: Token[], o: { size: number; lead: number; align: Align; indent?: number; bullet?: Token[]; color?: ReturnType<typeof rgb> }) {
    const indent = o.indent ?? 0;
    const max = this.width - indent;
    const lines = wrap(tokens, max);
    for (const [i, line] of lines.entries()) {
      this.room(o.lead);
      this.y -= o.lead;
      const baseline = this.y + (o.lead - o.size) / 2 + o.size * 0.22;
      const y = this.y;
      this.y = baseline;
      if (i === 0 && o.bullet) this.drawTokens(o.bullet, this.left + indent * 0.3, o.size, o.color);
      let x = this.left + indent;
      let extra = 0;
      if (o.align === 'center') x += (max - line.width) / 2;
      if (o.align === 'justify' && i < lines.length - 1) {
        const spaces = line.tokens.filter((t) => t.space).length;
        if (spaces) extra = (max - line.width) / spaces;
      }
      this.drawTokens(line.tokens, x, o.size, o.color, extra);
      this.y = y;
    }
  }
  /** One line with text on the left and dates on the right, the left wrapping before the dates. */
  split(left: Token[], right: Token[], size: number, lead: number) {
    const rightWidth = right.reduce((w, t) => w + t.width, 0);
    const lines = wrap(left, this.width - (rightWidth ? rightWidth + 12 : 0));
    if (!lines.length && rightWidth) lines.push({ tokens: [], width: 0 });
    for (const [i, line] of lines.entries()) {
      this.room(lead);
      this.y -= lead;
      const y = this.y;
      this.y = y + (lead - size) / 2 + size * 0.22;
      this.drawTokens(line.tokens, this.left, size);
      if (i === 0 && rightWidth) this.drawTokens(right, this.left + this.width - rightWidth, size);
      this.y = y;
    }
  }
  rule(thickness: number) {
    if (this.doc) this.page.drawLine({ start: { x: this.left, y: this.y }, end: { x: this.left + this.width, y: this.y }, thickness, color: INK });
  }
}

/** Lays the page out once; with no document it only counts pages. */
function lay(doc: PDFDocument | null, faces: Faces, resume: ResumeDoc, style: ResumeStyle, scale: number) {
  const m = metrics(style, scale);
  const L = new Layout(doc, PAPER[style.paper], m.margin);
  const compact = style.template === 'compact';
  const head: Align = compact ? 'left' : 'center';
  const body: Align = style.align === 'justify' ? 'justify' : 'left';
  const tk = (spans: Span[], size = m.size) => tokenize(spans, faces, size);

  if (resume.name) L.paragraph(tk([{ text: resume.name, bold: true }], m.name), { size: m.name, lead: m.name * 1.2, align: head });
  if (resume.title) L.paragraph(tk([{ text: resume.title }], m.size * 1.1), { size: m.size * 1.1, lead: m.lead * 1.1, align: head });
  const contacts = shownContacts(resume).map((c) => c.value.trim());
  if (contacts.length) {
    const s = m.size * 0.95;
    L.paragraph(tk([{ text: contacts.join(' | ') }], s), { size: s, lead: m.lead * 0.95, align: head, color: MUTED });
  }

  for (const section of shown(resume)) {
    L.room(m.sectionGap + m.heading * 1.4 + m.lead * 2);
    L.y -= m.sectionGap;
    L.paragraph(tk([{ text: section.heading.toUpperCase(), bold: true }], m.heading), { size: m.heading, lead: m.heading * 1.3, align: 'left' });
    L.y -= 1.5;
    L.rule(0.75);
    L.y -= 2.5;

    for (const [i, e] of section.entries.entries()) {
      if (i > 0) L.y -= m.entryGap;
      if (section.kind === 'summary') {
        L.paragraph(tk([{ text: e.text }]), { size: m.size, lead: m.lead, align: body });
      } else if (section.kind === 'skills') {
        L.paragraph(tk(e.title ? [{ text: `${e.title}: `, bold: true }, { text: e.text }] : [{ text: e.text }]), { size: m.size, lead: m.lead, align: body });
      } else if (hasHeadLine(section.kind)) {
        const rest = [e.subtitle, e.place].map((x) => x.trim()).filter(Boolean);
        const left: Span[] = [{ text: e.title, bold: true }, ...(rest.length ? [{ text: `${e.title ? ' | ' : ''}${rest.join(' | ')}` }] : [])];
        const when = dates(e);
        if (e.title || rest.length || when) L.split(tk(left), tk([{ text: when }]), m.size, m.lead);
        if (e.text) L.paragraph(tk([{ text: e.text }]), { size: m.size, lead: m.lead, align: body, color: MUTED });
      }
      for (const b of e.bullets) {
        if (!b.text.trim()) continue;
        L.paragraph(tk([{ text: b.text }]), { size: m.size, lead: m.lead, align: body, indent: m.size * 1.3, bullet: tk([{ text: '•' }]) });
      }
    }
  }
  return L.count;
}

/** The scale the page is set at: 1, or the largest that fits one page when asked to fit. */
export async function fitScale(resume: ResumeDoc, style: ResumeStyle): Promise<{ scale: number; pages: number }> {
  const scratch = await PDFDocument.create();
  const faces = await embed(scratch, style.font);
  let pages = lay(null, faces, resume, style, 1);
  if (!style.fitOnePage || pages <= 1) return { scale: 1, pages };
  const floor = minScale(style);
  let scale = 1;
  while (pages > 1 && scale > floor) {
    scale = Math.max(floor, scale - 0.02);
    pages = lay(null, faces, resume, style, scale);
  }
  return { scale, pages };
}

/** The version as PDF bytes. */
export async function docPdf(resume: ResumeDoc, style: ResumeStyle, meta: { title?: string } = {}): Promise<Uint8Array> {
  const { scale } = await fitScale(resume, style);
  const doc = await PDFDocument.create();
  doc.setTitle(meta.title ?? `${resume.name || 'Résumé'}: résumé`);
  if (resume.name) doc.setAuthor(resume.name);
  doc.setCreator('Skystep');
  const faces = await embed(doc, style.font);
  lay(doc, faces, resume, style, scale);
  return doc.save();
}
