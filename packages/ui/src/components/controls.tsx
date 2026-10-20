'use client';

import {
  useId,
  useRef,
  useState,
  type CSSProperties,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { cx } from '../cx';

/** Controlled when `value` is given, otherwise keeps its own state. */
function useControllable<T>(value: T | undefined, defaultValue: T, onChange?: (next: T) => void) {
  const [inner, setInner] = useState(defaultValue);
  const current = value === undefined ? inner : value;
  const set = (next: T) => {
    if (value === undefined) setInner(next);
    onChange?.(next);
  };
  return [current, set] as const;
}

export type SegmentOption<T extends string> = { value: T; label: ReactNode };

export type SegmentedProps<T extends string> = {
  options: SegmentOption<T>[];
  value?: T;
  defaultValue?: T;
  onChange?: (value: T) => void;
  /** aria-label for the group, e.g. "View as". */
  label: string;
  /** `pressed` = toggle buttons (aria-pressed); `radio` = a radiogroup (aria-checked). */
  mode?: 'pressed' | 'radio';
  className?: string;
  style?: CSSProperties;
};

/** Segmented control: `.seg` with one `.on` button. */
export function Segmented<T extends string>({
  options,
  value,
  defaultValue,
  onChange,
  label,
  mode = 'pressed',
  className,
  style,
}: SegmentedProps<T>) {
  const [current, set] = useControllable<T>(value, defaultValue ?? options[0]!.value, onChange);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const radio = mode === 'radio';
  const onKey = (e: KeyboardEvent, i: number) => {
    if (!radio) return;
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (i + delta + options.length) % options.length;
    set(options[next]!.value);
    refs.current[next]?.focus();
  };
  return (
    <span className={cx('seg', className)} style={style} role={radio ? 'radiogroup' : 'group'} aria-label={label}>
      {options.map((o, i) => {
        const on = o.value === current;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            className={on ? 'on' : undefined}
            role={radio ? 'radio' : undefined}
            aria-checked={radio ? on : undefined}
            aria-pressed={radio ? undefined : on}
            tabIndex={radio && !on ? -1 : undefined}
            onClick={() => set(o.value)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {o.label}
          </button>
        );
      })}
    </span>
  );
}

export type SwitchProps = {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  /** aria-label; the visible text usually sits next to the switch. */
  label: string;
  id?: string;
  className?: string;
};

/** On/off switch: `button.sw[role=switch]`. */
export function Switch({ checked, defaultChecked = false, onChange, label, id, className }: SwitchProps) {
  const [on, set] = useControllable(checked, defaultChecked, onChange);
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={cx('sw', on && 'on', className)}
      onClick={() => set(!on)}
    />
  );
}

export type TextInputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

/** Text input: `.inp`. `invalid` darkens the border and sets aria-invalid. */
export function TextInput({ invalid, className, style, ...rest }: TextInputProps) {
  return (
    <input
      className={cx('inp', className)}
      aria-invalid={invalid || undefined}
      style={invalid ? { borderColor: 'var(--ink)', ...style } : style}
      {...rest}
    />
  );
}

export type FieldProps = TextInputProps & {
  label: ReactNode;
  help?: ReactNode;
  error?: ReactNode;
  fieldClassName?: string;
};

/** Label + input + help or error, stacked (`.fl`). */
export function Field({ label, help, error, id, fieldClassName, ...input }: FieldProps) {
  const auto = useId();
  const inputId = id ?? auto;
  const noteId = `${inputId}-note`;
  return (
    <div className={cx('fl', fieldClassName)}>
      <label htmlFor={inputId} style={{ fontSize: 14, fontWeight: 700 }}>
        {label}
      </label>
      <TextInput id={inputId} invalid={!!error} aria-describedby={help || error ? noteId : undefined} {...input} />
      {error ? (
        <span id={noteId} className="err">
          {error}
        </span>
      ) : help ? (
        <span id={noteId} className="help">
          {help}
        </span>
      ) : null}
    </div>
  );
}

export type OptionItem<T extends string> = { value: T; title: ReactNode; description?: ReactNode };

export type OptionGroupProps<T extends string> = {
  options: OptionItem<T>[];
  value?: T;
  defaultValue?: T;
  onChange?: (value: T) => void;
  label: string;
  /** Layout of the group; defaults to a column with 8px gaps. */
  className?: string;
  style?: CSSProperties;
  optionClassName?: string;
};

/** Large radio options (`.opt` with a ring): who can see what. Arrow keys move the choice. */
export function OptionGroup<T extends string>({
  options,
  value,
  defaultValue,
  onChange,
  label,
  className,
  style,
  optionClassName,
}: OptionGroupProps<T>) {
  const [current, set] = useControllable<T>(value, defaultValue ?? options[0]!.value, onChange);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (i + delta + options.length) % options.length;
    set(options[next]!.value);
    refs.current[next]?.focus();
  };
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={className}
      style={className || style ? style : { display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      {options.map((o, i) => {
        const on = o.value === current;
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
            className={cx('opt', on && 'on', optionClassName)}
            onClick={() => set(o.value)}
            onKeyDown={(e) => onKey(e, i)}
          >
            <span className="ring" />
            <span>
              <span className="t-h3" style={{ display: 'block' }}>
                {o.title}
              </span>
              {o.description ? <span className="t-s c2">{o.description}</span> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
