'use client';

import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition } from 'react';
import { Button, Segmented, Switch, TextInput, buttonClass, cx } from '@portrait/ui';
import {
  FONT_IDS,
  FONTS,
  MARGIN,
  minScale,
  PAPER,
  SECTION_INFO,
  SECTION_KINDS,
  SIZE,
  TEMPLATES,
  type ResumeDoc,
  type ResumeStyle,
  type SectionKind,
  type TemplateId,
} from '@/lib/resume/doc';
import * as edit from '@/lib/resume/edit';
import { createVersion, deleteVersion, makeDefault, saveVersion } from '@/lib/resume-actions';
import type { ResumeVersion } from '@/lib/resume/store';
import { routes } from '@/lib/routes';
import { ResumeSheet, sheetVars, type SheetChange } from './ResumeSheet';
import { CloseIcon, DownIcon, DownloadIcon, EyeIcon, EyeOffIcon, MoreIcon, PencilIcon, RedoIcon, StarIcon, TrashIcon, UndoIcon, UpIcon } from './icons';
import s from './resume.module.css';

// The résumé editor (app/resume, PRD COACH-12): versions along the top, the page's settings under
// them, and the sheet itself, edited in place. Changes stay in this tab until Save; Cancel puts the
// version back as it was saved. Undo and redo step through this tab's changes.

type Props = {
  versions: ResumeVersion[];
  /** False for the signed-out example: everything works except saving. */
  canSave: boolean;
  /** Shown instead of saving when the deployment can't store versions yet. */
  notice?: string | null;
};

type Draft = { name: string; target: string; doc: ResumeDoc; style: ResumeStyle };
const draftOf = (v: ResumeVersion): Draft => ({ name: v.name, target: v.target, doc: v.doc, style: v.style });
const same = (a: Draft, b: Draft) => JSON.stringify(a) === JSON.stringify(b);
const PT = 4 / 3;

