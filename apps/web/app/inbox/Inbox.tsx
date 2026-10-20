'use client';

import Link from 'next/link';
import { Fragment, useEffect, useId, useRef, useState } from 'react';
import {
  BasisMark,
  Button,
  Grow,
  MarginNote,
  PencilMark,
  Segmented,
  buttonClass,
  cx,
  withViewTransition,
} from '@portrait/ui';
import { AppShell, ShellMain } from '@/components/shell/AppShell';
import {
  inboxThreads,
  inboxUnread,
  northwindInboxFacts,
  northwindRequest,
  northwindTagline,
  type ThreadId,
} from '@/lib/data/connections';
import { talentNav } from '@/lib/nav';
import { routes } from '@/lib/routes';
import s from './inbox.module.css';

type Answer = 'pending' | 'accepted' | 'declined';
type Folder = 'requests' | 'messages' | 'chats';
type FocusTarget = 'accept' | 'pick' | 'declineToggle' | 'undoDecline';

export function Inbox() {
  const [th, setTh] = useState<ThreadId>('n');
  const [folder, setFolder] = useState<Folder>('requests');
  const [answer, setAnswer] = useState<Answer>('pending');
  const [decline, setDecline] = useState(false);
  const [reason, setReason] = useState('');

  const detailId = useId();
  const declineId = useId();

  // Buttons that replace each other move focus along with them.
  const acceptRef = useRef<HTMLButtonElement>(null);
  const pickRef = useRef<HTMLAnchorElement>(null);
  const declineToggleRef = useRef<HTMLButtonElement>(null);
  const undoDeclineRef = useRef<HTMLButtonElement>(null);
  const focusNext = useRef<FocusTarget | null>(null);
  useEffect(() => {
    const target = focusNext.current;
    if (!target) return;
    const el = { accept: acceptRef, pick: pickRef, declineToggle: declineToggleRef, undoDecline: undoDeclineRef }[target]
      .current;
    if (!el) return; // not rendered yet: try again after the next render
    focusNext.current = null;
    el.focus({ preventScroll: true });
  });

  const thread = inboxThreads.find((t) => t.id === th) ?? inboxThreads[0]!;
  const answered = answer !== 'pending';
  const accepted = answer === 'accepted';

  const pickThread = (id: ThreadId) => withViewTransition(() => setTh(id));
  const accept = () => {
    focusNext.current = 'pick';
    withViewTransition(() => {
      setAnswer('accepted');
      setDecline(false);
    });
  };
  const undo = () => {
    focusNext.current = 'accept';
    withViewTransition(() => setAnswer('pending'));
  };
  const confirmDecline = () => {
    focusNext.current = 'undoDecline';
    withViewTransition(() => {
      setAnswer('declined');
      setDecline(false);
    });
  };
  const keepIt = () => {
    focusNext.current = 'declineToggle';
    setDecline(false);
  };

  return (
    <AppShell
      nav={talentNav}
      active="inbox"
      badges={{ inbox: inboxUnread(answered) }}
      footer="Lin Zhou · companies see quiet-otter"
      agent={{ context: thread.context }}
    >
      <ShellMain className={s.main}>
        <div className={s.cols}>
          <section className={s.threads} aria-label="Threads">
            <h1 className="t-h1">Inbox</h1>
            <Segmented<Folder>
              label="Show"
              className="mt-3.5"
              value={folder}
              onChange={setFolder}
              options={[
                { value: 'requests', label: 'Requests 2' },
                { value: 'messages', label: 'Messages' },
                { value: 'chats', label: 'Coffee chats' },
              ]}
            />
            {folder === 'requests' ? (
              <div className={s.list}>
                {inboxThreads.map((t) => {
                  const dot = t.unread && !(t.id === 'n' && answered);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={cx(s.th, t.old && s.old, th === t.id && s.on)}
                      aria-current={th === t.id ? 'true' : undefined}
                      aria-controls={detailId}
                      onClick={() => pickThread(t.id)}
                    >
                      <span className="t-s b">
                        {dot ? <span className={s.dot} aria-hidden="true" /> : null}
                        {t.name}
                      </span>
                      <span className={cx('t-xs', !t.old && 'c2')}>{t.when}</span>
                      <span className={cx('t-xs', !t.old && 'c2', s.preview)}>{t.preview}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="t-s c2 mt-3.5 px-4 py-3.5">Nothing here yet.</p>
            )}
          </section>

          <section id={detailId} className={s.detail} aria-live="polite">
            {th === 'n' ? (
              <div>
                <p className="lab">{`Request · expires ${northwindRequest.expires} · ${northwindRequest.daysLeft}`}</p>
                <h2 className="t-h1 mt-2">Northwind would like a coffee chat.</h2>
                <p className="t-s c2 mt-1.5">
                  <BasisMark kind="ver" />
                  Verified startup · sent by Sam Okafor, CEO · about <b className="text-ink">SWE Intern, Summer 2027</b>
                </p>
                <p className="hand mt-[18px] max-w-[40ch] text-[20px] leading-[1.5]">
                  “Hi — I’m Sam at Northwind (6 people, restaurant inventory). Your move-in week write-up is the kind of
                  thinking our re-order screen needs. I’d love to hear what you’d change about the cache if traffic
                  doubled. 20 minutes next week?”
                </p>
                <div className={cx(s.cmp2, 'mt-[22px]')}>
                  <div className="sunk">
                    <p className="lab">What they see now</p>
                    <p className="t-s mt-1.5">quiet-otter · CS junior · Southern California, and your anonymous portrait.</p>
                  </div>
                  <div className={cx(accepted ? 'panel' : 'sunk', s.ifBox)}>
                    <p className="lab">{accepted ? 'They see now' : 'If you accept'}</p>
                    <p className="t-s mt-1.5">
                      Your name, full portrait and links. Work authorization stays hidden until you share it.
                    </p>
                  </div>
                </div>

                {answer === 'pending' ? (
                  <>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <button ref={acceptRef} type="button" className={buttonClass()} onClick={accept}>
                        Accept and pick a time
                      </button>
                      <Button variant="secondary">Not now</Button>
                      <button
                        ref={declineToggleRef}
                        type="button"
                        className={buttonClass({ variant: 'quiet' })}
                        onClick={() => setDecline((v) => !v)}
                        aria-expanded={decline}
                        aria-controls={declineId}
                      >
                        Decline…
                      </button>
                    </div>
                    <Grow open={decline} id={declineId}>
                      <div className="gl mt-3.5">
                        <p className="ln t-s">Declining is private. Northwind sees “not available right now”.</p>
                        <label className="ln fl mt-2.5 block" htmlFor="why">
                          A reason only Portrait sees · optional
                        </label>
                        <input
                          id="why"
                          className="inp ln mt-1.5 max-w-[460px]"
                          placeholder="e.g. I’m only looking at Bay Area roles"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                        />
                        <div className="ln mt-2.5 flex gap-2">
                          <Button variant="secondary" size="sm" onClick={confirmDecline}>
                            Decline
                          </Button>
                          <Button variant="quiet" size="sm" onClick={keepIt}>
                            Keep it
                          </Button>
                        </div>
                      </div>
                    </Grow>
                  </>
                ) : null}

                {accepted ? (
                  <div className="mt-5">
                    <PencilMark vw={200} d="M2 6 C50 3 120 7 198 4" isNew draw style={{ width: 260 }} />
                    <div className="land">
                      <MarginNote className="mt-1.5">
                        {`Accepted ${northwindRequest.answeredOn} · Northwind now sees Lin Zhou`}
                      </MarginNote>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link ref={pickRef} className={buttonClass()} href={routes.coffeeChat}>
                          Pick a time
                        </Link>
                        <Button variant="quiet" onClick={undo}>
                          Undo · 30 s
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}

                {answer === 'declined' ? (
                  <div className="land mt-5">
                    <MarginNote>
                      {`Declined ${northwindRequest.answeredOn} · Northwind sees “not available right now”`}
                    </MarginNote>
                    <div className="mt-3 flex gap-2">
                      <button
                        ref={undoDeclineRef}
                        type="button"
                        className={buttonClass({ variant: 'quiet', className: '-ml-2' })}
                        onClick={undo}
                      >
                        Undo · 30 s
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="sunk mt-7 flex items-center justify-between gap-3 px-4 py-3">
                  <p className="t-xs c2">
                    <b className="text-ink">Safety</b> · Startups never need money, gift cards or your ID to talk. If
                    anyone asks, report it.
                  </p>
                  <Button variant="quiet" size="sm">
                    Report
                  </Button>
                </div>
              </div>
            ) : null}

            {th === 'j' ? (
              <div>
                <p className="lab">Offer · from an insider</p>
                <h2 className="t-h1 mt-2">Jordan Lee offered a coffee chat.</h2>
                <p className="t-s c2 mt-1.5">Software engineer at Fernway, one year in · 4.9 from 11 chats</p>
                <p className="hand mt-[18px] max-w-[40ch] text-[20px] leading-[1.5]">
                  “Saw your move-in week post. I hit the same connection-pool wall at Fernway last spring. Happy to swap
                  notes for 20 minutes.”
                </p>
                <p className="t-s c2 mt-3.5">
                  An insider chat doesn’t reveal your name unless you choose to. Jordan sees quiet-otter.
                </p>
                <div className="mt-[18px] flex flex-wrap gap-2">
                  <Button>See Jordan’s times</Button>
                  <Button variant="secondary">Reply</Button>
                </div>
              </div>
            ) : null}

            {th === 'l' ? (
              <div>
                <p className="lab">Expired · Oct 14</p>
                <h2 className="t-h1 mt-2">Lumen Labs’ request expired.</h2>
                <p className="t-s c2 mt-2 max-w-[46ch]">
                  No reply in 14 days, so the request went back to them. They weren’t told why, and nothing about you was
                  shared.
                </p>
              </div>
            ) : null}
          </section>

          <aside className={s.rl} aria-label="About the sender">
            {th === 'n' ? (
              <>
                <div className="rb">
                  <p className="lab">About Northwind</p>
                  <p className="t-s b mt-2">{northwindTagline}</p>
                  <dl className={cx(s.fact, 'mt-3')}>
                    {northwindInboxFacts.map(([k, v]) => (
                      <Fragment key={k}>
                        <dt>{k}</dt>
                        <dd>{v}</dd>
                      </Fragment>
                    ))}
                  </dl>
                  <Link
                    className={buttonClass({ variant: 'quiet', size: 'sm', className: 'mt-2.5 -ml-2' })}
                    href={routes.company}
                  >
                    Northwind’s page
                  </Link>
                </div>
                <div className="rb">
                  <p className="lab">Their AMA</p>
                  <p className="t-s mt-1.5">What does an intern actually do at a six-person startup?</p>
                  <p className="hand mt-1 text-[15px]">Thu Oct 29 · 6 PM PT · you’re registered</p>
                </div>
              </>
            ) : null}
          </aside>
        </div>
      </ShellMain>
    </AppShell>
  );
}
