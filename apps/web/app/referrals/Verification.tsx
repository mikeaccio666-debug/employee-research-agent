'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Button, Grow, buttonClass, cx } from '@portrait/ui';
import { VERIFY_LABEL, verifySteps, type LabProof, type Reference } from '@/lib/data/growth';
import { routes } from '@/lib/routes';
import s from './referrals.module.css';

/** S19 · verification: one tick per check on the ladder, the checks below, and the reference ask. */
export function Verification() {
  const [lab, setLab] = useState<LabProof>('need');
  const [ref, setRef] = useState<Reference>('todo');
  const [ask, setAsk] = useState(false);
  // When a button disappears under the pointer, keep keyboard focus on its row.
  const focusNext = useRef<string | null>(null);
  useEffect(() => {
    if (!focusNext.current) return;
    document.getElementById(focusNext.current)?.focus({ preventScroll: true });
    focusNext.current = null;
  });
  const then = (id: string, update: () => void) => {
    focusNext.current = id;
    update();
  };

  const steps = verifySteps(lab, ref);
  const total = steps.length;
  const nDone = steps.filter((v) => v.st === 'ok').length;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 className="lab">
          Verification · {nDone} of {total} done
        </h2>
        <p className="t-xs c2">Each line goes up when it’s checked</p>
      </div>
      <div className={s.ladder} role="img" aria-label={`${nDone} of ${total} verification steps done`}>
        {steps.map((v, i) => (
          <i
            key={v.key}
            className={v.st === 'ok' ? undefined : v.st === 'rev' ? s.rev : s.todo}
            style={{ height: 24 + i * 16 }}
          />
        ))}
      </div>
      <div className="mt-3.5">
        {steps.map((v) => (
          <div key={v.key} id={`verify-${v.key}`} tabIndex={-1} className={s.vr}>
            <div>
              <p className="t-s b">{v.t}</p>
              <p className="t-xs c2">{v.d}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={cx(s.pill, v.st === 'ok' && s.ok, v.st === 'rev' && s.rev)}>{VERIFY_LABEL[v.st]}</span>
              {v.st === 'need' ? (
                <Button variant="secondary" size="sm" onClick={() => then(`verify-${v.key}`, () => setLab('rev'))}>
                  Upload
                </Button>
              ) : null}
              {v.st === 'todo' ? (
                <Button
                  id="ask-someone"
                  variant="secondary"
                  size="sm"
                  aria-expanded={ask}
                  aria-controls="ask-draft"
                  onClick={() => setAsk(!ask)}
                >
                  Ask someone
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <Grow open={ask} id="ask-draft">
        <div className="gl mt-2.5">
          <p className="ln t-xs c2">Draft to Dr. Hale, your lab supervisor · edit freely</p>
          <p className="ln hand mt-1 text-[17px] leading-[1.5]">
            “Hi Dr. Hale — I’m applying for frontend roles. Would you write two lines about the sample-tracking board I
            built? It goes on my portrait, and you can see exactly how it’s shown.”
          </p>
          <div className="ln mt-2.5 flex gap-2">
            <Button
              size="sm"
              onClick={() =>
                then('verify-reference', () => {
                  setAsk(false);
                  setRef('asked');
                })
              }
            >
              Send
            </Button>
            <Button variant="quiet" size="sm" onClick={() => then('ask-someone', () => setAsk(false))}>
              Not now
            </Button>
          </div>
        </div>
      </Grow>
      <p className="t-s c2 mt-[18px]">
        A packet can go into the pool once your identity and the work in it are verified, and you’ve confirmed every
        line. Anything still in review shows as “in review” to insiders.
      </p>
      <Link href={routes.packet} className={buttonClass({ className: 'mt-3' })}>
        Review packet for Fernway
      </Link>
    </div>
  );
}
