'use client';

import Link from 'next/link';
import { Fragment, useEffect, useId, useRef, useState } from 'react';
import {
  Band,
  BasisMark,
  Button,
  DateNote,
  Grow,
  LinkButton,
  PencilMark,
  SectionMark,
  Slot,
  Tick,
  buttonClass,
  cx,
  withViewTransition,
} from '@portrait/ui';
import {
  northwindEvents,
  northwindFacts,
  northwindGrowth,
  northwindGrowthLabel,
  northwindPeople,
  northwindTagline,
  officeHourDefault,
  officeHourSlots,
} from '@/lib/data/connections';
import { routes } from '@/lib/routes';
import s from './company.module.css';

type Role = 0 | 1 | 2;

export function Company() {
  const [make, setMake] = useState(false);
  const [role, setRole] = useState<Role>(1);
  const [interested, setInterested] = useState(false);
  const [fol, setFol] = useState(true);
  const [slot, setSlot] = useState(officeHourDefault);
  const [booked, setBooked] = useState(false);
  const makeId = useId();
  const growthId = useId();
  const r1Id = useId();
  const r2Id = useId();

  // "Book" and "Undo" replace each other; focus follows.
  const bookRef = useRef<HTMLButtonElement>(null);
  const unbookRef = useRef<HTMLButtonElement>(null);
  const focusNext = useRef<'book' | 'unbook' | null>(null);
  useEffect(() => {
    const target = focusNext.current;
    const el = target && (target === 'book' ? bookRef : unbookRef).current;
    if (!el) return; // nothing asked, or not rendered yet
    focusNext.current = null;
    el.focus({ preventScroll: true });
  });

  const toggleRole = (r: 1 | 2) => withViewTransition(() => setRole((cur) => (cur === r ? 0 : r)));
  const book = () => {
    focusNext.current = 'unbook';
    setBooked(true);
  };
  const unbook = () => {
    focusNext.current = 'book';
    setBooked(false);
  };

  return (
    <>
      <section className="wrap relative pt-7">
        <div className="g12 gap-y-[18px]">
          <div className="relative col-[1/span_9] max-lg:col-span-full">
            <SectionMark vw={210} d="M2 6 C50 3 120 7 208 4" isNew className="top-1.5 w-[210px]" />
            <p className="hand pt-[22px] text-[18px]">
              <Band>Now · hiring a summer intern</Band>
              <DateNote>Oct 18</DateNote>
            </p>
            <p className="lab mt-5">
              Company · <BasisMark kind="ver" className="ml-1" />
              verified startup, checked by a person on Oct 3
            </p>
            <h1 className={cx('t-name mt-3', s.name)}>Northwind</h1>
            <p className="t-h1 mt-[22px] max-w-[26ch]">{northwindTagline}</p>
          </div>
          <div className={cx('col-[10/span_3] max-lg:col-span-full', s.factsCol)}>
            <dl className={s.facts}>
              {northwindFacts.map(([k, v]) => (
                <Fragment key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </Fragment>
              ))}
            </dl>
            <div className="flex flex-wrap gap-2">
              <a className={buttonClass()} href="#oh">
                Book office hours
              </a>
              <Button variant="secondary" aria-pressed={fol} onClick={() => setFol((v) => !v)}>
                {fol ? 'Following' : 'Follow'}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="wrap pt-[72px] pb-16">
        <div className="g12 gap-y-12">
          <main className="col-[1/span_8] flex flex-col gap-14 max-lg:col-[1/span_7] max-md:col-span-full">
            <section className="relative">
              <SectionMark d="M2 5 C40 7 90 3 148 6" />
              <p className="lab pt-[18px]">What we make</p>
              <p className="t-h2 mt-2.5 max-w-[32ch]">
                The screen a restaurant opens at 6 a.m.: what’s left, what’s coming, and one button to re-order.
              </p>
              <Grow open={make} id={makeId}>
                <div className="gl mt-3.5 flex flex-col gap-3">
                  <p className="ln t-body max-w-[62ch]">
                    Independent restaurants re-order produce by text message and memory. Northwind connects to the
                    suppliers they already use, so a chef can see the walk-in at a glance and re-order before the first
                    delivery.
                  </p>
                  <div className={cx('ln', s.shot)}>
                    <svg viewBox="0 0 300 140" aria-hidden="true">
                      <rect x="2" y="2" width="296" height="136" rx="6" />
                      <path d="M20 30 L140 30 M20 54 L120 54 M20 78 L132 78 M20 102 L100 102" />
                      <rect x="196" y="92" width="84" height="28" rx="4" />
                    </svg>
                    <span className="t-xs c2 relative">Re-order screen · from Northwind</span>
                  </div>
                </div>
              </Grow>
              <Button
                variant="quiet"
                size="sm"
                className="mt-1.5 -ml-2"
                onClick={() => setMake((v) => !v)}
                aria-expanded={make}
                aria-controls={makeId}
              >
                {make ? 'Less' : 'How it works'}
              </Button>
            </section>

            <section className="relative" aria-labelledby={growthId}>
              <SectionMark d="M2 6 C50 4 100 7 148 4" />
              <p className="lab pt-[18px]" id={growthId}>
                How tall we are · restaurants using it every morning
              </p>
              <div className={s.growth} role="img" aria-label={northwindGrowthLabel}>
                <svg viewBox="0 0 600 200" preserveAspectRatio="none" aria-hidden="true">
                  <path className={s.base} d="M0 180 L600 180" />
                  {northwindGrowth.map((g, i) => (
                    <path
                      key={g.value}
                      className={cx(s.tk, g.now && s.now)}
                      pathLength={1}
                      d={`M${g.x} 180 L${g.x} ${g.top}`}
                      style={i ? { animationDelay: `${i * 90}ms` } : undefined}
                    />
                  ))}
                </svg>
                {northwindGrowth.map((g) => (
                  <span
                    key={g.value}
                    className={cx(s.lbl, g.now && s.lblNow)}
                    style={{ left: g.labelLeft, top: g.labelTop }}
                  >
                    {g.value}
                  </span>
                ))}
                {northwindGrowth.map((g) => (
                  <span key={g.month} className={cx('t-xs', s.lbl, s.month)} style={{ left: g.labelLeft }}>
                    {g.month}
                  </span>
                ))}
              </div>
              <p className="hand mt-[30px] max-w-[44ch] text-[19px] leading-[1.45]">
                “Our first intern will ship to real kitchens in week three. We’d rather teach you our domain than hire
                someone who’s seen it all.”
              </p>
              <p className="t-xs c2 mt-1.5">Sam Okafor, CEO</p>
            </section>

            <section className="relative">
              <SectionMark d="M2 4 C50 6 100 4 148 6" />
              <p className="lab pt-[18px]">Open roles · 2</p>
              <div className={s.roles}>
                <div className={cx(s.role, role === 1 && s.open)}>
                  <button
                    type="button"
                    className={s.rh}
                    onClick={() => toggleRole(1)}
                    aria-expanded={role === 1}
                    aria-controls={r1Id}
                  >
                    <span>
                      <span className="t-h3 block">Software Engineering Intern, Summer 2027</span>
                      <span className="t-s c2">12 weeks · SF or remote · ship the re-order screen and own it</span>
                    </span>
                    <span className="t-xs c2">AMA Oct 29</span>
                    <span className={s.pm2} aria-hidden="true">
                      +
                    </span>
                  </button>
                  <Grow open={role === 1} id={r1Id}>
                    <div className={s.rb2}>
                      <div className="gl flex flex-col gap-2">
                        <p className="ln t-s">
                          <b>You’ve shipped something real people use.</b> You’ll own a screen restaurants open at 6 a.m.
                        </p>
                        <p className="ln t-s">
                          <b>You’re comfortable in TypeScript</b>, free June–August, and around 10–3 Pacific for pairing.
                        </p>
                        <p className="ln t-s">
                          <b>You write clearly.</b> Six people, async; decisions live in docs.
                        </p>
                      </div>
                      <div className="ln mt-3.5 flex flex-wrap gap-2">
                        <Button
                          variant={interested ? 'secondary' : 'primary'}
                          size="sm"
                          onClick={() => setInterested((v) => !v)}
                        >
                          {interested ? 'Interested · undo' : 'I’m interested'}
                        </Button>
                        <span className="t-xs c2 self-center" aria-live="polite">
                          {interested ? 'Northwind sees quiet-otter, not your name.' : 'They’ll see your anonymous portrait.'}
                        </span>
                      </div>
                    </div>
                  </Grow>
                </div>
                <div className={cx(s.role, role === 2 && s.open)}>
                  <button
                    type="button"
                    className={s.rh}
                    onClick={() => toggleRole(2)}
                    aria-expanded={role === 2}
                    aria-controls={r2Id}
                  >
                    <span>
                      <span className="t-h3 block">Founding Engineer, Backend</span>
                      <span className="t-s c2">Full-time · SF hybrid · Go and Postgres</span>
                    </span>
                    <span className="t-xs c2">AMA Nov 12</span>
                    <span className={s.pm2} aria-hidden="true">
                      +
                    </span>
                  </button>
                  <Grow open={role === 2} id={r2Id}>
                    <div className={s.rb2}>
                      <div className="gl">
                        <p className="ln t-s">
                          The second engineer after Dana. You’d own supplier integrations and the morning re-order run.
                        </p>
                      </div>
                    </div>
                  </Grow>
                </div>
              </div>
            </section>

            <section className="relative">
              <SectionMark d="M2 6 C40 3 100 7 148 5" />
              <p className="lab pt-[18px]">Who’s here</p>
              <div className="g12 mt-3.5 gap-y-4">
                {northwindPeople.map((p) => (
                  <div key={p.name} className={cx(s.person, 'col-span-6')}>
                    <span className={s.av} aria-hidden="true">
                      {p.initials}
                    </span>
                    <span className="t-s">
                      <b>{p.name}</b>
                      <span className="t-xs c2 block">{p.about}</span>
                    </span>
                  </div>
                ))}
                <p className="t-s c2 col-span-full">
                  Four more: two engineers, a designer, and the person who answers the phone at 6 a.m.
                </p>
              </div>
            </section>
          </main>

          <aside
            className={cx('col-[10/span_3] max-lg:col-[9/span_4] max-md:col-span-full', s.rail)}
          >
            <div className="rb">
              <p className="lab">You &amp; Northwind</p>
              <ul className="mt-3 flex flex-col gap-2.5">
                <li className="t-s flex gap-2.5">
                  <Tick />
                  <span>Registered for the Oct 29 AMA</span>
                </li>
                <li className="t-s flex gap-2.5">
                  <Tick d="M2 7 L7 12 L16 3" />
                  <span>Same stack as Campus Marketplace: Postgres</span>
                </li>
              </ul>
              <p className="t-xs c3 mt-3">Viewing as Lin Zhou</p>
            </div>

            <div className="rb" id="oh">
              <p className="lab">Office hours · every Wednesday</p>
              <p className="t-s mt-1.5">Sam or Dana, 15 minutes, no résumé needed.</p>
              {booked ? (
                <div className="mt-3">
                  <PencilMark vw={200} d="M2 6 C50 3 120 7 198 4" isNew draw style={{ width: '80%' }} />
                  <div className="land">
                    <p className="hand mt-1.5 text-[17px]">
                      <Band>{`Wed Oct 28 · ${slot} PM`}</Band>
                    </p>
                    <button
                      ref={unbookRef}
                      type="button"
                      className={buttonClass({ variant: 'quiet', size: 'sm', className: 'mt-1.5 -ml-2' })}
                      onClick={unbook}
                    >
                      Undo
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="t-xs c2 mt-2.5">Wed Oct 28 · your time, PT</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {officeHourSlots.map((o) =>
                      o.taken ? (
                        <Slot key={o.time} aria-disabled="true" className="cursor-default text-ink-3 line-through">
                          {o.time}
                        </Slot>
                      ) : (
                        <Slot key={o.time} on={slot === o.time} onClick={() => setSlot(o.time)}>
                          {o.time}
                        </Slot>
                      ),
                    )}
                  </div>
                  <button
                    ref={bookRef}
                    type="button"
                    className={buttonClass({ size: 'sm', className: 'mt-3 w-full' })}
                    onClick={book}
                  >
                    {`Book Wed ${slot} PM`}
                  </button>
                  <p className="t-xs c2 mt-1.5">Up to two a week</p>
                </div>
              )}
            </div>

            <div className="rb">
              <p className="lab">Events</p>
              <div className="mt-3 grid grid-cols-[44px_minmax(0,1fr)] items-baseline gap-y-3">
                {northwindEvents.map((e) => (
                  <Fragment key={e.day}>
                    <span className="hand text-[26px] font-semibold">{e.day}</span>
                    <span className="t-s">
                      {e.title}
                      <span className="t-xs c2 block">{e.meta}</span>
                    </span>
                  </Fragment>
                ))}
              </div>
            </div>

            <div className="rb">
              <p className="lab">Lately</p>
              <p className="t-s mt-2">
                Forty restaurants. Thanks to every chef who texted us a photo of their walk-in at 5:45 a.m.
              </p>
              <p className="t-xs c2 mt-1">Oct 2</p>
            </div>
          </aside>
        </div>
      </section>

      <footer className="wrap pb-12">
        <p className="t-xs c2">
          Drawn with Portrait · <Link href={routes.birth}>Draw yours</Link> ·{' '}
          <LinkButton>Report this company</LinkButton>
        </p>
      </footer>
    </>
  );
}
