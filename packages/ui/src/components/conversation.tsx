'use client';

import { useId, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from '../cx';
import { Button, Chip } from './buttons';
import { Stroke } from './marks';

type Base = { className?: string; style?: CSSProperties; children?: ReactNode };

/** Conversation column: agent on the left without a bubble, the person on the right on trim. */
export function Thread({ className, style, children }: Base) {
  return (
    <div className={cx('thread', className)} style={style}>
      {children}
    </div>
  );
}

export function AgentMessage({ lang, className, style, children }: Base & { lang?: string }) {
  return (
    <div className={cx('m-a', className)} style={style} lang={lang}>
      {children}
    </div>
  );
}

/** `source` paints the message in chalk while the portrait grows out of it. */
export function UserMessage({ lang, source, className, style, children }: Base & { lang?: string; source?: boolean }) {
  return (
    <div className={cx('m-u', source && 'src', className)} style={style} lang={lang}>
      {children}
    </div>
  );
}

export type ReceiptProps = Base & {
  /** Dashed stroke: something marked to confirm rather than done. */
  dashed?: boolean;
  /** Lit (warm) — set while the matching block on the page is lit. */
  on?: boolean;
  /** Hovering or focusing a receipt lights the block it changed. */
  onHoverChange?: (hovering: boolean) => void;
  action?: ReactNode;
};

/** What the agent just did, under its message: "Added to Experience — Move-in week". */
export function Receipt({ dashed, on, onHoverChange, action, className, style, children }: ReceiptProps) {
  return (
    <div
      className={cx('rcpt', on && 'on', className)}
      style={style}
      onMouseEnter={onHoverChange ? () => onHoverChange(true) : undefined}
      onMouseLeave={onHoverChange ? () => onHoverChange(false) : undefined}
      onFocus={onHoverChange ? () => onHoverChange(true) : undefined}
      onBlur={onHoverChange ? () => onHoverChange(false) : undefined}
    >
      <Stroke dashed={dashed} />
      <span className="t-xs">{children}</span>
      {action}
    </div>
  );
}

/** Work in progress: a pencil line being written, not a spinner. */
export function StatusLine({ className, style, children }: Base) {
  return (
    <p className={cx('status', className)} style={style}>
      <Stroke />
      {children}
    </p>
  );
}

/** Gold context tag above the composer: "Editing: Experience › Move-in week". */
export function ContextTag({
  onRemove,
  removeLabel = 'Remove context',
  className,
  style,
  children,
}: Base & { onRemove?: () => void; removeLabel?: string }) {
  return (
    <span className={cx('ctx', className)} style={style}>
      {children}
      {onRemove ? (
        <button type="button" aria-label={removeLabel} onClick={onRemove}>
          ×
        </button>
      ) : null}
    </span>
  );
}

export type ComposerProps = {
  id?: string;
  placeholder: string;
  /** Suggestion chips above the box. */
  suggestions?: string[];
  /** Default: a suggestion is sent as the message. */
  onSuggestion?: (text: string) => void;
  /** A <ContextTag> shown above the text box. */
  context?: ReactNode;
  rows?: number;
  /** Return false when the send failed: the text stays in the box (show `error` alongside). */
  onSend?: (text: string) => void | boolean;
  /** Composer background. Chips take the other surface so they stay visible. */
  surface?: 'trim' | 'wall';
  /** One row of suggestions that clips instead of wrapping (phones). */
  clipSuggestions?: boolean;
  /** Shown when the last send failed; the text stays in the box. */
  error?: ReactNode;
  /** What Attach does (open a file picker). Without it the chip is decoration. */
  onAttach?: () => void;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
};

/**
 * Message box with suggestions, context tag, Attach and Send.
 * Enter sends, Shift+Enter adds a line; an IME composition is never sent mid-word.
 */
export function Composer({
  id,
  placeholder,
  suggestions,
  onSuggestion,
  context,
  rows = 2,
  onSend,
  surface = 'trim',
  clipSuggestions,
  error,
  onAttach,
  disabled,
  className,
  style,
}: ComposerProps) {
  const auto = useId();
  const inputId = id ?? `${auto}-msg`;
  const [text, setText] = useState('');
  const chipTone = surface === 'trim' ? 'wall' : 'trim';
  const send = (value: string) => {
    const v = value.trim();
    if (!v || disabled) return;
    if (onSend?.(v) !== false) setText('');
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send(text);
    }
  };
  return (
    <div
      className={cx('cmp', className)}
      style={surface === 'wall' ? { background: 'var(--wall-2)', ...style } : style}
    >
      {suggestions?.length ? (
        <div className={cx('cmp-sugg', clipSuggestions && 'clip')}>
          {suggestions.map((s) => (
            <Chip key={s} size="sm" tone={chipTone} onClick={() => (onSuggestion ? onSuggestion(s) : send(s))}>
              {s}
            </Chip>
          ))}
        </div>
      ) : null}
      {context}
      <label className="sr" htmlFor={inputId}>
        Message
      </label>
      <textarea
        id={inputId}
        rows={rows}
        placeholder={placeholder}
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        aria-describedby={error ? `${inputId}-err` : undefined}
      />
      {error ? (
        <p id={`${inputId}-err`} className="err" style={{ marginBottom: 6 }}>
          {error}
        </p>
      ) : null}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Chip size="sm" tone={chipTone} aria-label="Attach a file" onClick={onAttach} disabled={disabled && !!onAttach}>
          Attach
        </Chip>
        <Button icon aria-label="Send" style={{ minHeight: 40, width: 40 }} onClick={() => send(text)} disabled={disabled}>
          ↑
        </Button>
      </div>
    </div>
  );
}
