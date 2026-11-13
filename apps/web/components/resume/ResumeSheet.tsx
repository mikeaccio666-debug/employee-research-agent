'use client';

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from '@portrait/ui';
import {
  dates,
  FONTS,
  hasHeadLine,
  metrics,
  PAPER,
  SECTION_INFO,
  type Contact,
  type Entry,
  type ResumeDoc,
  type ResumeStyle,
  type Section,
} from '@/lib/resume/doc';
import * as edit from '@/lib/resume/edit';
import { CloseIcon, DownIcon, EyeIcon, EyeOffIcon, GripIcon, LineIcon, UpIcon } from './icons';
import s from './resume.module.css';

// The sheet of paper in the résumé editor: the version set in its template, font and size, with
// every field editable in place. Laid out with the same numbers as the PDF (lib/resume/doc-pdf.ts),
// in points, so what you see is what you download. Read only, it is the same page without the
// editing controls.

/**
 * What the assistant changed, marked on the page until the person has looked: field ids
 * ("blt_x:b", "ent_x:title", "title") and the ids of whole sections, entries and bullets it added
 * or moved. `hot` is the one whose receipt is being pointed at in the thread.
 */
export type Marks = { ids: ReadonlySet<string>; hot: string | null; seen?: (id: string) => void };
export const MarksContext = createContext<Marks>({ ids: new Set(), hot: null });
function useMark(id: string) {
  const m = useContext(MarksContext);
  return cx(m.ids.has(id) && s.ai, m.hot === id && s.hot);
}

export type SheetChange = (next: ResumeDoc, opts?: { commit?: boolean; focus?: string }) => void;

type Props = {
  doc: ResumeDoc;
  style: ResumeStyle;
  /** Fit-to-one-page's shrink factor, worked out by the editor by measuring. */
  scale: number;
  /** Null shows the page read only. */
  onChange: SheetChange | null;
  /** A field to put the cursor in once it exists (a bullet just added). */
  focus: { id: string; n: number } | null;
  /** Where page one ends on the sheet, in points from the top of the content, when content runs past it. */
  pageEnd: number | null;
  contentRef?: React.Ref<HTMLDivElement>;
  sheetRef?: React.Ref<HTMLDivElement>;
  /** Phones: the text flows to the screen's width at full size, for editing; not the page's layout. */
  reflow?: boolean;
};

/** CSS variables for a style at a scale, in points: the sheet and the fit measurement share them. */
export function sheetVars(style: ResumeStyle, scale: number): Record<string, string> {
  const m = metrics(style, scale);
  return {
    '--size': `${m.size}pt`,
    '--lead': `${m.lead}pt`,
    '--name': `${m.name}pt`,
    '--heading': `${m.heading}pt`,
    '--section-gap': `${m.sectionGap}pt`,
    '--entry-gap': `${m.entryGap}pt`,
  };
}

