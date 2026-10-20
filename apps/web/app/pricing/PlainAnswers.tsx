'use client';

import { useId, useState } from 'react';
import { Grow, cx } from '@portrait/ui';
import { plainAnswers } from '@/lib/data/entry';
import s from './pricing.module.css';

/** "Plain answers": each question opens its answer in place; the first starts open. */
export function PlainAnswers() {
  const [open, setOpen] = useState(0);
  const base = useId();
  return (
    <div className="mt-3.5 -mx-5 flex max-w-[900px] flex-col gap-1.5 max-sm:-mx-3">
      {plainAnswers.map((qa, i) => {
        const on = open === i;
        const id = `${base}-${i}`;
        return (
          <div key={qa.q} className={cx(s.qa, on && s.open)}>
            <h3>
              <button
                type="button"
                className={s.qh}
                aria-expanded={on}
                aria-controls={id}
                onClick={() => setOpen(on ? -1 : i)}
              >
                <span className="t-h3">{qa.q}</span>
                <span className={s.pm2} aria-hidden="true">
                  +
                </span>
              </button>
            </h3>
            <Grow open={on} id={id}>
              <div className="gl mx-5 mb-[18px]">
                <p className="ln t-body">{qa.a}</p>
              </div>
            </Grow>
          </div>
        );
      })}
    </div>
  );
}
