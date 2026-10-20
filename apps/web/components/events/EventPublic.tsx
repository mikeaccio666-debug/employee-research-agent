'use client';

import { useId, useState, type FormEvent } from 'react';
import {
  Band,
  Button,
  Grow,
  Ruler,
  SectionMark,
  Segmented,
  Switch,
  TextInput,
  buttonClass,
  cx,
  withViewTransition,
} from '@portrait/ui';
import { PublicHeader } from '@/components/chrome';
import { AMA_DRAFT, amaHosts, amaQuestions, linQuestion, type AmaQuestion } from '@/lib/data/events';
import s from './event-page.module.css';

type AskAs = 'alias' | 'name';
type Question = AmaQuestion & { isNew?: boolean };

/** One line per vote, four then a gate, as the board draws them (30 × 16). */
function voteTallyPath(n: number): string {
  const parts: string[] = [];
  const k = Math.min(n, 5);
  for (let i = 0; i < Math.min(k, 4); i++) parts.push(`M${3 + i * 6} 2 L${3 + i * 6} 14`);
  if (k >= 5) parts.push('M1 12 L24 4');
  return parts.join(' ') || 'M0 0';
}

/** S10b · the public event page for Northwind's AMA, as Lin sees it signed in. */
export function EventPublic() {
  const [about, setAbout] = useState(false);
  const [votes, setVotes] = useState<Record<string, boolean>>({ mine: true });
  const [as, setAs] = useState<AskAs>('alias');
  const [share, setShare] = useState(false);
  const [posted, setPosted] = useState<AmaQuestion[]>([]);
  const [draft, setDraft] = useState(AMA_DRAFT);
  const [announce, setAnnounce] = useState('');
  const aboutId = useId();
  const joinNote = useId();

  const all: Question[] = [...posted.map((q) => ({ ...q, isNew: true })), ...amaQuestions, linQuestion];
  const qs = all
    .map((q) => {
      const voted = !!votes[q.id];
      return { ...q, voted, count: q.n + (voted ? 1 : 0) };
    })
    .sort((a, b) => (b.isNew ? 1000 : b.count) - (a.isNew ? 1000 : a.count));

  const postQuestion = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const name = as === 'alias' ? 'quiet-otter' : 'Lin Zhou';
    const id = `new-${posted.length + 1}`;
    withViewTransition(() => {
      setPosted((list) => [{ id, text, by: `${name} · just now`, n: 0, yours: true }, ...list]);
      setVotes((v) => ({ ...v, [id]: true }));
      setDraft('');
    });
    setAnnounce(`Question posted as ${name}`);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Ruler />
      <PublicHeader>
        <span className="t-xs c2">Events · signed in as Lin</span>
      </PublicHeader>
      <p className="sr" aria-live="polite">
        {announce}
      </p>

      <section className="wrap relative pt-9">
        <SectionMark vw={210} d="M2 6 C50 3 120 7 208 4" isNew style={{ top: 44, width: 210 }} />
        <p className="lab">AMA · Northwind</p>
        <p className="hand mt-3 text-[18px]">
          <Band>Thu Oct 29 · online</Band>
        </p>
        <div className="g12 mt-[18px] items-end gap-y-[18px]">
          <h1 className="t-d col-[1/span_8] max-md:col-[1/-1]">What does an intern actually do at a six-person startup?</h1>
          <div className="col-[9/span_4] max-md:col-[1/-1]">
            <p className={s.bigtime}>6:00</p>
            <p className="t-s b mt-1.5">PM PT · your time</p>
            <p className="t-xs c2 mt-0.5">45 minutes · link on this page · 64 going</p>
          </div>
        </div>
      </section>

      <section className="wrap pt-16 pb-[72px] max-sm:pt-12">
        <div className="g12 gap-y-10">
          <main className="col-[1/span_8] flex flex-col gap-12 max-md:col-[1/-1]">
            <section className="relative" aria-labelledby="ev-about">
              <SectionMark d="M2 5 C40 7 90 3 148 6" />
              <h2 id="ev-about" className="lab pt-[18px]">
                About
              </h2>
              <p className="t-h3 mt-2 max-w-[46ch]">
                What you’d ship in twelve weeks, how six people decide, and what they look for.
              </p>
              <Grow open={about} id={aboutId}>
                <div className="gl mt-2.5">
                  <p className="ln t-body max-w-[60ch]">
                    Sam and Dana answer questions about Northwind’s summer internship. Post questions ahead of time,
                    under your name or your alias. Questions stay up after the event so hosts can follow up in writing.
                  </p>
                </div>
              </Grow>
              <Button
                variant="quiet"
                size="sm"
                className="mt-1.5 -ml-2"
                onClick={() => setAbout((v) => !v)}
                aria-expanded={about}
                aria-controls={aboutId}
              >
                {about ? 'Less' : 'More about this AMA'}
              </Button>
            </section>

            <section className="relative" aria-labelledby="ev-agenda">
              <SectionMark d="M2 6 C50 4 100 7 148 4" />
              <h2 id="ev-agenda" className="lab pt-[18px]">
                Agenda
              </h2>
              <div className="mt-1.5">
                <div className={s.ag}>
                  <span className={s.t}>6:00 – 6:05</span>
                  <span className="t-s">
                    What Northwind does, in five minutes · <b>Sam</b>
                  </span>
                </div>
                <div className={s.ag}>
                  <span className={s.t}>6:05 – 6:15</span>
                  <span className="t-s">
                    A real intern project, start to finish — and how we run Postgres for 40 kitchens · <b>Dana</b>
                  </span>
                </div>
                <div className={s.ag}>
                  <span className={s.t}>6:15 – 6:45</span>
                  <span className="t-s">Your questions, most-voted first</span>
                </div>
              </div>
            </section>

            <section className="relative" aria-labelledby="ev-questions">
              <SectionMark d="M2 4 C50 6 100 4 148 6" />
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 pt-[18px]">
                <h2 id="ev-questions" className="lab">
                  Questions · {qs.length} · most-voted first
                </h2>
                <p className="t-xs c2">One vote per question</p>
              </div>
              <form className="panel mt-3 px-4 py-3.5" onSubmit={postQuestion}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="fl" htmlFor="nq">
                    Your question
                  </label>
                  <span className="t-xs c2 inline-flex items-center gap-2">
                    Ask as
                    <Segmented<AskAs>
                      label="Ask as"
                      options={[
                        { value: 'alias', label: 'quiet-otter' },
                        { value: 'name', label: 'Lin Zhou' },
                      ]}
                      value={as}
                      onChange={setAs}
                    />
                  </span>
                </div>
                <TextInput
                  id="nq"
                  className="mt-2"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Ask something you’d actually want answered"
                />
                <div className="mt-2.5 flex items-center justify-between gap-3">
                  <span className="t-xs c2">Hosts see questions now; everyone sees them after you post.</span>
                  <Button type="submit" size="sm" className="flex-none">
                    Post question
                  </Button>
                </div>
              </form>
              <ul className="mt-2" aria-label="Questions, most-voted first">
                {qs.map((q) => (
                  <li key={q.id} className={cx(s.q, q.isNew && q.id === posted[0]?.id && cx(s.new, 'land'))}>
                    <button
                      type="button"
                      className={cx(s.vote, q.voted && s.on)}
                      onClick={() => setVotes((v) => ({ ...v, [q.id]: !v[q.id] }))}
                      aria-pressed={q.voted}
                      aria-label={`${q.voted ? 'Remove your vote, ' : 'Vote, '}${q.count} ${q.count === 1 ? 'vote' : 'votes'}`}
                    >
                      {q.count}
                      <svg className="tally" viewBox="0 0 30 16" style={{ width: 30 }} aria-hidden="true">
                        <path d={voteTallyPath(q.count)} />
                      </svg>
                    </button>
                    <div>
                      <p className="t-s">{q.text}</p>
                      <p className="t-xs c2 mt-1">
                        {q.by}
                        {q.yours ? (
                          <>
                            {' · '}
                            <span className="hand text-ink">yours</span>
                          </>
                        ) : null}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </main>

          <aside
            className="col-[9/span_4] flex flex-col gap-4 max-md:col-[1/-1] max-md:grid max-md:grid-cols-2 max-md:items-start max-sm:grid-cols-1"
            aria-label="Your spot and hosts"
          >
            <div className="rb">
              <p className="lab">Your spot</p>
              <p className="t-h3 mt-1.5">You’re registered.</p>
              <p className="t-xs c2 mt-1">Reminders 24 hours and 1 hour before · in your calendar</p>
              <div className={cx(s.swrow, 'mt-4')}>
                <span className="t-s">
                  <b>Share my portrait with Northwind</b>
                  <span className="t-xs c2 block">
                    {share
                      ? 'Sam and Dana can open your full portrait after the event.'
                      : 'Off · they see quiet-otter in the attendee list.'}
                  </span>
                </span>
                <Switch label="Share my portrait with Northwind" checked={share} onChange={setShare} className="flex-none" />
              </div>
              <button
                type="button"
                className={buttonClass({ className: 'mt-4 w-full cursor-not-allowed opacity-55' })}
                aria-disabled="true"
                aria-describedby={joinNote}
              >
                Join
              </button>
              <p id={joinNote} className="t-xs c2 mt-1.5 text-center">
                Opens at 5:50 PM, ten minutes before
              </p>
              <Button variant="quiet" size="sm" className="mt-2.5 -ml-2">
                Cancel registration
              </Button>
            </div>
            <div className="rb">
              <p className="lab">Hosts</p>
              <div className="mt-3 flex flex-col gap-3.5">
                {amaHosts.map((h) => (
                  <div key={h.name} className={s.host}>
                    <span className={s.av} aria-hidden="true">
                      {h.initials}
                    </span>
                    <span className="t-s">
                      <b>{h.name}</b>
                      <span className="t-xs c2 block">{h.about}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
