'use client';

import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { AgentMessage, Button, Composer, Kbd, LinkButton, Thread, UserMessage, cx } from '@portrait/ui';
import { PREVIEW_REPLY } from '@/lib/preview';
import s from './AgentPanel.module.css';

export type AgentConfig = {
  /** What the agent can see: "07A night-heron" → "Looking at: 07A night-heron". */
  context?: string;
  /** Small centred line at the top: "Same conversation as your Brief studio · today". */
  caption?: ReactNode;
  /** The conversation from the design (AgentMessage, UserMessage, Receipt …). */
  thread?: ReactNode;
  placeholder?: string;
  /** Open on arrival. `?talk=open` in the URL also opens it. */
  defaultOpen?: boolean;
};

/** Messages typed into a prototype composer, each answered with an honest "not connected" note. */
export function useLocalThread() {
  const [sent, setSent] = useState<{ id: number; text: string }[]>([]);
  const send = (text: string) => setSent((list) => [...list, { id: Date.now(), text }]);
  const nodes = sent.map((m) => (
    <Fragment key={m.id}>
      <UserMessage>
        <p className="t-s">{m.text}</p>
      </UserMessage>
      <AgentMessage>
        <p className="t-s c2">{PREVIEW_REPLY}</p>
      </AgentMessage>
    </Fragment>
  ));
  return { nodes, send };
}

type Props = AgentConfig & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Opened by default rather than by the person: hidden on narrow screens until settled. */
  auto?: boolean;
  /** Changes when page content asks for the cursor in the message box (useShell().openAgent). */
  focusToken?: number;
};

/** The always-on agent: a Talk button (⌘J) that slides the conversation in from the right. */
export function AgentPanel({
  open,
  onOpenChange,
  auto,
  focusToken = 0,
  context,
  caption,
  thread,
  placeholder = 'Ask about this page, or anything',
}: Props) {
  const [usingPage, setUsingPage] = useState(true);
  const { nodes, send } = useLocalThread();
  const panel = useRef<HTMLElement>(null);
  const talk = useRef<HTMLButtonElement>(null);
  // Focus follows the person's own open/close only, never a default opening or settling.
  const focusNext = useRef<'panel' | 'talk' | null>(null);
  const setOpen = (next: boolean) => {
    focusNext.current = next ? 'panel' : 'talk';
    onOpenChange(next);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        focusNext.current = open ? 'talk' : 'panel';
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (focusToken) panel.current?.querySelector('textarea')?.focus({ preventScroll: true });
  }, [focusToken]);

  useEffect(() => {
    const target = focusNext.current;
    focusNext.current = null;
    if (target === 'panel' && open) panel.current?.querySelector('textarea')?.focus({ preventScroll: true });
    if (target === 'talk' && !open) talk.current?.focus({ preventScroll: true });
  }, [open]);

  return (
    <>
      {open ? null : (
        <button
          ref={talk}
          type="button"
          className={s.talkbtn}
          onClick={() => setOpen(true)}
          aria-keyshortcuts="Meta+J Control+J"
        >
          Talk <Kbd style={{ color: 'var(--wall)' }}>⌘J</Kbd>
        </button>
      )}
      <aside
        ref={panel}
        className={cx(s.panel, open && s.open, auto && s.auto)}
        aria-label="Talk to Portrait"
        inert={!open}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
        }}
      >
        <span className={s.edge} aria-hidden="true" />
        <div>
          <div className={s.ph}>
            <p className="t-h3">Talk</p>
            <Button variant="quiet" size="sm" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
          {context ? (
            <div className={s.ctxrow}>
              {usingPage ? (
                <span className={s.look}>
                  Looking at: {context}
                  <button type="button" aria-label="Stop using this page" onClick={() => setUsingPage(false)}>
                    ×
                  </button>
                </span>
              ) : (
                <span className="t-xs c2">
                  Not using this page. <LinkButton onClick={() => setUsingPage(true)}>Use it again</LinkButton>
                </span>
              )}
            </div>
          ) : null}
        </div>
        <div className={s.pscroll} aria-live="polite">
          <Thread>
            {caption ? (
              <p className="t-xs c3" style={{ textAlign: 'center' }}>
                {caption}
              </p>
            ) : null}
            {thread}
            {nodes}
          </Thread>
        </div>
        <Composer className={s.composer} placeholder={placeholder} onSend={send} />
      </aside>
    </>
  );
}
