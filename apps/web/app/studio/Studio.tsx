'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import {
  AgentMessage,
  Band,
  Button,
  Chip,
  ChipTag,
  Composer,
  ContextTag,
  DateNote,
  EditableBlock,
  LinkButton,
  MarginNote,
  PencilMark,
  Pending,
  Receipt,
  Ruler,
  Segmented,
  StatusLine,
  Tally,
  UserMessage,
  buttonClass,
  cx,
  prefersReducedMotion,
  withViewTransition,
} from '@portrait/ui';
import { useLocalThread } from '@/components/agent/AgentPanel';
import { Workspace, useWorkspace } from '@/components/workspace/Workspace';
import { lin } from '@/lib/data/cast';
import { routes } from '@/lib/routes';
import s from './studio.module.css';

type SectionId = 'story' | 'exp' | 'good' | 'work' | 'look';
type Selection = SectionId | 'move' | null;

const NAMES: Record<SectionId, string> = {
  story: 'Her story',
  exp: 'Experience',
  good: 'Good at',
  work: 'Work',
  look: 'Looking for',
};
const CONTEXT: Record<Exclude<Selection, null>, string> = {
  move: 'Experience › Move-in week',
  story: 'Her story',
  exp: 'Experience',
  good: 'Good at',
  work: 'Work',
  look: 'Looking for',
};

function moveTo(order: SectionId[], id: SectionId, to: number): SectionId[] {
  const next = order.filter((x) => x !== id);
  next.splice(Math.max(0, Math.min(next.length, to)), 0, id);
  return next;
}

