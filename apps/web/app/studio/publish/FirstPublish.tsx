'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { Button, Grow, PencilMark, Ruler, buttonClass, cx, useFlash, withViewTransition } from '@portrait/ui';
import { FlowBar } from '@/components/chrome';
import { VisibilityOptions } from '@/components/entry/VisibilityOptions';
import { lin } from '@/lib/data/cast';
import { publishChecks, publishVisibility, type PublishCheck, type Visibility } from '@/lib/data/entry';
import { routes } from '@/lib/routes';
import s from './publish.module.css';

const LINK = 'portrait.so/lin';

/** S15 · first publish: choose who can see the portrait, confirm four things, then the first mark. */
export function FirstPublish() {
  const [vis, setVis] = useState<Visibility>('anon');
  const [ok, setOk] = useState<Record<PublishCheck['id'], boolean>>({ a: true, b: true, c: false, d: false });
  const [open, setOpen] = useState<PublishCheck['id'] | ''>('c');
  const [done, setDone] = useState(false);
  const [copied, flashCopied] = useFlash(2000);
  const base = useId();
  const chooseHeading = useRef<HTMLHeadingElement>(null);
  const doneHeading = useRef<HTMLHeadingElement>(null);
  const changed = useRef(false);

  const sel = publishVisibility.find((o) => o.value === vis) ?? publishVisibility[1]!;
  const nDone = publishChecks.filter((c) => ok[c.id]).length;
  const ready = nDone === publishChecks.length;

  // Publishing or unpublishing swaps the whole page: take focus to the new heading.
  useEffect(() => {
    if (!changed.current) return;
    (done ? doneHeading : chooseHeading).current?.focus({ preventScroll: true });
  }, [done]);

  const swap = (next: boolean) => {
    changed.current = true;
    withViewTransition(() => setDone(next));
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`https://${LINK}`);
      flashCopied();
    } catch {
      // Clipboard refused (permissions, insecure context): nothing to undo.
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Ruler />
      <FlowBar
        left={
          <span className="flex items-baseline gap-3.5">
            <Link href={routes.landing} className="text-[19px] font-extrabold tracking-[-0.02em] no-underline">
              Portrait
            </Link>
            <span className="hand text-[17px]">{LINK}</span>
          </span>
        }
        right={<span className="t-xs c2">{done ? `Live · ${sel.title}` : 'Draft · nothing is public yet'}</span>}
      />

      {done ? (
        <div className={s.first}>
          <PencilMark vw={150} d="M2 6 C40 3 90 7 148 4" isNew draw className="w-full" />
          <span className={cx(s.d, 'land')}>Oct 19 · first mark</span>
        </div>
      ) : null}

      <main className="wrap max-w-[1120px] pt-12 pb-[72px]">
        {done ? (
          <div className="land pt-20">
            <p className="lab">Published · {sel.title}</p>
            <h1 ref={doneHeading} tabIndex={-1} className="t-d mt-3 text-[72px] max-md:text-[60px] max-sm:text-[48px]">
              Your portrait is up.
            </h1>
            <p className="t-body c2 mt-3 max-w-[54ch]">
              That’s the first mark on your doorframe. Every time you add something, a new one goes up beside it, with
              the date.
            </p>
            <div className="mt-[22px] flex flex-wrap gap-2">
              <Link
                className={buttonClass()}
                href={vis === 'anon' ? routes.anonPortrait(lin.alias ?? 'quiet-otter') : routes.portrait(lin.handle ?? 'lin')}
              >
                See it as a startup would
              </Link>
              <Button variant="secondary" onClick={copy} aria-live="polite">
                {copied ? 'Copied' : 'Copy link'}
              </Button>
              <Button variant="quiet" onClick={() => swap(false)}>
                Unpublish
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <p className="lab">Before you publish · step 1 of 1</p>
            <h1 ref={chooseHeading} tabIndex={-1} className="t-d mt-3 text-[64px] max-md:text-[52px] max-sm:text-[44px]">
              Who can see your portrait?
            </h1>
            <p className="t-body c2 mt-2.5 max-w-[54ch]">
              We picked the setting most people start with. You can change it any time in Settings.
            </p>
            <div className="g12 mt-7 gap-y-6">
              <VisibilityOptions
                className="col-[1/span_6] max-md:col-[1/-1]"
                options={publishVisibility}
                value={vis}
                onChange={setVis}
              />
              <div className="col-[7/span_6] max-md:col-[1/-1]">
                <div className="flex items-baseline justify-between">
                  <p className="lab">Confirm 4 things first</p>
                  <p className="t-xs c2" id={`${base}-count`}>
                    {nDone} of 4
                  </p>
                </div>
                <div className="mt-2 flex flex-col gap-1.5">
                  {publishChecks.map((c) => {
                    const on = ok[c.id];
                    const isOpen = open === c.id;
                    const toggle = () => setOpen(isOpen ? '' : c.id);
                    const id = `${base}-${c.id}`;
                    return (
                      <div key={c.id} className={cx(s.ck, isOpen && s.open)}>
                        <div className={s.ckh}>
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={on}
                            aria-label={c.title}
                            className={cx(s.bx, on && s.on)}
                            onClick={() => setOk((prev) => ({ ...prev, [c.id]: !on }))}
                          />
                          <button
                            type="button"
                            className={s.ckt}
                            aria-expanded={isOpen}
                            aria-controls={id}
                            onClick={toggle}
                          >
                            <span className="t-s b">{c.title}</span>
                          </button>
                          {/* The same toggle as the title, for the pointer; keyboard users have the title button. */}
                          <span className={cx('t-xs c2', s.why)} aria-hidden="true" onClick={toggle}>
                            {isOpen ? 'less' : 'why'}
                          </span>
                        </div>
                        <Grow open={isOpen} id={id}>
                          <div className={s.ckb}>
                            <div className="gl">
                              <p className="ln t-s">{c.detail}</p>
                            </div>
                          </div>
                        </Grow>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-2.5">
              <Link className={buttonClass({ variant: 'quiet', className: '-ml-2' })} href={routes.studio}>
                Back to studio
              </Link>
              <button
                type="button"
                className={buttonClass({ className: s.publish })}
                aria-disabled={!ready}
                aria-describedby={`${base}-count`}
                onClick={() => {
                  if (ready) swap(true);
                }}
              >
                {sel.cta}
              </button>
              <span className="t-xs c2 max-w-[46ch]">
                {vis === 'anon'
                  ? 'Anonymity is our best effort. If you also share your named link widely, people may connect the two.'
                  : 'You can switch to anonymous any time.'}
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
