import type { ReactNode } from 'react';
import { Band, PencilMark, Ruler, Tally, cx } from '@portrait/ui';
import { shareCards } from '@/lib/data/portraits';
import { CardFrame } from './CardFrame';
import c from './cards.module.css';

/** A pencil mark on the card's doorframe with its date underneath. */
function CardMark({ top, date, isNew }: { top: number; date: string; isNew?: boolean }) {
  return (
    <div className={c.cm} style={{ top }}>
      <PencilMark vw={120} d={isNew ? 'M2 6 C40 3 80 7 118 4' : 'M2 5 C40 7 80 3 118 6'} isNew={isNew} />
      <span className={c.d}>{date}</span>
    </div>
  );
}

function Shown({ n, caption, children }: { n: number; caption: string; children: ReactNode }) {
  return (
    <figure className="flex flex-col gap-3.5">
      <CardFrame>{children}</CardFrame>
      <figcaption className={c.cap} lang="zh-CN">
        <span className="hand b">{n}</span> {caption}
      </figcaption>
    </figure>
  );
}

/**
 * V2-S02-Share-Cards. Each card keeps its own theme whatever the page's: the named and the
 * work card are drawn in 晨 light, the anonymous card in 夜 dark.
 */
export function ShareCards() {
  const { named, anonymous, work } = shareCards;
  return (
    <main className={c.page}>
      <h1 className="sr">Share cards</h1>

      <Shown n={1} caption={named.caption}>
        <div role="group" aria-label={named.label} className={cx('pv light', c.card)}>
          <Ruler />
          {named.marks.map((m) => (
            <CardMark key={m.date} top={m.top} date={m.date} isNew={m.isNew} />
          ))}
          <div className={c.top}>
            <span className={c.wm}>Portrait</span>
            <span className={c.url}>{named.url}</span>
          </div>
          <div className="mt-[34px] flex items-end justify-between gap-10">
            <div className="min-w-0">
              <p className="hand text-[26px]">
                <Band>{named.now}</Band>
              </p>
              <p className={cx(c.big, 'mt-[26px]')}>{named.name}</p>
            </div>
            <div className={c.ph}>
              <span className="t-xs c2">{named.photo}</span>
            </div>
          </div>
          <p className="mt-[30px] max-w-[26ch] text-[36px] leading-[1.18] font-[700]">{named.line}</p>
          <div className="mt-auto flex gap-2.5">
            {named.pills.map((p) => (
              <span key={p.label} className={c.pr}>
                {p.label}
                {'proofs' in p && p.proofs ? (
                  <Tally n={p.proofs} style={{ width: p.proofs === 3 ? 24 : 17 }} />
                ) : null}
              </span>
            ))}
          </div>
        </div>
      </Shown>

      <Shown n={2} caption={anonymous.caption}>
        <div role="group" aria-label={anonymous.label} className={cx('pv dark', c.card)}>
          <Ruler />
          <CardMark top={anonymous.mark.top} date={anonymous.mark.date} isNew />
          <div className={c.top}>
            <span className={c.wm}>Portrait</span>
            <span className={c.url}>{anonymous.url}</span>
          </div>
          <p className="lab mt-10 text-[18px]">{anonymous.lab}</p>
          <p className={cx(c.big, 'mt-[18px] text-[132px]')}>{anonymous.name}</p>
          <p className="mt-[34px] max-w-[24ch] text-[40px] leading-[1.16] font-[700]">{anonymous.line}</p>
          <div className="mt-auto flex items-end justify-between gap-6">
            <p className="num text-[30px] font-[800]">
              {anonymous.stat}{' '}
              <span className="hand ml-2 text-[20px] font-[500] text-chalk">{anonymous.statNote}</span>
            </p>
            <p className="t-s c2 text-right">
              {anonymous.side[0]}
              <br />
              {anonymous.side[1]}
            </p>
          </div>
        </div>
      </Shown>

      <Shown n={3} caption={work.caption}>
        <div role="group" aria-label={work.label} className={cx('pv light', c.card, c.work)}>
          <Ruler />
          <CardMark top={work.mark.top} date={work.mark.date} isNew />
          <div className={c.top}>
            <span className={c.wm}>Portrait</span>
            <span className={c.url}>{work.url}</span>
          </div>
          <div className="mt-[30px] grid min-h-0 flex-1 grid-cols-[400px_minmax(0,1fr)] gap-12">
            <div className={c.kiosk}>
              <svg viewBox="0 0 240 300" style={{ width: 240, height: 300 }} aria-hidden="true">
                <rect x="40" y="8" width="160" height="284" rx="8" />
                <rect x="60" y="32" width="120" height="16" rx="3" className={c.f} />
                <rect x="60" y="66" width="54" height="54" rx="6" />
                <rect x="126" y="66" width="54" height="54" rx="6" />
                <rect x="60" y="132" width="54" height="54" rx="6" />
                <rect x="126" y="132" width="54" height="54" rx="6" />
                <path d="M74 214 L166 214 M90 236 L150 236" />
              </svg>
            </div>
            <div className="flex min-w-0 flex-col">
              <p className="lab text-[18px]">{work.lab}</p>
              <p className="mt-4 text-[64px] leading-[1] font-[800] tracking-[-0.035em]">{work.headline}</p>
              <div className={cx(c.rt, 'mt-[34px]')} role="img" aria-label="Six rounds of testing">
                {work.rounds.map((h, i) => (
                  <span key={h}>
                    <i style={{ height: h }} className={i === work.rounds.length - 1 ? c.me : undefined} />R{i + 1}
                  </span>
                ))}
              </div>
              <div className="mt-auto">
                <p className="text-[34px] font-[800] tracking-[-0.03em]">{work.name}</p>
                <p className="t-s c2 mt-0.5">{work.sub}</p>
              </div>
            </div>
          </div>
        </div>
      </Shown>
    </main>
  );
}
