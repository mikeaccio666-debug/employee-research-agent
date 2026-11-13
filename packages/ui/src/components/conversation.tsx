'use client';

import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
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
  /** Text already in the box when it first renders (a draft carried over from elsewhere). */
  defaultText?: string;
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
  /** False leaves the Attach chip out, where nothing can be attached. */
  attach?: boolean;
  /**
   * Turns a recording into text (the app's speech-to-text). With it, a Speak chip records from the
   * microphone and puts the words into the box to read and fix; nothing is sent until they press Send.
   * Throw an Error whose message the person should see when it fails.
   */
  onDictate?: (audio: Blob) => Promise<string>;
  /** The longest recording, in seconds. */
  maxDictateSeconds?: number;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
};

type Dictation = 'idle' | 'starting' | 'recording' | 'working';

/** Recorder formats in the order we'd like them; Safari only has mp4. */
const RECORDER_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Microphone → recording → text, for the Composer's Speak chip. */
function useDictation(onText: (text: string) => void, onDictate: ComposerProps['onDictate'], maxSeconds: number) {
  const [state, setState] = useState<Dictation>('idle');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<{ recorder: MediaRecorder; stream: MediaStream; chunks: Blob[]; cancelled: boolean; timer: number } | null>(null);

  const release = () => {
    const r = rec.current;
    if (!r) return;
    window.clearInterval(r.timer);
    for (const t of r.stream.getTracks()) t.stop();
    rec.current = null;
  };
  // Leaving the page mid-recording turns the microphone off.
  useEffect(() => () => {
    if (rec.current) rec.current.cancelled = true;
    if (rec.current?.recorder.state === 'recording') rec.current.recorder.stop();
    release();
  }, []);

  const stop = (cancel = false) => {
    const r = rec.current;
    if (!r) return;
    r.cancelled = cancel;
    if (r.recorder.state === 'recording') r.recorder.stop();
  };

  const start = async () => {
    if (!onDictate || state !== 'idle') return;
    setError(null);
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('This browser can’t record. Type your message instead.');
      return;
    }
    setState('starting');
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setState('idle');
      setError('I can’t hear you: the microphone is blocked. Allow it for this site in your browser, then try again.');
      return;
    }
    const mimeType = RECORDER_TYPES.find((t) => MediaRecorder.isTypeSupported?.(t));
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 32_000 } : undefined);
    const began = Date.now();
    const timer = window.setInterval(() => {
      const s = Math.floor((Date.now() - began) / 1000);
      setSeconds(s);
      if (s >= maxSeconds) stop();
    }, 250);
    const r = { recorder, stream, chunks: [] as Blob[], cancelled: false, timer };
    rec.current = r;
    recorder.ondataavailable = (e) => {
      if (e.data.size) r.chunks.push(e.data);
    };
    recorder.onstop = async () => {
      release();
      setSeconds(0);
      if (r.cancelled || !r.chunks.length) {
        setState('idle');
        return;
      }
      setState('working');
      try {
        const text = (await onDictate(new Blob(r.chunks, { type: recorder.mimeType || mimeType || 'audio/webm' }))).trim();
        if (text) onText(text);
      } catch (e) {
        setError(e instanceof Error && e.message ? e.message : 'I couldn’t turn that into text. Try again, or type it.');
      }
      setState('idle');
    };
    recorder.start(1000);
    setSeconds(0);
    setState('recording');
  };

  return { state, seconds, error, start, stop, maxSeconds };
}

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
  defaultText = '',
  onSend,
  surface = 'trim',
  clipSuggestions,
  error,
  onAttach,
  attach = true,
  onDictate,
  maxDictateSeconds = 120,
  disabled,
  className,
  style,
}: ComposerProps) {
  const auto = useId();
  const inputId = id ?? `${auto}-msg`;
  const [text, setText] = useState(defaultText);
  const box = useRef<HTMLTextAreaElement>(null);
  // Spoken words join whatever is already typed, then the box takes focus so they can fix them.
  const voice = useDictation(
    (heard) => {
      setText((t) => (t.trim() ? `${t.trimEnd()} ${heard}` : heard));
      requestAnimationFrame(() => box.current?.focus());
    },
    onDictate,
    maxDictateSeconds,
  );
  const shownError = voice.error ?? error;
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
        ref={box}
        id={inputId}
        rows={rows}
        placeholder={voice.state === 'recording' ? 'Listening… press Done when you’ve finished' : placeholder}
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        aria-describedby={shownError ? `${inputId}-err` : undefined}
      />
      {shownError ? (
        <p id={`${inputId}-err`} className="err" style={{ marginBottom: 6 }}>
          {shownError}
        </p>
      ) : null}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {attach ? (
            <Chip size="sm" tone={chipTone} aria-label="Attach a file" onClick={onAttach} disabled={disabled && !!onAttach}>
              Attach
            </Chip>
          ) : null}
          {onDictate ? (
            voice.state === 'recording' ? (
              <>
                <Chip size="sm" tone={chipTone} aria-label="Done speaking: turn it into text" onClick={() => voice.stop()}>
                  <span className="rec-dot" aria-hidden="true" /> Done · {clock(voice.seconds)}
                </Chip>
                <Chip size="sm" tone={chipTone} aria-label="Cancel recording" onClick={() => voice.stop(true)}>
                  Cancel
                </Chip>
              </>
            ) : (
              <Chip
                size="sm"
                tone={chipTone}
                aria-label="Speak your message"
                onClick={voice.start}
                disabled={disabled || voice.state !== 'idle'}
              >
                {voice.state === 'working' ? 'Writing it down…' : voice.state === 'starting' ? 'Opening mic…' : 'Speak'}
              </Chip>
            )
          ) : null}
          <span className="sr" aria-live="polite">
            {voice.state === 'recording' ? 'Recording' : voice.state === 'working' ? 'Turning your recording into text' : ''}
          </span>
        </div>
        <Button icon aria-label="Send" style={{ minHeight: 40, width: 40 }} onClick={() => send(text)} disabled={disabled || voice.state === 'recording' || voice.state === 'working'}>
          ↑
        </Button>
      </div>
    </div>
  );
}
