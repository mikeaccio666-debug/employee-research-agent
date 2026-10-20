'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AgentMessage,
  Band,
  BasisMark,
  Button,
  Chip,
  LinkButton,
  MarginNote,
  MustHaves,
  PencilMark,
  Receipt,
  UserMessage,
  cx,
  prefersReducedMotion,
  useFlash,
} from '@portrait/ui';
import { AppShell, ShellMain, useShell } from '@/components/shell/AppShell';
import { MARK_LABEL, brief, nightHeron } from '@/lib/data/hire';
import { companyNav } from '@/lib/nav';
import s from './NightHeron.module.css';

const M4_ID = 'night-heron-m4';
const SEND_ID = 'night-heron-send';
const UNDO_ID = 'night-heron-undo';

/**
 * V2-S01b (company): frame 07A with the agent open. The thread and the page share
 * state here: the receipt lights the M4 row, and the request card sends from the thread.
 */
export function CandidateNightHeron() {
  const [hover, setHover] = useState(false);
  const [flashing, flash] = useFlash(2000);
  const [sent, setSent] = useState(false);
  const followFocus = useRef(false);
  const lit = hover || flashing;

  // Send and undo replace each other; keep focus on the one now shown.
  const send = (next: boolean) => {
    followFocus.current = true;
    setSent(next);
  };
  useEffect(() => {
    if (!followFocus.current) return;
    followFocus.current = false;
    document.getElementById(sent ? UNDO_ID : SEND_ID)?.focus();
  }, [sent]);

  const thread = (
    <>
      <UserMessage>
        <p className="t-s">Is night-heron worth a chat, or is the time zone a problem?</p>
      </UserMessage>
      <AgentMessage>
        <p className="t-s">
          Worth it: four of five must-haves. The gap is M4 — from New York, they overlap your pairing window from 10 to
          2 Pacific, not until 3.
        </p>
        <Receipt on={lit} onHoverChange={setHover} action={<ShowOnPage onShow={flash} />}>
          M4 · overlaps 10–2 only
        </Receipt>
      </AgentMessage>
      <AgentMessage>
        <p className="t-s">
          They asked ahead of your AMA how you decide what not to build — a good opening. Want me to send a
          coffee-chat request?
        </p>
        {sent ? (
          <div className="land mt-2.5">
            <PencilMark vw={200} d="M2 6 C50 3 120 7 198 4" isNew draw className="w-[60%]" />
            <MarginNote className="mt-1">
              Sent · Oct 19 · night-heron sees it in Inbox; their name stays hidden unless they accept ·{' '}
              <LinkButton id={UNDO_ID} onClick={() => send(false)}>
                undo
              </LinkButton>
            </MarginNote>
          </div>
        ) : (
          <div className={s.confirm}>
            <p className="lab">Send to night-heron · coffee chat · 20 min</p>
            <p className="t-s">
              “Hi — Sam at Northwind here. You asked how we decide what not to build; I’d love to answer properly. 20
              minutes next week, between 10 and 2 Pacific?”
            </p>
            <div className="flex flex-wrap gap-2">
              <Button id={SEND_ID} size="sm" onClick={() => send(true)}>
                Send request
              </Button>
              <Button variant="quiet" size="sm">
                Edit first
              </Button>
            </div>
            <p className="t-xs c2">Uses 1 of 3 requests left this month</p>
          </div>
        )}
      </AgentMessage>
    </>
  );

  return (
    <AppShell
      nav={companyNav}
      active="hire"
      footer="Sam Okafor · Northwind"
      agent={{
        defaultOpen: true,
        context: `${nightHeron.no} ${nightHeron.alias}`,
        caption: 'Same conversation as your Brief studio · today',
        thread,
      }}
    >
      <NightHeronPage m4Lit={lit} sent={sent} />
    </AppShell>
  );
}

/** "Show on page": lights the M4 row for two seconds. */
function ShowOnPage({ onShow }: { onShow: () => void }) {
  const { setAgentOpen } = useShell();
  return (
    <Chip
      size="sm"
      onClick={() => {
        // Where the panel covers the whole page (≤900px) it steps aside so the row can be seen.
        if (window.matchMedia('(max-width: 900px)').matches) setAgentOpen(false);
        onShow();
        document
          .getElementById(M4_ID)
          ?.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      }}
    >
      Show on page
    </Chip>
  );
}

function NightHeronPage({ m4Lit, sent }: { m4Lit: boolean; sent: boolean }) {
  const { setAgentOpen } = useShell();
  // The coffee-chat request is drafted in the thread: open the panel and go to it.
  const coffee = () => {
    setAgentOpen(true);
    window.setTimeout(() => document.getElementById(sent ? UNDO_ID : SEND_ID)?.focus(), 60);
  };

  return (
    <ShellMain className={cx(s.page, 'max-sm:pb-28')}>
      <p className="lab">
        Hire › {brief.role} › {nightHeron.no}
      </p>
      <div className="mt-3.5 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="hand text-[17px]">
            <Band>{nightHeron.nowLine}</Band>
          </p>
          <h1 className={cx('t-name mt-3', s.name)}>{nightHeron.alias}</h1>
          <p className="t-s c2 mt-1.5">{nightHeron.ctxLine}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={coffee}>Coffee chat</Button>
          <Button variant="secondary">Chat</Button>
        </div>
      </div>
      <p className="t-h2 mt-[22px] max-w-[34ch]">{nightHeron.headline}</p>
      <div className="g12 mt-8 gap-y-6">
        <div className={cx('panel', s.c7)}>
          <div className="px-[22px] py-[18px]">
            <p className="lab">Match notes · SWE Intern</p>
            {nightHeron.notes.map((n) => (
              <div
                key={n.k}
                id={n.k === 'M4' ? M4_ID : undefined}
                className={cx(s.mrow, n.k === 'M4' && m4Lit && s.hilite)}
              >
                <span className="hand b">{n.k}</span>
                <span className="t-s">
                  {n.t}
                  <span className="t-xs c2 block">{n.sub}</span>
                </span>
                <MustHaves marks={[n.mark]} label={MARK_LABEL[n.mark]} />
              </div>
            ))}
          </div>
        </div>
        <div className={cx('flex flex-col gap-3.5', s.c5)}>
          <div className="panel px-[18px] py-4">
            <p className="lab">Lately</p>
            <p className="t-s mt-1.5">
              <b>Asked</b> ahead of your Oct 29 AMA: “How do you decide what not to build with only six people?”
            </p>
            <p className="hand c3 text-[14px]">Oct 15 · 14 votes</p>
          </div>
          <div className="panel px-[18px] py-4">
            <p className="lab">A mark someone drew</p>
            <p className="hand mt-1.5 text-[17px]">“Replaced our shared spreadsheet in a weekend. We still use it.”</p>
            <p className="t-xs c2 mt-1">
              <BasisMark kind="ver" />
              Lab manager · verified
            </p>
          </div>
        </div>
      </div>
    </ShellMain>
  );
}
