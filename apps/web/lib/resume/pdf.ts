import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as fontkit from 'fontkit';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { Resume } from './model';

// The résumé as a PDF: US Letter, one column, real text (no images of text), so an applicant
// tracking system reads it in order. Latin text is set in Atkinson Hyperlegible Next; anything it
// has no glyph for (Chinese names and places) falls back to Noto Sans SC, character by character.
// next.config.ts traces the font files into the route's deployment.

export const FONTS_DIR = path.join(process.cwd(), 'lib/resume/fonts');

const PAGE = { width: 612, height: 792, margin: 54 };
const INK = rgb(0.1, 0.1, 0.12);
const MUTED = rgb(0.38, 0.38, 0.42);

// pdf-lib's own fontkit fork drops the parts of composite glyphs when it subsets a font, which
// blanks most Chinese characters. fontkit 2 subsets them correctly; pdf-lib only needs its subset
// to offer the older streaming encoder.
type Emitter = { on(event: string, cb: (arg?: unknown) => void): Emitter };
const compatFontkit = {
  create(data: Uint8Array) {
    const font = fontkit.create(data as Buffer) as fontkit.Font;
    const createSubset = font.createSubset.bind(font);
    return Object.assign(font, {
      createSubset() {
        const subset = createSubset();
        return Object.assign(subset, {
          encodeStream() {
            const on: Record<string, (arg?: unknown) => void> = {};
            queueMicrotask(() => {
              try {
                on.data?.(subset.encode());
                on.end?.();
              } catch (e) {
                on.error?.(e);
              }
            });
            const emitter: Emitter = { on: (event, cb) => ((on[event] = cb), emitter) };
            return emitter;
          },
        });
      },
    });
  },
};

type Fonts = { regular: PDFFont; bold: PDFFont; cjk: PDFFont; has: (font: PDFFont, ch: string) => boolean };

// Read once per server instance: the files, and fontkit's view of them for glyph coverage.
let cache: { files: Record<'regular' | 'bold' | 'cjk', Buffer>; cover: Record<'regular' | 'bold' | 'cjk', fontkit.Font> } | null = null;
function fontFiles() {
  if (!cache) {
    const read = (f: string) => readFileSync(path.join(FONTS_DIR, f));
    const files = { regular: read('atkinson-400.woff'), bold: read('atkinson-700.woff'), cjk: read('noto-sans-sc-400.woff') };
    const view = (b: Buffer) => fontkit.create(b) as fontkit.Font;
    cache = { files, cover: { regular: view(files.regular), bold: view(files.bold), cjk: view(files.cjk) } };
  }
  return cache;
}

async function loadFonts(doc: PDFDocument): Promise<Fonts> {
  doc.registerFontkit(compatFontkit as never);
  const { files, cover } = fontFiles();
  const [regular, bold, cjk] = await Promise.all([
    doc.embedFont(files.regular, { subset: true }),
    doc.embedFont(files.bold, { subset: true }),
    doc.embedFont(files.cjk, { subset: true }),
  ]);
  const of = new Map([
    [regular, cover.regular],
    [bold, cover.bold],
    [cjk, cover.cjk],
  ]);
  return { regular, bold, cjk, has: (font, ch) => of.get(font)!.hasGlyphForCodePoint(ch.codePointAt(0)!) };
}

type Run = { text: string; font: PDFFont };

/** Text split into runs by the font that can draw it; characters no font has are dropped. */
function runs(text: string, font: PDFFont, fonts: Fonts): Run[] {
  const out: Run[] = [];
  for (const ch of text.replace(/[\t\r\n]+/g, ' ')) {
    const f = fonts.has(font, ch) ? font : fonts.has(fonts.cjk, ch) ? fonts.cjk : null;
    if (!f) continue;
    const last = out[out.length - 1];
    if (last?.font === f) last.text += ch;
    else out.push({ text: ch, font: f });
  }
  return out;
}

const widthOf = (rs: Run[], size: number) => rs.reduce((w, r) => w + r.font.widthOfTextAtSize(r.text, size), 0);

// Words break at spaces; Chinese, Japanese and Korean characters break anywhere.
const TOKENS = /[　-鿿가-힯＀-￯]|[^\s　-鿿가-힯＀-￯]+|\s+/g;

