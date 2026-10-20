'use client';

import { useRef, type KeyboardEvent } from 'react';
import { cx } from '@portrait/ui';
import s from './TallyScore.module.css';

export type TallyScoreProps = {
  value: number;
  onChange: (value: number) => void;
  /** aria-label of the radio group, e.g. "Overall, 1 to 5". */
  label: string;
  max?: number;
  className?: string;
};

/**
 * Scores as tally marks, not stars (S20): one pencil stroke per point, tap the fifth to give five.
 * A radio group — arrow keys move the score, Home and End jump to the ends.
 */
export function TallyScore({ value, onChange, label, max = 5, className }: TallyScoreProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const marks = Array.from({ length: max }, (_, i) => i + 1);

  const move = (next: number) => {
    onChange(next);
    refs.current[next - 1]?.focus();
  };
  const onKey = (e: KeyboardEvent, i: number) => {
    let next: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = i === max ? 1 : i + 1;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = i === 1 ? max : i - 1;
    if (e.key === 'Home') next = 1;
    if (e.key === 'End') next = max;
    if (next === null) return;
    e.preventDefault();
    move(next);
  };

  return (
    <div className={cx(s.marks, className)} role="radiogroup" aria-label={label}>
      {marks.map((i) => (
        <button
          key={i}
          ref={(el) => {
            refs.current[i - 1] = el;
          }}
          type="button"
          className={cx(s.mk, i <= value && s.on)}
          role="radio"
          aria-checked={i === value}
          aria-label={`${i} ${i === 1 ? 'mark' : 'marks'}`}
          tabIndex={i === value ? 0 : -1}
          onClick={() => onChange(i)}
          onKeyDown={(e) => onKey(e, i)}
        >
          <svg viewBox="0 0 8 28" aria-hidden="true">
            <path d="M4 2 L4 26" />
          </svg>
        </button>
      ))}
      <span className={s.score} aria-hidden="true">
        {value}
      </span>
    </div>
  );
}