export function ResumeSheet({ doc, style, scale, onChange, focus, pageEnd, contentRef, sheetRef, reflow }: Props) {
  const editing = !!onChange;
  const paper = PAPER[style.paper];
  const m = metrics(style, scale);
  const centered = style.template === 'standard';

  // Put the cursor in a field that was just added, as soon as it's on the page (a frame later if
  // React hasn't drawn it yet).
  useEffect(() => {
    if (!focus) return;
    let frame = 0;
    const put = (tries: number) => {
      const el = document.querySelector<HTMLElement>(`[data-field="${CSS.escape(focus.id)}"]`);
      if (!el) {
        if (tries > 0) frame = requestAnimationFrame(() => put(tries - 1));
        return;
      }
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    };
    put(5);
    return () => cancelAnimationFrame(frame);
  }, [focus]);

  const sheetStyle = {
    width: reflow ? '100%' : `${paper.width}pt`,
    minHeight: reflow ? undefined : `${paper.height}pt`,
    padding: reflow ? '20px 16px 28px 28px' : `${m.margin}pt`,
    fontFamily: FONTS[style.font].css,
    ...sheetVars(style, scale),
  } as CSSProperties;

  const contacts = editing ? doc.contacts : doc.contacts.filter((c) => !c.hidden && c.value.trim());

  return (
    <div ref={sheetRef} className={cx(s.sheet, editing && s.editing, style.align === 'justify' && s.justify)} style={sheetStyle}>
      <div ref={contentRef} className={s.content}>
        {pageEnd !== null && !reflow ? <div className={s.pageEnd} style={{ top: `${pageEnd}pt` }} data-label="End of page 1" aria-hidden /> : null}

        <div className={cx(s.name, centered && s.center)}>
          <Text value={doc.name} id="name" placeholder="Your name" onChange={onChange && ((v, commit) => onChange(edit.setHeader(doc, { name: v }), { commit }))} />
        </div>
        {doc.title || editing ? (
          <div className={cx(s.title, centered && s.center)}>
            <Text value={doc.title} id="title" placeholder="Title, e.g. Data Analyst" onChange={onChange && ((v, commit) => onChange(edit.setHeader(doc, { title: v }), { commit }))} />
          </div>
        ) : null}
        {contacts.length || editing ? (
          <div className={cx(s.contacts, centered && s.center)}>
            {contacts.map((c, i) => (
              <ContactField key={c.id} c={c} first={i === 0} doc={doc} onChange={onChange} />
            ))}
            {editing && doc.contacts.length < 8 ? (
              <>
                {contacts.length ? <span className={s.sep}>{'  '}</span> : null}
                <button
                  type="button"
                  className={s.add}
                  onClick={() => {
                    const [next, id] = edit.addContact(doc, 'link');
                    onChange!(next, { commit: true, focus: id });
                  }}
                >
                  + Add contact
                </button>
              </>
            ) : null}
          </div>
        ) : null}

        {doc.sections.map((sec) =>
          sec.hidden && !editing ? null : !editing && !hasContent(sec) ? null : (
            <SectionView key={sec.id} sec={sec} doc={doc} onChange={onChange} />
          ),
        )}
      </div>
    </div>
  );
}

const hasContent = (sec: Section) => sec.entries.some((e) => e.title || e.subtitle || e.text || e.bullets.some((b) => b.text.trim()));

