'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, Chip, Grow, MarginNote, Segmented, buttonClass, cx, withViewTransition } from '@portrait/ui';
import { AppShell, ShellMain } from '@/components/shell/AppShell';
import { talentNav } from '@/lib/nav';
import { DRAFT_TEXT, feedPosts, type FeedPost } from './posts';
import s from './feed.module.css';

const FEEDS = [
  { value: 'for', label: 'For you' },
  { value: 'following', label: 'Following' },
  { value: 'events', label: 'Events' },
] as const;

const KINDS = [
  { value: 'text', label: 'Text' },
  { value: 'image', label: 'Image' },
  { value: 'project', label: 'Project' },
] as const;

const BLURRED_NOTE = 'Logo blurred · nothing else in the image names you';
const POSTED_NOTE = 'Posted as paper-kite · it shows on your anonymous portrait only';

/** S09 · the feed, as Maya sees it: posting under their alias checks the image for anything that names them. */
export function Feed() {
  const [blurred, setBlurred] = useState(false);
  const [posted, setPosted] = useState(false);
  const [open, setOpen] = useState('a');
  const [res, setRes] = useState<Record<string, boolean>>({});
  const [announce, setAnnounce] = useState('');

  // Keep focus on the next step when the control that was pressed goes away.
  const postBtn = useRef<HTMLButtonElement>(null);
  const undoBtn = useRef<HTMLButtonElement>(null);
  const focusNext = useRef<'post' | 'undo' | null>(null);
  useEffect(() => {
    const target = focusNext.current === 'post' ? postBtn.current : focusNext.current === 'undo' ? undoBtn.current : null;
    target?.focus({ preventScroll: true });
    focusNext.current = null;
  }, [posted, blurred]);

  const blur = () => {
    focusNext.current = 'post';
    setBlurred(true);
    setAnnounce(BLURRED_NOTE);
  };
  const post = () => {
    focusNext.current = 'undo';
    withViewTransition(() => setPosted(true));
    setAnnounce(POSTED_NOTE);
  };
  const unpost = () => {
    focusNext.current = 'post';
    withViewTransition(() => setPosted(false));
    setAnnounce('');
  };

  const logo = (
    <span className={cx(s.logo, blurred && s.blur)} aria-hidden="true">
      LOGO
    </span>
  );

  return (
    <AppShell
      nav={talentNav}
      active="feed"
      footer={
        <>
          Maya Ortiz · @maya
          <br />
          alias paper-kite
        </>
      }
    >
      <ShellMain className={cx(s.main, 'pb-24')}>
        <p className="sr" aria-live="polite">
          {announce}
        </p>
        <div className={s.cols}>
          <div className="flex flex-col gap-3.5">
            <Segmented label="Feed" options={[...FEEDS]} defaultValue="for" />

            {posted ? (
              <article className={cx(s.post, s.new)} aria-label="Your post">
                <div className={s.who}>
                  <span className="t-s b">paper-kite</span>
                  <span className="t-xs c2">Interaction design · new grad · just now</span>
                </div>
                <p className="t-body mt-2">{DRAFT_TEXT}</p>
                <div className={s.img}>
                  {logo}
                  <span className="t-xs c2">kiosk-v6.png</span>
                </div>
                <div className="land mt-2.5 flex items-center justify-between gap-3">
                  <MarginNote as="span">{POSTED_NOTE}</MarginNote>
                  <button
                    ref={undoBtn}
                    type="button"
                    className={buttonClass({ variant: 'quiet', size: 'sm' })}
                    onClick={unpost}
                  >
                    Undo
                  </button>
                </div>
              </article>
            ) : (
              <div className={cx(s.post, s.new)} role="group" aria-label="New post">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="t-xs c2">
                    Posting as <b className="text-ink">paper-kite</b>
                  </p>
                  <Segmented label="Post type" options={[...KINDS]} defaultValue="image" />
                </div>
                <p className="t-body mt-3">{DRAFT_TEXT}</p>
                <div className={s.img}>
                  <svg className={s.kiosk} viewBox="0 0 200 110" aria-hidden="true">
                    <rect x="70" y="4" width="60" height="100" rx="5" />
                    <rect x="80" y="20" width="40" height="18" rx="3" />
                    <rect x="80" y="44" width="40" height="18" rx="3" />
                    <rect x="80" y="68" width="40" height="18" rx="3" />
                  </svg>
                  {logo}
                  <span className="t-xs c2 relative">kiosk-v6.png · from Maya</span>
                </div>
                {blurred ? null : (
                  <div className={s.check} role="status">
                    <p className="t-s">
                      <b>Anonymity check.</b> The screenshot shows your school’s logo. Posting as paper-kite could
                      reveal who you are.
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      <Button size="sm" onClick={blur}>
                        Blur the logo
                      </Button>
                      <Button variant="secondary" size="sm">
                        Replace image
                      </Button>
                      <Button variant="quiet" size="sm" onClick={post}>
                        Post anyway
                      </Button>
                    </div>
                  </div>
                )}
                {blurred ? (
                  <MarginNote land className="mt-2.5">
                    {BLURRED_NOTE}
                  </MarginNote>
                ) : null}
                <div className="mt-3.5 flex items-center justify-between gap-3">
                  <span className="t-xs c2">Visible to everyone · as paper-kite</span>
                  <button ref={postBtn} type="button" className={buttonClass({ size: 'sm' })} onClick={post}>
                    Post
                  </button>
                </div>
              </div>
            )}

            {feedPosts.map((p) => (
              <Post
                key={p.id}
                post={p}
                open={open === p.id}
                mine={!!res[p.id]}
                onToggle={() => setOpen((cur) => (cur === p.id ? '' : p.id))}
                onResonate={() => setRes((cur) => ({ ...cur, [p.id]: !cur[p.id] }))}
              />
            ))}
          </div>

          <aside className="flex flex-col gap-4" aria-label="Coming up and worth following">
            <div className="rb">
              <p className="lab">Coming up</p>
              <div className={s.up}>
                <span className="hand text-[26px] font-semibold">29</span>
                <span className="t-s">
                  <b>Northwind AMA</b>
                  <span className="t-xs c2 block">Thu · 6 PM PT</span>
                </span>
                <span className="hand text-[26px] font-semibold">05</span>
                <span className="t-s">
                  <b>Showcase night</b>
                  <span className="t-xs c2 block">Thu Nov 5 · 5:30 PM PT</span>
                </span>
              </div>
            </div>
            <div className="rb">
              <p className="lab">Worth following</p>
              <div className="mt-3 flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="t-s">
                    <b>Jordan Lee</b>
                    <span className="t-xs c2 block">Insider · Fernway</span>
                  </span>
                  <Chip size="sm" aria-label="Follow Jordan Lee">
                    Follow
                  </Chip>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="t-s">
                    <b>Northwind</b>
                    <span className="t-xs c2 block">Seed · restaurants</span>
                  </span>
                  <Chip size="sm" aria-label="Follow Northwind">
                    Follow
                  </Chip>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </ShellMain>
    </AppShell>
  );
}

