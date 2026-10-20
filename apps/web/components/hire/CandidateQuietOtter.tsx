'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  Band,
  BasisMark,
  Button,
  ChipTag,
  MarginNote,
  MustHaves,
  PencilMark,
  Segmented,
  Tally,
  cx,
  prefersReducedMotion,
  withViewTransition,
} from '@portrait/ui';
import { AppShell, ShellMain, useShell } from '@/components/shell/AppShell';
import { brief, quietOtter, type EvidenceSection, type MustKey } from '@/lib/data/hire';
import { companyNav } from '@/lib/nav';
import { routes } from '@/lib/routes';
import s from './Candidate.module.css';

type Version = 'anon' | 'rev';
type Kind = 'chat' | 'coffee';

/** V2-S07: frame 08A. Anonymous now, or as it reads after quiet-otter accepts. */
export function CandidateQuietOtter() {
  return (
    <AppShell
      nav={companyNav}
      active="hire"
      badges={{ inbox: '2' }}
      footer="Sam Okafor · Northwind"
      agent={{ context: `${quietOtter.no} ${quietOtter.alias}` }}
    >
      <QuietOtter />
    </AppShell>
  );
}

function QuietOtter() {
  const { agentOpen } = useShell();
  const [version, setVersion] = useState<Version>('anon');
  const [hl, setHl] = useState<MustKey | ''>('M1');
  const [q1, setQ1] = useState(true);
  const [q2, setQ2] = useState(false);
  const [kind, setKind] = useState<Kind>('coffee');
  const [sent, setSent] = useState(false);
  const sections = useRef<Partial<Record<EvidenceSection, HTMLDivElement | null>>>({});
  const reach = useRef<HTMLDivElement>(null);
  const followFocus = useRef(false);

  const v = quietOtter.versions[version === 'rev' ? 'revealed' : 'anon'];
  const lit = quietOtter.notes.find((n) => n.k === hl)?.section;
  const section = (k: EvidenceSection) => (el: HTMLDivElement | null) => {
    sections.current[k] = el;
  };

  // A match note lights its evidence; bring it into view when it is off screen (stacked layouts).
  const pick = (k: MustKey) => {
    const next = hl === k ? '' : k;
    setHl(next);
    const sec = quietOtter.notes.find((n) => n.k === next)?.section;
    if (sec) {
      sections.current[sec]?.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
  };

  // Send and its Undo replace each other; keep focus on the one now shown.
  const send = (next: boolean) => {
    followFocus.current = true;
    setSent(next);
  };
  useEffect(() => {
    if (!followFocus.current) return;
    followFocus.current = false;
    reach.current?.querySelector<HTMLElement>(sent ? '[data-undo]' : '[data-send]')?.focus();
  }, [sent]);

  return (
    <ShellMain className={cx(s.main, agentOpen && s.stack, 'max-sm:pb-28')}>
      <div className={s.pane}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="lab">
            <Link href={routes.contactSheet}>Hire › {brief.role}</Link> › Frame {quietOtter.no}{' '}
            <span className="hand ml-2 text-ink">circled Oct 19</span>
          </p>
          <Segmented<Version>
            label="Version"
            value={version}
            onChange={(next) => withViewTransition(() => setVersion(next))}
            options={[
              { value: 'anon', label: 'Anonymous · now' },
              { value: 'rev', label: 'After they accept' },
            ]}
          />
        </div>

        <div className="relative mt-[26px]">
          <p className="hand text-[18px]">
            <Band>{v.nowLine}</Band>
          </p>
          <p className="lab mt-[18px]">{v.ctxLine}</p>
          <h1 className={cx('t-name mt-3', s.name)}>{v.name}</h1>
          <p className="t-h2 mt-[18px] max-w-[32ch]">{v.headline}</p>
        </div>

        <div className={cx(s.ev, 'mt-7')}>
          <p className="lab">Good at</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <ChipTag>
              Ships under real load <Tally n={3} />
            </ChipTag>
            <ChipTag>
              Debugs from the logs up <Tally n={2} />
            </ChipTag>
            <ChipTag>
              Explains with drawings <Tally n={2} />
            </ChipTag>
          </div>
        </div>

        <div ref={section('work')} className={cx(s.ev, lit === 'work' && s.hilite, 'mt-[18px]')}>
          <p className="lab">Work</p>
          <div className={cx(s.proj, 'mt-2.5')}>
            <p className="t-h3">{v.proj}</p>
            <p className="t-s c2">{v.projDesc}</p>
            <div className="flex flex-wrap gap-1.5">
              <span className={s.tagc}>Go</span>
              <span className={s.tagc}>PostgreSQL</span>
              <span className={s.tagc}>Redis</span>
              <span className={cx(s.tagc, hl === 'M2' && 'band')}>TypeScript · admin panel</span>
            </div>
            <p className="t-xs c2">{v.projLink}</p>
          </div>
        </div>

        <div ref={section('write')} className={cx(s.ev, lit === 'write' && s.hilite, 'mt-[18px]')}>
          <p className="lab">Writing</p>
          <p className="t-s mt-2">
            <b>What move-in week did to my database</b> — a public post-mortem with the slow-query log, p95 before and
            after, and what she’d do differently.
          </p>
          <p className="t-xs c2 mt-1">
            <BasisMark kind="shown" />
            Shown · feed · 41 resonated
          </p>
        </div>

        <div ref={section('look')} className={cx(s.ev, lit === 'look' && s.hilite, 'mt-[18px]')}>
          <p className="lab">Looking for</p>
          <p className="t-s mt-2">
            A summer 2027 backend internship on a team small enough to sit next to the people using it. Free
            June–August. {v.tz}
          </p>
        </div>

        <div className="sunk mt-7 px-[18px] py-3.5">
          <p className="t-xs c2">{v.note}</p>
        </div>
      </div>

      <aside className={s.rail} aria-label="Match notes and outreach">
        <div className="panel px-[18px] py-4">
          <div className="flex items-baseline justify-between">
            <p className="lab">Match notes · 5 of 5</p>
            <MustHaves marks={['y', 'y', 'y', 'y', 'y']} />
          </div>
          <p className="t-xs c2 mt-0.5">Tap a line to see its evidence on the page.</p>
          <div className="mt-1.5">
            {quietOtter.notes.map((n) => (
              <button
                key={n.k}
                type="button"
                className={cx(s.nr, hl === n.k && s.on)}
                aria-pressed={hl === n.k}
                onClick={() => pick(n.k)}
              >
                <span className="hand b">{n.k}</span>
                <span className="t-s">
                  {n.t}
                  <span className="t-xs c2 block">{n.sub}</span>
                </span>
                <MustHaves marks={[n.mark]} />
              </button>
            ))}
          </div>
        </div>

        <div className="panel px-[18px] py-4">
          <p className="lab">Worth asking about</p>
          <p className="t-s mt-1.5">Hasn’t worked with a designer or PM yet.</p>
          <p className="t-s mt-1">Frontend so far is a mini-program, not React.</p>
        </div>

        <div className="panel px-[18px] py-4" ref={reach}>
          <div className="flex items-center justify-between">
            <p className="lab">Reach out</p>
            <Segmented<Kind>
              label="Reach out by"
              value={kind}
              onChange={setKind}
              options={[
                { value: 'chat', label: 'Chat' },
                { value: 'coffee', label: 'Coffee chat' },
              ]}
            />
          </div>
          {sent ? (
            <div className="mt-3">
              <PencilMark vw={200} d="M2 6 C50 3 120 7 198 4" isNew draw className="w-[70%]" />
              <div className="land">
                <MarginNote className="mt-1.5">
                  Sent Oct 19 · quiet-otter decides whether to reveal their name · 2 requests left
                </MarginNote>
                <Button variant="quiet" size="sm" className="-ml-2 mt-1" data-undo onClick={() => send(false)}>
                  Undo · 30 s
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <p className="t-xs c2 mt-2.5">Add a question from the reasons</p>
              <button type="button" className={cx(s.q, q1 && s.on)} aria-pressed={q1} onClick={() => setQ1(!q1)}>
                <span className={s.bx} aria-hidden="true" />
                <span className="t-s">What would you change about the cache if traffic doubled?</span>
              </button>
              <button type="button" className={cx(s.q, q2 && s.on)} aria-pressed={q2} onClick={() => setQ2(!q2)}>
                <span className={s.bx} aria-hidden="true" />
                <span className="t-s">Who decides what to build next on the app?</span>
              </button>
              <div className={cx(s.draft, 'mt-2.5')}>
                Hi — I’m Sam at Northwind (6 people, restaurant inventory). Your move-in week write-up is the kind of
                thinking our re-order screen needs.
                {q1 ? (
                  <>
                    {' '}
                    <span className={s.add}>I’d love to hear what you’d change about the cache if traffic doubled.</span>
                  </>
                ) : null}
                {q2 ? (
                  <>
                    {' '}
                    <span className={s.add}>And who decides what gets built next?</span>
                  </>
                ) : null}{' '}
                {kind === 'coffee' ? '20 minutes next week?' : 'Happy to keep it to messages if that’s easier.'}
              </div>
              <p className="t-xs c2 mt-2">Drafted from the reasons · edit freely · uses 1 request, 3 left this month</p>
              <div className="mt-2.5 flex gap-2">
                <Button size="sm" data-send onClick={() => send(true)}>
                  Send request
                </Button>
                <Button variant="quiet" size="sm">
                  Save draft
                </Button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </ShellMain>
  );
}
