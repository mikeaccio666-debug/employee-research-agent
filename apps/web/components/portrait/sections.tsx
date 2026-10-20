'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  Band,
  BasisMark,
  Chip,
  ExpandRow,
  FootnoteButton,
  Grow,
  PencilMark,
  SectionMark,
  Slot,
  SourceCard,
  Tally,
  Tick,
  buttonClass,
  cx,
} from '@portrait/ui';
import type { Ask, ExpLine, ExperienceRow, Skill, Source } from '@/lib/data/portraits';
import { Rich } from './Rich';
import s from './portrait.module.css';

/** A section's pencil mark on the ruler and its label. Phones drop the ruler, and the label's room for it. */
export function SectionHead({ id, mark, children }: { id: string; mark: string; children: ReactNode }) {
  return (
    <>
      <SectionMark d={mark} />
      <p className="lab pt-[18px] max-sm:pt-0" id={id}>
        {children}
      </p>
    </>
  );
}

/** Copy that the phone board words differently: one is shown per breakpoint. */
export function Responsive({ wide, phone }: { wide: ReactNode; phone: ReactNode }) {
  return (
    <>
      <span className="max-sm:hidden">{wide}</span>
      <span className="hidden max-sm:inline">{phone}</span>
    </>
  );
}

/**
 * "Good at": chips whose tally is the number of proofs. On wide screens the proofs grow
 * in place under the chips; on phones the page raises a sheet instead (see ProofSheet).
 */
