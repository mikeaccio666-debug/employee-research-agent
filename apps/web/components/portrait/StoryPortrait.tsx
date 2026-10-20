'use client';

import Link from 'next/link';
import { Fragment, useEffect, useId, useRef, useState } from 'react';
import {
  Band,
  BasisMark,
  Button,
  Chip,
  DateNote,
  FootnoteButton,
  Grow,
  MarginNote,
  PencilMark,
  Ruler,
  Segmented,
  SectionMark,
  buttonClass,
  cx,
} from '@portrait/ui';
import { PublicHeader } from '@/components/chrome';
import { routes } from '@/lib/routes';
import type { Run, StoryPortraitData } from '@/lib/data/portraits';
import { Rich } from './Rich';
import { Dock, PhoneBar, ProofSheet, ShareButton, isPhone, useUnderBar } from './phone';
import { AskCard, ExperienceList, GoodAt, Responsive, SectionHead, YouCard } from './sections';
import { PhoneVoiceButton, VoiceButton, useVoice } from './voice';
import s from './portrait.module.css';

type Lang = 'en' | 'zh';

const LANGS = [
  { value: 'en' as const, label: 'English' },
  { value: 'zh' as const, label: <span lang="zh-CN">原话</span> },
];

/**
 * V2-S02-Portrait — a story that grows in place, every line footnoted to its source.
 * Phones follow V2-S02-Portrait-Mobile: a sticky bar, the first screen as drawn on the
 * phones, proofs on a sheet and a dock within thumb reach.
 *
 * `anonymous` renders the view a startup sees. Pass anonymized data with it: this
 * component never receives a real name, handle or photo in that mode.
 */
