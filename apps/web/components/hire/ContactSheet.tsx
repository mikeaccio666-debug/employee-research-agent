'use client';

import Link from 'next/link';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
} from 'react';
import {
  Button,
  Frame,
  Grow,
  Kbd,
  MarginNote,
  MustHaves,
  PencilMark,
  Switch,
  buttonClass,
  cx,
  prefersReducedMotion,
  withViewTransition,
} from '@portrait/ui';
import { AppShell, ShellMain, useShell } from '@/components/shell/AppShell';
import { brief, frameSlug, mustAria, mustHaves, scoreOf, sheetFrames, type SheetFrame } from '@/lib/data/hire';
import { companyNav } from '@/lib/nav';
import { routes } from '@/lib/routes';
import s from './ContactSheet.module.css';

/** c = circled, x = not now. */
type Decision = 'c' | 'x';
type Tab = 'all' | 'cir' | 'str';
type SheetState = {
  /** The frame grown open in place. */
  open: string | null;
  st: Partial<Record<string, Decision>>;
  tab: Tab;
  /** Set by the first circle of the session: the rail draws a note. */
  first: boolean;
};

// As the board opens: 08A grown open, 09A already set aside.
const INITIAL: SheetState = { open: 'b', st: { c: 'x' }, tab: 'all', first: false };

const inTab = (tab: Tab, d: Decision | undefined) => (tab === 'all' ? true : tab === 'cir' ? d === 'c' : d === 'x');

/** V2-S06: the contact sheet for SWE Intern, Summer 2027. */
export function ContactSheet() {
  return (
    <AppShell
      nav={companyNav}
      active="hire"
      footer="Sam Okafor · Northwind"
      agent={{ context: `Contact sheet · ${brief.role}` }}
    >
      <Sheet />
    </AppShell>
  );
}

