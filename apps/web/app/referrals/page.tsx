import type { Metadata } from 'next';
import { Tick, cx } from '@portrait/ui';
import { AppShell, ShellMain } from '@/components/shell/AppShell';
import { talentNav } from '@/lib/nav';
import { Verification } from './Verification';
import s from './referrals.module.css';

export const metadata: Metadata = { title: 'Referral subscription' };

/** S19 · the referral subscription (Alex): what it is, what it isn't, and how verification is going. */
export default function ReferralsPage() {
  return (
    <AppShell
      nav={talentNav}
      active="grow"
      footer="Alex Rivera · @alex"
      agent={{ context: 'Grow › Referral subscription' }}
    >
      <ShellMain className={s.main}>
        <div className={s.cols}>
          <div>
            <p className="lab">Grow › Referral subscription</p>
            <h1 className={cx('t-d mt-3.5', s.h1)}>Get introduced to insiders — honestly.</h1>
            <p className="t-body c2 mt-3.5 max-w-[46ch]">
              You’re paying for verification, packaging and introductions — not for a referral. Referrals are always the
              insider’s call.
            </p>
            <h2 className="lab mt-7">You get</h2>
            <div className={s.gets}>
              <Tick />
              <p className="t-s">
                <b>Verification.</b> We check the claims insiders care about, so they can trust your page.
              </p>
              <Tick d="M2 7 L7 12 L16 3" />
              <p className="t-s">
                <b>Packaging.</b> A packet for each role: a tailored résumé, a short note, and your three strongest pieces
                of evidence.
              </p>
              <Tick d="M2 8 L7 11 L16 2" />
              <p className="t-s">
                <b>Introductions.</b> Shown to up to five matching insiders a month.
              </p>
            </div>
            <div className="sunk mt-5 px-4 py-3.5">
              <h2 className="lab">You don’t get</h2>
              <p className="t-s mt-1.5">
                A promised referral, interview or job. Insiders never see that you pay, and nobody can pay them.
              </p>
            </div>
            <p className="t-s b mt-5">[PRICE] / month · cancel any time</p>
            <p className="t-xs c2">Active since Oct 15</p>
          </div>
          <Verification />
        </div>
      </ShellMain>
    </AppShell>
  );
}