function Post({
  post: p,
  open,
  mine,
  onToggle,
  onResonate,
}: {
  post: FeedPost;
  open: boolean;
  mine: boolean;
  onToggle: () => void;
  onResonate: () => void;
}) {
  const bodyId = `post-${p.id}-more`;
  const count = p.n + (mine ? 1 : 0);
  return (
    <article className={s.post} aria-labelledby={`post-${p.id}-title`}>
      <div className={s.who}>
        <span className="t-s b">{p.who}</span>
        <span className="t-xs c2">{p.ctx}</span>
      </div>
      <p id={`post-${p.id}-title`} className="t-h3 mt-2">
        {p.title}
      </p>
      <Grow open={open} id={bodyId}>
        <div className="gl mt-2.5 flex flex-col gap-2">
          <p className="ln t-s">{p.body}</p>
          {p.code ? <p className={cx('ln', s.code)}>{p.code}</p> : null}
          <p className="ln t-xs c2">{p.meta}</p>
        </div>
      </Grow>
      <div className={s.acts}>
        <button type="button" className={cx(mine && s.on)} onClick={onResonate} aria-pressed={mine}>
          Resonate · {count}
          {mine ? (
            <svg className="tally draw" viewBox="0 0 8 16" style={{ width: 8 }} aria-hidden="true">
              <path pathLength={1} d="M3 2 L3 14" />
            </svg>
          ) : null}
        </button>
        <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={bodyId}>
          {open ? 'Fold' : 'Read more'}
        </button>
        <button type="button">Comment · {p.c}</button>
        <button type="button">Share</button>
        <button type="button">Report</button>
      </div>
    </article>
  );
}