/** Lines of at most `max` points wide. */
function wrap(text: string, font: PDFFont, size: number, max: number, fonts: Fonts): string[] {
  const lines: string[] = [];
  let line = '';
  for (const token of text.match(TOKENS) ?? []) {
    const next = line + token;
    if (line && widthOf(runs(next.trimEnd(), font, fonts), size) > max) {
      lines.push(line.trimEnd());
      line = token.trimStart();
    } else line = next;
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines;
}

class Writer {
  page: PDFPage;
  y: number;
  constructor(
    private doc: PDFDocument,
    private fonts: Fonts,
  ) {
    this.page = doc.addPage([PAGE.width, PAGE.height]);
    this.y = PAGE.height - PAGE.margin;
  }

  private room(height: number) {
    if (this.y - height < PAGE.margin) {
      this.page = this.doc.addPage([PAGE.width, PAGE.height]);
      this.y = PAGE.height - PAGE.margin;
    }
  }

  private draw(text: string, x: number, size: number, font: PDFFont, color = INK) {
    for (const r of runs(text, font, this.fonts)) {
      this.page.drawText(r.text, { x, y: this.y, size, font: r.font, color });
      x += r.font.widthOfTextAtSize(r.text, size);
    }
  }

  /** A paragraph, wrapped, with an optional hanging bullet. */
  text(text: string, o: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; bullet?: boolean; gap?: number } = {}) {
    const size = o.size ?? 10.5;
    const font = o.bold ? this.fonts.bold : this.fonts.regular;
    const indent = o.bullet ? 12 : 0;
    const lead = size * 1.35;
    for (const [i, line] of wrap(text, font, size, PAGE.width - 2 * PAGE.margin - indent, this.fonts).entries()) {
      this.room(lead);
      this.y -= lead;
      if (o.bullet && i === 0) this.draw('•', PAGE.margin + 2, size, font, o.color);
      this.draw(line, PAGE.margin + indent, size, font, o.color);
    }
    this.y -= o.gap ?? 0;
  }

  /** "Title, Org" on the left, the dates on the right of the same line. */
  entryHead(left: string, right: string | null) {
    const size = 10.5;
    const lead = size * 1.35;
    const rightWidth = right ? widthOf(runs(right, this.fonts.regular, this.fonts), size) : 0;
    const lines = wrap(left, this.fonts.bold, size, PAGE.width - 2 * PAGE.margin - rightWidth - 12, this.fonts);
    for (const [i, line] of lines.entries()) {
      this.room(lead);
      this.y -= lead;
      this.draw(line, PAGE.margin, size, this.fonts.bold);
      if (i === 0 && right) this.draw(right, PAGE.width - PAGE.margin - rightWidth, size, this.fonts.regular, MUTED);
    }
  }

  heading(text: string) {
    this.room(40);
    this.y -= 14;
    this.text(text.toUpperCase(), { size: 10, bold: true, color: MUTED });
    this.y -= 3;
    this.page.drawLine({
      start: { x: PAGE.margin, y: this.y },
      end: { x: PAGE.width - PAGE.margin, y: this.y },
      thickness: 0.6,
      color: MUTED,
    });
    this.y -= 2;
  }
}

/** The résumé as PDF bytes. */
export async function resumePdf(r: Resume): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(r.target ? `${r.name}: résumé for ${r.target}` : `${r.name}: résumé`);
  doc.setAuthor(r.name);
  doc.setCreator('Portrait');
  const fonts = await loadFonts(doc);
  const w = new Writer(doc, fonts);

  w.text(r.name, { size: 20, bold: true, gap: 2 });
  if (r.contact.length) w.text(r.contact.join('  ·  '), { size: 9.5, color: MUTED });
  if (r.summary) w.text(r.summary, { size: 11, gap: 2 });

  for (const s of r.sections) {
    w.heading(s.heading);
    for (const e of s.entries) {
      const head = [e.title, e.org].filter(Boolean).join(', ');
      if (head || e.when) w.entryHead(head, e.when);
      // Summary and skills read as lines of their own; experience as bullets under its heading.
      for (const b of e.bullets) w.text(b, { bullet: !!(head || e.when) || s.heading === 'Skills' || s.heading === 'Background' });
      w.y -= 4;
    }
  }
  return doc.save();
}
