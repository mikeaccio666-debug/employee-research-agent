import type { Metadata } from 'next';
import Link from 'next/link';
import { Band, BasisMark, buttonClass, cx } from '@portrait/ui';
import { AppShell, ShellMain } from '@/components/shell/AppShell';
import { referralLog, referralLogColumns, type LogCell } from '@/lib/data/insider';
import { insiderNav } from '@/lib/nav';
import { routes } from '@/lib/routes';
import { ChatHours } from './ChatHours';
import { RequestList } from './RequestList';
import s from './insider.module.css';

export const metadata: Metadata = { title: 'Insider · Jordan Lee' };

function Cell({ cell, label }: { cell: LogCell; label: string }) {
  return (
    <td role="cell" data-label={label} className={cell.muted ? 'c2' : undefined}>
      {cell.band ? <Band>{cell.t}</Band> : cell.t}
    </td>
  );
}

/** S18 · the insider home: requests that grow in place, the referral log, ratings and hours. */
export default function InsiderPage() {
  const [, chatCol, referredCol, outcomeCol] = referralLogColumns;
  return (
    <AppShell nav={insiderNav} active="insider" footer="Jordan Lee · Fernway" agent={{ context: 'Insider · Jordan Lee' }}>
      <ShellMain className={s.main}>
        <div className={s.cols}>
          <div className={s.left}>
            <p className="hand text-[17px]">
              <Band>Now · one year on the payments team</Band>
            </p>
            <p className="lab mt-4">
              Insider · <BasisMark kind="ver" className="ml-1" />
              work email verified · Fernway
            </p>
            <h1 className={cx('t-name mt-3', s.name)}>Jordan Lee</h1>
            <p className="t-h3 mt-3.5">Happy to talk about new-grad SWE, payments and Fernway interviews.</p>

            <section className="mt-10" aria-labelledby="requests-h">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <h2 id="requests-h" className="lab">
                  Requests · 3
                </h2>
                <p className="t-xs c2">Referral is always your call · nobody sees how long you take</p>
              </div>
              <RequestList />
            </section>

            <section className="mt-10">
              <h2 id="log-h" className="lab">
                Referral log · 4 this year · 1 hired
              </h2>
              <table className={s.log} role="table" aria-labelledby="log-h">
                <thead role="rowgroup">
                  <tr role="row">
                    {referralLogColumns.map((c) => (
                      <th key={c} role="columnheader" scope="col">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody role="rowgroup">
                  {referralLog.map((r) => (
                    <tr key={r.person} role="row">
                      <td role="cell" className="b">
                        {r.person}
                      </td>
                      <Cell cell={r.chat} label={chatCol} />
                      <Cell cell={r.referred} label={referredCol} />
                      <Cell cell={r.outcome} label={outcomeCol} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>

          <div className={s.side}>
            <div className="rb">
              <h2 className="lab">How people rated your chats</h2>
              <p className="mt-1.5 text-[44px] font-[800] tracking-[-0.03em]">4.9</p>
              <p className="t-xs c2">11 reviews · on time 11 of 11</p>
              <Link href={routes.ratings} className={buttonClass({ variant: 'quiet', size: 'sm', className: 'mt-2 -ml-2' })}>
                See reviews
              </Link>
            </div>
            <ChatHours />
          </div>
        </div>
      </ShellMain>
    </AppShell>
  );
}
