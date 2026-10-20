import type { CSSProperties, ReactNode } from 'react';
import { cx } from '../cx';

type Styled = { className?: string; style?: CSSProperties };

/** The doorframe ruler down the left edge. Its parent must be position: relative. */
export function Ruler({ className, style }: Styled) {
  return <span className={cx('ruler', className)} style={style} aria-hidden="true" />;
}

export type PencilMarkProps = Styled & {
  /** viewBox width; the mark stretches to its CSS width (preserveAspectRatio none). */
  vw?: number;
  /** Hand-drawn path. Defaults to a gentle line across `vw`. */
  d?: string;
  /** `new` marks use --new (ink in light, chalk in dark). */
  isNew?: boolean;
  /** Draw the line on mount (380 ms); `late` waits 520 ms first. */
  draw?: boolean;
  late?: boolean;
  /** Dashed pencil, e.g. a mark that is not confirmed yet. */
  dash?: string;
};

export function pencilPath(vw: number): string {
  return `M2 6 C${Math.round(vw * 0.25)} 3 ${Math.round(vw * 0.6)} 7 ${vw - 2} 4`;
}

/** A pencil height mark: `svg.mark`. */
export function PencilMark({ vw = 150, d, isNew, draw, late, dash, className, style }: PencilMarkProps) {
  return (
    <svg
      className={cx('mark', isNew && 'new', draw && 'draw', late && 'late', className)}
      viewBox={`0 0 ${vw} 10`}
      preserveAspectRatio="none"
      style={style}
      aria-hidden="true"
    >
      <path pathLength={draw ? 1 : undefined} d={d ?? pencilPath(vw)} strokeDasharray={dash} />
    </svg>
  );
}

/** A section's height mark hanging off the ruler: `.smark` holding a PencilMark. */
export function SectionMark({ className, style, ...mark }: PencilMarkProps) {
  return (
    <div className={cx('smark', className)} style={style}>
      <PencilMark {...mark} />
    </div>
  );
}

const TALLY: Record<number, { vw: number; d: string }> = {
  1: { vw: 8, d: 'M3 2 L3 14' },
  2: { vw: 14, d: 'M3 2 L3 14 M9 2 L9 14' },
  3: { vw: 20, d: 'M3 2 L3 14 M9 2 L9 14 M15 2 L15 14' },
  4: { vw: 26, d: 'M3 2 L3 14 M9 2 L9 14 M15 2 L15 14 M21 2 L21 14' },
  5: { vw: 26, d: 'M3 2 L3 14 M8 2 L8 14 M13 2 L13 14 M18 2 L18 14 M1 12 L22 4' },
};

export type TallyProps = Styled & {
  /** Number of proofs, 1–5. Each line is one proof; five is a gate. */
  n: number;
  /** Accessible label; defaults to "n proofs". Pass `null` when the count is said nearby. */
  label?: string | null;
};

/** Tally marks: one line per proof. */
export function Tally({ n, label, className, style }: TallyProps) {
  const t = TALLY[Math.max(1, Math.min(5, Math.round(n)))] ?? TALLY[1]!;
  const text = label === undefined ? `${n} ${n === 1 ? 'proof' : 'proofs'}` : label;
  return (
    <svg
      className={cx('tally', className)}
      viewBox={`0 0 ${t.vw} 16`}
      style={{ width: t.vw, ...style }}
      role={text ? 'img' : undefined}
      aria-label={text ?? undefined}
      aria-hidden={text ? undefined : true}
    >
      <path d={t.d} />
    </svg>
  );
}

/** Pencil tick: `svg.tick`. */
export function Tick({ d = 'M2 8 L7 12 L16 2', className, style }: Styled & { d?: string }) {
  return (
    <svg className={cx('tick', className)} viewBox="0 0 18 14" style={style} aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/** The short pencil stroke in receipts and status lines. Dashed = waiting for a yes. */
export function Stroke({ dashed, className, style }: Styled & { dashed?: boolean }) {
  return (
    <svg className={cx('stroke', className)} viewBox="0 0 22 10" style={style} aria-hidden="true">
      <path d="M2 6 C8 4 14 6 20 4" strokeDasharray={dashed ? '3 4' : undefined} />
    </svg>
  );
}

/** Pencil square brackets around a selected block (`.br.l` + `.br.r`). */
export function Brackets() {
  return (
    <>
      <svg className="br l" viewBox="0 0 12 100" preserveAspectRatio="none" aria-hidden="true">
        <path d="M10 2 L3 3 L3 97 L10 98" />
      </svg>
      <svg className="br r" viewBox="0 0 12 100" preserveAspectRatio="none" aria-hidden="true">
        <path d="M2 2 L9 3 L9 97 L2 98" />
      </svg>
    </>
  );
}

/** The six dots inside a `.grip` handle. */
export function GripDots() {
  return (
    <>
      <i />
      <i />
      <i />
      <i />
      <i />
      <i />
    </>
  );
}

/** Waveform for the 15-second voice intro; animates inside a `.playing` parent. */
export function Wave({ className }: { className?: string }) {
  return (
    <span className={cx('wave', className)} aria-hidden="true">
      <GripDots />
    </span>
  );
}

/** Keyboard key, e.g. ⌘J. Inherits colour. */
export function Kbd({ children, className, style }: Styled & { children: ReactNode }) {
  return (
    <span className={cx('kbd', className)} style={style}>
      {children}
    </span>
  );
}
