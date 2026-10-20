'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button, ChipTag, Grow, buttonClass, cx, withViewTransition } from '@portrait/ui';
import { insiderRequests } from '@/lib/data/insider';
import s from './insider.module.css';

/** S18 · requests: one line each; the open one grows in place (one at a time). */
export function RequestList() {
  const [open, setOpen] = useState('R-01');
  return (
    <div className="mx-[-16px] mt-2 flex flex-col gap-1">
      {insiderRequests.map((r) => {
        const isOpen = open === r.id;
        const body = `request-${r.id}`;
        return (
          <div key={r.id} className={cx(s.rq, isOpen && s.open)}>
            <button
              type="button"
              className={s.rqh}
              aria-expanded={isOpen}
              aria-controls={body}
              onClick={() => withViewTransition(() => setOpen(isOpen ? '' : r.id))}
            >
              <span className={s.id}>{r.id}</span>
              <span>
                <span className="t-s b">{r.who}</span> <span className="t-xs c2">{r.ctx}</span>
                <span className="t-s mt-1 block">{r.line}</span>
              </span>
              <ChipTag size="sm">{r.ask}</ChipTag>
            </button>
            <Grow open={isOpen} id={body}>
              <div className={s.rqb}>
                <div className="gl flex flex-col gap-2">
                  <p className="ln t-s">{r.more}</p>
                  <p className="ln t-xs c2">{r.integrity}</p>
                </div>
                <div className="ln mt-3 flex flex-wrap gap-2">
                  <Link className={buttonClass({ size: 'sm' })} href={r.href}>
                    {r.cta}
                  </Link>
                  <Button variant="quiet" size="sm">
                    Not this week
                  </Button>
                </div>
              </div>
            </Grow>
          </div>
        );
      })}
    </div>
  );
}
