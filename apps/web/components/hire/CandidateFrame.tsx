'use client';

import Link from 'next/link';
import { MustHaves, cx } from '@portrait/ui';
import { AppShell, ShellMain, useShell } from '@/components/shell/AppShell';
import { MARK_LABEL, brief, mustAria, mustHaves, scoreOf, type SheetFrame } from '@/lib/data/hire';
import { companyNav } from '@/lib/nav';
import { routes } from '@/lib/routes';
import s from './Candidate.module.css';

/**
 * A contact-sheet frame that has no page of its own on the canvas: the S07 layout,
 * written only from what the sheet knows (its line, marks, reasons and question).
 */
export function CandidateFrame({ frame }: { frame: SheetFrame }) {
  return (
    <AppShell
      nav={companyNav}
      active="hire"
      badges={{ inbox: '2' }}
      footer="Sam Okafor · Northwind"
      agent={{ context: `${frame.no} ${frame.alias}` }}
    >
      <FramePage frame={frame} />
    </AppShell>
  );
}

function FramePage({ frame: f }: { frame: SheetFrame }) {
  const { agentOpen } = useShell();
  return (
    <ShellMain className={cx(s.main, agentOpen && s.stack, 'max-sm:pb-28')}>
      <div className={s.pane}>
        <p className="lab">
          <Link href={routes.contactSheet}>Hire › {brief.role}</Link> › Frame {f.no}
        </p>
        <div className="relative mt-[26px]">
          <p className="lab">Anonymous · {f.ctx}</p>
          <h1 className={cx('t-name mt-3', s.name)}>{f.alias}</h1>
          <p className="t-h2 mt-[18px] max-w-[32ch]">{f.line}</p>
          <p className="t-xs c2 mt-3">
            {f.avail} · {f.interest}
          </p>
        </div>

        <div className={cx(s.ev, 'mt-7')}>
          <p className="lab">Reasons</p>
          <div className="gl on mt-2.5 flex flex-col gap-2.5">
            {f.reasons.map((r, i) => (
              <p key={i} className={s.reason}>
                <span className={s.k}>{i + 1}</span>
                <span className="t-s">{r}</span>
              </p>
            ))}
          </div>
        </div>

        <div className="sunk mt-7 px-[18px] py-3.5">
          <p className="t-xs c2">
            Anonymous version: written separately from the public page. School and project names are generalized,
            numbers rounded, links and contact hidden. The name appears only if {f.alias} accepts.
          </p>
        </div>
      </div>

      <aside className={s.rail} aria-label="Match notes">
        <div className="panel px-[18px] py-4">
          <div className="flex items-baseline justify-between">
            <p className="lab">Match notes · {scoreOf(f.m)} of 5</p>
            <MustHaves marks={f.m} label={mustAria(f.m)} />
          </div>
          <div className="mt-1.5">
            {mustHaves.map((m, i) => {
              const mark = f.m[i] ?? 'n';
              return (
                <div key={m.k} className={s.nrow}>
                  <span className="hand b">{m.k}</span>
                  <span className="t-s">
                    {m.match}
                    <span className="t-xs c2 block">{MARK_LABEL[mark]}</span>
                  </span>
                  <MustHaves marks={[mark]} />
                </div>
              );
            })}
          </div>
        </div>
        <div className="panel px-[18px] py-4">
          <p className="lab">Worth asking about</p>
          <p className="t-s mt-1.5">Ask in a coffee chat: {f.ask}</p>
        </div>
      </aside>
    </ShellMain>
  );
}
