'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Chip, buttonClass, cx } from '@portrait/ui';
import { ShellMain } from '@/components/shell/AppShell';
import { actOnJob, undoJobAction } from '@/lib/job-actions';
import type { DismissReason, JobAction, Reason } from '@/lib/jobs/match';
import type { SavedJob } from '@/lib/jobs/store';
import type { EmploymentType, WorkplaceType } from '@/lib/jobs/types';
import { routes } from '@/lib/routes';
import s from './jobs.module.css';

export type JobCard = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  workplace: WorkplaceType;
  type: EmploymentType;
  pay: string | null;
  postedAt: string | null;
  url: string;
  description: string;
  reasons: Reason[];
  caution: string | null;
  action: JobAction | null;
};

const WORKPLACE: Record<WorkplaceType, string | null> = { on_site: 'On site', hybrid: 'Hybrid', remote: 'Remote', unknown: null };
const TYPE: Record<EmploymentType, string | null> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  temporary: 'Temporary',
  internship: 'Internship',
  volunteer: 'Volunteer',
  unknown: null,
};
const NOT_FOR_ME: { reason: DismissReason; label: string }[] = [
  { reason: 'role', label: 'Not my kind of role' },
  { reason: 'seniority', label: 'Too senior or junior' },
  { reason: 'location', label: 'Wrong place' },
  { reason: 'pay', label: 'Pay' },
  { reason: 'company', label: 'Not this company' },
  { reason: 'other', label: 'Something else' },
];

function posted(at: string | null): string | null {
  if (!at) return null;
  const days = Math.floor((Date.now() - Date.parse(at)) / 86_400_000);
  if (Number.isNaN(days)) return null;
  return days <= 0 ? 'Posted today' : days === 1 ? 'Posted yesterday' : days < 60 ? `Posted ${days} days ago` : `Posted ${Math.round(days / 30)} months ago`;
}

/** The posting's words with the one their line matched in bold. */
function Quote({ text, term }: { text: string; term: string }) {
  const at = text.toLowerCase().indexOf(term.toLowerCase());
  if (at < 0) return <>“{text}”</>;
  return (
    <>
      “{text.slice(0, at)}
      <b>{text.slice(at, at + term.length)}</b>
      {text.slice(at + term.length)}”
    </>
  );
}

function ReasonLine({ r }: { r: Reason }) {
  if (r.kind === 'role')
    return (
      <li className="t-s">
        {r.close ? 'Close to' : 'A role you’re looking for:'} <b>{r.role}</b>
      </li>
    );
  if (r.kind === 'pref') return <li className="t-s">{r.text}</li>;
  return (
    <li className="t-s">
      <span className="c2">You:</span> {r.statement}
      <span className={cx('t-xs c2', s.quote)}>
        The posting: <Quote text={r.quote} term={r.term} />
      </span>
    </li>
  );
}

