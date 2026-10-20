'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  AgentMessage,
  Band,
  Brackets,
  Button,
  Chip,
  ChipTag,
  Composer,
  ContextTag,
  DateNote,
  Receipt,
  Ruler,
  SectionMark,
  UserMessage,
  buttonClass,
  cx,
  withViewTransition,
} from '@portrait/ui';
import { useLocalThread } from '@/components/agent/AgentPanel';
import { Workspace } from '@/components/workspace/Workspace';
import { brief, mustHaves, type MustKey } from '@/lib/data/hire';
import { routes } from '@/lib/routes';
import s from './BriefStudio.module.css';

const COMPOSER_ID = 'brief-message';

/** "124 match the basics · 18 strong" with the M4 experiment beside it. */
function Pool({
  strong,
  relaxed,
  onToggle,
  className,
}: {
  strong: number;
  relaxed: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <span className={cx(s.pool, className)}>
      <span>
        <b>{brief.basics}</b> match the basics · <span className={s.n}>{strong}</span> strong
      </span>
      <Chip size="sm" on={relaxed} aria-pressed={relaxed} onClick={onToggle}>
        {relaxed ? 'Keep M4 strict' : `Try relaxing M4 → ${brief.relaxedStrong}`}
      </Chip>
    </span>
  );
}