export function ResumeEditor({ versions: initial, canSave, notice }: Props) {
  const [versions, setVersions] = useState(initial);
  const [currentId, setCurrentId] = useState(initial[0]?.id ?? '');
  const current = versions.find((v) => v.id === currentId) ?? versions[0]!;
  const [draft, setDraft] = useState<Draft>(() => draftOf(current));
  const [past, setPast] = useState<Draft[]>([]);
  const [future, setFuture] = useState<Draft[]>([]);
  const [focus, setFocus] = useState<{ id: string; n: number } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, start] = useTransition();
  const dirty = !same(draft, draftOf(current));

  // The last committed state, for undo: text commits on blur, everything else at once.
  const committed = useRef<Draft>(draft);
  const commit = useCallback((next: Draft) => {
    if (!same(next, committed.current)) {
      const prev = committed.current;
      setPast((p) => [...p.slice(-99), prev]);
      setFuture([]);
      committed.current = next;
    }
  }, []);

  const change: SheetChange = (doc, opts) => {
    const next = { ...draft, doc };
    setDraft(next);
    if (opts?.commit) commit(next);
    if (opts?.focus) setFocus((f) => ({ id: opts.focus!, n: (f?.n ?? 0) + 1 }));
  };
  const setStyle = (patch: Partial<ResumeStyle>) => {
    const next = { ...draft, style: { ...draft.style, ...patch } };
    setDraft(next);
    commit(next);
  };
  const setDoc = (doc: ResumeDoc) => {
    const next = { ...draft, doc };
    setDraft(next);
    commit(next);
  };

  const undo = () => {
    const prev = past[past.length - 1];
    if (!prev) return;
    setPast(past.slice(0, -1));
    setFuture([committed.current, ...future]);
    committed.current = prev;
    setDraft(prev);
  };
  const redo = () => {
    const next = future[0];
    if (!next) return;
    setFuture(future.slice(1));
    setPast([...past, committed.current]);
    committed.current = next;
    setDraft(next);
  };

  // Ctrl/Cmd+Z outside a field undoes a change on the page; inside one, the browser undoes typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const inField = (e.target as HTMLElement)?.closest?.('[contenteditable], input, textarea, select');
      if (inField || !(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Leaving with unsaved changes asks first.
  useEffect(() => {
    if (!dirty || !canSave) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, canSave]);

  const switchTo = (id: string) => {
    if (dirty && canSave && !window.confirm('Switch versions? Changes you haven’t saved will be lost.')) return;
    const v = versions.find((x) => x.id === id);
    if (!v) return;
    setCurrentId(id);
    const d = draftOf(v);
    setDraft(d);
    committed.current = d;
    setPast([]);
    setFuture([]);
    setStatus(null);
  };

  const save = () =>
    start(async () => {
      if (!canSave) return;
      const r = await saveVersion({ id: current.id, since: current.updatedAt, ...draft });
      if (!r.ok) return setStatus({ text: r.error, error: true });
      setVersions((vs) => vs.map((v) => (v.id === current.id ? { ...v, ...draft, updatedAt: r.value.updatedAt } : v)));
      setStatus({ text: 'Saved' });
    });

  const cancel = () => {
    const d = draftOf(current);
    setDraft(d);
    commit(d);
    setStatus(null);
  };

  const add = (from: 'portrait' | 'blank' | 'copy') =>
    start(async () => {
      if (!canSave) return;
      const name = from === 'copy' ? `${draft.name} (copy)` : from === 'portrait' ? 'From my portrait' : 'New version';
      const r = await createVersion({ name, from: from === 'copy' ? { copy: current.id } : from });
      if (!r.ok) return setStatus({ text: r.error, error: true });
      setVersions((vs) => [...vs, r.value]);
      setCurrentId(r.value.id);
      const d = draftOf(r.value);
      setDraft(d);
      committed.current = d;
      setPast([]);
      setFuture([]);
      setRenaming(true);
      setStatus({ text: from === 'copy' ? 'Copied. Saved changes to the copy leave the original as it is.' : 'New version made.' });
    });

  const star = () =>
    start(async () => {
      if (!canSave || current.isDefault) return;
      const r = await makeDefault(current.id);
      if (!r.ok) return setStatus({ text: r.error, error: true });
      setVersions((vs) => vs.map((v) => ({ ...v, isDefault: v.id === current.id })));
      setStatus({ text: `“${current.name}” is now your default résumé.` });
    });

  const remove = () =>
    start(async () => {
      if (!canSave || versions.length < 2) return;
      if (!window.confirm(`Delete “${current.name}”? This can’t be undone.`)) return;
      const r = await deleteVersion(current.id);
      if (!r.ok) return setStatus({ text: r.error, error: true });
      const left = versions.filter((v) => v.id !== current.id);
      if (current.isDefault && left[0]) left[0] = { ...left[0], isDefault: true };
      setVersions(left);
      const next = left[0]!;
      setCurrentId(next.id);
      const d = draftOf(next);
      setDraft(d);
      committed.current = d;
      setPast([]);
      setFuture([]);
      setStatus({ text: 'Deleted.' });
    });

  // ---- Fit to one page, by measuring a read-only copy of the sheet (no editing controls) ----
  const contentRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  // Re-measure once the résumé fonts have loaded (widths change).
  const [fontsReady, setFontsReady] = useState(0);
  useEffect(() => {
    document.fonts?.ready.then(() => setFontsReady((n) => n + 1));
  }, [draft.style.font]);
  const [overflow, setOverflow] = useState<number | null>(null);
  const limitPt = PAPER[draft.style.paper].height - 2 * MARGIN[draft.style.template];

  useLayoutEffect(() => {
    const sheet = measureRef.current;
    const content = contentRef.current;
    if (!sheet || !content) return;
    const heightAt = (k: number) => {
      for (const [prop, v] of Object.entries(sheetVars(draft.style, k))) sheet.style.setProperty(prop, v);
      return content.offsetHeight / PT;
    };
    let best = 1;
    if (draft.style.fitOnePage && heightAt(1) > limitPt) {
      let lo = minScale(draft.style);
      let hi = 1;
      if (heightAt(lo) > limitPt) best = lo;
      else {
        for (let i = 0; i < 8; i++) {
          const mid = (lo + hi) / 2;
          if (heightAt(mid) <= limitPt) lo = mid;
          else hi = mid;
        }
        best = lo;
      }
    }
    const h = heightAt(best);
    setScale(best);
    setOverflow(h > limitPt + 0.5 ? h - limitPt : null);
  }, [draft.doc, draft.style, limitPt, fontsReady]);


  // ---- Phones: edit with the text at full size, or look at the page as it prints ----
  const [narrow, setNarrow] = useState(false);
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  useEffect(() => {
    const q = window.matchMedia('(max-width: 760px)');
    const on = () => setNarrow(q.matches);
    on();
    q.addEventListener('change', on);
    return () => q.removeEventListener('change', on);
  }, []);
  const reflow = narrow && view === 'edit';

  // ---- Fit the sheet to the width of the desk ----
  const deskRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [sheetHeight, setSheetHeight] = useState(0);
  useEffect(() => {
    const desk = deskRef.current;
    const sheet = sheetRef.current;
    if (!desk || !sheet) return;
    const measure = () => {
      const pad = window.matchMedia('(max-width: 760px)').matches ? 24 : 48;
      setZoom(sheet.offsetWidth ? Math.min(1, (desk.clientWidth - pad) / sheet.offsetWidth) : 1);
      setSheetHeight(sheet.offsetHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(desk);
    ro.observe(sheet);
    return () => ro.disconnect();
  }, [reflow]);

  // The PDF is made from the saved version, so unsaved changes are saved first, in one click.
  const download = () =>
    start(async () => {
      if (!canSave) return setStatus({ text: 'Sign in to download your own résumé as a PDF.', error: true });
      let since = current.updatedAt;
      if (dirty) {
        const r = await saveVersion({ id: current.id, since, ...draft });
        if (!r.ok) return setStatus({ text: r.error, error: true });
        since = r.value.updatedAt;
        setVersions((vs) => vs.map((v) => (v.id === current.id ? { ...v, ...draft, updatedAt: since } : v)));
      }
      setStatus({ text: dirty ? 'Saved. Downloading…' : 'Downloading…' });
      window.location.href = `/api/resume?version=${encodeURIComponent(current.id)}`;
    });

  // Template, font, size and fit stay in the bar; alignment, paper and the target role sit under
  // More. On phones all of it folds into one Format menu so the sheet keeps the screen.
  const format = (
    <>
      <span className={s.tool}>
        <span className="lab">Template</span>
        <Segmented<TemplateId>
          label="Template"
          mode="radio"
          options={(Object.keys(TEMPLATES) as TemplateId[]).map((t) => ({ value: t, label: TEMPLATES[t].label }))}
          value={draft.style.template}
          onChange={(template) => setStyle({ template })}
        />
      </span>
      <span className={s.tool}>
        <select className={cx(s.select, s.small)} aria-label="Font" value={draft.style.font} onChange={(e) => setStyle({ font: e.target.value as ResumeStyle['font'] })}>
          {FONT_IDS.map((f) => (
            <option key={f} value={f}>
              {FONTS[f].label}
            </option>
          ))}
        </select>
      </span>
      <span className={s.tool}>
        <span className="lab">Size</span>
        <span className={s.stepper}>
          <button type="button" className={s.tiny} aria-label="Smaller text" disabled={draft.style.size <= SIZE.min} onClick={() => setStyle({ size: Math.max(SIZE.min, draft.style.size - SIZE.step) })}>
            −
          </button>
          <output aria-live="polite">{draft.style.size}pt</output>
          <button type="button" className={s.tiny} aria-label="Larger text" disabled={draft.style.size >= SIZE.max} onClick={() => setStyle({ size: Math.min(SIZE.max, draft.style.size + SIZE.step) })}>
            +
          </button>
        </span>
      </span>
      <label className={s.tool}>
        <Switch checked={draft.style.fitOnePage} onChange={(fitOnePage) => setStyle({ fitOnePage })} label="Fit to one page" />
        <span className="t-xs">Fit to one page</span>
      </label>
    </>
  );
  const extras = (
    <PageExtras style={draft.style} onStyle={setStyle} target={draft.target} onTarget={(target) => setDraft({ ...draft, target })} onTargetDone={() => commit(draft)} />
  );

  return (
    <div className={s.editor}>
      <div className={s.top}>
        <div className={s.version}>
          {renaming ? (
            <TextInput
              className={s.nameInput}
              aria-label="Version name"
              autoFocus
              maxLength={60}
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              onBlur={() => {
                setRenaming(false);
                commit(draft);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
                if (e.key === 'Escape') {
                  setDraft({ ...draft, name: committed.current.name });
                  setRenaming(false);
                }
              }}
            />
          ) : (
            <select className={s.select} aria-label="Résumé version" value={current.id} onChange={(e) => switchTo(e.target.value)}>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.id === current.id ? draft.name : v.name}
                  {v.isDefault && !/^default$/i.test((v.id === current.id ? draft.name : v.name).trim()) ? ' (default)' : ''}
                </option>
              ))}
            </select>
          )}
          <span className={s.iconOnly}>
            <Button variant="wall" size="sm" icon onClick={() => setRenaming(true)} aria-label="Rename this version" title="Rename">
              <PencilIcon />
            </Button>
            <Button
              variant="wall"
              size="sm"
              icon
              onClick={star}
              disabled={!canSave || current.isDefault}
              aria-label={current.isDefault ? 'This is your default résumé' : 'Make this your default résumé'}
              title={current.isDefault ? 'Your default résumé: the one used when you apply' : 'Make this your default résumé'}
            >
              <StarIcon filled={current.isDefault} />
            </Button>
            <Button variant="wall" size="sm" icon onClick={remove} disabled={!canSave || versions.length < 2} aria-label="Delete this version" title="Delete this version">
              <TrashIcon />
            </Button>
          </span>
          <VersionMenu
            canSave={canSave}
            isDefault={current.isDefault}
            canDelete={versions.length > 1}
            onRename={() => setRenaming(true)}
            onStar={star}
            onDelete={remove}
          />
        </div>
        <NewVersion disabled={!canSave || pending} onPick={add} />
        <span className={s.spacer} />
        {status ? (
          <span className={cx('t-xs', status.error ? s.error : s.status)} role="status">
            {status.text}
          </span>
        ) : dirty && canSave ? (
          <span className={cx('t-xs', s.status)}>Unsaved changes</span>
        ) : null}
        <Button variant="secondary" size="sm" onClick={download} disabled={pending} title={dirty ? 'Saves, then downloads' : 'Download this version as a PDF'}>
          <DownloadIcon /> PDF
        </Button>
        {canSave ? (
          <>
            <Button variant="secondary" size="sm" onClick={cancel} disabled={!dirty || pending}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={save} disabled={!dirty || pending}>
              {pending ? 'Saving…' : 'Save'}
            </Button>
          </>
        ) : (
          <Link href={`${routes.login}?next=${encodeURIComponent(routes.resume)}`} className={buttonClass({ variant: 'primary', size: 'sm' })}>
            Sign in to save
          </Link>
        )}
      </div>

      <div className={s.tools} role="toolbar" aria-label="Page settings">
        <Segmented<'edit' | 'preview'>
          label="View"
          mode="radio"
          options={[
            { value: 'edit', label: 'Edit' },
            { value: 'preview', label: 'Preview' },
          ]}
          value={view}
          onChange={setView}
        />
        {narrow ? (
          <FormatMenu>
            {format}
            {extras}
          </FormatMenu>
        ) : (
          format
        )}
        <SectionsMenu doc={draft.doc} onChange={setDoc} />
        <span className={s.tool}>
          <button type="button" className={s.tiny} onClick={undo} disabled={!past.length} aria-label="Undo" title="Undo (Ctrl+Z)">
            <UndoIcon />
          </button>
          <button type="button" className={s.tiny} onClick={redo} disabled={!future.length} aria-label="Redo" title="Redo (Ctrl+Shift+Z)">
            <RedoIcon />
          </button>
        </span>
        {narrow ? null : <MoreMenu>{extras}</MoreMenu>}
      </div>

      <div className={s.desk} ref={deskRef}>
        {notice ? <p className={cx('t-sm', s.fitNote)}>{notice}</p> : null}
        {overflow !== null ? (
          <p className={cx('t-sm', s.fitNote, s.overflowNote)} role="status">
            {draft.style.fitOnePage
              ? `Even at ${Math.max(9, +(draft.style.size * minScale(draft.style)).toFixed(1))}pt this runs about ${Math.ceil((overflow / (draft.style.size * 1.3)) * 1)} lines past one page. Cut or shorten a few bullets, or hide a section.`
              : `This runs about ${Math.ceil(overflow / (draft.style.size * 1.3))} lines past one page. Turn on Fit to one page, or shorten it.`}
          </p>
        ) : null}
        <div style={reflow ? undefined : { height: sheetHeight ? sheetHeight * zoom : undefined, width: sheetRef.current ? sheetRef.current.offsetWidth * zoom : undefined, margin: '0 auto' }}>
          <div className={s.sheetBox} style={{ transform: zoom < 1 && !reflow ? `scale(${zoom})` : undefined }}>
            <ResumeSheet
              doc={draft.doc}
              style={draft.style}
              scale={scale}
              onChange={view === 'edit' ? change : null}
              focus={focus}
              pageEnd={overflow !== null ? limitPt : null}
              sheetRef={sheetRef}
              reflow={reflow}
            />
          </div>
        </div>
        <div aria-hidden inert style={{ position: 'absolute', top: 0, left: -20000, visibility: 'hidden', pointerEvents: 'none' }}>
          <ResumeSheet doc={draft.doc} style={draft.style} scale={scale} onChange={null} focus={null} pageEnd={null} contentRef={contentRef} sheetRef={measureRef} />
        </div>
      </div>
    </div>
  );
}