/** S20 · Jobs for you, and the ones they saved. */
export function Jobs({
  cards: initial,
  saved: initialSaved,
  filteredOut,
  needsPortrait,
  notice,
  signedIn,
  hasRoles,
}: {
  cards: JobCard[];
  saved: SavedJob[];
  filteredOut: number;
  needsPortrait: boolean;
  notice: string | null;
  signedIn: boolean;
  hasRoles: boolean;
}) {
  const [cards, setCards] = useState(initial);
  const [saved, setSaved] = useState(initialSaved);
  const [tab, setTab] = useState<'for-you' | 'saved'>('for-you');
  const [asking, setAsking] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [, start] = useTransition();

  const mark = (id: string, action: JobAction | null) => setCards((all) => all.map((c) => (c.id === id ? { ...c, action } : c)));
  const remember = (c: JobCard, action: JobAction) =>
    setSaved((all) => [
      { jobId: c.id, action, reason: null, job: { title: c.title, company: c.company, location: c.location, url: c.url }, at: new Date().toISOString() },
      ...all.filter((x) => x.jobId !== c.id),
    ]);

  /** Shows the change at once; a signed-out preview keeps it on the page only. */
  const act = (c: JobCard, action: JobAction, reason: DismissReason | null, done: string) => {
    setError('');
    const before = cards;
    const savedBefore = saved;
    if (action === 'dismissed') {
      setCards((all) => all.filter((x) => (reason === 'company' ? x.company !== c.company : x.id !== c.id)));
      setSaved((all) => all.filter((x) => x.jobId !== c.id));
    } else {
      mark(c.id, action);
      remember(c, action);
    }
    setAsking(null);
    setStatus(done);
    if (!signedIn) return;
    start(async () => {
      const r = await actOnJob(c.id, action, reason);
      if (!r.ok) {
        setCards(before);
        setSaved(savedBefore);
        setError(r.error);
        setStatus('');
      }
    });
  };

  const unsave = (jobId: string) => {
    const savedBefore = saved;
    const cardsBefore = cards;
    setSaved((all) => all.filter((x) => x.jobId !== jobId));
    mark(jobId, null);
    setError('');
    setStatus('Removed from saved');
    if (!signedIn) return;
    start(async () => {
      const r = await undoJobAction(jobId);
      if (!r.ok) {
        setSaved(savedBefore);
        setCards(cardsBefore);
        setStatus('');
        setError(r.error);
      }
    });
  };

  return (
    <ShellMain className={s.main}>
      <h1 className="t-h1">Jobs</h1>
      <p className="t-s c2 mt-1.5 max-w-[62ch]">
        Picked from what you confirmed in your portrait and what you told the agent you’re looking for. Every reason quotes the line
        of yours it rests on and the posting’s own words, so you can check it. You apply on the employer’s own site.
      </p>
      {notice ? <p className={cx('t-xs c2 mt-2', s.notice)}>{notice}</p> : null}

      <div className="mt-4 flex gap-2" role="tablist" aria-label="Jobs">
        <Chip size="sm" on={tab === 'for-you'} role="tab" aria-selected={tab === 'for-you'} onClick={() => setTab('for-you')}>
          For you · {cards.length}
        </Chip>
        <Chip size="sm" on={tab === 'saved'} role="tab" aria-selected={tab === 'saved'} onClick={() => setTab('saved')}>
          Saved · {saved.length}
        </Chip>
      </div>
      <p className={cx('t-xs mt-2', error ? 'err' : 'c2')} role="status" aria-live="polite">
        {error || status}
      </p>

      {tab === 'saved' ? (
        <ul className={s.list} aria-label="Saved jobs">
          {saved.length ? (
            saved.map((x) => (
              <li key={x.jobId} className={s.card}>
                <p className="t-h3">{x.job.title}</p>
                <p className="t-s c2">
                  {x.job.company}
                  {x.job.location ? ` · ${x.job.location}` : ''}
                  {x.action === 'applied' ? ' · You went to apply' : ''}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a className={buttonClass({ size: 'sm' })} href={x.job.url} target="_blank" rel="noopener noreferrer">
                    Open posting
                  </a>
                  <Chip size="sm" tone="wall" onClick={() => unsave(x.jobId)}>
                    Remove
                  </Chip>
                </div>
              </li>
            ))
          ) : (
            <li className="t-s c2">Nothing saved yet. Save a job from “For you” and it waits here.</li>
          )}
        </ul>
      ) : needsPortrait ? (
        <div className={cx(s.card, 'mt-2 max-w-[560px]')}>
          <p className="t-h3">Tell the agent what you’re after</p>
          <p className="t-s c2 mt-1">
            Jobs come from your portrait: what you’ve done, confirmed line by line, and the roles you want. Start in the studio, or attach your
            résumé there, and come back.
          </p>
          <Link className={cx(buttonClass(), 'mt-3')} href={routes.studio}>
            Go to the studio
          </Link>
        </div>
      ) : (
        <>
          {!hasRoles ? (
            <p className="t-xs c2">
              Tip: tell the agent which roles you want (“data analyst, operations”), and these get sharper.{' '}
              <Link className="linklike" href={routes.studio}>
                Studio
              </Link>
            </p>
          ) : null}
          <ul className={s.list} aria-label="Jobs for you">
            {cards.map((c) => {
              const facts = [c.location, WORKPLACE[c.workplace], TYPE[c.type], c.pay, posted(c.postedAt)].filter(Boolean);
              return (
                <li key={c.id} className={s.card}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="t-h3">{c.title}</p>
                    <p className="t-s b shrink-0">{c.company}</p>
                  </div>
                  <p className="t-xs c2 mt-0.5">{facts.join(' · ')}</p>
                  <ul className={s.reasons} aria-label="Why it fits">
                    {c.reasons.map((r, i) => (
                      <ReasonLine key={i} r={r} />
                    ))}
                  </ul>
                  {c.caution ? <p className={cx('t-xs mt-2', s.caution)}>{c.caution}</p> : null}
                  {open === c.id ? <p className={cx('t-xs c2 mt-2', s.description)}>{c.description}</p> : null}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <a
                      className={buttonClass({ size: 'sm' })}
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => c.action !== 'applied' && act(c, 'applied', null, `Opened ${c.company}’s posting; it’s in Saved`)}
                    >
                      Apply on {c.company}’s site
                    </a>
                    {c.action === 'saved' || c.action === 'applied' ? (
                      <Chip size="sm" on onClick={() => unsave(c.id)}>
                        {c.action === 'applied' ? 'Applied' : 'Saved'} · undo
                      </Chip>
                    ) : (
                      <Chip size="sm" onClick={() => act(c, 'saved', null, `Saved ${c.title}`)}>
                        Save
                      </Chip>
                    )}
                    <Chip size="sm" tone="wall" aria-expanded={asking === c.id} onClick={() => setAsking(asking === c.id ? null : c.id)}>
                      Not for me
                    </Chip>
                    <button type="button" className="linklike t-xs" onClick={() => setOpen(open === c.id ? null : c.id)}>
                      {open === c.id ? 'Hide the posting' : 'Read the posting'}
                    </button>
                  </div>
                  {asking === c.id ? (
                    <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Why not">
                      {NOT_FOR_ME.map((o) => (
                        <Chip
                          key={o.reason}
                          size="sm"
                          tone="wall"
                          onClick={() => act(c, 'dismissed', o.reason, o.reason === 'company' ? `Won’t show ${c.company} again` : 'Got it, hidden')}
                        >
                          {o.label}
                        </Chip>
                      ))}
                    </div>
                  ) : null}
                </li>
              );
            })}
            {!cards.length ? <li className="t-s c2">Nothing fits yet. Confirm more lines in your portrait, or widen what you’re looking for.</li> : null}
          </ul>
          {filteredOut ? <p className="t-xs c2 mt-4">{filteredOut} postings were left out by your job type, work mode or place.</p> : null}
        </>
      )}
    </ShellMain>
  );
}
