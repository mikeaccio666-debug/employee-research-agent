'use client';

import Link from 'next/link';
import {
  createContext,
  useContext,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { Button, Thread, cx } from '@portrait/ui';
import { routes } from '@/lib/routes';
import s from './Workspace.module.css';

export type WorkspaceView = 'talk' | 'canvas';
type WorkspaceState = { view: WorkspaceView; setView: (view: WorkspaceView) => void };
const WorkspaceContext = createContext<WorkspaceState>({ view: 'talk', setView: () => {} });

/** Switch panes on phones from inside the canvas ("Change this in chat"). */
export function useWorkspace() {
  return useContext(WorkspaceContext);
}

export type WorkspaceProps = {
  /** Top bar after the brand: breadcrumbs, controls, actions. */
  top: ReactNode;
  /** Thread content (AgentMessage, UserMessage, Receipt, StatusLine …). */
  talk: ReactNode;
  /** Usually a <Composer>; sits under the thread. */
  composer: ReactNode;
  /** The live canvas. */
  children: ReactNode;
  talkLabel?: string;
  canvasLabel: string;
  /** Width of the conversation column; the canvas boards use 38% (S17: 36%). */
  talkWidth?: string;
  /** The studio's divider can be dragged (or moved with the arrow keys). */
  resizable?: boolean;
  minHeight?: number;
  /** Phones: what the bars and the preview strip say. */
  mobile?: {
    status?: ReactNode;
    canvasNote?: ReactNode;
    previewLabel?: ReactNode;
    previewTitle?: ReactNode;
    /** Accessible name of the preview strip; defaults to "Open your portrait". */
    previewAria?: string;
    /** Links from the desktop top bar that must stay reachable on a phone (one scrolling row). */
    nav?: ReactNode;
  };
  view?: WorkspaceView;
  onViewChange?: (view: WorkspaceView) => void;
  className?: string;
};

const MIN_TALK = 320;
const MIN_CANVAS = 420;

export function Workspace({
  top,
  talk,
  composer,
  children,
  talkLabel = 'Conversation',
  canvasLabel,
  talkWidth = '38%',
  resizable,
  minHeight,
  mobile,
  view: viewProp,
  onViewChange,
  className,
}: WorkspaceProps) {
  const [innerView, setInnerView] = useState<WorkspaceView>('talk');
  const view = viewProp ?? innerView;
  const setView = (next: WorkspaceView) => {
    if (viewProp === undefined) setInnerView(next);
    onViewChange?.(next);
  };
  const body = useRef<HTMLDivElement>(null);
  const [talkPx, setTalkPx] = useState<number | null>(null);

  const clamp = (px: number) => {
    const total = body.current?.getBoundingClientRect().width ?? 1200;
    return Math.round(Math.max(MIN_TALK, Math.min(total - MIN_CANVAS, px)));
  };
  const currentTalk = () => body.current?.firstElementChild?.getBoundingClientRect().width ?? 480;

  const onSplitDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!resizable || e.button !== 0) return;
    const el = e.currentTarget;
    const left = body.current?.getBoundingClientRect().left ?? 0;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // Older browsers: dragging still works while the pointer stays on the divider.
    }
    const move = (ev: globalThis.PointerEvent) => setTalkPx(clamp(ev.clientX - left - 7));
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  };
  const onSplitKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!resizable) return;
    const step = e.shiftKey ? 96 : 24;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      setTalkPx(clamp(currentTalk() + (e.key === 'ArrowLeft' ? -step : step)));
    }
    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      setTalkPx(clamp(e.key === 'Home' ? MIN_TALK : Number.POSITIVE_INFINITY));
    }
  };

  const bodyStyle = {
    '--talk-w': talkPx ? `${talkPx}px` : `minmax(380px, ${talkWidth})`,
  } as CSSProperties;

  return (
    <WorkspaceContext.Provider value={{ view, setView }}>
      <div className={cx(s.app, className)} style={minHeight ? { minHeight } : undefined} data-view={view}>
        <header className={s.top}>
          <Link href={routes.landing} className={s.brand}>
            Portrait
          </Link>
          {top}
        </header>
        <div className={s.mbar}>
          {view === 'talk' ? (
            <>
              <span className="t-s b">Portrait</span>
              {mobile?.status ? <span className="t-xs c2">{mobile.status}</span> : null}
            </>
          ) : (
            <>
              <Button variant="quiet" size="sm" style={{ marginLeft: -8 }} onClick={() => setView('talk')}>
                ‹ Chat
              </Button>
              {mobile?.canvasNote ? <span className="t-xs c2">{mobile.canvasNote}</span> : null}
            </>
          )}
        </div>
        {mobile?.nav && view === 'talk' ? (
          <nav className={s.mnav} aria-label="Main">
            {mobile.nav}
          </nav>
        ) : null}
        <div className={s.body} ref={body} style={bodyStyle}>
          <section className={s.talk} aria-label={talkLabel}>
            <div className={s.scroll} aria-live="polite">
              <Thread>{talk}</Thread>
            </div>
            <div>
              <button
                type="button"
                className={s.strip}
                onClick={() => setView('canvas')}
                aria-label={mobile?.previewAria ?? 'Open your portrait'}
              >
                <span className={s.thumb} aria-hidden="true">
                  <i style={{ top: 10, width: 24 }} />
                  <i style={{ top: 20 }} />
                  <i style={{ top: 30, background: 'var(--chalk)', height: 6 }} />
                  <i style={{ top: 42 }} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="t-xs c2" style={{ display: 'block' }}>
                    {mobile?.previewLabel ?? 'Your portrait · just now'}
                  </span>
                  <span className="t-s b" style={{ display: 'block' }}>
                    {mobile?.previewTitle ?? 'Open the preview'}
                  </span>
                </span>
                <span className="hand" style={{ fontSize: 15 }}>
                  open
                </span>
              </button>
              <div className={s.cmpwrap}>{composer}</div>
            </div>
          </section>
          <div
            className={cx(s.split, resizable && s.resizable)}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize conversation"
            tabIndex={resizable ? 0 : undefined}
            onPointerDown={onSplitDown}
            onKeyDown={onSplitKey}
          >
            <i />
          </div>
          <section className={s.canvas} aria-label={canvasLabel}>
            {children}
          </section>
        </div>
        <button type="button" className={s.mtalk} onClick={() => setView('talk')}>
          Talk
        </button>
      </div>
    </WorkspaceContext.Provider>
  );
}
