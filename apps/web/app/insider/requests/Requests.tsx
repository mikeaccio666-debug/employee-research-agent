'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AgentMessage,
  Band,
  Button,
  Chip,
  ChipTag,
  LinkButton,
  MarginNote,
  PencilMark,
  Receipt,
  Slot,
  UserMessage,
  cx,
  prefersReducedMotion,
  useFlash,
} from '@portrait/ui';
import { AppShell, ShellMain, useShell } from '@/components/shell/AppShell';
import { replySlots, requestQueue } from '@/lib/data/insider';
import { insiderWorkNav } from '@/lib/nav';
import s from './requests.module.css';

/** "Show on page": where the panel covers the page (≤900px) it steps aside first. */
function ShowOnPage({ onShow }: { onShow: (panelClosed: boolean) => void }) {
  const { setAgentOpen } = useShell();
  return (
    <Chip
      size="sm"
      onClick={() => {
        const covered = window.matchMedia('(max-width: 900px)').matches;
        if (covered) setAgentOpen(false);
        onShow(covered);
      }}
    >
      Show on page
    </Chip>
  );
}

/**
 * S01b · Insider › Requests, with the agent open. The page and the thread share state:
 * the receipt lights R-02, and a reply sent from the thread marks R-02 "replied".
 */
export function Requests() {
  const [hov, setHov] = useState(false);
  const [flash, startFlash] = useFlash(2000);
  const [slot, setSlot] = useState('500');
  const [replied, setReplied] = useState(false);
  const r2 = useRef<HTMLDivElement>(null);
  const moved = useRef(false);
  const lit = hov || flash;
  const held = replySlots.find((x) => x.key === slot)?.held ?? '';

  // Keep keyboard focus on the thread when the reply swaps for its margin note, and back.
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    document.getElementById(replied ? 'reply-undo' : 'reply-send')?.focus({ preventScroll: true });
  }, [replied]);
  const reply = (next: boolean) => {
    moved.current = true;
    setReplied(next);
  };

  const showOnPage = (panelClosed: boolean) => {
    // The receipt slid away with the panel, so it no longer counts as hovered.
    if (panelClosed) setHov(false);
    startFlash();
    r2.current?.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  const thread = (
    <>
      <UserMessage>
        <p className="t-s">I’ve got about an hour this week. Who should I help first?</p>
      </UserMessage>
      <AgentMessage>
        <p className="t-s">
          paper-kite, R-02. The question is specific, Fernway has an open design intern role, and 20 minutes fits your
          Wednesday hours.
        </p>
        <Receipt on={lit} onHoverChange={setHov} action={<ShowOnPage onShow={showOnPage} />}>
          R-02 · matches an open Fernway role
        </Receipt>
      </AgentMessage>
      <AgentMessage>
        <p className="t-s">
          night-heron wants a referral, but you two haven’t talked. You can still refer — the note would say “haven’t
          met” — so I’d offer a chat first.
        </p>
      </AgentMessage>
      <AgentMessage>
        <p className="t-s">Shall I offer paper-kite a Wednesday slot?</p>
        {replied ? (
          <div className="land mt-2.5">
            <PencilMark vw={200} d="M2 6 C50 3 120 7 198 4" isNew draw className="w-[60%]" />
            <MarginNote className="mt-1">
              Sent · held {held} for paper-kite ·{' '}
              <LinkButton id="reply-undo" onClick={() => reply(false)}>
                undo
              </LinkButton>
            </MarginNote>
          </div>
        ) : (
          <div className={s.confirm}>
            <p className="lab">Reply to paper-kite · Wed Oct 21 · 20 min</p>
            <div className={s.slots} role="group" aria-label="Times, Pacific">
              {replySlots.map((x) =>
                x.taken ? (
                  <Slot key={x.key} disabled aria-label={x.aria}>
                    {x.label}
                  </Slot>
                ) : (
                  <Slot key={x.key} on={slot === x.key} onClick={() => setSlot(x.key)}>
                    {x.label}
                  </Slot>
                ),
              )}
            </div>
            <p className="t-s">
              “Happy to talk about how we hand off designs. Here’s a Wednesday slot — move it if it doesn’t work.”
            </p>
            <div className="flex flex-wrap gap-2">
              <Button id="reply-send" size="sm" onClick={() => reply(true)}>
                Send reply
              </Button>
              <Button variant="quiet" size="sm">
                Edit first
              </Button>
            </div>
          </div>
        )}
      </AgentMessage>
    </>
  );

  return (
    <AppShell
      nav={insiderWorkNav}
      active="requests"
      footer="Jordan Lee · Fernway insider"
      agent={{ defaultOpen: true, context: 'Requests · 3 waiting', thread }}
    >
      <ShellMain className={s.main}>
        <p className="lab">Insider › Requests</p>
        <div className="mt-3.5 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className={cx('t-d', s.h1)}>3 people asked for you</h1>
            <p className="t-body c2 mt-2">You answer when you can. Nobody sees how long you take.</p>
          </div>
          <p className={cx('t-s c2', s.rating)}>
            <b className="text-[22px] text-ink">4.9</b> · 11 reviews
            <br />
            Wed office hours · 2 of 3 slots open
          </p>
        </div>

        <div className="mt-[30px] flex max-w-[760px] flex-col gap-3">
          {requestQueue.map((r) => {
            const isR2 = r.id === 'R-02';
            return (
              <div key={r.id} ref={isR2 ? r2 : undefined} className={cx(s.req, isR2 && lit && s.hilite)}>
                <span className={s.id}>{r.id}</span>
                <div className={s.body}>
                  <p className="t-s">
                    <b>{r.who}</b> · {r.ctx}
                  </p>
                  <p className="t-s mt-1.5">{r.quote}</p>
                  <p className="t-xs c2 mt-1.5">
                    {r.asks}
                    {isR2 && replied ? (
                      <>
                        {' · '}
                        <span className="hand text-[14px] text-ink">
                          <Band>replied Oct 19</Band>
                        </span>
                      </>
                    ) : null}
                  </p>
                </div>
                <ChipTag size="sm">{r.chip}</ChipTag>
              </div>
            );
          })}
        </div>
        <p className="t-xs c2 mt-[18px]">
          Referral log · 4 this year · 1 hired · every referral says how well you know the person
        </p>
      </ShellMain>
    </AppShell>
  );
}
