'use client';

import { useRef, type KeyboardEvent } from 'react';
import { Band, cx } from '@portrait/ui';
import type { Visibility, VisibilityChoice } from '@/lib/data/entry';

/**
 * "Who can see your portrait" as S12 and S15 draw it: `.opt` radios with a bold 15px title,
 * a "recommended" chalk band and a line of description. (`OptionGroup` sets the title in
 * t-h3, so this keeps the boards' smaller title.) Arrow keys move the choice.
 */
export function VisibilityOptions({
  options,
  value,
  onChange,
  label = 'Visibility',
  className,
}: {
  options: VisibilityChoice[];
  value: Visibility;
  onChange: (next: Visibility) => void;
  label?: string;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const delta =
      e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (i + delta + options.length) % options.length;
    onChange(options[next]!.value);
    refs.current[next]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} className={cx('flex flex-col gap-2', className)}>
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            className={cx('opt', on && 'on')}
            onClick={() => {
              if (!on) onChange(o.value);
            }}
            onKeyDown={(e) => onKey(e, i)}
          >
            <span className="ring" aria-hidden="true" />
            <span>
              <span className="t-s b">{o.title}</span>
              {o.recommended ? (
                <>
                  {' '}
                  <span className="hand ml-1.5 text-[14px]">
                    <Band>recommended</Band>
                  </span>
                </>
              ) : null}
              <span className="t-s c2 mt-0.5 block">{o.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
