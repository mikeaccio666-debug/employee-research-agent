'use client';

import { Fragment, useEffect, useId, useRef, useState } from 'react';
import { Band, Button, DateNote, Grow, PencilMark, Ruler, SectionMark, buttonClass, cx } from '@portrait/ui';
import { jordanScore } from '@/lib/data/connections';
import s from './ratings.module.css';

export function Ratings() {
  const [edited, setEdited] = useState(false);
  const [appeal, setAppeal] = useState(false);
  const appealId = useId();

  // "Edit to …" and "Undo" replace each other; focus follows.
  const editRef = useRef<HTMLButtonElement>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const focusNext = useRef<'edit' | 'undo' | null>(null);
  useEffect(() => {
    const target = focusNext.current;
    const el = target && (target === 'edit' ? editRef : undoRef).current;
    if (!el) return; // nothing asked, or not rendered yet
    focusNext.current = null;
    el.focus({ preventScroll: true });
  });

  const editIt = () => {
    focusNext.current = 'undo';
    setEdited(true);
    setAppeal(false);
  };
  const undo = () => {
    focusNext.current = 'edit';
    setEdited(false);
  };

  return (
    <main className="relative min-h-screen overflow-hidden pb-20">
      <Ruler />
      <header className="wrap relative pt-14">
        <SectionMark vw={220} d="M2 6 C60 3 140 7 218 4" isNew className="top-[62px] w-[220px]" />
        <p className="hand pt-[22px] text-[18px]">
          <Band>S20 · scores and disputes</Band> <DateNote className="whitespace-nowrap max-sm:mt-1 max-sm:ml-0 max-sm:block">numbers and bars, no stars</DateNote>
        </p>
        <h1 className="t-d mt-4 text-[56px] max-sm:text-[40px]">What a score looks like, and how to argue with one.</h1>
      </header>

      <section className="wrap pt-10">
        <div className="g12 gap-y-7">
          <div className="rb col-[1/span_5] max-md:col-span-full">
            <p className="lab">On Jordan Lee’s insider page</p>
            <div className="mt-2.5 flex items-end gap-[22px]">
              <p className={s.big}>{jordanScore.score}</p>
              <p className="t-s c2 pb-2">{jordanScore.summary}</p>
            </div>
            <div className={cx(s.dist, 'mt-[18px]')}>
              {jordanScore.distribution.map((row) => (
                <Fragment key={row.marks}>
                  <span>{row.marks}</span>
                  <span className={s.bar} aria-hidden="true">
                    <i style={{ width: `${row.pct}%` }} />
                  </span>
                  <span>{row.count}</span>
                </Fragment>
              ))}
            </div>
            <div className={cx(s.kv, 'mt-[18px]')}>
              {jordanScore.facts.map(([k, v]) => (
                <Fragment key={k}>
                  <span>{k}</span>
                  <b>{v}</b>
                </Fragment>
              ))}
            </div>
            <div className="mt-5 flex flex-col gap-3.5">
              {jordanScore.quotes.map((q) => (
                <div key={q.meta}>
                  <p className="hand text-[17px] leading-[1.45]">{q.text}</p>
                  <p className="t-xs c2 mt-1">{q.meta}</p>
                </div>
              ))}
            </div>
            <Button variant="quiet" size="sm" className="mt-2.5 -ml-2">
              Read all 11
            </Button>
          </div>

          <div className="col-[6/span_7] flex flex-col gap-5 max-md:col-span-full">
            <div className="rb">
              <p className="lab">Job seekers · integrity, shown to insiders</p>
              <div className={cx(s.kv, s.kvWide, 'mt-3')}>
                <span>
                  <b>night-heron</b> · portrait matched the person 4 of 5 times
                </span>
                <b>4.8 · 5 reviews</b>
                <span>
                  <b>field-vole</b>
                </span>
                <span className="t-xs c2">Too few reviews to show a score · shown from 3</span>
              </div>
            </div>

            <div className="rb">
              <p className="lab">In Alex’s studio · a flagged line</p>
              <p className="t-xs c2 mt-2.5">Experience · 2022 — 2024 · lab technician, university research lab</p>
              <div className={cx(s.flag, 'mt-2')}>
                <p className="t-s">
                  <span className={cx(!edited && s.hid)}>{edited ? 'Worked with 4 others' : 'Led a team of 5'}</span> to
                  replace a shared spreadsheet with a sample-tracking board.
                  <span className="fn" aria-hidden="true">
                    4
                  </span>
                </p>
                <div aria-live="polite">
                  <p className="t-xs mt-2">
                    <b>{edited ? 'Edited Oct 29 · flag closed' : 'Flagged · due Nov 2'}</b>
                  </p>
                  <p className="t-s mt-1.5">
                    {edited
                      ? 'The line is back on your page for startups and insiders. Nothing goes on your record.'
                      : 'Someone flagged “Led a team of 5” as inaccurate. Until it’s resolved, the line is hidden from startups and insiders. Nothing else on your page changes.'}
                  </p>
                </div>
                {edited ? (
                  <div className="land mt-2.5">
                    <PencilMark vw={200} d="M2 6 C50 3 120 7 198 4" draw style={{ width: '40%' }} />
                    <button
                      ref={undoRef}
                      type="button"
                      className={buttonClass({ variant: 'quiet', size: 'sm', className: 'mt-1.5 -ml-2' })}
                      onClick={undo}
                    >
                      Undo
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm">Add evidence</Button>
                    <button
                      ref={editRef}
                      type="button"
                      className={buttonClass({ variant: 'secondary', size: 'sm' })}
                      onClick={editIt}
                    >
                      Edit to “Worked with 4 others”
                    </button>
                    <Button
                      variant="quiet"
                      size="sm"
                      onClick={() => setAppeal((v) => !v)}
                      aria-expanded={appeal}
                      aria-controls={appealId}
                    >
                      Think this is unfair? Appeal
                    </Button>
                  </div>
                )}
              </div>
              <Grow open={appeal && !edited} id={appealId}>
                <div className="gl mt-3.5 flex flex-col gap-2">
                  <p className="ln t-s">
                    <b>1</b> · You add context or a document; a person reads it within three days.
                  </p>
                  <p className="ln t-s">
                    <b>2</b> · If the flag doesn’t hold, the line comes back and the flag leaves your record.
                  </p>
                  <p className="ln t-s">
                    <b>3</b> · Repeated bad-faith flags count against the person who made them.
                  </p>
                </div>
              </Grow>
              <p className="t-xs c2 mt-3">Not sure who flagged it? That stays private, both ways.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
