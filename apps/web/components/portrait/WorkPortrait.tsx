'use client';

import Link from 'next/link';
import { useRef, useState, type KeyboardEvent } from 'react';
import {
  Band,
  BasisMark,
  DateNote,
  Grow,
  Ruler,
  SectionMark,
  Tally,
  buttonClass,
  cx,
  withViewTransition,
} from '@portrait/ui';
import { PublicHeader } from '@/components/chrome';
import { routes } from '@/lib/routes';
import type { WorkPortraitData } from '@/lib/data/portraits';
import { Dock, PhoneBar, ProofSheet, ShareButton, isPhone } from './phone';
import { AskCard, ExperienceList, GoodAt, SectionHead, YouCard } from './sections';
import { PhoneVoiceButton, VoiceButton, useVoice } from './voice';
import s from './portrait.module.css';
import w from './work.module.css';

/** Line drawings in the tile placeholders, as on the board. */
function TileArt({ kind }: { kind: string }) {
  if (kind === 'k')
    return (
      <svg viewBox="0 0 240 160" aria-hidden="true">
        <rect x="60" y="6" width="120" height="148" rx="6" />
        <rect x="74" y="22" width="92" height="12" rx="2" className={w.f} />
        <rect x="74" y="44" width="42" height="36" rx="4" />
        <rect x="124" y="44" width="42" height="36" rx="4" />
        <rect x="74" y="88" width="42" height="36" rx="4" />
        <rect x="124" y="88" width="42" height="36" rx="4" />
        <path d="M88 138 L152 138" />
      </svg>
    );
  if (kind === 'l')
    return (
      <svg viewBox="0 0 160 100" aria-hidden="true">
        <rect x="52" y="4" width="56" height="92" rx="8" />
        <path d="M62 22 L98 22 M62 34 L90 34" />
        <rect x="62" y="46" width="36" height="20" rx="3" />
        <path d="M62 78 L98 78" />
      </svg>
    );
  return (
    <svg viewBox="0 0 160 100" aria-hidden="true">
      <path d="M20 20 L140 20 M20 40 L120 40 M20 60 L134 60 M20 80 L96 80" />
      <circle cx="128" cy="80" r="8" />
    </svg>
  );
}

const TILE_PLACE: Record<string, string> = { k: w.feat!, l: cx(w.sm, w.second), f: cx(w.sm, w.third) };

/**
 * V2-S02-Portrait-Maya — work first. Each tile opens into its case in place; the kiosk's
 * six rounds of testing are six marks, and picking one tells what changed in it.
 * Phones get the same chrome as S02-Mobile: sticky bar, dock and proof sheet.
 */
