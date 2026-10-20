import type { CSSProperties, ElementType, ReactNode } from 'react';
import { cx } from '../cx';

type Base = { className?: string; style?: CSSProperties; children?: ReactNode };

/** Gold chalk highlight. `sweep` paints it left to right (words that just changed). */
export function Band({ sweep, className, style, children }: Base & { sweep?: boolean }) {
  return (
    <span className={cx('band', sweep && 'sweep', className)} style={style}>
      {children}
    </span>
  );
}

/** Inferred text waiting for the person to confirm: dashed underline while `pending`. */
export function Pending({ pending = true, className, style, children }: Base & { pending?: boolean }) {
  return (
    <span className={cx(pending && 'pend', className)} style={style}>
      {children}
    </span>
  );
}

export type Basis = 'shown' | 'said' | 'inf' | 'ver';

export const BASIS_LABEL: Record<Basis, string> = {
  shown: 'Shown',
  said: 'Said',
  inf: 'Inferred',
  ver: 'Verified',
};

/** Basis marker: filled = shown, ring = said, dashed = inferred, tick = verified. */
export function BasisMark({ kind, label, className }: { kind: Basis; label?: string; className?: string }) {
  return (
    <>
      <span className={cx('bm', kind, className)} aria-hidden="true" />
      {label !== undefined ? <span className="sr">{label || BASIS_LABEL[kind]}: </span> : null}
    </>
  );
}

/** Handwritten date after a label: "updated Oct 17". */
export function DateNote({ className, style, children }: Base) {
  return (
    <span className={cx('date', className)} style={style}>
      {children}
    </span>
  );
}

/**
 * Handwritten margin note that replaces toasts ("Oct 19 · added from your message · undo").
 * `land` drops it in after the change settles.
 */
export function MarginNote({
  as: Tag = 'p',
  land,
  className,
  style,
  children,
}: Base & { as?: ElementType; land?: boolean }) {
  return (
    <Tag className={cx('note', land && 'land', className)} style={style}>
      {children}
    </Tag>
  );
}

/** An alias reads like a name: same size and weight, with context beside it. */
export function Alias({ name, context, className }: { name: string; context?: string; className?: string }) {
  return (
    <p className={className}>
      <span className="t-h3">{name}</span>
      {context ? (
        <span className="t-xs c2" style={{ marginLeft: 8 }}>
          {context}
        </span>
      ) : null}
    </p>
  );
}