/** V2-S05: the brief studio. The agent drafts the brief; every change lands on the right. */
export function BriefStudio() {
  const [relaxed, setRelaxed] = useState(false);
  const [used, setUsed] = useState(false);
  const [sel, setSel] = useState<MustKey | ''>('M1');
  const { nodes, send } = useLocalThread();
  const guard = useRef<HTMLDivElement>(null);
  const followFocus = useRef(false);

  const strong = relaxed ? brief.relaxedStrong : brief.strong;
  const toggleRelax = () => withViewTransition(() => setRelaxed((v) => !v));
  const setWording = (next: boolean) => {
    followFocus.current = true;
    withViewTransition(() => setUsed(next));
  };

  // "Use that wording" and its Undo replace each other; keep focus on the one now shown.
  useEffect(() => {
    if (!followFocus.current) return;
    followFocus.current = false;
    guard.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, [used]);

  const clearSel = () => {
    setSel('');
    document.getElementById(COMPOSER_ID)?.focus();
  };

  const seeMatches = (
    <Link className={buttonClass({ size: 'sm', className: s.see })} href={routes.contactSheet}>
      See {strong} matches
    </Link>
  );

  const top = (
    <>
      <span className={s.crumbs}>
        <span className="t-s c2 max-md:hidden">Northwind ›</span>
        <span className="t-s b">Brief · {brief.role}</span>
      </span>
      <span className="t-xs c2 ml-1.5 whitespace-nowrap max-lg:hidden">Private · for matching</span>
      <span className="flex-1" />
      <Pool strong={strong} relaxed={relaxed} onToggle={toggleRelax} />
      {seeMatches}
    </>
  );

  const talk = (
    <>
      <UserMessage>
        <p className="t-s">
          <ChipTag size="sm" tone="wall" className="mb-2">
            intern-job-post.txt
          </ChipTag>
          <br />
          Here’s our post. We need a strong engineer for the summer.
        </p>
      </UserMessage>
      <AgentMessage>
        <p className="t-s">
          I drafted a brief on the right. One question first: “strong engineer” — what has this person already done?
          Shipped something, led something, fixed something?
        </p>
        <Receipt>Drafted brief · 4 sections, 5 must-haves</Receipt>
      </AgentMessage>
      <UserMessage>
        <p className="t-s">
          Shipped something real people use. Go is nice, not required. Honestly we’d prefer under 25 — young team.
        </p>
      </UserMessage>
      <AgentMessage>
        <p className="t-s">I moved Go to nice-to-haves and made M1 about shipping.</p>
        <Receipt action={<Chip size="sm">Undo</Chip>}>Edited Must-haves · M1</Receipt>
        <div className={s.guard} ref={guard}>
          <p className="t-s">
            <b>We don’t filter by age</b>, or by anything that stands in for it. Want to describe the pace instead?
          </p>
          {used ? (
            <Receipt
              className="land mt-2.5 bg-wall-2"
              action={
                <Chip size="sm" onClick={() => setWording(false)}>
                  Undo
                </Chip>
              }
            >
              Added a signal · owns a feature end to end
            </Receipt>
          ) : (
            <>
              <p className={cx('t-s mt-2', s.chipsrc)}>
                <Band>“Comfortable with a fast, scrappy pace; owns a feature end to end.”</Band>
              </p>
              <div className="mt-2.5 flex gap-2">
                <Button size="sm" onClick={() => setWording(true)}>
                  Use that wording
                </Button>
                <Button variant="quiet" size="sm">
                  Skip
                </Button>
              </div>
            </>
          )}
        </div>
      </AgentMessage>
      {relaxed ? (
        <AgentMessage className="land">
          <p className="t-s">
            With M4 as a nice-to-have, 9 more people become strong matches — most are on the East Coast and overlap
            until 2 Pacific.
          </p>
        </AgentMessage>
      ) : null}
      {nodes}
    </>
  );

  const composer = (
    <Composer
      id={COMPOSER_ID}
      placeholder="Say what to change"
      onSend={send}
      context={sel ? <ContextTag onRemove={clearSel}>Editing: Must-haves › {sel}</ContextTag> : undefined}
    />
  );

  return (
    <Workspace
      top={top}
      talk={talk}
      composer={composer}
      canvasLabel="The brief"
      mobile={{
        status: 'Private · for matching',
        canvasNote: 'Private · for matching',
        previewLabel: 'Brief · Northwind · v3',
        previewTitle: brief.role,
        previewAria: 'Open the brief',
      }}
    >
      <div className={s.sheet}>
        <Ruler />
        {/* Phones: the top bar is folded away, so the pool and the way to the matches sit here. */}
        <div className="mb-6 flex flex-wrap items-center gap-2.5 sm:hidden">
          <Pool strong={strong} relaxed={relaxed} onToggle={toggleRelax} className={s.poolm} />
          {seeMatches}
        </div>
        <p className="lab">
          Brief · Northwind · v3 <DateNote>updated just now</DateNote>
        </p>
        <h1 className="t-h1 mt-2.5 max-w-[22ch]">{brief.title}</h1>
        <p className="t-body mt-2.5 max-w-[54ch]">{brief.pitch}</p>

        <section className="relative mt-[30px] max-w-[640px]">
          <SectionMark vw={150} d="M2 6 C40 3 90 7 148 4" isNew className="top-1" />
          <p className="lab">Must-haves · {relaxed ? '4 + 1 relaxed' : '5'}</p>
          <div className="mt-2 flex flex-col gap-0.5">
            {mustHaves.map((m) => {
              const struck = relaxed && m.k === 'M4';
              const on = sel === m.k;
              return (
                <button
                  key={m.k}
                  type="button"
                  className={cx(s.mh, on && s.sel, struck && s.moved)}
                  aria-pressed={on}
                  onClick={() => setSel(on ? '' : m.k)}
                >
                  <Brackets />
                  <span className={s.k}>{m.k}</span>
                  <span className="t-s">
                    <b>{m.t}</b>
                    <span className={s.why}>{m.why}</span>
                  </span>
                  <span className={s.edited}>{struck ? 'now a nice-to-have' : m.note}</span>
                  {struck ? (
                    <svg
                      className={cx(s.strk, 'draw')}
                      viewBox="0 0 100 12"
                      preserveAspectRatio="none"
                      aria-hidden="true"
                    >
                      <path pathLength={1} d="M2 7 C30 4 60 9 98 5" />
                    </svg>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-7 max-w-[640px]">
          <p className="lab">Nice to have</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {relaxed ? (
              <span className={cx(s.sig, 'land bg-warm')}>
                Overlaps 10–3 Pacific <span className={cx(s.edited, 'ml-2')}>moved from M4</span>
              </span>
            ) : null}
            <span className={s.sig}>Go in production</span>
            <span className={s.sig}>Worked in a restaurant or shop</span>
            <span className={s.sig}>Mobile web</span>
          </div>
        </section>

        <section className="mt-7 max-w-[640px]">
          <p className="lab">Signals we love</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <span className={s.sig}>Writes post-mortems</span>
            <span className={s.sig}>Side projects with users</span>
            {used ? <span className={cx(s.sig, s.src)}>Owns a feature end to end</span> : null}
          </div>
        </section>

        <section className="mt-7 max-w-[640px]">
          <p className="lab">Logistics</p>
          <p className="t-s mt-2">SF office two days a week, or remote · Pay [YOUR RANGE] / hour · CPT and OPT welcome</p>
        </section>

        <section className="sunk mt-8 max-w-[640px]">
          <div className="flex flex-col gap-2 px-[18px] py-3.5">
            <p className="t-s">
              <span className="lab mr-2">Not added</span>“Under 25.” We don’t filter by age or anything that stands in
              for it.
            </p>
            <p className="t-s">
              <span className="lab mr-2">Pool</span>M3 is the strictest: 40% of the basics pool is only free in July.
            </p>
          </div>
        </section>
      </div>
    </Workspace>
  );
}