function NewVersion({ disabled, onPick }: { disabled: boolean; onPick: (from: 'portrait' | 'blank' | 'copy') => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} setOpen={setOpen} label="+ New version" disabled={disabled} align="left">
      <MenuButton onClick={() => (setOpen(false), onPick('copy'))}>Copy this version</MenuButton>
      <MenuButton onClick={() => (setOpen(false), onPick('portrait'))}>Start from my portrait</MenuButton>
      <MenuButton onClick={() => (setOpen(false), onPick('blank'))}>Start blank</MenuButton>
      <p className={cx('t-xs', s.popHint)}>
        One version per kind of role works well: “Data analyst”, “Product”.
      </p>
    </Popover>
  );
}

/** Phones: rename, make default and delete behind one button, to keep the bar to one row. */
function VersionMenu(p: { canSave: boolean; isDefault: boolean; canDelete: boolean; onRename: () => void; onStar: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <span className={s.menuOnly}>
      <Popover open={open} setOpen={setOpen} label={<MoreIcon />} aria="Version actions" align="left">
        <MenuButton onClick={() => (setOpen(false), p.onRename())}>Rename</MenuButton>
        <MenuButton disabled={!p.canSave || p.isDefault} onClick={() => (setOpen(false), p.onStar())}>
          {p.isDefault ? 'This is your default' : 'Make default'}
        </MenuButton>
        <MenuButton disabled={!p.canSave || !p.canDelete} onClick={() => (setOpen(false), p.onDelete())}>
          Delete this version
        </MenuButton>
      </Popover>
    </span>
  );
}

