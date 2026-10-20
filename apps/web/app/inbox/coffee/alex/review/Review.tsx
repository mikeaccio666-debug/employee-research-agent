'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Band, Button, Chip, DateNote, Grow, MarginNote, PencilMark, Ruler, SectionMark, Segmented, cx } from '@portrait/ui';
import { TallyScore } from '@/components/connections/TallyScore';
import { reviewFlagLines, reviewInitial, type FlagId, type MatchAnswer } from '@/lib/data/connections';
import s from './review.module.css';

const SEALED_BOTH = 'Both submitted · reviews are now visible to each other';

/** The note that replaces "Submit review": sealed until the other side submits. Takes focus when it appears. */
function Seal({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div ref={ref} tabIndex={-1} className={cx(s.seal, 'land')}>
      <PencilMark vw={200} d="M2 6 C50 3 120 7 198 4" isNew draw style={{ width: '50%' }} />
      <MarginNote className="mt-1.5">{text}</MarginNote>
    </div>
  );
}

export function Review() {
  const [a, setA] = useState(reviewInitial.a);
  const [b, setB] = useState(reviewInitial.b);
  const [match, setMatch] = useState<MatchAnswer>(reviewInitial.match);
  const [flags, setFlags] = useState(reviewInitial.flags);
  const [money, setMoney] = useState(reviewInitial.money);
  const [aDone, setADone] = useState(false);
  const [bDone, setBDone] = useState(false);
  const both = aDone && bDone;
  const flagId = useId();
  const moneyId = useId();

  return (
    <main className="relative min-h-screen overflow-hidden pb-20">
      <Ruler />
      <header className="wrap relative pt-14">
        <SectionMark vw={220} d="M2 6 C60 3 140 7 218 4" isNew className="top-[62px] w-[220px]" />
        <p className="hand pt-[22px] text-[18px]">
          <Band>Wed Oct 28</Band> <DateNote className="whitespace-nowrap max-sm:mt-1 max-sm:ml-0 max-sm:block">Alex Rivera ↔ Jordan Lee · 20 min</DateNote>
        </p>
        <h1 className="t-d mt-4 text-[56px] max-sm:text-[40px]">After a coffee chat, both sides review.</h1>
        <p className="t-body c2 mt-2.5 max-w-[60ch]">
          Double-blind: neither sees the other’s review until both submit, or 14 days pass. Scores are tally marks, not
          stars — tap the fifth to give five.
        </p>
      </header>

      <section className="wrap pt-10">
        <div className={s.two}>
          <section className={s.side} aria-label="Insider reviews job seeker">
            <p className="lab">Jordan reviews Alex</p>
            <h2 className="t-h2">How did your coffee chat with Alex go?</h2>
            <div className={s.q}>
              <p className="lab">Overall</p>
              <TallyScore value={a} onChange={setA} label="Overall, 1 to 5" />
            </div>
            <div className={s.q}>
              <p className="lab">Did Alex’s portrait match the person you met?</p>
              <Segmented<MatchAnswer>
                mode="radio"
                label="Did Alex’s portrait match the person you met?"
                value={match}
                onChange={setMatch}
                options={[
                  { value: 'yes', label: 'Yes' },
                  { value: 'mostly', label: 'Mostly' },
                  { value: 'no', label: 'No' },
                ]}
              />
              <Grow open={match !== 'yes'} id={flagId}>
                <div className="gl mt-3">
                  <p className="ln t-s">Which line didn’t match? Alex sees the line, never who flagged it.</p>
                  <div className="ln mt-2 flex flex-wrap gap-1.5">
                    {reviewFlagLines.map((f) => (
                      <Chip
                        key={f.id}
                        size="sm"
                        on={!!flags[f.id]}
                        aria-pressed={!!flags[f.id]}
                        onClick={() => setFlags((prev) => ({ ...prev, [f.id as FlagId]: !prev[f.id] }))}
                      >
                        {f.text}
                      </Chip>
                    ))}
                  </div>
                </div>
              </Grow>
            </div>
            <div className={s.q}>
              <p className="lab">Came prepared</p>
              <Segmented
                mode="radio"
                label="Came prepared"
                defaultValue="4"
                options={['1', '2', '3', '4', '5'].map((n) => ({ value: n, label: n }))}
              />
            </div>
            <label className="fl" htmlFor="ja">
              Anything else? <span className="c2">· optional</span>
            </label>
            <input id="ja" className="inp" placeholder="One line Alex will read" />
            {aDone ? (
              <Seal text={both ? SEALED_BOTH : 'Sealed · opens when Alex submits, or on Nov 11'} />
            ) : (
              <Button className="self-start" onClick={() => setADone(true)}>
                Submit review
              </Button>
            )}
          </section>

          <section className={s.side} aria-label="Job seeker reviews insider">
            <p className="lab">Alex reviews Jordan</p>
            <h2 className="t-h2">How was your coffee chat with Jordan?</h2>
            <div className={s.q}>
              <p className="lab">Overall</p>
              <TallyScore value={b} onChange={setB} label="Overall, 1 to 5" />
            </div>
            <div className={s.q}>
              <p className="lab">On time</p>
              <Segmented
                mode="radio"
                label="On time"
                defaultValue="yes"
                options={[
                  { value: 'yes', label: 'Yes' },
                  { value: 'late', label: 'A little late' },
                  { value: 'noshow', label: 'No-show' },
                ]}
              />
            </div>
            <div className={s.q}>
              <p className="lab">Kept their word</p>
              <Segmented
                mode="radio"
                label="Kept their word"
                defaultValue="yes"
                options={[
                  { value: 'yes', label: 'Yes' },
                  { value: 'notdue', label: 'Not yet due' },
                  { value: 'no', label: 'No' },
                ]}
              />
            </div>
            <div className={s.q}>
              <p className="lab">Did Jordan ask you for money or gifts?</p>
              <Segmented<'no' | 'yes'>
                mode="radio"
                label="Did Jordan ask you for money or gifts?"
                value={money}
                onChange={setMoney}
                options={[
                  { value: 'no', label: 'No' },
                  { value: 'yes', label: 'Yes' },
                ]}
              />
              <Grow open={money === 'yes'} id={moneyId} live>
                <div className="gl mt-2.5">
                  <p className="ln t-s">
                    Thank you for telling us. This stays private and goes straight to our team, not into the score.
                    Someone will reply within a day.
                  </p>
                </div>
              </Grow>
              <p className="t-xs c2 mt-1.5">This answer is private either way.</p>
            </div>
            {bDone ? (
              <Seal text={both ? SEALED_BOTH : 'Sealed · opens when Jordan submits, or on Nov 11'} />
            ) : (
              <Button className="self-start" onClick={() => setBDone(true)}>
                Submit review
              </Button>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