/** S01 · the portrait studio: talk on the left, the portrait drawn live on the right. */
export function Studio() {
  const [grown, setGrown] = useState(true);
  const [sel, setSel] = useState<Selection>('move');
  const [hov, setHov] = useState(false);
  const [pending, setPending] = useState(true);
  const [announce, setAnnounce] = useState('');
  const [order, setOrder] = useState<SectionId[]>(['story', 'exp', 'good', 'work', 'look']);
  const [prev, setPrev] = useState<SectionId[] | null>(null);
  const [moved, setMoved] = useState('');
  const [viewAs, setViewAs] = useState<'public' | 'anon' | 'startup'>('public');
  const { nodes: sent, send } = useLocalThread();
  const secs = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));

  const reorder = (id: SectionId, to: number) => {
    const text = `${NAMES[id]} moved to position ${to + 1}`;
    setPrev(order);
    setOrder(moveTo(order, id, to));
    setSel(id);
    setMoved(text);
    setAnnounce(text);
  };

  // "Show where it came from": the block folds back into Lin's message, then grows out of it again.
  const replay = () => {
    setGrown(false);
    setSel('move');
    setAnnounce('');
    later(() => {
      withViewTransition(() => {
        setGrown(true);
        setAnnounce('Experience updated: Survived move-in week');
      });
    }, 650);
  };

  const onGripKey = (id: SectionId, idx: number) => (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const to = e.key === 'ArrowUp' ? idx - 1 : idx + 1;
    if (to < 0 || to >= order.length) return;
    withViewTransition(() => reorder(id, to));
    later(() => secs.current?.querySelector<HTMLButtonElement>(`[data-id="${id}"] .grip`)?.focus(), 80);
  };

  // Pointer drag: the block lifts and tilts, the others make room, and it settles with a FLIP.
  const onGripDown = (id: SectionId) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const grip = e.currentTarget;
    const el = grip.closest<HTMLElement>('[data-id]');
    const parent = el?.parentElement;
    if (!el || !parent) return;
    const all = Array.from(parent.querySelectorAll<HTMLElement>(':scope > [data-id]'));
    const from = all.indexOf(el);
    const rects = all.map((n) => n.getBoundingClientRect());
    const first = rects[0]!;
    const gap = rects.length > 1 ? Math.max(0, rects[1]!.top - first.bottom) : 18;
    const h = rects[from]!.height + gap;
    const y0 = e.clientY;
    const reduce = prefersReducedMotion();
    let to = from;
    try {
      grip.setPointerCapture(e.pointerId);
    } catch {
      // Capture can fail on synthetic events; the drag still follows the pointer over the grip.
    }
    el.classList.add(s.lift!);
    el.style.transition = 'background-color 240ms';
    const move = (ev: PointerEvent) => {
      const dy = ev.clientY - y0;
      el.style.transform = reduce ? `translateY(${dy}px)` : `translateY(${dy}px) scale(1.01) rotate(-0.4deg)`;
      const mid = rects[from]!.top + rects[from]!.height / 2 + dy;
      to = from;
      rects.forEach((r, i) => {
        if (i < from && mid < r.top + r.height / 2) to = Math.min(to, i);
        if (i > from && mid > r.top + r.height / 2) to = Math.max(to, i);
      });
      all.forEach((n, i) => {
        if (i === from) return;
        let t = 0;
        if (to > from && i > from && i <= to) t = -h;
        if (to < from && i < from && i >= to) t = h;
        n.style.transform = t ? `translateY(${t}px)` : '';
      });
    };
    const up = () => {
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', up);
      grip.removeEventListener('pointercancel', up);
      const before = el.getBoundingClientRect();
      all.forEach((n) => {
        n.style.transition = 'none';
        n.style.transform = '';
      });
      el.classList.remove(s.lift!);
      if (to === from) setSel(id);
      else reorder(id, to);
      later(() => {
        all.forEach((n) => {
          n.style.transition = '';
        });
        const now = secs.current?.querySelector<HTMLElement>(`[data-id="${id}"]`);
        if (!now || reduce) return;
        const d = before.top - now.getBoundingClientRect().top;
        if (Math.abs(d) < 1) return;
        now.style.transition = 'none';
        now.style.transform = `translateY(${d}px)`;
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            now.style.transition = '';
            now.style.transform = '';
          }),
        );
      }, 30);
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', up);
    grip.addEventListener('pointercancel', up);
  };

  const undoMove = () =>
    withViewTransition(() => {
      setOrder(prev ?? order);
      setPrev(null);
      setMoved('');
      setAnnounce('Order restored');
    });

  const onSuggestion = (text: string) => {
    if (text === 'Move Experience to the top') {
      const idx = order.indexOf('exp');
      if (idx > 0) withViewTransition(() => reorder('exp', 0));
      return;
    }
    send(text);
  };

  const displayName = viewAs === 'public' ? lin.name : lin.alias!;

  const top = (
    <>
      <span className={s.cap}>
        <span className="t-s">{'{domain}'}/@lin</span>
        <span className={s.pill}>Anonymous · discoverable</span>
      </span>
      <span className="flex-1" />
      <Segmented
        label="View as"
        value={viewAs}
        onChange={setViewAs}
        options={[
          { value: 'public', label: 'Public' },
          { value: 'anon', label: 'Anonymous' },
          { value: 'startup', label: 'As a startup' },
        ]}
      />
      <Button variant="quiet">History</Button>
      <span className="t-xs c2 whitespace-nowrap">{pending ? '3 things to confirm' : '2 things to confirm'}</span>
      <Link href={routes.firstPublish} className={buttonClass()}>
        Publish
      </Link>
    </>
  );

  const talk = (
    <>
      <AgentMessage>
        <p>Morning, Lin. Last time we stopped at Campus Marketplace. What happened during move-in week?</p>
      </AgentMessage>
      <UserMessage lang="zh-CN" source={!grown}>
        <p className="zh">开学那周数据库一直超时。我加了一层读缓存，又把图片上传从主请求里拆了出去，之后就稳了。</p>
      </UserMessage>
      <AgentMessage>
        <p>
          That’s the strongest story on your page, so it gets its own mark under Experience. I wrote it in English and
          kept your words as the source.
        </p>
        <Receipt
          on={hov}
          onHoverChange={setHov}
          action={
            <Chip size="sm" onClick={replay}>
              Show where it came from
            </Chip>
          }
        >
          Added to Experience — Move-in week
        </Receipt>
      </AgentMessage>
      <AgentMessage>
        <p>One number to check: did p95 really drop from 1.8 s to 240 ms? I read it off your Grafana screenshot.</p>
        <Receipt dashed>Marked to confirm — Result</Receipt>
      </AgentMessage>
      <UserMessage>
        <p>Can Experience go first? It’s the part I’m proudest of.</p>
      </UserMessage>
      <AgentMessage>
        <p>Drag it by the handle, or I can do it. I’ll keep Her story right under your name either way.</p>
      </AgentMessage>
      <StatusLine>Reading screenshot · grafana-p95.png</StatusLine>
      {sent}
    </>
  );

  const composer = (
    <Composer
      id="msg"
      placeholder="Tell me what to change — in any language"
      suggestions={['Move Experience to the top', 'Add the Grafana link', 'Record a 15-second intro']}
      onSuggestion={onSuggestion}
      onSend={send}
      context={sel ? <ContextTag onRemove={() => setSel(null)}>Editing: {CONTEXT[sel]}</ContextTag> : null}
    />
  );

  return (
    <Workspace
      top={top}
      talk={talk}
      composer={composer}
      canvasLabel="Your portrait, live"
      resizable
      mobile={{
        status: 'Anonymous · discoverable',
        canvasNote: 'Preview · as the public sees it',
        previewLabel: 'Your portrait · just now',
        previewTitle: 'Experience updated',
      }}
    >
      <p className="sr" aria-live="polite">
        {announce}
      </p>
      <div className={s.sheet}>
        <Ruler />
        <div className="relative">
          <div className={s.nowmark}>
            <PencilMark vw={180} d="M2 6 C50 3 110 7 178 4" isNew />
          </div>
          <p className="hand pt-[18px] text-[17px]">
            <Band>Now · moving to TypeScript</Band> <DateNote>Oct 17</DateNote>
          </p>
        </div>
        <div className="g12 mt-4 max-w-[760px] gap-y-2">
          <h1 className={cx('t-name col-[1/span_9]', s.name)}>{displayName}</h1>
          <div className="col-[10/span_3] flex flex-col gap-0.5 self-end">
            <p className="t-xs b">Open to summer 2027</p>
            <p className="t-xs c2">Backend · full-stack</p>
            <p className="t-xs c2">San Diego · remote</p>
          </div>
          <p className="t-h2 col-[1/span_10] mt-3.5">Builds the thing first, then finds out who needed it.</p>
        </div>

        {moved && prev ? (
          <MarginNote land className="mt-[26px]">
            Oct 19 · {moved} · <LinkButton onClick={undoMove}>undo</LinkButton>
          </MarginNote>
        ) : null}

        <div className={s.secs} ref={secs}>
          {order.map((id, idx) => (
            <EditableBlock
              key={id}
              data-id={id}
              className={s.sec}
              style={{ viewTransitionName: `s-${id}` }}
              selected={sel === id}
              gripLabel={`Move ${NAMES[id]} — drag, or use the up and down arrow keys`}
              onGripPointerDown={onGripDown(id)}
              onGripKeyDown={onGripKey(id, idx)}
              onSelect={() => setSel(id)}
            >
              <SectionBody
                id={id}
                grown={grown}
                hov={hov}
                sel={sel}
                pending={pending}
                onSelectMove={() => setSel('move')}
                onConfirm={() => {
                  setPending(false);
                  setAnnounce('Result confirmed');
                }}
                onChange={() => {
                  setSel('move');
                  document.getElementById('msg')?.focus();
                }}
                onUndoAdd={() => {
                  setGrown(false);
                  setSel('exp');
                  setAnnounce('Removed from Experience');
                }}
              />
              {sel === id ? <ChangeInChat /> : null}
            </EditableBlock>
          ))}
        </div>
      </div>
    </Workspace>
  );
}

