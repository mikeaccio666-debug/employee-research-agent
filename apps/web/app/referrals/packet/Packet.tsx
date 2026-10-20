'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { BasisMark, Button, MarginNote, PencilMark, Ruler, SectionMark, cx, withViewTransition } from '@portrait/ui';
import { FlowBar } from '@/components/chrome';
import { packetConfirmed, packetEvidence, packetNote, packetSources } from '@/lib/data/growth';
import { routes } from '@/lib/routes';
import s from './packet.module.css';

function Confirmed() {
  return (
    <span className={s.ok}>
      <svg viewBox="0 0 16 12" aria-hidden="true">
        <path d="M2 7 L6 10 L14 2" />
      </svg>
      Confirmed
    </span>
  );
}

/** "Right" confirms the line; "Change" is drawn but not wired on the board. */
function LineActions({ id, done, onConfirm }: { id: string; done: boolean; onConfirm: () => void }) {
  return (
    <div className="flex items-center gap-1.5">
      {done ? (
        <Confirmed />
      ) : (
        <>
          <Button size="sm" data-confirm="" aria-describedby={`line-${id}`} onClick={onConfirm}>
            Right
          </Button>
          <Button variant="quiet" size="sm" aria-describedby={`line-${id}`}>
            Change
          </Button>
        </>
      )}
    </div>
  );
}

/** S19b · the referral packet for Fernway: confirm each line, then add it to the pool. */
export function Packet() {
  const [ok, setOk] = useState<Record<string, boolean>>(packetConfirmed);
  const [pooled, setPooled] = useState(false);
  const moveFocus = useRef(false);

  const left = [...packetNote, ...packetEvidence].filter((l) => !ok[l.id]).length;
  const notReady = left > 0 || pooled;
  const leftLine = pooled
    ? 'In the pool'
    : left
      ? `${left} ${left === 1 ? 'line' : 'lines'} left to confirm`
      : 'Every line confirmed';

  // After a "Right", go on to the next line still waiting, or to "Add to the pool".
  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    const next = document.querySelector<HTMLElement>('[data-confirm]') ?? document.getElementById('add-to-pool');
    next?.focus();
  }, [ok]);

  const confirm = (id: string) => {
    moveFocus.current = true;
    withViewTransition(() => setOk((prev) => ({ ...prev, [id]: true })));
  };
  const addPool = () => {
    if (!notReady) withViewTransition(() => setPooled(true));
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Ruler />
      <FlowBar
        className="max-sm:py-3"
        left={
          <span className="t-s">
            <Link href={routes.landing} className={cx('b', s.crumb)}>
              Portrait
            </Link>{' '}
            <span className="c2">
              ·{' '}
              <Link href={routes.referrals} className={s.crumb}>
                Referral subscription
              </Link>{' '}
              › Packet
            </span>
          </span>
        }
        right={
          <span className="flex items-center gap-3">
            <span id="pool-status" className="t-xs c2" aria-live="polite">
              {leftLine}
            </span>
            <Button
              id="add-to-pool"
              size="sm"
              className={s.pool}
              aria-disabled={notReady}
              aria-describedby="pool-status"
              onClick={addPool}
            >
              {pooled ? 'Added' : 'Add to the pool'}
            </Button>
          </span>
        }
      />
      <main className="wrap pt-10 pb-[72px]">
        <div className="g12 gap-y-8">
          <div className="col-[1/span_8]">
            <p className="lab">Referral packet · for Fernway · shown only to verified Fernway insiders</p>
            <h1 className="t-h1 mt-2.5">Alex Rivera — Frontend Engineer, New Grad</h1>
            <p className="t-s c2 mt-1.5">
              Alex shares his name with Fernway insiders for this packet only. Everyone else still sees night-heron.
            </p>
            <p className="t-s mt-2.5">
              <BasisMark kind="ver" />
              Identity, GitHub and form-kit verified · <span className="band">lab years and bootcamp in review</span> —
              insiders see those two marked “in review”.
            </p>

            <section className="relative mt-8">
              <SectionMark d="M2 5 C40 7 90 3 148 6" />
              <h2 className="lab pt-[18px]">The note · drafted from your portrait, in your voice</h2>
              <div className="mt-2">
                {packetNote.map((l) => {
                  const done = !!ok[l.id];
                  return (
                    <div key={l.id} className={cx(s.ln2, !done && s.todo)}>
                      <p id={`line-${l.id}`} className="t-body">
                        {l.t}
                        <span className="fn" aria-hidden="true">
                          {l.fn}
                        </span>
                      </p>
                      <LineActions id={l.id} done={done} onConfirm={() => confirm(l.id)} />
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="relative mt-8">
              <SectionMark d="M2 6 C50 4 100 7 148 4" />
              <h2 className="lab pt-[18px]">Three strongest pieces of evidence</h2>
              <div className="mt-2 flex flex-col gap-1.5">
                {packetEvidence.map((e) => {
                  const done = !!ok[e.id];
                  return (
                    <div key={e.id} className={cx(s.ln2, !done && s.todo)}>
                      <div className={s.ev}>
                        <span className={s.k}>{e.k}</span>
                        <span id={`line-${e.id}`}>
                          <span className="t-s b block">{e.t}</span>
                          <span className="t-xs c2">
                            {e.d} · <BasisMark kind={e.basis} />
                            {e.src}
                          </span>
                        </span>
                        <span />
                      </div>
                      <LineActions id={e.id} done={done} onConfirm={() => confirm(e.id)} />
                    </div>
                  );
                })}
              </div>
            </section>

            {pooled ? (
              <div className="land mt-7">
                <PencilMark vw={200} d="M2 6 C50 3 120 7 198 4" isNew draw className="w-[260px]" />
                <MarginNote className="mt-1.5">
                  In the pool · Oct 19 · Fernway insiders who match will see it this week
                </MarginNote>
              </div>
            ) : null}
          </div>

          <div className="col-[9/span_4] flex flex-col gap-4">
            <div className="rb">
              <h2 className="lab">Tailored résumé</h2>
              <p className="t-s mt-1.5">
                One page, frontend first. Every bullet keeps its footnote, so the insider can check it in one click.
              </p>
              <div className="sunk mt-3 p-3.5">
                <p className="t-s b">Alex Rivera</p>
                <p className="t-xs c2">Frontend · New York</p>
                <div className="mt-2.5 flex flex-col gap-1.5" aria-hidden="true">
                  <i className={cx(s.rl, 'w-[90%]')} />
                  <i className={cx(s.rl, 'w-[72%]')} />
                  <i className={cx(s.rl, 'w-[80%]')} />
                </div>
              </div>
              <Button variant="quiet" size="sm" className="mt-2 -ml-2">
                Open full résumé
              </Button>
            </div>
            <div className="rb">
              <h2 className="lab">Sources</h2>
              <p className="t-xs c2 mt-1.5 leading-[1.7]">{packetSources}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
