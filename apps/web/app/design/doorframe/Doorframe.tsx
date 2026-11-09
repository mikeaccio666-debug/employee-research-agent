'use client';

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import {
  Band,
  Button,
  Composer,
  ContextTag,
  MarginNote,
  PencilMark,
  Ruler,
  Segmented,
  StatusLine,
  cx,
  withViewTransition,
} from '@portrait/ui';
import { DOORFRAME_PEOPLE, RUNG_LABEL, type Note, type Person, type Step } from '@/lib/data/doorframe';
import s from './doorframe.module.css';

/** pencil = the agent drew it; ink = the person said 对; struck = 不要 (kept so it can be undone). */
type DraftState = 'pencil' | 'ink' | 'struck';
type Draft = Step & { state: DraftState };
type Done = Step & { fresh?: boolean };
type LensState = { done: Done[]; drafts: Draft[] };

const SWIPE = 80;
const DASH_PENCIL = '7 6';
const DASH_INK = '12 5';

function initLens(done: Step[], drafts: Step[]): LensState {
  return { done: done.map((d) => ({ ...d })), drafts: drafts.map((d) => ({ ...d, state: 'pencil' as const })) };
}

function initPerson(p: Person): Record<string, LensState> {
  return Object.fromEntries(p.lenses.map((l) => [l.id, initLens(l.done, l.drafts)]));
}

/** One person's doorframe with the three gestures, the overnight notes and the agent's states. */
export function Doorframe() {
  const [personId, setPersonId] = useState(DOORFRAME_PEOPLE[0]!.id);
  const person = DOORFRAME_PEOPLE.find((p) => p.id === personId) ?? DOORFRAME_PEOPLE[0]!;
  return (
    <div>
      <div className={s.bar}>
        <Segmented
          label="选一位虚构用户"
          options={DOORFRAME_PEOPLE.map((p) => ({ value: p.id, label: p.name }))}
          value={personId}
          onChange={(v) => withViewTransition(() => setPersonId(v))}
        />
        <span className="t-xs c2">{person.meta}</span>
      </div>
      {/* A fresh frame per person, so switching back starts the story again. */}
      <PersonFrame key={person.id} person={person} />
    </div>
  );
}