export function StoryPortrait({ data, anonymous = false }: { data: StoryPortraitData; anonymous?: boolean }) {
  const [story, setStory] = useState(false);
  const [fn, setFn] = useState<number | null>(null);
  const [skill, setSkill] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>('en');
  const [saved, setSaved] = useState(false);
  const voice = useVoice();
  // Phone, anonymous: the topic for the coffee-chat request, and whether it was sent.
  const [topic, setTopic] = useState(0);
  const [sent, setSent] = useState(false);

  const ids = useId();
  const storyId = `${ids}-story`;
  const srcId = `${ids}-src`;
  const panelId = `${ids}-proof`;
  const sheetId = `${ids}-sheet`;

  const storyRef = useRef<HTMLElement>(null);
  const underBar = useUnderBar(storyRef);

  // Phone sheet: focus moves in when it opens and back to the chip when it closes.
  const chipRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const pickSkill = (key: string, chip: HTMLButtonElement) => {
    const next = skill === key ? null : key;
    chipRef.current = chip;
    setSkill(next);
    if (next && isPhone()) requestAnimationFrame(() => closeRef.current?.focus({ preventScroll: true }));
  };
  const closeSheet = () => {
    setSkill(null);
    chipRef.current?.focus({ preventScroll: true });
  };

  // Phone, anonymous: focus follows the request into its sent state and back.
  const requestRef = useRef<HTMLButtonElement>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const moved = useRef(false);
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    (sent ? undoRef : requestRef).current?.focus({ preventScroll: true });
  }, [sent]);

  // Keep the last source on the panel while it folds away.
  const lastFn = useRef<number>(1);
  if (fn !== null) lastFn.current = fn;
  const source = data.sources[fn ?? lastFn.current];

  // A footnote opens its source on the panel under the story; the phone numbers its lines in its own order.
  const footnote = (r: Run) => {
    if (!r.fn) return null;
    const key = r.src ?? r.fn;
    return <FootnoteButton n={r.fn} open={fn === key} onToggle={() => setFn(fn === key ? null : key)} controls={srcId} />;
  };

  const toggleStory = () => {
    setStory(!story);
    setFn(null);
  };

  const photo = anonymous ? undefined : data.photo;
  const voiceCopy = anonymous ? undefined : data.voice;
  const startup = anonymous ? data.startup : undefined;
  const openSkill = data.skills.items.find((k) => k.key === skill);

  const quote =
    lang === 'en' ? (
      <blockquote className="hand text-[26px] leading-[1.4]">{data.quote.en}</blockquote>
    ) : (
      <blockquote className="hcn text-[30px] leading-[1.55]" lang="zh-CN">
        {data.quote.zh}
      </blockquote>
    );

  return (
    <div className={cx(s.root, startup ? s.dockedTall : s.docked)}>
      <Ruler />

      {/* Phone bar: the address and Share, or the section under it; startups see where they came from. */}
      <PhoneBar>
        {startup ? (
          <>
            <Link href={routes.contactSheet} className={buttonClass({ variant: 'quiet', size: 'sm', className: '-ml-2' })}>
              ‹ {startup.back}
            </Link>
            <span className="t-xs c2">{startup.frame}</span>
          </>
        ) : (
          <>
            <span className="t-xs c2">{data.address}</span>
            {underBar ? <span className="t-xs c2">{data.story.phoneBar}</span> : <ShareButton />}
          </>
        )}
      </PhoneBar>

      <PublicHeader className="max-sm:hidden">
        <Link href={routes.birth} className={buttonClass({ variant: 'quiet' })}>
          Draw yours
        </Link>
      </PublicHeader>

      {/* Hero, wide */}
      <section className="wrap pt-7 max-sm:hidden">
        <div className="g12 gap-y-4">
          <div className="relative col-[1/span_9] row-[1] flex flex-col items-start self-end max-md:col-[1/span_8]">
            <SectionMark vw={210} d="M2 6 C50 3 120 7 208 4" isNew style={{ top: 6, width: 210 }} />
            <p className={cx(s.nowline, 'hand mt-[22px] text-[20px]')}>
              <Band>{data.now}</Band>
              <DateNote>{data.nowDate}</DateNote>
            </p>
            <p className="lab mt-[22px]">{data.byline}</p>
            <h1 className="t-name mt-3.5">{data.name}</h1>
          </div>

          {photo && voiceCopy ? (
            <figure
              className="col-[10/span_3] row-[1] self-end max-md:col-[9/span_4]"
              aria-label="Photo and voice intro"
            >
              <div className="panel px-2.5 pt-2.5 pb-3">
                <div className={s.photo}>
                  <span className="t-xs c2">{photo.note}</span>
                </div>
                <p className="hand mt-2 pl-0.5 text-[16px]">{photo.caption}</p>
              </div>
              <VoiceButton voice={voiceCopy} state={voice} />
              <figcaption className="t-xs c3 mt-2">Hidden when anonymous, and in startup lists</figcaption>
            </figure>
          ) : data.anon ? (
            <div className="col-[10/span_3] row-[1] self-end max-md:col-[9/span_4]">
              <div className="sunk flex flex-col gap-2 p-[18px]">
                <p className="t-s b">{data.anon.title}</p>
                <p className="t-xs c2">{data.anon.text}</p>
              </div>
            </div>
          ) : null}

          <div className="col-[10/span_3] row-[2] mt-3 flex flex-col gap-1 max-md:col-[9/span_4]">
            <p className="t-s b">{data.openTo.title}</p>
            {data.openTo.lines.map((l) => (
              <p key={l} className="t-s c2">
                {l}
              </p>
            ))}
          </div>

          <div className="col-[1/span_7] row-[2] mt-[18px] flex flex-col gap-6 max-md:col-[1/span_8]">
            <p className="t-h1">{data.headline}</p>
            <figure aria-live="polite" className="flex flex-col gap-2.5">
              {quote}
              <figcaption className="flex flex-wrap items-center gap-3">
                <span className="t-xs c2">{data.quote.caption}</span>
                <Segmented<Lang> label="Language" value={lang} onChange={setLang} options={LANGS} />
              </figcaption>
            </figure>
            <div className="flex flex-wrap gap-2.5">
              <a className={buttonClass()} href="#ask">
                Book a coffee chat
              </a>
              <Link className={buttonClass({ variant: 'secondary' })} href={routes.inbox}>
                Message
              </Link>
              <Button variant="quiet" aria-pressed={saved} onClick={() => setSaved(!saved)}>
                {saved ? 'Saved' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Hero, phone (S02-Mobile phones 1 and 3) */}
      {startup && data.anon ? (
        <section className={cx('wrap', s.phoneHero)}>
          <p className="hand text-[16px]">
            <Band>{data.phoneNow ?? data.now}</Band>
          </p>
          <p className="lab mt-4">{data.phoneLab ?? data.byline}</p>
          <h1 className="t-name mt-2.5 text-[60px]">{data.name}</h1>
          <div className={cx(s.anonbox, 'mt-4')}>
            <p className="t-s b">{data.anon.title}</p>
            <p className="t-xs c2 mt-0.5">{data.anon.phoneText}</p>
          </div>
          <p className="t-h3 mt-[18px]">{data.headline}</p>
          <div className="mt-4">
            <p className="lab">{startup.askLab}</p>
            <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={startup.askLab}>
              {startup.topics.map((t, i) => (
                <Chip
                  key={t.label}
                  size="sm"
                  on={topic === i}
                  aria-pressed={topic === i}
                  onClick={() => {
                    setTopic(i);
                    setSent(false);
                  }}
                >
                  {t.label}
                </Chip>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <p className="lab">{startup.youLab}</p>
            <p className="t-s mt-1.5">{startup.you}</p>
          </div>
          <p className="t-xs c2 mt-3.5">{startup.note}</p>
        </section>
      ) : photo && voiceCopy ? (
        <section className={cx('wrap', s.phoneHero)}>
          <p className="hand text-[16px]">
            <Band>{data.now}</Band>
          </p>
          <p className="hand c3 mt-1 text-[14px]">{data.nowDate}</p>
          <h1 className="t-name mt-3.5 text-[76px]">{data.name}</h1>
          <div className="mt-[18px] flex items-end gap-3">
            <div className={s.mphoto} role="img" aria-label={photo.label}>
              <span className="hand text-[13px] leading-[1.3]">{photo.caption}</span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <p className="t-s b">{data.openTo.title}</p>
              <p className="t-xs c2">{data.openTo.phoneSummary ?? data.openTo.lines.join(' · ')}</p>
              <PhoneVoiceButton voice={voiceCopy} state={voice} />
            </div>
          </div>
          <p className="t-h3 mt-5">{data.headline}</p>
          <div aria-live="polite">
            {lang === 'en' ? (
              <p className="hand mt-3.5 text-[19px] leading-[1.45]">{data.quote.en}</p>
            ) : (
              <p className="hcn mt-3.5 text-[20px] leading-[1.6]" lang="zh-CN">
                {data.quote.zh}
              </p>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="t-xs c2">{data.quote.phoneCaption ?? data.quote.caption}</span>
            <Segmented<Lang> label="Language" value={lang} onChange={setLang} options={LANGS} />
          </div>
        </section>
      ) : null}

      <section className="wrap pt-[88px] pb-16 max-sm:pt-9">
        <div className="g12 items-start gap-y-12">
          <main className="col-[1/span_8] flex flex-col gap-14 max-md:col-[1/-1] max-sm:gap-9">
            <section ref={storyRef} className={cx('relative', s.story)} aria-labelledby="st">
              <SectionMark d="M2 5 C40 7 90 3 148 6" />
              <p className="lab pt-[18px] max-sm:pt-0" id="st">
                <Responsive
                  wide={
                    <>
                      {data.story.lab} <DateNote>{data.story.date}</DateNote>
                    </>
                  }
                  phone="Story"
                />
              </p>
              <p className={cx('t-h2', s.storyHead)}>{data.story.headline}</p>
              <Grow open={story} id={storyId} className={s.storyBody}>
                <div className={cx('gl', s.storyText)}>
                  {data.story.paragraphs.map((runs, i) => (
                    <p key={i} className="ln max-sm:hidden">
                      {runs.map((r) => (
                        <Fragment key={r.text}>
                          {r.text}
                          {footnote(r)}
                        </Fragment>
                      ))}
                    </p>
                  ))}
                  {data.story.phoneRuns.map((r) => (
                    <p key={r.text} className="ln hidden max-sm:block">
                      {r.text}
                      {footnote(r)}
                    </p>
                  ))}
                  <Grow open={fn !== null} id={srcId} live>
                    <div className="panel mt-3.5 px-4 py-3">
                      {source ? (
                        <>
                          <p className="t-xs">
                            <BasisMark kind={source.basis} />
                            {source.meta}
                          </p>
                          {source.quote ? (
                            <p className="t-s mt-1">
                              <Rich text={source.quote} />
                            </p>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </Grow>
                </div>
              </Grow>
              <button
                type="button"
                className={cx('btn btn-q', s.storyToggle)}
                aria-expanded={story}
                aria-controls={storyId}
                onClick={toggleStory}
              >
                <Responsive
                  wide={story ? 'Show less' : data.story.read}
                  phone={story ? 'Fold the story' : 'Read the story'}
                />
              </button>
            </section>

            <GoodAt
              lab={data.skills.lab}
              phoneLab={data.skills.phoneLab}
              mark="M2 6 C50 4 100 6 148 4"
              skills={data.skills.items}
              open={skill}
              onPick={pickSkill}
              variant="panel"
              panelId={panelId}
              sheetId={sheetId}
            />

            <section className="relative" aria-labelledby="ex">
              <SectionHead id="ex" mark="M2 4 C50 6 100 4 148 6">
                Experience · newest on top
              </SectionHead>
              <ExperienceList rows={data.experience} sources={data.sources} defaultOpen="e1" />
            </section>

            <section className="relative" aria-labelledby="wk">
              <SectionHead id="wk" mark="M2 5 C40 3 100 7 148 5">
                Work
              </SectionHead>
              <div className={cx(s.work, 'mt-3')}>
                {data.work.map((w) => {
                  const body = (
                    <>
                      <span className={cx(s.wkImg, w.wall && s.wall)}>
                        <span className="t-xs c2">{w.img}</span>
                      </span>
                      <span className="t-h3 mt-2.5 block">{w.title}</span>
                      <span className="t-s c2">{w.sub}</span>
                    </>
                  );
                  return w.href === 'feed' ? (
                    <Link key={w.title} className={s.wk} href={routes.feed}>
                      {body}
                    </Link>
                  ) : (
                    <a key={w.title} className={s.wk} href="#ex">
                      {body}
                    </a>
                  );
                })}
              </div>
            </section>

            <section className="relative" aria-labelledby="hw">
              <SectionHead id="hw" mark="M2 6 C50 4 100 6 148 5">
                {data.how.lab}
              </SectionHead>
              <div className={cx(s.how, 'mt-3')}>
                {data.how.items.map((it) => (
                  <div key={it.title} className={s.howIt}>
                    <p className="t-h3">{it.title}</p>
                    <p className="t-s c2">{it.text}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="relative" aria-labelledby="lf">
              <SectionHead id="lf" mark="M2 5 C50 6 100 4 148 6">
                Looking for
              </SectionHead>
              <p className="t-h2 mt-2.5 max-w-[34ch] max-sm:text-[22px] max-sm:leading-[1.25]">{data.lookingFor.text}</p>
              <p className="t-s c2 mt-2.5">{data.lookingFor.note}</p>
            </section>
          </main>

          <aside
            className="col-[10/span_3] flex flex-col gap-5 max-lg:col-[9/span_4] max-md:col-[1/-1] max-md:grid max-md:grid-cols-2 max-sm:grid-cols-1"
            aria-label="You and this person"
          >
            {/* On the startup phone these two sit in the first screen already. */}
            <YouCard you={data.you} className={startup ? 'max-sm:hidden' : undefined} />
            <AskCard lab={data.ask.lab} who={data.who} ask={data.ask} className={startup ? 'max-sm:hidden' : undefined} />
            <div className="rb">
              <p className="lab">{data.vouch.lab}</p>
              <p className="hand mt-2.5 text-[18px] leading-[1.45]">{data.vouch.quote}</p>
              <p className="t-xs c2 mt-2">
                <BasisMark kind="ver" />
                {data.vouch.by}
              </p>
            </div>
            <div className="rb">
              <p className="lab">Lately</p>
              <ul className="mt-3 flex flex-col gap-3.5">
                {data.lately.map((l) => (
                  <li key={l.verb}>
                    <p className="t-s">
                      <b>{l.verb}</b> {l.text}
                    </p>
                    <p className="hand c3 text-[14px]">{l.when}</p>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>

      <footer className="wrap flex flex-wrap items-center justify-between gap-3 pt-8 pb-14">
        <p className="t-s">
          Drawn with Portrait ·{' '}
          <Link href={routes.birth} className="b">
            Draw yours
          </Link>
        </p>
        <p className="t-xs c3">Every line links back to where it came from.</p>
      </footer>

      <Dock
        column={!!startup}
        sheet={
          <ProofSheet id={sheetId} skill={openSkill} open={!!openSkill} onClose={closeSheet} closeRef={closeRef} />
        }
      >
        {startup ? (
          sent ? (
            <div className={s.sent}>
              <PencilMark vw={200} d="M2 6 C50 3 120 7 198 4" isNew draw style={{ width: '70%' }} />
              <MarginNote land className="mt-1.5">
                {startup.sent}
              </MarginNote>
              <button
                ref={undoRef}
                type="button"
                className={buttonClass({ variant: 'quiet', size: 'sm', className: 'mt-1' })}
                onClick={() => {
                  moved.current = true;
                  setSent(false);
                }}
              >
                Undo
              </button>
            </div>
          ) : (
            <>
              <button
                ref={requestRef}
                type="button"
                className={buttonClass({ className: 'w-full' })}
                onClick={() => {
                  moved.current = true;
                  setSent(true);
                }}
              >
                Request a coffee chat · {startup.topics[topic]?.short}
              </button>
              <p className="t-xs c2 text-center">{startup.uses}</p>
            </>
          )
        ) : (
          <>
            <a className={buttonClass()} href="#ask">
              Book a coffee chat
            </a>
            <Link className={buttonClass({ variant: 'secondary', className: s.fixed })} href={routes.inbox}>
              Message
            </Link>
          </>
        )}
      </Dock>
    </div>
  );
}
