'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Band, Button, Grow, Segmented, buttonClass, cx, withViewTransition } from '@portrait/ui';
import { AppShell, ShellMain } from '@/components/shell/AppShell';
import { initialRegistrations, programWeeks, type ProgramEvent } from '@/lib/data/events';
import { talentNav } from '@/lib/nav';
import { routes } from '@/lib/routes';
import s from './program.module.css';

type Filter = 'for' | 'all' | 'reg';

/** A hand-drawn circle around the date: drawn when you register. */
const RING = 'M50 4 C78 2 98 22 97 50 C96 80 76 98 48 97 C20 96 3 78 4 50 C5 24 22 6 54 6';

/** S10 · the program: this week and next, filtered for Lin; registering circles the date. */
export function Program() {
  const [open, setOpen] = useState('b');
  const [reg, setReg] = useState<Record<string, boolean>>(initialRegistrations);
  const [filter, setFilter] = useState<Filter>('for');

  const keep = (e: ProgramEvent) => (filter === 'all' ? true : filter === 'reg' ? !!reg[e.id] : e.forYou);
  const weeks = programWeeks.map((w) => ({ ...w, events: w.events.filter(keep) }));
  const empty = weeks.every((w) => w.events.length === 0);
  const nReg = Object.values(reg).filter(Boolean).length;

  return (
    <AppShell nav={talentNav} active="events" footer="Lin Zhou · @lin">
      <ShellMain className="max-w-[1040px]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="t-d text-[56px] max-sm:text-[44px]">The program</h1>
            <p className="t-s c2 mt-1.5">All times in your time zone · Pacific</p>
          </div>
          <Segmented<Filter>
            label="Show events"
            options={[
              { value: 'for', label: 'For you' },
              { value: 'all', label: 'All' },
              { value: 'reg', label: `Registered ${nReg}` },
            ]}
            value={filter}
            onChange={(f) => withViewTransition(() => setFilter(f))}
          />
        </div>

        {weeks.map((week, i) => (
          <section key={week.id} aria-labelledby={`wk-${week.id}`}>
            <div className={s.wk}>
              <h2 id={`wk-${week.id}`} className="hand text-[18px]">
                {i === 0 ? <Band>{week.label}</Band> : week.label}
              </h2>
              <p className="t-s c2">{week.range}</p>
            </div>
            <div className="mt-2.5 flex flex-col gap-1">
              {week.events.map((e) => (
                <EventRow
                  key={e.id}
                  event={e}
                  open={open === e.id}
                  registered={!!reg[e.id]}
                  onToggle={() => withViewTransition(() => setOpen((cur) => (cur === e.id ? '' : e.id)))}
                  onRegister={() => setReg((cur) => ({ ...cur, [e.id]: !cur[e.id] }))}
                />
              ))}
            </div>
          </section>
        ))}
        {empty ? (
          <p className="t-s c2 mt-4">Nothing here yet. Register for an event and its date gets circled.</p>
        ) : null}
      </ShellMain>
    </AppShell>
  );
}

function EventRow({
  event: e,
  open,
  registered,
  onToggle,
  onRegister,
}: {
  event: ProgramEvent;
  open: boolean;
  registered: boolean;
  onToggle: () => void;
  onRegister: () => void;
}) {
  const bodyId = `ev-${e.id}`;
  const label = registered
    ? 'Registered · cancel'
    : e.full
      ? 'Join the waitlist'
      : e.slot
        ? 'Book a slot'
        : 'Register';
  return (
    <div className={cx(s.evr, open && s.open)}>
      <button type="button" className={s.eh} onClick={onToggle} aria-expanded={open} aria-controls={bodyId}>
        <span className={s.dd}>
          <span className={s.n}>{e.d}</span> <span className={s.w}>{e.w}</span>
          {registered ? (
            <svg className={cx(s.ring, 'draw')} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <path pathLength={1} d={RING} />
            </svg>
          ) : null}
        </span>{' '}
        <span>
          <span className="t-h3 block">{e.title}</span>{' '}
          {/* Phones wrap this line; as a block it keeps its own line height. */}
          <span className="t-xs c2 max-sm:mt-1 max-sm:block">{e.kind}</span>
          {registered ? <span className="sr">, registered</span> : null}
        </span>{' '}
        <span className={s.tm}>
          {e.time} <span className="t-xs c2 block font-medium">{e.len}</span>
        </span>
        <span className={s.pm} aria-hidden="true">
          +
        </span>
      </button>
      <Grow open={open} id={bodyId}>
        <div className={s.eb}>
          <div className="gl flex flex-col gap-2">
            <p className="ln t-s">{e.about}</p>
            {e.why ? <p className="ln note">{e.why}</p> : null}
          </div>
          <div className="ln flex flex-col items-start gap-2">
            <Button variant={registered ? 'secondary' : 'primary'} size="sm" onClick={onRegister}>
              {label}
            </Button>
            {e.page ? (
              <Link href={routes.eventPublic} className={buttonClass({ variant: 'quiet', size: 'sm', className: '-ml-2' })}>
                Event page
              </Link>
            ) : null}
          </div>
        </div>
      </Grow>
    </div>
  );
}
