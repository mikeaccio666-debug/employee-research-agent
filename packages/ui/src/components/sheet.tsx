import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx';

export type MustMark = 'y' | 'h' | 'n';

/** Must-have boxes: filled = met, half = partly, empty = not yet. */
export function MustHaves({ marks, className, label }: { marks: MustMark[]; className?: string; label?: string }) {
  return (
    <span className={cx('must', className)} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {marks.map((m, i) => (
        <i key={i} className={m === 'n' ? undefined : m} />
      ))}
    </span>
  );
}

/** Counts met must-haves the way the contact sheet writes them: "2½ of 4". */
export function mustCount(marks: MustMark[]): string {
  const full = marks.filter((m) => m === 'y').length;
  const half = marks.some((m) => m === 'h');
  return `${full}${half ? '½' : ''} of ${marks.length}`;
}

export type FrameProps = HTMLAttributes<HTMLDivElement> & {
  /** Hand-drawn circle around the frame (shortlisted). */
  circled?: boolean;
  /** Struck through and faded (not this time). */
  struck?: boolean;
  /** Open: ink outline; reasons grow inside. */
  open?: boolean;
  /** Draw the circle or strike on appear. */
  draw?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
};

const RING =
  'M30 5 C80 -2 150 -2 188 6 C202 10 204 32 203 60 C202 92 200 112 186 116 C130 124 70 124 16 116 C2 112 -2 90 -2 60 C-2 30 0 12 14 6 C20 4 26 4 34 7';

/** A contact-sheet frame (`.frm`): circle to shortlist, strike to pass. */
export function Frame({ circled, struck, open, draw, className, style, children, ...rest }: FrameProps) {
  return (
    <div
      className={cx('frm', struck && 'struck', className)}
      style={open ? { boxShadow: 'inset 0 0 0 2px var(--ink)', ...style } : style}
      {...rest}
    >
      {circled ? (
        <svg className={cx('ring', draw && 'draw')} viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden="true">
          <path pathLength={draw ? 1 : undefined} d={RING} />
        </svg>
      ) : null}
      {struck ? (
        <svg className={cx('strike', draw && 'draw')} viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true">
          <path pathLength={draw ? 1 : undefined} d="M2 12 C30 8 60 13 98 7" />
        </svg>
      ) : null}
      {children}
    </div>
  );
}
