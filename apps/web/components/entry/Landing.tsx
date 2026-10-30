'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { BasisMark, DateNote, Ruler, SectionMark, buttonClass, chipClass, cx, withViewTransition } from '@portrait/ui';
import { AccountLink } from '@/components/account/Account';
import { PublicHeader } from '@/components/chrome';
import { anonymousTrial } from '@/lib/auth-options';
import { landingCopy, landingEvents, landingShots, type Who } from '@/lib/data/entry';
import { supabaseBrowser } from '@/lib/supabase/client';
import { routes } from '@/lib/routes';
import s from '@/app/landing.module.css';

const DRAFT_KEY = 'pv-landing-draft';
const STEP_BARS = ['h-10', 'h-[72px]', 'h-[104px] bg-new'];
const navLink = buttonClass({ variant: 'quiet', size: 'sm', className: 'max-sm:px-2' });

/** S03 · the landing page. One word flips the whole page between job seekers and startups. */
export function Landing() {
  const router = useRouter();
  const [who, setWho] = useState<Who>('work');
  const [open, setOpen] = useState('');
  const [draft, setDraft] = useState('');
  const c = landingCopy[who];
  const work = who === 'work';
  // Where each side starts: job seekers talk their portrait into being, startups write a brief.
  const start = work ? routes.studio : routes.brief;

  // Whatever someone typed is kept for the visit, even if they leave and come back.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(DRAFT_KEY);
      if (saved) setDraft(saved);
    } catch {
      // Storage can be unavailable; the box simply starts empty.
    }
  }, []);
  const keep = (text: string) => {
    setDraft(text);
    try {
      if (text) sessionStorage.setItem(DRAFT_KEY, text);
      else sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      // Not saved this time; the text stays in the box.
    }
  };

  const flip = () =>
    withViewTransition(() => {
      setWho(work ? 'people' : 'work');
      setOpen('');
    });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void go();
  };
  const go = async () => {
    // Job seekers can start before making an account: an anonymous sign-in holds their draft until
    // they save it (lib/auth-options.ts). If that isn't on, the studio asks them to sign in first.
    const supabase = work && anonymousTrial ? supabaseBrowser() : null;
    if (supabase) {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) await supabase.auth.signInAnonymously();
      } catch {
        // Falls through to sign-in as before.
      }
    }
    router.push(start);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Ruler />

      <PublicHeader brandSize={22} className="flex-wrap gap-x-3">
        <nav aria-label="Main" className="flex items-center gap-1">
          <Link className={navLink} href={routes.events}>
            Events
          </Link>
          <Link className={navLink} href={routes.pricing}>
            Pricing
          </Link>
          <Link className={navLink} href={routes.privacy}>
            Privacy
          </Link>
          <AccountLink className="ml-2" />
        </nav>
      </PublicHeader>

      <main>
        <section className="wrap relative pt-20">
          <SectionMark vw={210} d="M2 6 C50 3 120 7 208 4" isNew className="top-[92px] w-[210px]" />
          <p className="hand text-[18px]">
            <DateNote className="ml-0">a page that grows with you</DateNote>
          </p>
          <h1 className={cx(s.hero, 'mt-[22px]')}>
            I’m looking for{' '}
            {/* The full stop stays with the word when the line wraps. */}
            <span className="whitespace-nowrap">
              <button type="button" className={s.word} onClick={flip} aria-label={c.wordAria}>
                {c.word}
              </button>
              .
            </span>
          </h1>
          <p className="t-s c2 mt-3.5" aria-live="polite">
            {c.flipHint}
          </p>
          <form className={cx(s.ask, 'mt-9')} onSubmit={submit}>
            <label className="sr" htmlFor="first">
              {c.askLabel}
            </label>
            <input
              id="first"
              className="inp"
              placeholder={c.askPh}
              value={draft}
              onChange={(e) => keep(e.target.value)}
              autoComplete="off"
            />
            <button type="submit" className={buttonClass({ className: 'min-h-[60px] px-[26px]' })}>
              {c.askBtn}
            </button>
          </form>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              href={start}
              className={chipClass({ size: 'sm', tone: 'wall', className: 'no-underline' })}
              onClick={(e) => {
                if (!work || !anonymousTrial) return;
                e.preventDefault();
                void go();
              }}
            >
              {c.chip}
            </Link>
            <span className="t-xs c2">{c.askHelp}</span>
          </div>
        </section>

        <section className="wrap relative pt-[110px]" aria-labelledby="how">
          <SectionMark d="M2 5 C40 7 90 3 148 6" />
          <p className="lab pt-[18px]" id="how">
            {c.howLab}
          </p>
          <div className={cx(s.steps, 'mt-[22px]')}>
            {c.steps.map((step, i) => (
              <div key={step.h} className={s.stp}>
                <i className={STEP_BARS[i]} aria-hidden="true" />
                <div>
                  <p className="hand text-[18px]">0{i + 1}</p>
                  <p className="t-h3 mt-1">{step.h}</p>
                  <p className="t-s c2 mt-1">{step.d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="wrap relative pt-[110px]" aria-labelledby="shots">
          <SectionMark d="M2 6 C50 4 100 7 148 4" />
          <div className="flex flex-wrap items-baseline justify-between gap-4 pt-[18px]">
            <p className="lab" id="shots">
              {c.shotsLab}
            </p>
            <p className="t-xs c2">{c.shotsHelp}</p>
          </div>
          <div className={cx(s.shots, 'mt-4')}>
            {landingShots[who].map((f) => {
              const on = open === f.id;
              return (
                <button
                  key={`${who}-${f.id}`}
                  type="button"
                  className={cx(s.sh, on && s.on)}
                  aria-expanded={on}
                  onClick={() => setOpen(on ? '' : f.id)}
                >
                  <span className={s.no}>{f.no}</span>
                  <span className="t-h3">{f.name}</span>
                  <span className="t-xs c2">{f.ctx}</span>
                  <span className="t-s mt-1">{f.line}</span>
                  <span className={cx('grow', on && 'open')} aria-hidden={!on}>
                    <span className="block min-h-0 overflow-hidden">
                      <span className="gl mt-2.5 flex flex-col gap-1.5">
                        {f.rows.map(([basis, text]) => (
                          <span key={text} className="ln t-xs block">
                            <BasisMark kind={basis} label="" />
                            {text}
                          </span>
                        ))}
                      </span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="wrap relative pt-[110px]" aria-labelledby="evs">
          <SectionMark d="M2 4 C50 6 100 4 148 6" />
          <div className="flex items-baseline justify-between pt-[18px]">
            <p className="lab" id="evs">
              On the program · this month
            </p>
            <Link className={buttonClass({ variant: 'quiet', size: 'sm' })} href={routes.events}>
              All events
            </Link>
          </div>
          <div className="g12 mt-4 gap-y-3">
            {landingEvents.map((ev, i) => (
              <div key={ev.day} className={cx(s.ev, i === 0 ? 'col-[1/span_6]' : 'col-[7/span_6]', 'max-md:col-[1/-1]')}>
                <span className={s.day}>{ev.day}</span>
                <div>
                  <p className="t-h3">{ev.title}</p>
                  <p className="t-xs c2 mt-0.5">{ev.meta}</p>
                </div>
                <span className="t-xs c2">{ev.going}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="wrap pt-24 pb-[72px]">
          <div key={who} id="fair" className={cx(s.fair, 'land')}>
            <p className="t-s">
              <b>{c.fair.lead}</b> {c.fair.rest}
            </p>
          </div>
          <footer className="t-xs c2 mt-10 flex flex-wrap gap-[18px]">
            <span>
              <b className="text-ink">Portrait</b>
            </span>
            <Link href={routes.pricing}>Pricing</Link>
            <Link href={routes.events}>Events</Link>
            <Link href={routes.privacy}>Privacy</Link>
            <a href="#fair">Community rules</a>
          </footer>
        </section>
      </main>
    </div>
  );
}