export function WorkPortrait({ data }: { data: WorkPortraitData }) {
  const [work, setWork] = useState<string>('k');
  const [round, setRound] = useState(6);
  const [skill, setSkill] = useState<string | null>(null);
  const voice = useVoice();

  const caseId = 'case';
  const panelId = 'pf-proof';
  const sheetId = 'pf-sheet';

  const tileRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const roundRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const chipRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const openTile = (key: string) =>
    withViewTransition(() => {
      setWork(work === key ? '' : key);
      if (key === 'k') setRound(6);
    });
  const fold = () => {
    const from = work;
    withViewTransition(() => setWork(''));
    tileRefs.current[from]?.focus({ preventScroll: true });
  };

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

  const onRoundKey = (e: KeyboardEvent, i: number) => {
    const n = data.work.kiosk.rounds.length;
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (i + delta + n) % n;
    setRound(next + 1);
    roundRefs.current[next]?.focus();
  };

  const photo = data.photo!;
  const voiceCopy = data.voice!;
  const kiosk = data.work.kiosk;
  const r = kiosk.rounds[round - 1]!;
  const short = data.work.short[work];
  const openSkill = data.skills.items.find((k) => k.key === skill);

  return (
    <div className={cx(s.root, s.docked, w.root)}>
      <Ruler />

      <PhoneBar>
        <span className="t-xs c2">{data.address}</span>
        <ShareButton />
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
          <div className="col-[10/span_3] row-[2] mt-3 flex flex-col gap-1 max-md:col-[9/span_4]">
            <p className="t-s b">{data.openTo.title}</p>
            {data.openTo.lines.map((l) => (
              <p key={l} className="t-s c2">
                {l}
              </p>
            ))}
          </div>
          <div className="col-[1/span_7] row-[2] mt-[18px] flex flex-col gap-[22px] max-md:col-[1/span_8]">
            <p className="t-h2 max-w-[30ch]">{data.headline}</p>
            <div>
              <p className="hand max-w-[34ch] text-[22px] leading-[1.45]">{data.quote.text}</p>
              <p className="t-xs c2 mt-1.5">{data.quote.caption}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a className={buttonClass()} href="#ask">
                Book a coffee chat
              </a>
              <Link className={buttonClass({ variant: 'secondary' })} href={routes.inbox}>
                Message
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Hero, phone: the first screen of S02-Mobile, with Maya's portrait */}
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
        <p className="hand mt-3.5 text-[19px] leading-[1.45]">{data.quote.text}</p>
        <p className="t-xs c2 mt-2">{data.quote.caption}</p>
      </section>

      {/* Work · start here */}
      <section className="wrap relative pt-[72px] max-sm:pt-9" aria-labelledby="wk">
        <SectionMark d="M2 5 C40 7 90 3 148 6" />
        <p className="lab pt-[18px] max-sm:pt-0" id="wk">
          {data.work.lab} <DateNote>{data.work.date}</DateNote>
        </p>
        <div className={cx(w.tiles, 'mt-4')}>
          {data.work.tiles.map((t) => (
            <button
              key={t.key}
              ref={(el) => {
                tileRefs.current[t.key] = el;
              }}
              type="button"
              className={cx(w.tile, TILE_PLACE[t.key], work === t.key && w.on)}
              aria-expanded={work === t.key}
              aria-controls={caseId}
              onClick={() => openTile(t.key)}
            >
              <span className={w.img}>
                <TileArt kind={t.key} />
                <span className="t-xs c2">{t.cap}</span>
              </span>
              {t.key === 'k' ? (
                <>
                  <span className="t-h3">{t.title}</span>
                  <span className="t-s c2">{t.sub}</span>
                  <span className="t-xs flex items-center gap-2">
                    <Tally n={t.proofs ?? 1} />
                    {t.meta}
                  </span>
                </>
              ) : (
                <>
                  <span className="t-s b">{t.title}</span>
                  <span className="t-xs c2">{t.sub}</span>
                </>
              )}
            </button>
          ))}
          <div className={cx('sunk', w.more)}>
            <p className="t-s b">{data.work.more.title}</p>
            <p className="t-xs c2">{data.work.more.text}</p>
          </div>
        </div>

        <Grow open={!!work} id={caseId}>
          {work === 'k' ? (
              <div className={cx(w.casebox, w.open, 'mt-6')} aria-live="polite">
                <div className="flex flex-wrap items-baseline justify-between gap-4">
                  <p className="lab">
                    {kiosk.lab} <DateNote>{kiosk.date}</DateNote>
                  </p>
                  <button type="button" className={buttonClass({ variant: 'quiet', size: 'sm' })} onClick={fold}>
                    Fold
                  </button>
                </div>
                <div className="g12 mt-2.5 gap-y-5">
                  <div className="col-[1/span_8] max-md:col-[1/-1]">
                    <p className="t-h2 max-w-[30ch]">{kiosk.headline}</p>
                    <div className={w.rounds} role="group" aria-label="Six rounds of testing">
                      {kiosk.rounds.map((x, i) => (
                        <button
                          key={x.n}
                          ref={(el) => {
                            roundRefs.current[i] = el;
                          }}
                          type="button"
                          className={cx(w.rd, round === x.n && w.on)}
                          aria-pressed={round === x.n}
                          onClick={() => setRound(x.n)}
                          onKeyDown={(e) => onRoundKey(e, i)}
                        >
                          <svg viewBox="0 0 14 60" style={{ height: 60 }} aria-hidden="true">
                            <path pathLength={1} d={`M7 60 L7 ${x.y}`} />
                          </svg>
                          <span className={w.rn}>R{x.n}</span>
                          <span className={w.dt}>{x.date}</span>
                        </button>
                      ))}
                    </div>
                    <div className={w.base} aria-hidden="true" />
                    <div className="gl on mt-[18px] min-h-16">
                      {/* Keyed by round so each pick lands like a new note. */}
                      <p key={r.n} className="t-body land max-w-[56ch]">
                        {r.text}
                      </p>
                      <p className="t-xs c2 mt-1.5">
                        <BasisMark kind={r.basis} />
                        Round {r.n} · {r.src}
                      </p>
                    </div>
                  </div>
                  <div className="col-[9/span_4] flex flex-col gap-3.5 max-md:col-[1/-1]">
                    <div>
                      <p className="lab">{kiosk.didLab}</p>
                      {kiosk.did.map((d) => (
                        <p key={d} className="t-s mt-1.5">
                          {d}
                        </p>
                      ))}
                    </div>
                    <div className="sunk px-4 py-3.5">
                      <p className="hand text-[17px] leading-[1.45]">{kiosk.vouch}</p>
                      <p className="t-xs c2 mt-1.5">
                        <BasisMark kind="ver" />
                        {kiosk.vouchBy}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : short ? (
              <div className={cx(w.casebox, 'mt-6')}>
                <div className="flex items-baseline justify-between gap-4">
                  <p className="lab">{short.lab}</p>
                  <button type="button" className={buttonClass({ variant: 'quiet', size: 'sm' })} onClick={fold}>
                    Fold
                  </button>
                </div>
                <p className="t-h3 mt-2.5">{short.line}</p>
                <p className="t-s c2 mt-2">{data.work.shortNote}</p>
              </div>
            ) : null}
        </Grow>
      </section>

      <section className="wrap pt-20 pb-16 max-sm:pt-9">
        <div className="g12 gap-y-12">
          <main className="col-[1/span_8] flex flex-col gap-14 max-md:col-[1/-1] max-sm:gap-9">
            <GoodAt
              lab={data.skills.lab}
              phoneLab={data.skills.phoneLab}
              mark="M2 6 C50 4 100 7 148 4"
              skills={data.skills.items}
              open={skill}
              onPick={pickSkill}
              variant="lines"
              panelId={panelId}
              sheetId={sheetId}
            />

            <section className="relative" aria-labelledby="ex">
              <SectionHead id="ex" mark="M2 4 C50 6 100 4 148 6">
                Experience · newest on top
              </SectionHead>
              <ExperienceList rows={data.experience} />
            </section>

            <section className="relative" aria-labelledby="hw">
              <SectionHead id="hw" mark="M2 6 C40 3 100 7 148 5">
                {data.how.lab}
              </SectionHead>
              <div className={cx(s.how, 'mt-3.5')}>
                {data.how.items.map((it) => (
                  <div key={it.title} className={s.howIt}>
                    <p className="t-h3">{it.title}</p>
                    <p className="t-s c2">{it.text}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="relative" aria-labelledby="lf">
              <SectionHead id="lf" mark="M2 5 C50 7 100 3 148 5">
                Looking for
              </SectionHead>
              <p className="t-h3 mt-2.5 max-w-[40ch]">{data.lookingFor}</p>
            </section>
          </main>

          <aside
            className="col-[10/span_3] flex flex-col gap-5 max-lg:col-[9/span_4] max-md:col-[1/-1] max-md:grid max-md:grid-cols-2 max-sm:grid-cols-1"
            aria-label="You and this person"
          >
            <YouCard you={data.you} />
            <AskCard lab={data.ask.lab} who={data.who} ask={data.ask} />
            <div className="rb">
              <p className="lab">Lately</p>
              <div className="mt-2.5 flex flex-col gap-3">
                {data.lately.map((l) => (
                  <div key={l.verb}>
                    <p className="t-s">
                      <b>{l.verb}</b> {l.text}
                    </p>
                    <p className="t-xs c2">{l.when}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      <footer className="wrap pb-12">
        <p className="t-xs c2">
          Drawn with Portrait · <Link href={routes.birth}>Draw yours</Link> · Every line links back to where it came
          from.
        </p>
      </footer>

      <Dock
        sheet={
          <ProofSheet id={sheetId} skill={openSkill} open={!!openSkill} onClose={closeSheet} closeRef={closeRef} />
        }
      >
        <a className={buttonClass()} href="#ask">
          Book a coffee chat
        </a>
        <Link className={buttonClass({ variant: 'secondary', className: s.fixed })} href={routes.inbox}>
          Message
        </Link>
      </Dock>
    </div>
  );
}