function SectionsMenu({ doc, onChange }: { doc: ResumeDoc; onChange: (doc: ResumeDoc) => void }) {
  const [open, setOpen] = useState(false);
  const missing = SECTION_KINDS.filter((k) => k === 'custom' || !doc.sections.some((x) => x.kind === k));
  return (
    <Popover open={open} setOpen={setOpen} label="Sections">
      {doc.sections.map((sec, i) => (
        <div key={sec.id} className={cx(s.popRow, sec.hidden && s.off)}>
          <span>{sec.heading || SECTION_INFO[sec.kind].heading}</span>
          <button type="button" className={s.tiny} aria-label={`Move ${sec.heading} up`} disabled={i === 0} onClick={() => onChange(edit.moveSection(doc, sec.id, -1))}>
            <UpIcon />
          </button>
          <button type="button" className={s.tiny} aria-label={`Move ${sec.heading} down`} disabled={i === doc.sections.length - 1} onClick={() => onChange(edit.moveSection(doc, sec.id, 1))}>
            <DownIcon />
          </button>
          <button
            type="button"
            className={s.tiny}
            aria-label={sec.hidden ? `Show ${sec.heading}` : `Hide ${sec.heading}`}
            title={sec.hidden ? 'Show on the page' : 'Hide from the page'}
            onClick={() => onChange(edit.setSection(doc, sec.id, { hidden: !sec.hidden }))}
          >
            {sec.hidden ? <EyeOffIcon /> : <EyeIcon />}
          </button>
          <button
            type="button"
            className={s.tiny}
            aria-label={`Remove ${sec.heading}`}
            title="Remove section"
            onClick={() => {
              if (!sec.entries.length || window.confirm(`Remove “${sec.heading}” and everything in it?`)) onChange(edit.removeSection(doc, sec.id));
            }}
          >
            <CloseIcon />
          </button>
        </div>
      ))}
      {missing.length ? (
        <label className={s.popRow}>
          <span className="t-xs">Add a section</span>
          <select
            className={cx(s.select, s.small)}
            value=""
            onChange={(e) => {
              const [next] = edit.addSection(doc, e.target.value as SectionKind);
              onChange(next);
            }}
          >
            <option value="" disabled>
              Choose…
            </option>
            {missing.map((k) => (
              <option key={k} value={k}>
                {SECTION_INFO[k].heading}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </Popover>
  );
}

/** Alignment, paper size and the role this version is for. */
function PageExtras({
  style,
  onStyle,
  target,
  onTarget,
  onTargetDone,
}: {
  style: ResumeStyle;
  onStyle: (p: Partial<ResumeStyle>) => void;
  target: string;
  onTarget: (t: string) => void;
  onTargetDone: () => void;
}) {
  return (
    <>
      <div className={s.popRow}>
        <span className="t-xs">Align</span>
        <Segmented<'left' | 'justify'>
          label="Alignment"
          mode="radio"
          options={[
            { value: 'left', label: 'Left' },
            { value: 'justify', label: 'Justified' },
          ]}
          value={style.align}
          onChange={(align) => onStyle({ align })}
        />
      </div>
      <div className={s.popRow}>
        <span className="t-xs">Paper</span>
        <Segmented<'letter' | 'a4'>
          label="Paper size"
          mode="radio"
          options={[
            { value: 'letter', label: 'Letter' },
            { value: 'a4', label: 'A4' },
          ]}
          value={style.paper}
          onChange={(paper) => onStyle({ paper })}
        />
      </div>
      <label className="t-xs" style={{ display: 'grid', gap: 4, padding: '4px 0' }}>
        The role this version is for
        <TextInput value={target} maxLength={120} placeholder="e.g. Data analyst at fintechs" onChange={(e) => onTarget(e.target.value)} onBlur={onTargetDone} />
      </label>
    </>
  );
}

function MoreMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} setOpen={setOpen} label="More">
      {children}
    </Popover>
  );
}

/** Phones: every page setting in one menu. */
function FormatMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} setOpen={setOpen} label="Format" align="left">
      <div className={s.formatStack}>{children}</div>
    </Popover>
  );
}

