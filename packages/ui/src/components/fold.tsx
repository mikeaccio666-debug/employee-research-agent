'use client';

import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { cx } from '../cx';
import { Tally } from './marks';
import { BasisMark, type Basis } from './text';

type Base = { className?: string; style?: CSSProperties; children?: ReactNode };

/**
 * One line first, then grow: animates its content's height open in place.
 * Children with `.ln` slide in one after another; `.gl` draws its pencil rule.
 */
export function Grow({
  open,
  id,
  live,
  className,
  style,
  children,
}: Base & { open: boolean; id?: string; live?: boolean }) {
  return (
    <div
      id={id}
      className={cx('grow', open && 'open', className)}
      style={style}
      aria-live={live ? 'polite' : undefined}
      inert={!open}
    >
      <div>{children}</div>
    </div>
  );
}

export type FootnoteButtonProps = {
  n: number | string;
  open?: boolean;
  onToggle?: () => void;
  /** id of the Grow it opens */
  controls?: string;
  label?: string;
  className?: string;
};

/** Hand-circled footnote number. Pressing it grows the source in place under the line. */
export function FootnoteButton({ n, open, onToggle, controls, label, className }: FootnoteButtonProps) {
  return (
    <button
      type="button"
      className={cx('fn', open && 'on', className)}
      aria-expanded={onToggle ? !!open : undefined}
      aria-controls={controls}
      aria-label={label ?? `Source ${n}`}
      onClick={onToggle}
    >
      {n}
    </button>
  );
}

export type SourceCardProps = Base & {
  basis: Basis;
  /** "Résumé, p.1 · Oct 12" */
  meta: ReactNode;
};

/** A source as it grows open: sunk panel with a pencil rule, basis marker and the quote. */
export function SourceCard({ basis, meta, className, style, children }: SourceCardProps) {
  return (
    <div className={cx('sunk gl', className)} style={{ padding: '12px 16px 12px 30px', ...style }}>
      <p className="ln t-xs">
        <BasisMark kind={basis} label="" />
        {meta}
      </p>
      {children ? (
        <p className="ln t-s" style={{ marginTop: 4 }}>
          {children}
        </p>
      ) : null}
    </div>
  );
}

export type FootnotedProps = Base & {
  n: number | string;
  basis: Basis;
  meta: ReactNode;
  quote?: ReactNode;
  /** element for the line; default p.t-body */
  lineClassName?: string;
  defaultOpen?: boolean;
  /** gap between the line and the source when open */
  gap?: number;
};

/** A line that ends in a footnote, with its source growing underneath when pressed. */
export function Footnoted({
  n,
  basis,
  meta,
  quote,
  lineClassName = 't-body',
  defaultOpen = false,
  gap = 8,
  className,
  style,
  children,
}: FootnotedProps) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className={className} style={style}>
      <p className={lineClassName}>
        {children}
        <FootnoteButton n={n} open={open} onToggle={() => setOpen((v) => !v)} controls={id} />
      </p>
      <Grow open={open} id={id} live>
        <SourceCard basis={basis} meta={meta} style={{ marginTop: gap }}>
          {quote}
        </SourceCard>
      </Grow>
    </div>
  );
}

export type ExpandRowProps = Base & {
  /** handwritten years on the left, e.g. "2025 — now" */
  years?: ReactNode;
  title: ReactNode;
  summary?: ReactNode;
  /** proofs behind this row, drawn as a tally */
  proofs?: number;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** class for the body grid (`.xb`); its default has a 180px side column */
  bodyClassName?: string;
  bodyStyle?: CSSProperties;
};

/** Experience-style row: one line, + turns to ×, the detail grows in place (`.xrow`). */
export function ExpandRow({
  years,
  title,
  summary,
  proofs,
  open,
  defaultOpen = false,
  onOpenChange,
  bodyClassName,
  bodyStyle,
  className,
  style,
  children,
}: ExpandRowProps) {
  const [inner, setInner] = useState(defaultOpen);
  const isOpen = open ?? inner;
  const id = useId();
  const toggle = () => {
    if (open === undefined) setInner(!isOpen);
    onOpenChange?.(!isOpen);
  };
  return (
    <div className={cx('xrow', isOpen && 'open', className)} style={style}>
      <button type="button" className="xh" aria-expanded={isOpen} aria-controls={id} onClick={toggle}>
        <span className="yr">{years}</span>
        <span>
          <span className="t-h3" style={{ display: 'block' }}>
            {title}
          </span>
          {summary ? <span className="t-s c2">{summary}</span> : null}
        </span>
        {proofs ? <Tally n={proofs} style={{ justifySelf: 'end' }} /> : <span />}
        <span className="pm" aria-hidden="true">
          +
        </span>
      </button>
      <Grow open={isOpen} id={id}>
        <div className={cx('xb', bodyClassName)} style={bodyStyle}>
          {children}
        </div>
      </Grow>
    </div>
  );
}