function ContactField({ c, first, doc, onChange }: { c: Contact; first: boolean; doc: ResumeDoc; onChange: SheetChange | null }) {
  const placeholder = { email: 'Email', phone: 'Phone', location: 'City, State', link: 'linkedin.com/in/you' }[c.kind];
  return (
    <span className={cx(s.contactWrap, c.hidden && s.hiddenContact)}>
      {first ? null : <span className={s.sep}>{' | '}</span>}
      <Text
        value={c.value}
        id={c.id}
        placeholder={placeholder}
        onChange={onChange && ((v, commit) => onChange(edit.setContact(doc, c.id, { value: v }), { commit }))}
        onKeyDown={(e) => {
          if (e.key === 'Backspace' && !c.value && onChange) {
            e.preventDefault();
            onChange(edit.removeContact(doc, c.id), { commit: true });
          }
        }}
      />
      {onChange ? (
        <button
          type="button"
          className={s.eye}
          title={c.hidden ? 'Show on the page' : 'Hide from the page'}
          aria-label={c.hidden ? `Show ${placeholder} on the page` : `Hide ${placeholder} from the page`}
          onClick={() => onChange(edit.setContact(doc, c.id, { hidden: !c.hidden }), { commit: true })}
        >
          {c.hidden ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      ) : null}
    </span>
  );
}

function SectionView({ sec, doc, onChange }: { sec: Section; doc: ResumeDoc; onChange: SheetChange | null }) {
  const editing = !!onChange;
  const info = SECTION_INFO[sec.kind];
  const entries = editing ? sec.entries : sec.entries.filter((e) => e.title || e.subtitle || e.text || e.bullets.some((b) => b.text.trim()));
  const drag = useDrag((from, to) => onChange?.(edit.moveEntry(doc, sec.id, from, to), { commit: true }));
  const canAdd = editing && (sec.kind !== 'summary' || sec.entries.length === 0);
  const mark = useMark(sec.id);
  const marks = useContext(MarksContext);
  const markOf = (id: string) => cx(marks.ids.has(id) && s.ai, marks.hot === id && s.hot);

  return (
    <section className={cx(s.section, sec.hidden && s.hiddenSection, mark)} aria-label={sec.heading}>
      <div className={s.heading}>
        <Text value={sec.heading} id={`${sec.id}:h`} placeholder={info.heading} onChange={onChange && ((v, commit) => onChange(edit.setSection(doc, sec.id, { heading: v }), { commit }))} />
        {sec.hidden ? <span className={s.hiddenNote}>hidden from the page</span> : null}
      </div>
      {entries.map((e, i) => (
        <div key={e.id} className={cx(s.entry, drag.over === e.id && s.dropBefore, drag.dragging === e.id && s.dragging, markOf(e.id))} {...drag.target(e.id, i)}>
          {editing && sec.kind !== 'summary' ? (
            <span className={s.rowTools}>
              <span className={s.grip} {...drag.handle(e.id, i)} title="Drag to reorder" aria-hidden>
                <GripIcon />
              </span>
              <button type="button" title="Move up" aria-label={`Move ${e.title || 'this entry'} up`} disabled={i === 0} onClick={() => onChange!(edit.moveEntry(doc, sec.id, e.id, i - 1), { commit: true })}>
                <UpIcon />
              </button>
              <button
                type="button"
                title="Move down"
                aria-label={`Move ${e.title || 'this entry'} down`}
                disabled={i === entries.length - 1}
                onClick={() => onChange!(edit.moveEntry(doc, sec.id, e.id, i + 1), { commit: true })}
              >
                <DownIcon />
              </button>
              <button type="button" title="Delete" aria-label={`Delete ${e.title || 'this entry'}`} onClick={() => onChange!(edit.removeEntry(doc, sec.id, e.id), { commit: true })}>
                <CloseIcon />
              </button>
            </span>
          ) : null}
          <EntryView sec={sec} e={e} doc={doc} onChange={onChange} />
        </div>
      ))}
      {canAdd ? (
        <button
          type="button"
          className={s.add}
          onClick={() => {
            const [next, id] = edit.addEntry(doc, sec.id);
            if (id) onChange!(next, { commit: true, focus: sec.kind === 'summary' ? `${id}:text` : `${id}:title` });
          }}
        >
          + {info.add}
        </button>
      ) : null}
    </section>
  );
}

function EntryView({ sec, e, doc, onChange }: { sec: Section; e: Entry; doc: ResumeDoc; onChange: SheetChange | null }) {
  const editing = !!onChange;
  const info = SECTION_INFO[sec.kind];
  const set = (patch: Partial<Entry>, commit: boolean) => onChange?.(edit.setEntry(doc, sec.id, e.id, patch), { commit });
  const field = (key: 'title' | 'subtitle' | 'place' | 'start' | 'end' | 'text', placeholder: string, className?: string) => (
    <Text
      value={e[key]}
      id={`${e.id}:${key}`}
      placeholder={placeholder}
      label={`${sec.heading}${e.title && key !== 'title' ? `, ${e.title}` : ''}: ${placeholder}`}
      className={className}
      onChange={onChange && ((v, commit) => set({ [key]: v }, commit))}
    />
  );
  // The line under the heading takes a whole line, so when empty it waits to be asked for (the ¶
  // button beside the entry) instead of showing a placeholder that would come and go and move
  // everything below it.
  const [wantText, setWantText] = useState(false);

  if (sec.kind === 'summary') return <div className={s.para}>{field('text', info.text, s.block)}</div>;

  if (sec.kind === 'skills')
    return (
      <div className={s.para}>
        {e.title || editing ? (
          <>
            <span className={s.b}>{field('title', info.title)}</span>
            <span className={s.b}>: </span>
          </>
        ) : null}
        {field('text', info.text)}
      </div>
    );

  const when = dates(e);
  const show = (v: string) => editing || !!v.trim();
  return (
    <>
      {e.title || e.subtitle || e.place || when || editing ? (
        <div className={s.headLine}>
          <div className={s.headLeft}>
            <span className={s.b}>{field('title', info.title)}</span>
            {show(e.subtitle) ? (
              <>
                {e.title || editing ? <span className={s.sep}>{' | '}</span> : null}
                {field('subtitle', info.subtitle)}
              </>
            ) : null}
            {show(e.place) ? (
              <>
                <span className={s.sep}>{' | '}</span>
                {field('place', 'Location')}
              </>
            ) : null}
          </div>
          {editing ? (
            <div className={s.dates}>
              {field('start', 'Start')}
              <span className={s.sep}>{' – '}</span>
              {field('end', 'End')}
            </div>
          ) : when ? (
            <div className={s.dates}>{when}</div>
          ) : null}
        </div>
      ) : null}
      {info.text && (e.text.trim() || (editing && wantText)) ? <div className={cx(s.para, s.muted)}>{field('text', `${info.text}…`, s.block)}</div> : null}
      {editing && info.text && !e.text.trim() && !wantText ? (
        <span className={s.lineTool}>
          <button
            type="button"
            title={`Add a line: ${info.text.toLowerCase()}`}
            aria-label={`Add a line: ${info.text.toLowerCase()}`}
            onClick={() => {
              setWantText(true);
              requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-field="${CSS.escape(`${e.id}:text`)}"]`)?.focus());
            }}
          >
            <LineIcon />
          </button>
        </span>
      ) : null}
      <Bullets sec={sec} e={e} doc={doc} onChange={onChange} />
    </>
  );
}

function Bullets({ sec, e, doc, onChange }: { sec: Section; e: Entry; doc: ResumeDoc; onChange: SheetChange | null }) {
  const editing = !!onChange;
  const drag = useDrag((from, to) => onChange?.(edit.moveBullet(doc, sec.id, e.id, from, to), { commit: true }));
  const bullets = editing ? e.bullets : e.bullets.filter((b) => b.text.trim());
  const marks = useContext(MarksContext);
  const markOf = (id: string) => cx(marks.ids.has(id) && s.ai, marks.hot === id && s.hot);
  if (!bullets.length && !editing) return null;

  const onKey = (ev: KeyboardEvent<HTMLElement>, bid: string, i: number, text: string) => {
    if (!onChange) return;
    if (ev.key === 'Enter') {
      ev.preventDefault();
      const [next, id] = edit.addBullet(doc, sec.id, e.id, bid);
      if (id) onChange(next, { commit: true, focus: `${id}:b` });
    } else if (ev.key === 'Backspace' && !text) {
      ev.preventDefault();
      const prev = e.bullets[i - 1];
      onChange(edit.removeBullet(doc, sec.id, e.id, bid), { commit: true, focus: prev ? `${prev.id}:b` : undefined });
    } else if (ev.altKey && (ev.key === 'ArrowUp' || ev.key === 'ArrowDown')) {
      ev.preventDefault();
      onChange(edit.moveBullet(doc, sec.id, e.id, bid, i + (ev.key === 'ArrowUp' ? -1 : 1)), { commit: true, focus: `${bid}:b` });
    }
  };

  return (
    <>
      <ul className={s.bullets}>
        {bullets.map((b, i) => (
          <li key={b.id} className={cx(s.bullet, s.para, drag.over === b.id && s.dropBefore, drag.dragging === b.id && s.dragging, markOf(b.id))} {...drag.target(b.id, i)}>
            {editing ? (
              <span className={s.rowTools}>
                <span className={s.grip} {...drag.handle(b.id, i)} title="Drag to reorder (or Alt+↑/↓ while typing)" aria-hidden>
                  <GripIcon />
                </span>
              </span>
            ) : null}
            <Text
              value={b.text}
              id={`${b.id}:b`}
              placeholder="What you did and what came of it"
              label={`${e.title || sec.heading}, bullet ${i + 1} of ${bullets.length}. Enter adds a bullet, Alt+arrows move it`}
              className={s.block}
              onChange={onChange && ((v, commit) => onChange(edit.setBullet(doc, sec.id, e.id, b.id, v), { commit }))}
              onKeyDown={(ev) => onKey(ev, b.id, i, b.text)}
            />
          </li>
        ))}
      </ul>
      {editing && !e.bullets.length && hasHeadLine(sec.kind) ? (
        <button
          type="button"
          className={s.add}
          onClick={() => {
            const [next, id] = edit.addBullet(doc, sec.id, e.id);
            if (id) onChange!(next, { commit: true, focus: `${id}:b` });
          }}
        >
          + Add bullet
        </button>
      ) : null}
    </>
  );
}

/**
 * One editable run of text on the sheet. The browser owns the text while it's focused (so the
 * cursor never jumps); the doc follows on every keystroke and takes the text back when it changes
 * from elsewhere (undo, the AI).
 */
function Text({
  value,
  id,
  placeholder,
  onChange,
  onKeyDown,
  className,
  label,
}: {
  value: string;
  id: string;
  placeholder: string;
  /** What a screen reader announces; defaults to the placeholder. */
  label?: string;
  onChange: ((value: string, commit: boolean) => void) | null;
  onKeyDown?: (e: KeyboardEvent<HTMLElement>) => void;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const editable = !!onChange;
  const mark = useMark(id);
  const { seen } = useContext(MarksContext);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && el.textContent !== value) el.textContent = value;
  }, [value, editable]);
  // Different keys, so switching between Preview and Edit makes a fresh element rather than React
  // reusing the read-only one and leaving the editable one empty.
  if (!onChange)
    return (
      <span key="read" className={cx(className, mark)}>
        {value}
      </span>
    );
  return (
    <span
      key="edit"
      ref={ref}
      className={cx(s.field, className, mark)}
      onFocus={mark ? () => seen?.(id) : undefined}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      role="textbox"
      aria-label={label ?? placeholder}
      data-placeholder={placeholder}
      data-field={id}
      spellCheck
      onInput={(e) => onChange((e.currentTarget.textContent ?? '').replace(/\n/g, ' '), false)}
      onBlur={(e) => onChange((e.currentTarget.textContent ?? '').replace(/\s+/g, ' ').trim(), true)}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        // Enter moves on to the next field on the page, like a form; Escape leaves the field.
        if (!e.defaultPrevented && e.key === 'Enter') {
          e.preventDefault();
          const fields = [...document.querySelectorAll<HTMLElement>('[data-field]')];
          const next = fields[fields.indexOf(e.currentTarget) + 1];
          if (next) next.focus();
          else e.currentTarget.blur();
        } else if (e.key === 'Escape') e.currentTarget.blur();
      }}
      onPaste={(e) => {
        // Plain text only, on one line.
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain').replace(/\s+/g, ' ');
        document.execCommand('insertText', false, text);
      }}
    />
  );
}

/** Drag to reorder within one list: a grip starts it, rows are the drop targets. */
function useDrag(onMove: (id: string, to: number) => void) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const from = useRef<number>(-1);
  return {
    dragging,
    over,
    handle: (id: string, i: number) => ({
      draggable: true,
      onDragStart: (e: DragEvent) => {
        from.current = i;
        setDragging(id);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
        const row = (e.currentTarget as HTMLElement).closest('li, div');
        if (row) e.dataTransfer.setDragImage(row, 0, 0);
      },
      onDragEnd: () => {
        setDragging(null);
        setOver(null);
      },
    }),
    target: (id: string, i: number) => ({
      onDragOver: (e: DragEvent) => {
        if (!dragging) return;
        e.preventDefault();
        setOver(id);
      },
      onDragLeave: () => setOver((o) => (o === id ? null : o)),
      onDrop: (e: DragEvent) => {
        if (!dragging) return;
        e.preventDefault();
        const id0 = dragging;
        setDragging(null);
        setOver(null);
        if (from.current !== i) onMove(id0, from.current < i ? i - 1 : i);
      },
    }),
  };
}