function Popover({
  open,
  setOpen,
  label,
  aria,
  disabled,
  align = 'right',
  children,
}: {
  open: boolean;
  setOpen: (o: boolean) => void;
  label: React.ReactNode;
  /** Accessible name when the label is an icon. */
  aria?: string;
  disabled?: boolean;
  align?: 'left' | 'right';
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [at, setAt] = useState<{ top: number; left?: number; right?: number } | null>(null);
  // Fixed to the window, under its button, so nothing around it can clip it.
  useLayoutEffect(() => {
    const button = ref.current?.querySelector('button');
    if (!open || !button) return;
    const r = button.getBoundingClientRect();
    setAt(align === 'left' ? { top: r.bottom + 6, left: Math.max(8, Math.min(r.left, window.innerWidth - 296)) } : { top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) });
  }, [open, align]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent | Event) => {
      if (e.type === 'scroll' || e.type === 'resize') return setOpen(false);
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
      window.removeEventListener('resize', close);
    };
  }, [open, setOpen]);
  return (
    <span className={s.pop} ref={ref}>
      <Button variant="quiet" size="sm" aria-label={aria} aria-expanded={open} aria-haspopup="true" disabled={disabled} onClick={() => setOpen(!open)}>
        {label}
      </Button>
      {open ? (
        <div className={s.popBody} style={at ? { position: 'fixed', ...at } : { position: 'fixed', visibility: 'hidden' }}>
          {children}
        </div>
      ) : null}
    </span>
  );
}

function MenuButton({ onClick, children, disabled }: { onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} className={buttonClass({ variant: 'wall', size: 'sm' })} style={{ justifyContent: 'flex-start' }} onClick={onClick}>
      {children}
    </button>
  );
}
