'use client';

import { useId, useState } from 'react';
import { Band, Button, Grow, cx } from '@portrait/ui';
import { AppShell, ShellMain, useShell } from '@/components/shell/AppShell';
import { brief, nightHeron } from '@/lib/data/hire';
import { companyNav } from '@/lib/nav';
import s from './Paywall.module.css';

/** V2-S13b: the request limit is reached on frame 07A. Nothing is locked but the send. */
export function Paywall() {
  return (
    <AppShell
      nav={companyNav}
      active="hire"
      footer={
        <>
          Sam Okafor · Northwind
          <br />
          Free plan
        </>
      }
      agent={{ context: `${nightHeron.no} ${nightHeron.alias}` }}
    >
      <PaywallPage />
    </AppShell>
  );
}

function PaywallPage() {
  const { agentOpen } = useShell();
  const [plans, setPlans] = useState(false);
  const [saved, setSaved] = useState(false);
  const uid = useId();
  const plansId = `${uid}-plans`;
  const headId = `${uid}-head`;

  return (
    <ShellMain className={cx(s.main, agentOpen && s.stack, 'max-sm:pb-28')}>
      <div className={s.pane}>
        <p className="lab">
          Hire › {brief.role} › Frame {nightHeron.no}
        </p>
        <p className="hand mt-[18px] text-[17px]">
          <Band>{nightHeron.nowLine}</Band>
        </p>
        <h1 className={cx('t-name mt-3', s.name)}>{nightHeron.alias}</h1>
        <p className="t-s c2 mt-2">{nightHeron.ctxLine}</p>
        <p className="t-h2 mt-[18px] max-w-[32ch]">{nightHeron.headline}</p>
        <p className="t-body mt-3.5 max-w-[60ch]">
          Two years as a lab technician, then taught himself frontend. The form library he built is used by three
          nonprofits for intake forms.
        </p>
      </div>

      <aside className={cx('panel', s.aside)} aria-labelledby={headId}>
        <p className="lab" id={headId}>
          Reach out · coffee chat
        </p>
        <div className={cx(s.draft, 'mt-2.5')}>
          Hi — I’m Sam at Northwind. Your accessible form library is exactly the care our ordering screens need. 20
          minutes next week?
        </div>
        <div className={cx(s.used, 'mt-[18px]')}>
          <svg viewBox="0 0 56 26" aria-hidden="true">
            <path d="M6 4 L6 22 M18 4 L18 22 M30 4 L30 22 M2 20 L36 6" />
          </svg>
          <div>
            <p className="t-s b">You’ve used all 3 requests this month.</p>
            <p className="t-xs c2">0 of 3 left</p>
          </div>
        </div>
        <p className="t-s mt-3">
          They reset on Nov 1. Requests nobody answers in 14 days come back on their own — one is due back on Oct 30.
        </p>
        <div className="mt-3.5 flex flex-wrap gap-2">
          <Button variant={saved ? 'secondary' : 'primary'} size="sm" onClick={() => setSaved(!saved)}>
            {saved ? 'Saved · sends when you have a request' : 'Save note as draft'}
          </Button>
          <Button
            variant="quiet"
            size="sm"
            aria-expanded={plans}
            aria-controls={plansId}
            onClick={() => setPlans(!plans)}
          >
            {plans ? 'Hide plans' : 'See plans'}
          </Button>
        </div>
        <Grow open={plans} id={plansId}>
          <div className="gl mt-3.5">
            <div className={cx(s.cmpp, 'ln')}>
              <div className="sunk">
                <p className="t-s b">Free · now</p>
                <p className="t-xs c2 mt-1">3 requests a month · top 10 matches, anonymous</p>
              </div>
              <div className="bg-wall">
                <p className="t-s b">Startup · $149/mo</p>
                <p className="t-xs c2 mt-1">40 requests a month · full match list · office hours</p>
              </div>
            </div>
            <div className="ln mt-3 flex items-center gap-2">
              <Button size="sm">Upgrade to Startup</Button>
              <span className="t-xs c2">Cancel any time</span>
            </div>
          </div>
        </Grow>
        <p className="t-xs c2 mt-4">Your draft keeps. Nothing else on this page is locked.</p>
      </aside>
    </ShellMain>
  );
}
