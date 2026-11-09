import type { Metadata } from 'next';
import { Tick, cx } from '@portrait/ui';
import { AppShell, ShellMain } from '@/components/shell/AppShell';
import { talentNav } from '@/lib/nav';
import { Verification } from './Verification';
import s from './referrals.module.css';

export const metadata: Metadata = { title: 'Referrals' };

/** S19 · referrals (Alex): free; what joining the pool gets you, what it doesn't, and how verification is going. */
export default function ReferralsPage() {
  return (
    <AppShell
      nav={talentNav}
      active="grow"
      footer="Alex Rivera · @alex"
      agent={{ context: 'Grow › Referrals' }}
    >
      <ShellMain className={s.main}>
        <div className={s.cols}>
          <div>
            <p className="lab">Grow › Referrals</p>
            <h1 className={cx('t-d mt-3.5', s.h1)}>Get introduced to insiders — honestly.</h1>
            <p className="t-body c2 mt-3.5 max-w-[46ch]">
              It’s free: we verify your claims, package your evidence and introduce you to insiders. Nobody can pay for a
              referral here, and referrals are always the insider’s call.
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
                A promised referral, interview or job. Nobody can buy a referral here, and nobody is paid for giving one.
              </p>
            </div>
            <p className="t-s b mt-5">Free · leave the pool any time</p>
            <p className="t-xs c2">Joined Oct 15</p>
          </div>
          <Verification />
        </div>
      </ShellMain>
    </AppShell>
  );
}