export function GoodAt({
  lab,
  phoneLab,
  mark,
  skills,
  open,
  onPick,
  variant,
  panelId,
  sheetId,
}: {
  lab: string;
  phoneLab: string;
  mark: string;
  skills: Skill[];
  open: string | null;
  onPick: (key: string, chip: HTMLButtonElement) => void;
  /** S02 lists proofs on a panel; S02-Maya writes them as lines on the pencil rule. */
  variant: 'panel' | 'lines';
  panelId: string;
  sheetId: string;
}) {
  const last = useRef<Skill | undefined>(undefined);
  const current = skills.find((k) => k.key === open);
  if (current) last.current = current;
  const shown = current ?? last.current;

  return (
    <section className="relative" aria-labelledby="pf">
      <SectionHead id="pf" mark={mark}>
        <Responsive wide={lab} phone={phoneLab} />
      </SectionHead>
      <div className={s.chips}>
        {skills.map((k) => (
          <Chip
            key={k.key}
            on={open === k.key}
            aria-expanded={open === k.key}
            aria-controls={`${panelId} ${sheetId}`}
            onClick={(e) => onPick(k.key, e.currentTarget)}
          >
            {k.label} <Tally n={k.proofs} />
          </Chip>
        ))}
      </div>
      <Grow open={!!current} id={panelId} live className="max-sm:hidden">
        {variant === 'panel' ? (
          <div className="panel gl mt-3.5 py-[18px] pr-[22px] pl-[30px]">
            <ul className="flex flex-col gap-3">
              {shown?.proof.map((p) => (
                <li key={p.text} className="ln t-s">
                  <BasisMark kind={p.basis} />
                  <Rich text={p.text} /> <span className="c2">{p.meta}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="gl mt-4 flex flex-col gap-2.5">
            {shown?.proof.map((p) => (
              <p key={p.text} className="ln t-s">
                <Rich text={p.text} />{' '}
                <span className="t-xs c2">
                  <BasisMark kind={p.basis} />
                  {p.meta}
                </span>
              </p>
            ))}
          </div>
        )}
      </Grow>
    </section>
  );
}

/** One "Context / Decision / Result" line; a footnote grows its source underneath. */
function ExperienceLine({ line, source }: { line: ExpLine; source?: Source }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="ln">
      <p className="t-s">
        <b>{line.label}</b> · {line.text}
        {line.fn && source ? (
          <FootnoteButton n={line.fn} open={open} onToggle={() => setOpen((v) => !v)} controls={id} />
        ) : null}
      </p>
      {line.fn && source ? (
        <Grow open={open} id={id} live>
          <SourceCard basis={source.basis} meta={source.meta} style={{ marginTop: 8 }}>
            {source.quote ? <Rich text={source.quote} /> : null}
          </SourceCard>
        </Grow>
      ) : null}
    </div>
  );
}

/** Experience · newest on top: one row open at a time; + turns to ×. */
export function ExperienceList({
  rows,
  sources = {},
  defaultOpen = null,
}: {
  rows: ExperienceRow[];
  sources?: Record<number, Source>;
  defaultOpen?: string | null;
}) {
  const [open, setOpen] = useState<string | null>(defaultOpen);
  return (
    <div className={s.xlist}>
      {rows.map((r) => (
        <ExpandRow
          key={r.key}
          years={r.years}
          title={r.title}
          summary={r.summary}
          proofs={r.proofs}
          open={open === r.key}
          onOpenChange={(next) => setOpen(next ? r.key : null)}
        >
          <div className="gl flex flex-col gap-2.5">
            {r.lines.map((l) => (
              <ExperienceLine key={l.label} line={l} source={l.fn ? sources[l.fn] : undefined} />
            ))}
          </div>
          <div className={cx('ln', r.tags && 'flex flex-col gap-2')}>
            <p className="t-xs">
              <BasisMark kind={r.basis} />
              {r.basisText}
            </p>
            {r.tags ? <p className="t-xs c2">{r.tags}</p> : null}
          </div>
        </ExpandRow>
      ))}
    </div>
  );
}

const TICKS = ['M2 8 L7 12 L16 2', 'M2 7 L7 12 L16 3', 'M2 8 L7 11 L16 2'];

/** "You & {who}": what the viewer has in common with the person, ticked in pencil. */
export function YouCard({
  you,
  className,
}: {
  you: { lab: string; items: string[]; viewing: string };
  className?: string;
}) {
  return (
    <div className={cx('rb', className)}>
      <p className="lab">{you.lab}</p>
      <ul className="mt-3 flex flex-col gap-2.5">
        {you.items.map((item, i) => (
          <li key={item} className="t-s flex gap-2.5">
            <Tick d={TICKS[i % TICKS.length]} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <p className="t-xs c3 mt-3">{you.viewing}</p>
    </div>
  );
}

/**
 * "Ask {who} about": pick a topic, the open times grow underneath; book one and a pencil
 * mark is drawn with the date in gold chalk.
 */
export function AskCard({ lab, who, ask, className }: { lab: string; who: string; ask: Ask; className?: string }) {
  const [topic, setTopic] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(ask.defaultSlot ?? null);
  const [booked, setBooked] = useState(false);
  const growId = useId();
  const bookRef = useRef<HTMLButtonElement>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const focusNext = useRef<'book' | 'undo' | null>(null);

  // Keep the last topic's words while the times fold away.
  const lastTopic = useRef(ask.topics[0]!);
  const t = ask.topics.find((x) => x.key === topic);
  if (t) lastTopic.current = t;
  const about = (t ?? lastTopic.current).about;
  const picked = ask.slots.find((x) => x.key === slot);

  useEffect(() => {
    if (focusNext.current === 'undo') undoRef.current?.focus();
    if (focusNext.current === 'book') bookRef.current?.focus();
    focusNext.current = null;
  }, [booked]);

  const pickTopic = (key: string) => {
    setTopic(topic === key && !booked ? null : key);
    setBooked(false);
  };
  const pickSlot = (key: string) => setSlot(ask.slotToggles && slot === key ? null : key);
  const book = () => {
    if (!picked) return;
    focusNext.current = 'undo';
    setBooked(true);
  };
  const undo = () => {
    focusNext.current = 'book';
    setBooked(false);
  };

  return (
    <div className={cx('rb', s.ask, className)} id="ask">
      <p className="lab">{lab}</p>
      <div className="mt-3 flex flex-col items-start gap-2">
        {ask.topics.map((x) => (
          <Chip
            key={x.key}
            on={topic === x.key}
            aria-expanded={topic === x.key}
            aria-controls={growId}
            onClick={() => pickTopic(x.key)}
          >
            {x.label}
          </Chip>
        ))}
      </div>
      <Grow open={!!topic} id={growId} live>
        {booked && picked ? (
          <div className="pt-4">
            <PencilMark vw={200} d="M2 6 C50 3 120 7 198 4" isNew draw style={{ width: '80%' }} />
            <div className="land">
              <p className="hand mt-1.5 text-[18px]">
                <Band>
                  {picked.short} · coffee with {who}
                </Band>
              </p>
              <p className="t-s c2 mt-2">
                About {about}. {ask.bookedNote}
              </p>
              <button
                ref={undoRef}
                type="button"
                className={buttonClass({ variant: 'quiet', className: 'mt-2 -ml-2' })}
                onClick={undo}
              >
                Undo
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-4">
            <p className="ln t-s b">Coffee chat · 20 min</p>
            <p className="ln t-xs c2 mt-0.5">Open times, in your time (PT)</p>
            <div className="ln mt-2.5 flex flex-wrap gap-2">
              {ask.slots.map((x) => (
                <Slot key={x.key} on={slot === x.key} onClick={() => pickSlot(x.key)}>
                  {x.label}
                </Slot>
              ))}
            </div>
            <button
              ref={bookRef}
              type="button"
              className={buttonClass({ className: 'ln mt-3.5 w-full' })}
              aria-disabled={!picked || undefined}
              onClick={book}
            >
              {picked ? `Book ${picked.label}` : 'Pick a time'}
            </button>
          </div>
        )}
      </Grow>
    </div>
  );
}