/** Phones: picking a block offers to change it in the conversation. */
function ChangeInChat() {
  const { setView } = useWorkspace();
  return (
    <Chip
      size="sm"
      className={s.mchip}
      onClick={(e) => {
        e.stopPropagation();
        setView('talk');
      }}
    >
      Change this in chat
    </Chip>
  );
}

function SectionBody({
  id,
  grown,
  hov,
  sel,
  pending,
  onSelectMove,
  onConfirm,
  onChange,
  onUndoAdd,
}: {
  id: SectionId;
  grown: boolean;
  hov: boolean;
  sel: Selection;
  pending: boolean;
  onSelectMove: () => void;
  onConfirm: () => void;
  onChange: () => void;
  onUndoAdd: () => void;
}) {
  switch (id) {
    case 'story':
      return (
        <div>
          <p className="lab">Her story</p>
          <p className="t-h3 mt-1">Learned backend by keeping a real app alive for 2,000 students.</p>
        </div>
      );
    case 'exp':
      return (
        <div>
          <p className="lab">Experience · newest on top</p>
          {grown ? (
            <div
              className={cx(s.move, hov && s.hov, sel === 'move' && s.sel, 'mt-1.5')}
              style={{ viewTransitionName: 'grow' }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectMove();
              }}
            >
              <div className={s.newmark}>
                <PencilMark vw={120} d="M2 5 C30 7 70 3 118 6" isNew draw late />
              </div>
              <div className={s.row}>
                <span className={s.yr}>Sep 2026</span>
                <div>
                  <p className="t-h3">Survived move-in week</p>
                  <p className="t-s mt-1.5">
                    When 2,000 students posted at once, Postgres ran out of connections. Lin{' '}
                    <Band sweep>cached listings and moved photo uploads to a queue</Band> instead of buying a bigger
                    database.<span className="fn">4</span>
                  </p>
                  <p className="t-s mt-1.5">
                    Result: <Pending pending={pending}>p95 1.8 s → 240 ms</Pending>.<span className="fn">5</span>
                  </p>
                  {pending ? (
                    <div className="mt-2.5 flex gap-2">
                      <Chip
                        size="sm"
                        tone="wall"
                        onClick={(e) => {
                          e.stopPropagation();
                          onConfirm();
                        }}
                      >
                        Right
                      </Chip>
                      <Chip
                        size="sm"
                        tone="wall"
                        onClick={(e) => {
                          e.stopPropagation();
                          onChange();
                        }}
                      >
                        Change
                      </Chip>
                    </div>
                  ) : null}
                </div>
              </div>
              <MarginNote className={s.noteR}>
                Oct 19 · added from your message ·{' '}
                <LinkButton
                  onClick={(e) => {
                    e.stopPropagation();
                    onUndoAdd();
                  }}
                >
                  undo
                </LinkButton>
              </MarginNote>
            </div>
          ) : null}
          <div className={s.row}>
            <span className={s.yr}>2025 — now</span>
            <div>
              <p className="t-h3">Campus Marketplace · founder &amp; backend</p>
              <p className="t-s c2">A trading app used by 2,000+ students.</p>
            </div>
          </div>
          <div className={s.row}>
            <span className={s.yr}>2026 — now</span>
            <div>
              <p className="t-h3">Data Structures tutor</p>
              <p className="t-s c2">A weekly section that grew from 12 to 30.</p>
            </div>
          </div>
        </div>
      );
    case 'good':
      return (
        <div>
          <p className="lab">Good at</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <ChipTag size="sm" tone="wall">
              Ships under real load <Tally n={3} />
            </ChipTag>
            <ChipTag size="sm" tone="wall">
              Debugs from the logs up <Tally n={2} />
            </ChipTag>
          </div>
        </div>
      );
    case 'work':
      return (
        <div>
          <p className="lab">Work</p>
          <p className="t-s mt-1">
            <b>Campus Marketplace</b> · <b>What move-in week did to my database</b>
          </p>
        </div>
      );
    case 'look':
      return (
        <div>
          <p className="lab">Looking for</p>
          <p className="t-s mt-1">A summer 2027 backend internship on a small team.</p>
        </div>
      );
  }
}
