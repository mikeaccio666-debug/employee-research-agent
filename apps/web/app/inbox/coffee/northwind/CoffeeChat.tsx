'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AgentMessage,
  Band,
  Button,
  Chip,
  PencilMark,
  Segmented,
  Thread,
  buttonClass,
  cx,
  withViewTransition,
} from '@portrait/ui';
import { TimeGrid, TimeGridLegend } from '@/components/connections/TimeGrid';
import { AppShell, ShellMain } from '@/components/shell/AppShell';
import {
  CHAT_DAYS,
  CHAT_DAYS_LONG,
  CHAT_ROWS,
  ET_OFFSET,
  cellKey,
  initialFreeTimes,
  isDanaFree,
  isLinBusy,
  northwindTagline,
  parseCellKey,
  slotEnd,
  slotTime,
} from '@/lib/data/connections';
import { talentNav } from '@/lib/nav';
import s from './coffee.module.css';

type Zone = 'pt' | 'et';
type Overlap = { k: string; d: number; r: number };

export function CoffeeChat() {
  const [sel, setSel] = useState<Record<string, true>>(initialFreeTimes);
  const [tz, setTz] = useState<Zone>('pt');
  const [pick, setPick] = useState('');
  const [done, setDone] = useState(false);
  const off = tz === 'et' ? ET_OFFSET : 0;

  const paint = useCallback(
    (k: string, free: boolean) =>
      setSel((prev) => {
        if (!!prev[k] === free) return prev;
        const next = { ...prev };
        if (free) next[k] = true;
        else delete next[k];
        return next;
      }),
    [],
  );

  // Each run of half hours where you and Dana are both free starts one option.
  const opts = useMemo(() => {
    const list: Overlap[] = [];
    for (let d = 0; d < CHAT_DAYS.length; d++) {
      let prev = false;
      for (let r = 0; r < CHAT_ROWS; r++) {
        const both = !!sel[cellKey(d, r)] && isDanaFree(d, r) && !isLinBusy(d, r);
        if (both && !prev) list.push({ k: cellKey(d, r), d, r });
        prev = both;
      }
    }
    return list;
  }, [sel]);

  const pk = pick && opts.some((o) => o.k === pick) ? pick : '';
  const [pd, pr] = pk ? parseCellKey(pk) : [0, 0];
  const whenLong = pk ? `${CHAT_DAYS_LONG[pd]} · ${slotTime(pr)}–${slotEnd(pr)} PT · ${slotTime(pr, ET_OFFSET)} in Toronto` : '';
  const whenShort = pk ? `${CHAT_DAYS_LONG[pd]} · ${slotTime(pr)} PT` : '';

  // The confirm button and the booked note replace each other; focus follows.
  const confirmRef = useRef<HTMLButtonElement>(null);
  const bookedRef = useRef<HTMLParagraphElement>(null);
  const focusNext = useRef<'confirm' | 'booked' | null>(null);
  useEffect(() => {
    const target = focusNext.current;
    const el = target && (target === 'confirm' ? confirmRef : bookedRef).current;
    if (!el) return; // nothing asked, or not rendered yet
    focusNext.current = null;
    el.focus({ preventScroll: true });
  });

  const confirm = () => {
    if (!pk) return;
    focusNext.current = 'booked';
    withViewTransition(() => setDone(true));
  };
  const reschedule = () => {
    focusNext.current = 'confirm';
    withViewTransition(() => setDone(false));
  };

  return (
    <AppShell nav={talentNav} active="inbox" footer="Lin Zhou · @lin" agent={{ context: 'Coffee chat › Northwind' }}>
      <ShellMain className={s.main}>
        <div className={s.cols}>
          <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-3">
              <h1 className="lab">Northwind · Sam Okafor, Dana Wu</h1>
              <Button variant="quiet" size="sm">
                Report
              </Button>
            </div>
            <p className="t-xs c3 mt-2.5 text-center">Oct 21 · you accepted · names are now visible to both sides</p>
            <Thread className="mt-3.5">
              <AgentMessage>
                <p className="t-xs c2">Sam · Northwind</p>
                <p className="t-s mt-0.5">
                  Thanks, Lin. Dana, our CTO, would love to take this one — she can talk caches all day.
                </p>
              </AgentMessage>
              <AgentMessage className="max-w-full">
                <p className="t-xs c2">Dana · Northwind · shared her free times</p>
                {done ? (
                  <div className={s.gridbox}>
                    <PencilMark vw={200} d="M2 6 C50 3 120 7 198 4" isNew draw style={{ width: 240 }} />
                    <div className="land">
                      <p ref={bookedRef} tabIndex={-1} className="hand mt-2 text-[22px]">
                        <Band>{whenLong}</Band>
                      </p>
                      <p className="t-s c2 mt-2">
                        Video link from Dana · reminders 24 h and 1 h before · calendar invites sent to you both
                      </p>
                      <div className="mt-3.5 flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm">
                          Open meeting link
                        </Button>
                        <Button variant="quiet" size="sm" onClick={reschedule}>
                          Reschedule
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={s.gridbox}>
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <div>
                        <h2 className="t-h3">Coffee chat · 20 minutes · week of Oct 26</h2>
                        <p className="t-s c2 mt-0.5">
                          Drag across the times you’re free. Where you overlap with Dana, it lights up.
                        </p>
                      </div>
                      <Segmented<Zone>
                        label="Time zone"
                        value={tz}
                        onChange={setTz}
                        options={[
                          { value: 'pt', label: 'PT · you' },
                          { value: 'et', label: 'ET · Dana' },
                        ]}
                      />
                    </div>
                    <TimeGridLegend other="Dana is free" mine="You’re free" both="Both" busy="Busy on your calendar" />
                    <TimeGrid
                      days={CHAT_DAYS}
                      rows={CHAT_ROWS}
                      timeLabel={(r) => slotTime(r, off)}
                      isOtherFree={isDanaFree}
                      otherName="Dana"
                      isBusy={isLinBusy}
                      selected={sel}
                      onPaint={paint}
                      picked={pick}
                      label="Free times, week of Oct 26"
                    />
                    <p className="t-xs c2 mt-2.5">
                      Keyboard: arrows move · Space marks a half hour. Dana is in Toronto, 3 hours ahead.
                    </p>
                    <div className="mt-4">
                      <p className="lab" aria-live="polite">
                        {opts.length
                          ? `You overlap at ${opts.length}${opts.length === 1 ? ' time' : ' times'} · pick one`
                          : 'No overlap yet · drag over a striped time'}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {opts.map((o) => (
                          <Chip
                            key={o.k}
                            on={pick === o.k}
                            aria-pressed={pick === o.k}
                            onClick={() => setPick((p) => (p === o.k ? '' : o.k))}
                          >
                            {`${CHAT_DAYS[o.d]} · ${slotTime(o.r, off)}`}
                          </Chip>
                        ))}
                      </div>
                      <button
                        ref={confirmRef}
                        type="button"
                        className={buttonClass({ className: cx('mt-3.5', s.confirm) })}
                        aria-disabled={!pk}
                        onClick={confirm}
                      >
                        {pk ? `Confirm ${CHAT_DAYS[pd]} · ${slotTime(pr)} PT` : 'Pick a time to confirm'}
                      </button>
                    </div>
                  </div>
                )}
              </AgentMessage>
            </Thread>
          </div>

          <aside className={s.side}>
            <div className="rb">
              <p className="lab">Scheduled</p>
              {done ? (
                <>
                  <p className="t-s b mt-2">{whenShort}</p>
                  <p className="t-xs c2">with Dana Wu · 20 min</p>
                </>
              ) : (
                <p className="t-s c2 mt-2">Nothing yet. Mark your free times in the grid.</p>
              )}
            </div>
            <div className="rb">
              <p className="lab">Northwind</p>
              <p className="t-s b mt-2">{northwindTagline}</p>
              <p className="t-xs c2 mt-1.5">Seed · 6 people · SF, hybrid</p>
            </div>
            <div className="rb">
              <p className="lab">You shared</p>
              <p className="t-s mt-2">
                Your full portrait, @lin. Work authorization stays hidden until you choose to share it.
              </p>
            </div>
          </aside>
        </div>
      </ShellMain>
    </AppShell>
  );
}
