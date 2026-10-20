'use client';

import { useState, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { cx } from '@portrait/ui';
import { cellKey, parseCellKey } from '@/lib/data/connections';
import s from './TimeGrid.module.css';

export type TimeGridProps = {
  /** Column headers, e.g. "Mon 26". */
  days: readonly string[];
  /** Number of half-hour rows. */
  rows: number;
  /** Start time of a row in the zone being shown ("9:00 AM"). Every other row is labelled on screen. */
  timeLabel: (row: number) => string;
  /** The other person's shared free times, drawn striped. */
  isOtherFree: (day: number, row: number) => boolean;
  /** "Dana" — used in each cell's accessible name ("Dana free"). */
  otherName: string;
  /** Busy on your own calendar: can't be marked. */
  isBusy: (day: number, row: number) => boolean;
  /** Times you marked free, keyed `${day}-${row}`. */
  selected: Readonly<Record<string, true>>;
  /** Mark (`free = true`) or clear one half hour. */
  onPaint: (key: string, free: boolean) => void;
  /** The overlap picked below the grid; drawn with a heavier ring. */
  picked?: string;
  /** aria-label of the grid, e.g. "Free times, week of Oct 26". */
  label: string;
  className?: string;
};

const MOVES: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * The S08b time grid. Drag across half hours to mark yourself free (dragging from a marked
 * cell clears instead); where you overlap with the other person it lights up in chalk.
 * Keyboard: arrows move (one tab stop for the whole grid), Space marks a half hour.
 */
export function TimeGrid({
  days,
  rows,
  timeLabel,
  isOtherFree,
  otherName,
  isBusy,
  selected,
  onPaint,
  picked,
  label,
  className,
}: TimeGridProps) {
  // Roving tab stop: the last focused cell.
  const [active, setActive] = useState(() => cellKey(0, 0));

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const start = (e.target as Element).closest?.('[data-k]');
    if (!start) return;
    const grid = e.currentTarget;
    const k0 = start.getAttribute('data-k') ?? '';
    // Starting on a marked cell clears; starting on an empty one marks.
    const mode = !selected[k0];
    const seen = new Set<string>();
    const apply = (k: string) => {
      if (seen.has(k)) return;
      seen.add(k);
      const [d, r] = parseCellKey(k);
      if (isBusy(d, r)) return;
      onPaint(k, mode);
    };
    apply(k0);
    try {
      grid.setPointerCapture(e.pointerId);
    } catch {
      // Without capture, painting still follows the pointer while it stays over the grid.
    }
    const move = (ev: PointerEvent) => {
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const c = el?.closest('[data-k]');
      if (c && grid.contains(c)) apply(c.getAttribute('data-k') ?? '');
    };
    const up = () => {
      grid.removeEventListener('pointermove', move);
      grid.removeEventListener('pointerup', up);
      grid.removeEventListener('pointercancel', up);
    };
    grid.addEventListener('pointermove', move);
    grid.addEventListener('pointerup', up);
    grid.addEventListener('pointercancel', up);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, d: number, r: number) => {
    const mv = MOVES[e.key];
    if (!mv) return;
    e.preventDefault();
    const nd = clamp(d + mv[0], 0, days.length - 1);
    const nr = clamp(r + mv[1], 0, rows - 1);
    const grid = e.currentTarget.closest('[role="grid"]');
    grid?.querySelector<HTMLButtonElement>(`[data-k="${cellKey(nd, nr)}"]`)?.focus();
  };

  return (
    <div className={cx(s.wrap, className)}>
      <div
        className={s.grid}
        style={{ '--days': days.length } as CSSProperties}
        role="grid"
        aria-label={label}
        onPointerDown={onPointerDown}
      >
        <div role="row" className={s.row}>
          <span role="columnheader">
            <span className="sr">Time</span>
          </span>
          {days.map((day) => (
            <span key={day} role="columnheader" className={s.gh}>
              {day}
            </span>
          ))}
        </div>
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} role="row" className={s.row}>
            <span role="rowheader" className={s.gt}>
              {r % 2 === 0 ? timeLabel(r) : <span className="sr">{timeLabel(r)}</span>}
            </span>
            {days.map((day, d) => {
              const k = cellKey(d, r);
              const mine = !!selected[k];
              const other = isOtherFree(d, r);
              const busy = isBusy(d, r);
              const state = busy ? s.busy : mine && other ? s.both : mine ? s.mine : other ? s.dana : undefined;
              return (
                <span key={k} role="gridcell" className={s.gc}>
                  <button
                    type="button"
                    className={cx(s.cell, state, picked === k && s.pick)}
                    data-k={k}
                    tabIndex={active === k ? 0 : -1}
                    aria-label={`${day} ${timeLabel(r)}${busy ? ', busy' : ''}${other ? `, ${otherName} free` : ''}${mine ? ', you marked free' : ''}`}
                    aria-pressed={mine}
                    aria-disabled={busy}
                    onFocus={() => setActive(k)}
                    // Pointer marking happens on pointerdown; a click with detail 0 is Space or Enter.
                    onClick={(e) => {
                      if (e.detail === 0 && !busy) onPaint(k, !mine);
                    }}
                    onKeyDown={(e) => onKeyDown(e, d, r)}
                  />
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/** The key above the grid: striped, tinted, chalk and busy swatches. */
export function TimeGridLegend({
  other,
  mine,
  both,
  busy,
  className,
}: {
  other: string;
  mine: string;
  both: string;
  busy: string;
  className?: string;
}) {
  return (
    <div className={cx(s.legend, className)}>
      <span className={s.lg}>
        <i className={s.swDana} aria-hidden="true" />
        {other}
      </span>
      <span className={s.lg}>
        <i className={s.swMine} aria-hidden="true" />
        {mine}
      </span>
      <span className={s.lg}>
        <i className={s.swBoth} aria-hidden="true" />
        {both}
      </span>
      <span className={s.lg}>
        <i className={s.swBusy} aria-hidden="true" />
        {busy}
      </span>
    </div>
  );
}