function PersonFrame({ person }: { person: Person }) {
  const [lensId, setLensId] = useState(person.lenses[person.lenses.length - 1]!.id);
  const [lenses, setLenses] = useState(() => initPerson(person));
  const [editing, setEditing] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [note, setNote] = useState<{ text: ReactNode; undo?: () => void } | null>(null);
  const [inbox, setInbox] = useState<Note[]>(person.notes);
  const [reviewing, setReviewing] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const lens = person.lenses.find((l) => l.id === lensId) ?? person.lenses[0]!;
  const state = lenses[lens.id]!;
  const live = state.drafts.filter((d) => d.state !== 'struck');
  const next = live[0];

  const later = (ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  };
  const update = (fn: (l: LensState) => LensState, animate = true) => {
    const run = () => setLenses((all) => ({ ...all, [lens.id]: fn(all[lens.id]!) }));
    if (animate) withViewTransition(run);
    else run();
  };
  const setDraft = (id: string, patch: Partial<Draft>) =>
    update((l) => ({ ...l, drafts: l.drafts.map((d) => (d.id === id ? { ...d, ...patch } : d)) }));
  const snapshot = () => structuredClone(state);
  const restore = (snap: LensState) => () => {
    update(() => snap);
    setNote(null);
  };

  const yes = (d: Draft) => {
    const snap = snapshot();
    setDraft(d.id, { state: 'ink' });
    setNote({ text: <>定下了：{d.title}</>, undo: restore(snap) });
  };
  const no = (d: Draft) => {
    const snap = snapshot();
    setDraft(d.id, { state: 'struck' });
    setNote({ text: <>划掉了，agent 记住了，不会再提</>, undo: restore(snap) });
  };
  const did = (d: Draft) => {
    const snap = snapshot();
    update((l) => ({
      drafts: l.drafts.filter((x) => x.id !== d.id),
      done: [...l.done.map((x) => ({ ...x, fresh: false })), { ...d, sub: '刚刚做到 · 证据：自述，补一个链接可以升级', when: '今天', rung: 'said', fresh: true }],
    }));
    setNote({ text: <>门框高了一道：{d.title}</>, undo: restore(snap) });
  };
  const start = (d: Draft) => {
    setWorking(`在准备：${d.title}`);
    later(1100, () => {
      setWorking(null);
      setNote({ text: d.start ?? '已经开始了（原型里只演示到这里）' });
    });
  };
  const edit = (d: Draft, text: string) => {
    setEditing(null);
    setWorking(`在按你说的改：${d.title}`);
    const snap = snapshot();
    later(900, () => {
      setWorking(null);
      setDraft(d.id, { title: d.revised ?? d.title, sub: `你说：“${text}”。agent 按这个改了，还是铅笔，等你点“对”`, state: 'pencil' });
      setNote({ text: <>改好了</>, undo: restore(snap) });
    });
  };

  // Overnight notes: one card at a time, 对 adds its step as a new pencil line above "now".
  const card = inbox[0];
  const answer = (n: Note, ok: boolean) => {
    if (ok && n.adds) {
      const add = n.adds;
      update((l) => ({ ...l, drafts: [{ ...add, state: 'pencil' }, ...l.drafts] }));
    }
    setInbox((q) => q.slice(1));
    setReviewed((c) => c + 1);
  };
  const retry = (n: Note) => {
    setWorking('再试一次，连 Jordan 的日历…');
    later(1200, () => {
      setWorking(null);
      setInbox((q) => q.map((x) => (x.id === n.id ? { id: n.id, text: '连上了：Jordan 周三、周四晚上有空。要约周四吗？' } : x)));
    });
  };

  return (
    <div className={s.stage}>
      {person.lenses.length > 1 ? (
        <div className={s.lens}>
          <Segmented
            label="换一个方向看自己"
            options={person.lenses.map((l) => ({ value: l.id, label: l.label }))}
            value={lens.id}
            onChange={(v) =>
              withViewTransition(() => {
                setLensId(v);
                setEditing(null);
                setNote(null);
              })
            }
          />
          {lens.note ? <p className="t-xs c2 zh">{lens.note}</p> : null}
        </div>
      ) : null}

      <div className={s.layout}>
        <section className={s.frame} aria-label={`${person.name} 的门框`} lang="zh-CN">
          <Ruler />
          <ol className={s.rows}>
            {[...live].reverse().map((d) =>
              d === next ? (
                <NextRow
                  key={d.id}
                  d={d}
                  editing={editing === d.id}
                  onYes={() => yes(d)}
                  onNo={() => no(d)}
                  onEdit={() => setEditing(d.id)}
                  onCancelEdit={() => setEditing(null)}
                  onSend={(t) => edit(d, t)}
                  onStart={() => start(d)}
                  onDid={() => did(d)}
                />
              ) : (
                <DraftRow
                  key={d.id}
                  d={d}
                  editing={editing === d.id}
                  onYes={() => yes(d)}
                  onNo={() => no(d)}
                  onEdit={() => setEditing(d.id)}
                  onCancelEdit={() => setEditing(null)}
                  onSend={(t) => edit(d, t)}
                />
              ),
            )}
            <li className={s.now} style={vt('now')}>
              <span className={s.nowLine} aria-hidden="true" />
              <p className="t-h3">
                <Band>{person.now}</Band>
              </p>
            </li>
            {[...state.done].reverse().map((d) => (
              <li key={d.id} className={s.row} style={vt(d.id)}>
                <PencilMark vw={110} className={s.mk} draw={d.fresh} />
                <div>
                  <p className="t-s b">{d.title}</p>
                  <p className="t-xs c2">
                    {d.when ? <span className="hand">{d.when} · </span> : null}
                    {d.sub}
                    {d.rung ? <span className={s.rung}>{RUNG_LABEL[d.rung]}</span> : null}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          {state.drafts.some((d) => d.state === 'struck') ? (
            <p className="t-xs c2 mt-4">已划掉 {state.drafts.filter((d) => d.state === 'struck').length} 条，不再显示。</p>
          ) : null}
        </section>

        <aside className={s.side} lang="zh-CN">
          <div aria-live="polite" className={s.live}>
            {working ? <StatusLine>{working}</StatusLine> : null}
            {!working && note ? (
              <MarginNote land>
                {note.text}
                {note.undo ? (
                  <>
                    {' · '}
                    <button type="button" className="linklike" onClick={note.undo}>
                      撤销
                    </button>
                  </>
                ) : null}
              </MarginNote>
            ) : null}
          </div>

          {!reviewing ? (
            inbox.length ? (
              <button type="button" className={s.stack} onClick={() => setReviewing(true)}>
                <span className={s.paper} aria-hidden="true" />
                <span className={s.paper} aria-hidden="true" />
                <span className={s.top}>
                  <span className="t-s b block">你不在时 · {inbox.length} 条</span>
                  <span className="t-xs c2">一分钟看完：右滑"对"，左滑"不要"</span>
                </span>
              </button>
            ) : null
          ) : card ? (
            <NoteCard
              key={card.id}
              n={card}
              index={reviewed + 1}
              total={reviewed + inbox.length}
              onAnswer={(ok) => answer(card, ok)}
              onRetry={() => retry(card)}
            />
          ) : (
            <p className="t-s zh">看完了。新的步骤已经画在门框上，还是铅笔，等你点"对"。</p>
          )}
        </aside>
      </div>
    </div>
  );
}

function vt(id: string): CSSProperties {
  return { viewTransitionName: `df-${id}` } as CSSProperties;
}

type RowProps = {
  d: Draft;
  editing: boolean;
  onYes: () => void;
  onNo: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSend: (text: string) => void;
};

/** Y / E / N on a focused row; a horizontal swipe on touch. */
function useGestures(d: Draft, onYes: () => void, onNo: () => void, onEdit: () => void) {
  const [dx, setDx] = useState(0);
  const from = useRef<number | null>(null);
  const pencil = d.state === 'pencil';
  return {
    dx,
    handlers: {
      tabIndex: 0,
      onKeyDown: (e: KeyboardEvent) => {
        if (e.target !== e.currentTarget || !pencil) return;
        const k = e.key.toLowerCase();
        if (k === 'y') onYes();
        else if (k === 'n') onNo();
        else if (k === 'e') onEdit();
        else return;
        e.preventDefault();
      },
      onPointerDown: (e: PointerEvent) => {
        if (e.pointerType === 'mouse' || !pencil) return;
        from.current = e.clientX;
      },
      onPointerMove: (e: PointerEvent) => {
        if (from.current === null) return;
        setDx(Math.max(-140, Math.min(140, e.clientX - from.current)));
      },
      onPointerUp: () => {
        if (from.current === null) return;
        from.current = null;
        if (dx > SWIPE) onYes();
        else if (dx < -SWIPE) onNo();
        setDx(0);
      },
      onPointerCancel: () => {
        from.current = null;
        setDx(0);
      },
    },
  };
}

function Gestures({
  d,
  strong,
  onYes,
  onNo,
  onEdit,
}: {
  d: Draft;
  /** On a trim card: 对 becomes the primary button so it stays visible. */
  strong?: boolean;
  onYes: () => void;
  onNo: () => void;
  onEdit: () => void;
}) {
  if (d.state !== 'pencil') return null;
  return (
    <span className={cx(s.gest, !strong && s.reveal)}>
      <Button size="sm" variant={strong ? 'primary' : 'secondary'} onClick={onYes} aria-label={`对：${d.title}`}>
        对
      </Button>
      <Button size="sm" variant="wall" onClick={onEdit} aria-label={`改：${d.title}`}>
        改
      </Button>
      <Button size="sm" variant="quiet" onClick={onNo} aria-label={`不要：${d.title}`}>
        不要
      </Button>
    </span>
  );
}

function EditBox({ d, onSend, onCancel }: { d: Draft; onSend: (t: string) => void; onCancel: () => void }) {
  return (
    <Composer
      className="mt-3"
      surface="wall"
      rows={2}
      placeholder="直接说怎么改，比如：换成 3 家，先投远程的"
      context={
        <ContextTag onRemove={onCancel} removeLabel="不改了">
          改：{d.title}
        </ContextTag>
      }
      onSend={(t) => {
        if (!t.trim()) return false;
        onSend(t.trim());
        return true;
      }}
    />
  );
}

function Mentor({ m }: { m: NonNullable<Step['mentor']> }) {
  return (
    <span className={s.mentor}>
      <span className={s.face} aria-hidden="true">
        {m.name.slice(0, 1)}
      </span>
      <span className="t-xs">
        <b>{m.name}</b> {m.note}
      </span>
    </span>
  );
}

/** A pencil line further up: compact, quiet, the three gestures. */
function DraftRow({ d, editing, onYes, onNo, onEdit, onCancelEdit, onSend }: RowProps) {
  const g = useGestures(d, onYes, onNo, onEdit);
  return (
    <li
      className={cx(s.row, s.draft, d.state === 'ink' && s.ink)}
      style={{ ...vt(d.id), transform: g.dx ? `translateX(${g.dx}px)` : undefined }}
      aria-label={`${d.state === 'ink' ? '已定' : '铅笔草稿'}：${d.title}`}
      {...g.handlers}
    >
      <PencilMark vw={110} className={s.mk} dash={d.state === 'ink' ? DASH_INK : DASH_PENCIL} />
      <div>
        <p className={cx('t-s b', d.state === 'pencil' && 'c2')}>
          {d.gap ? <span className={s.gap}>缺口</span> : null}
          {d.title.replace(/^缺口：/, '')}
          {d.state === 'ink' ? <span className={s.rung}>已定</span> : null}
        </p>
        <p className="t-xs c2">{d.sub}</p>
        {d.mentor ? <Mentor m={d.mentor} /> : null}
        <Gestures d={d} onYes={onYes} onNo={onNo} onEdit={onEdit} />
        {editing ? <EditBox d={d} onSend={onSend} onCancel={onCancelEdit} /> : null}
      </div>
      <SwipeHint dx={g.dx} />
    </li>
  );
}

/** The one step right above "now": big, like the next stop on a learning path. */
function NextRow({
  d,
  editing,
  onYes,
  onNo,
  onEdit,
  onCancelEdit,
  onSend,
  onStart,
  onDid,
}: RowProps & { onStart: () => void; onDid: () => void }) {
  const g = useGestures(d, onYes, onNo, onEdit);
  return (
    <li
      className={cx(s.row, s.next, d.state === 'ink' && s.ink)}
      style={{ ...vt(d.id), transform: g.dx ? `translateX(${g.dx}px)` : undefined }}
      aria-label={`下一步，${d.state === 'ink' ? '已定' : '铅笔草稿'}：${d.title}`}
      {...g.handlers}
    >
      <PencilMark vw={110} className={s.mk} dash={d.state === 'ink' ? DASH_INK : DASH_PENCIL} />
      <div className={s.card}>
        <p className="lab">下一步</p>
        <p className="t-h3 mt-1">
          {d.gap ? <span className={s.gap}>缺口</span> : null}
          {d.title.replace(/^缺口：/, '')}
        </p>
        <p className="t-s c2 mt-1">{d.sub}</p>
        {d.mentor ? <Mentor m={d.mentor} /> : null}
        {d.state === 'pencil' ? (
          <>
            <p className="t-xs c2 mt-3">agent 用铅笔画的，还没定。</p>
            <Gestures strong d={d} onYes={onYes} onNo={onNo} onEdit={onEdit} />
          </>
        ) : (
          <span className={s.gest}>
            <Button onClick={onStart}>开始</Button>
            <Button variant="secondary" onClick={onDid}>
              做到了
            </Button>
          </span>
        )}
        {editing ? <EditBox d={d} onSend={onSend} onCancel={onCancelEdit} /> : null}
      </div>
      <SwipeHint dx={g.dx} />
    </li>
  );
}

function SwipeHint({ dx }: { dx: number }) {
  if (Math.abs(dx) < 24) return null;
  return (
    <span className={cx(s.hint, dx > 0 ? s.hintYes : s.hintNo)} aria-hidden="true">
      {dx > 0 ? '对' : '不要'}
    </span>
  );
}

function NoteCard({
  n,
  index,
  total,
  onAnswer,
  onRetry,
}: {
  n: Note;
  index: number;
  total: number;
  onAnswer: (ok: boolean) => void;
  onRetry: () => void;
}) {
  const [dx, setDx] = useState(0);
  const from = useRef<number | null>(null);
  return (
    <div
      className={s.noteCard}
      style={{ transform: dx ? `translateX(${dx}px) rotate(${dx / 40}deg)` : undefined }}
      onPointerDown={(e) => {
        if (e.pointerType !== 'mouse' && !n.failed) from.current = e.clientX;
      }}
      onPointerMove={(e) => {
        if (from.current !== null) setDx(Math.max(-160, Math.min(160, e.clientX - from.current)));
      }}
      onPointerUp={() => {
        if (from.current === null) return;
        from.current = null;
        if (dx > SWIPE) onAnswer(true);
        else if (dx < -SWIPE) onAnswer(false);
        setDx(0);
      }}
      onPointerCancel={() => {
        from.current = null;
        setDx(0);
      }}
    >
      <p className="hand t-xs c2">
        你不在时 · {index} / {total}
      </p>
      {n.failed ? (
        <>
          <p className="note mt-2">✕ {n.text}</p>
          <span className={s.gest}>
            <Button size="sm" onClick={onRetry}>
              重试
            </Button>
            <Button size="sm" variant="quiet" onClick={() => onAnswer(false)}>
              先跳过
            </Button>
          </span>
        </>
      ) : (
        <>
          <p className="t-s mt-2">{n.text}</p>
          <span className={s.gest}>
            <Button size="sm" onClick={() => onAnswer(true)}>
              对
            </Button>
            <Button size="sm" variant="quiet" onClick={() => onAnswer(false)}>
              不要
            </Button>
          </span>
        </>
      )}
      <SwipeHint dx={dx} />
    </div>
  );
}