function Sheet() {
  const { agentOpen } = useShell();
  const [state, setState] = useState<SheetState>(INITIAL);
  const [photos, setPhotos] = useState(false);
  const dragged = useRef(false);
  const refocus = useRef<string | null>(null);
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});
  const uid = useId();
  const panelId = `${uid}-sheet`;
  const tabId = (t: Tab) => `${uid}-tab-${t}`;

  const update = (fn: (prev: SheetState) => SheetState) => withViewTransition(() => setState(fn));
  const list = sheetFrames.filter((f) => inTab(state.tab, state.st[f.id]));

  // A decision can move a frame out of the tab being shown; keep focus on the sheet.
  const keepFocus = (id: string, leaves: boolean) => {
    if (!leaves) return;
    const i = list.findIndex((f) => f.id === id);
    const next = list[i + 1] ?? list[i - 1];
    refocus.current = next ? next.id : 'tab';
  };
  useEffect(() => {
    const target = refocus.current;
    if (!target) return;
    refocus.current = null;
    const el =
      target === 'tab'
        ? tabRefs.current[state.tab]
        : document.querySelector<HTMLElement>(`[data-frame="${target}"]`);
    el?.focus();
  }, [state]);

  const decide = (id: string, d: Decision) => {
    keepFocus(id, !inTab(state.tab, d));
    update((p) => ({
      ...p,
      st: { ...p.st, [id]: d },
      open: null,
      first: p.first || (d === 'c' && !Object.values(p.st).includes('c')),
    }));
  };
  const undo = (id: string) => {
    keepFocus(id, !inTab(state.tab, undefined));
    update((p) => {
      const st = { ...p.st };
      delete st[id];
      return { ...p, st };
    });
  };
  const toggle = (id: string) => update((p) => ({ ...p, open: p.open === id ? null : id }));
  const close = (id: string) => update((p) => (p.open === id ? { ...p, open: null } : p));
  const pickTab = (tab: Tab) => update((p) => ({ ...p, tab }));

  const count = (d: Decision) => Object.values(state.st).filter((x) => x === d).length;
  const tabs: { k: Tab; label: string; n: number }[] = [
    { k: 'all', label: 'All', n: brief.strong },
    { k: 'cir', label: 'Circled', n: count('c') },
    { k: 'str', label: 'Not now', n: count('x') },
  ];
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    let next = -1;
    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    const t = tabs[next]!.k;
    pickTab(t);
    tabRefs.current[t]?.focus();
  };

  const firstNote = state.first && Object.values(state.st).includes('c');

  return (
    <>
      <ShellMain plain className={cx(s.main, agentOpen && s.withp)}>
        <p className="lab">
          <Link href={routes.brief} className={s.crumb}>
            Brief · {brief.role}
          </Link>
        </p>
        <h1 className="t-h1 mt-2">18 strong matches, each with reasons you can check.</h1>
        <div className="mt-[18px] flex flex-wrap items-center justify-between gap-4">
          <div className={s.tabs} role="tablist" aria-label="Filter">
            {tabs.map((t, i) => {
              const on = state.tab === t.k;
              return (
                <button
                  key={t.k}
                  ref={(el) => {
                    tabRefs.current[t.k] = el;
                  }}
                  id={tabId(t.k)}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  aria-controls={panelId}
                  tabIndex={on ? 0 : -1}
                  className={cx(s.tab, on && s.on)}
                  onClick={() => pickTab(t.k)}
                  onKeyDown={(e) => onTabKey(e, i)}
                >
                  {t.label} <span className={s.ct}>{t.n}</span>
                </button>
              );
            })}
            {/* Nobody has been contacted from this sheet yet. */}
            <button type="button" role="tab" aria-selected={false} aria-disabled="true" tabIndex={-1} className={s.tab}>
              Contacted <span className={s.ct}>0</span>
            </button>
          </div>
          <div className="flex items-center gap-2.5">
            <Switch id={`${uid}-photos`} checked={photos} onChange={setPhotos} label="Show photos" />
            <label htmlFor={`${uid}-photos`} className="t-s">
              Show photos <span className="c2">· off by default — read the work first</span>
            </label>
          </div>
        </div>
        <p className="t-xs c2 mt-3 flex flex-wrap items-center gap-2">
          Drag a frame right to circle, left for not now — or <Kbd className={s.key}>J</Kbd>
          <Kbd className={s.key}>K</Kbd> move · <Kbd className={s.key}>C</Kbd> circle · <Kbd className={s.key}>X</Kbd>{' '}
          not now · <Kbd className={s.key}>Enter</Kbd> open
        </p>

        <div role="tabpanel" id={panelId} aria-labelledby={tabId(state.tab)}>
          <div className={s.sheet} aria-live="polite">
            {list.map((f) => (
              <SheetCard
                key={f.id}
                frame={f}
                decision={state.st[f.id]}
                open={state.open === f.id && state.st[f.id] !== 'x'}
                photos={photos}
                dragged={dragged}
                onDecide={(d) => decide(f.id, d)}
                onUndo={() => undo(f.id)}
                onToggle={() => toggle(f.id)}
                onClose={() => close(f.id)}
              />
            ))}
          </div>
          <p className="t-xs c2 mt-[18px]">Showing 8 of 18 · the rest load as you scroll</p>
          {list.length === 0 ? (
            <div className="panel mt-[22px] p-7">
              <p className="t-h3">{state.tab === 'cir' ? 'No one circled yet.' : 'Nothing set aside.'}</p>
              <p className="t-s c2 mt-1.5">Drag a frame right, or press C, to circle someone you want to talk to.</p>
            </div>
          ) : null}
        </div>
      </ShellMain>

      <aside className={cx(s.rail, agentOpen && s.away)} aria-label="Brief">
        <div>
          <p className="lab">The brief</p>
          <p className="t-h3 mt-1.5">{brief.role}</p>
          <p className="t-s c2">{brief.company}</p>
        </div>
        <div className="panel px-[18px] py-4">
          <p className="lab">Must-haves</p>
          {mustHaves.map((m, i) => (
            <div key={m.k} className={s.mrow}>
              <span className="hand b">{i + 1}</span>
              <span className="t-s">{m.t}</span>
            </div>
          ))}
          <p className="t-xs c2 mt-1.5 flex items-center gap-2">
            <MustHaves marks={['y']} />
            yes <MustHaves marks={['h']} />
            partly <MustHaves marks={['n']} />
            not yet
          </p>
        </div>
        <div className="panel px-[18px] py-4">
          <p className="lab">Signals we love</p>
          <p className="t-s mt-1.5">Writes post-mortems. Side projects with users. Owns a feature end to end.</p>
        </div>
        {firstNote ? (
          <div className="land">
            <PencilMark vw={200} d="M2 6 C50 3 120 7 198 4" isNew draw className="w-[70%]" />
            <MarginNote className="mt-1.5">
              First one circled. I’ll draft a note for each circled frame when you’re ready.
            </MarginNote>
          </div>
        ) : null}
        <p className="t-xs c2">Relaxing M4, the 10–3 overlap, widens strong matches from 18 to 27.</p>
      </aside>
    </>
  );
}

type CardProps = {
  frame: SheetFrame;
  decision?: Decision;
  open: boolean;
  photos: boolean;
  /** Set for a moment after a drag so the click that ends it doesn't open the frame. */
  dragged: RefObject<boolean>;
  onDecide: (d: Decision) => void;
  onUndo: () => void;
  onToggle: () => void;
  onClose: () => void;
};

/** One frame: swipe right to circle, left for not now; C X J K Enter Esc from the keyboard. */
function SheetCard({ frame: f, decision, open, photos, dragged, onDecide, onUndo, onToggle, onClose }: CardProps) {
  const circled = decision === 'c';
  const struck = decision === 'x';
  const score = scoreOf(f.m);
  const tag = circled ? ' · circled' : open ? ' · open' : '';
  const aria = `${f.no} ${f.alias}, ${score} of 5 must-haves${circled ? ', circled' : struck ? ', not now' : ''}`;
  const lowered = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(lowered.current), []);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (struck || e.button !== 0 || !e.isPrimary) return;
    if ((e.target as HTMLElement).closest('button, a')) return;
    const el = e.currentTarget;
    const x0 = e.clientX;
    let dx = 0;
    let moved = false;
    const hr = el.querySelector<HTMLElement>('[data-hint="r"]');
    const hl = el.querySelector<HTMLElement>('[data-hint="l"]');
    const reduce = prefersReducedMotion();
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // Without capture the drag still works while the pointer stays on the frame.
    }
    const move = (ev: globalThis.PointerEvent) => {
      dx = ev.clientX - x0;
      if (Math.abs(dx) > 6) moved = true;
      if (!moved) return;
      el.style.transition = 'none';
      // Lifted above its neighbours while it moves, so its hint stays visible.
      clearTimeout(lowered.current);
      el.style.zIndex = '2';
      el.style.transform = reduce ? `translateX(${dx}px)` : `translateX(${dx * 0.9}px) rotate(${dx / 80}deg)`;
      if (hr) hr.style.opacity = String(Math.max(0, Math.min(1, dx / 90)));
      if (hl) hl.style.opacity = String(Math.max(0, Math.min(1, -dx / 90)));
    };
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.style.transition = '';
      el.style.transform = '';
      // Stay on top while it springs back (--t-m), then drop into the sheet again.
      lowered.current = setTimeout(() => {
        el.style.zIndex = '';
      }, 450);
      if (hr) hr.style.opacity = '';
      if (hl) hl.style.opacity = '';
      if (!moved) return;
      dragged.current = true;
      setTimeout(() => {
        dragged.current = false;
      }, 60);
      if (dx > 90) onDecide('c');
      else if (dx < -90) onDecide('x');
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  };

  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    if (dragged.current || struck) return;
    if ((e.target as HTMLElement).closest('button, a')) return;
    onToggle();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const el = e.currentTarget;
    const k = e.key.toLowerCase();
    if (k === 'c') {
      e.preventDefault();
      onDecide('c');
    } else if (k === 'x') {
      e.preventDefault();
      onDecide('x');
    } else if (k === 'enter' || k === ' ') {
      // Enter on a button inside the frame belongs to that button.
      if (e.target !== el) return;
      e.preventDefault();
      if (!struck) onToggle();
    } else if (k === 'escape') {
      if (!open) return;
      e.preventDefault();
      onClose();
      el.focus();
    } else if (k === 'j' || k === 'arrowright') {
      e.preventDefault();
      (el.nextElementSibling as HTMLElement | null)?.focus();
    } else if (k === 'k' || k === 'arrowleft') {
      e.preventDefault();
      (el.previousElementSibling as HTMLElement | null)?.focus();
    }
  };

  return (
    <Frame
      role="article"
      tabIndex={0}
      aria-label={aria}
      aria-keyshortcuts="C X J K Enter Escape"
      data-frame={f.id}
      circled={circled}
      draw
      className={cx(s.f, open && s.open, struck && cx(s.struck, 'struck'))}
      style={{ viewTransitionName: `f${f.id}` }}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
    >
      <span className={cx(s.hint, s.r)} data-hint="r" aria-hidden="true">
        Circle
      </span>
      <span className={cx(s.hint, s.l)} data-hint="l" aria-hidden="true">
        Not now
      </span>
      {struck ? (
        <div className="relative">
          <p className="t-s relative inline-block">
            <span className={s.fno}>{f.no}</span> <b>{f.alias}</b>
            <svg
              className="strike draw top-0.5 -left-1 w-[calc(100%+8px)]"
              viewBox="0 0 100 20"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path pathLength={1} d="M2 12 C30 8 60 13 98 7" />
            </svg>
          </p>
          <p className="t-xs c2 mt-0.5 flex items-center gap-1.5">Not now · {f.line}</p>
          <Button variant="quiet" size="sm" className="-ml-2 mt-1" onClick={onUndo}>
            Undo
          </Button>
        </div>
      ) : (
        <div>
          <div className={s.fh}>
            <span className={s.fno}>
              {f.no}
              {tag}
            </span>
            <span className="t-xs c2">{f.avail}</span>
          </div>
          {photos ? (
            <div className="mt-2.5 flex aspect-[3/2] items-end rounded-sm bg-wall-2 p-2">
              <span className="t-xs c2">Photo, if they shared one</span>
            </div>
          ) : null}
          <p className="t-h3 mt-2">
            {f.alias} <span className="t-xs c2">{f.ctx}</span>
          </p>
          <p className="t-s mt-1">{f.line}</p>
          <div className={s.meta}>
            <MustHaves marks={f.m} label={mustAria(f.m)} />
            <span className="t-xs">{score} of 5</span>
            <span className="t-xs c2">· {f.interest}</span>
          </div>
          <Grow open={open}>
            <div className="gl mt-4 flex flex-col gap-2.5">
              {f.reasons.map((r, i) => (
                <p key={i} className={cx('ln', s.reason)}>
                  <span className={s.k}>{i + 1}</span>
                  <span className="t-s">
                    {r}
                    <span className="fn" aria-hidden="true">
                      {i + 1}
                    </span>
                  </span>
                </p>
              ))}
              <p className="ln t-xs c2">Ask in a coffee chat: {f.ask}</p>
            </div>
            <div className="ln mt-4 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => !circled && onDecide('c')}>
                {circled ? 'Circled' : 'Circle'}
              </Button>
              <Button variant="wall" size="sm" onClick={() => onDecide('x')}>
                Not now
              </Button>
              <Link className={buttonClass({ variant: 'quiet', size: 'sm' })} href={routes.candidate(frameSlug(f.no))}>
                Open portrait
              </Link>
            </div>
          </Grow>
        </div>
      )}
    </Frame>
  );
}
