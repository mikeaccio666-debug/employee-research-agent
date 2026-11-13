'use client';

import { useEffect, useRef, useState } from 'react';
import { AgentMessage, Composer, Receipt, StatusLine, Thread, UserMessage, cx } from '@portrait/ui';
import type { ThreadMessage } from '@/lib/agent/store';
import type { ResumeReceipt } from '@/lib/resume/changes';
import { touched } from '@/lib/resume/changes';
import { dictate } from '@/lib/voice/client';
import { CloseIcon } from './icons';
import s from './resume.module.css';

// The assistant beside the résumé (PRD COACH-12): the conversation, and under each reply what it
// changed on the page, each change with its own Undo. Pointing at a change lights it on the page.

export type Live = { user: string; reply: string; receipts: ResumeReceipt[] };

type Props = {
  thread: ThreadMessage[];
  live: Live | null;
  /** off: the assistant can't run here; `note` says why. */
  ready: boolean;
  note?: string | null;
  /** Speech-to-text is set up: a Speak chip beside the box. */
  voice?: boolean;
  busy: boolean;
  error: string | null;
  /** The version open in the editor, and what the others are called, for changes made in them. */
  versionId: string | null;
  versionNames: Record<string, string>;
  /** Which page is open: the starters fit it. */
  mode?: 'resume' | 'letter';
  /** Receipts already undone in this tab, by key. */
  undone: ReadonlySet<string>;
  onSend: (text: string) => boolean | void;
  onUndo: (key: string, receipt: ResumeReceipt) => void;
  onUndoAll: (items: { key: string; receipt: ResumeReceipt }[]) => void;
  onPoint: (id: string | null) => void;
  /** Phones: back to the page to look at what changed. */
  onShowPage?: () => void;
  onClose?: () => void;
};

const STARTERS = {
  resume: ['Make my bullets stronger', 'Fit this on one page', 'Tailor it to a job posting', 'What’s weakest here?'],
  letter: ['Write my cover letter', 'Write one for a job posting', 'Make it shorter and plainer'],
};
// Starters that need the person to paste something first: the box opens with this in it.
const PASTE: Record<string, string> = {
  'Tailor it to a job posting': 'Tailor this version to this posting:\n\n',
  'Write one for a job posting': 'Write a cover letter for this posting:\n\n',
};

/** Plain text with blank lines as paragraph breaks. */
function Paras({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\n{2,}/)
        .filter(Boolean)
        .map((p, i) => (
          <p key={i} className="t-s" style={{ whiteSpace: 'pre-wrap' }}>
            {p}
          </p>
        ))}
    </>
  );
}

export function ResumeChat(p: Props) {
  const end = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState({ text: '', n: 0 });
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [p.thread.length, p.live?.reply, p.live?.receipts.length]);

  const Changes = ({ id, receipts }: { id: string; receipts: ResumeReceipt[] }) => {
    if (!receipts.length) return null;
    const items = receipts.map((r, i) => ({ key: `${id}:${i}`, receipt: r }));
    const here = items.filter((x) => (x.receipt.version ?? p.versionId) === p.versionId && !p.undone.has(x.key));
    return (
      <div className={s.changes}>
        {items.map(({ key, receipt }) => {
          const elsewhere = receipt.version && receipt.version !== p.versionId;
          const target = touched(receipt.change)[0] ?? null;
          return (
            <Receipt
              key={key}
              onHoverChange={elsewhere || !target ? undefined : (on) => p.onPoint(on ? target : null)}
              action={
                p.undone.has(key) ? (
                  <span className={cx('t-xs', s.undone)}>Undone</span>
                ) : elsewhere ? (
                  <span className={cx('t-xs', s.undone)}>in “{p.versionNames[receipt.version!] ?? 'another version'}”</span>
                ) : (
                  <button type="button" className={s.undoLink} disabled={p.busy} onClick={() => p.onUndo(key, receipt)}>
                    Undo
                  </button>
                )
              }
            >
              {receipt.note}
            </Receipt>
          );
        })}
        {here.length > 1 ? (
          <button type="button" className={cx(s.undoLink, s.undoAll)} disabled={p.busy} onClick={() => p.onUndoAll(here)}>
            {here.length === 2 ? 'Undo both' : `Undo all ${here.length}`}
          </button>
        ) : null}
      </div>
    );
  };

  const empty = !p.thread.length && !p.live;
  const starters = STARTERS[p.mode ?? 'resume'];
  const letterEmpty = p.mode === 'letter';

  return (
    <aside className={s.chat} aria-label="Assistant">
      <div className={s.chatHead}>
        <span className="t-sm" style={{ fontWeight: 600 }}>
          Assistant
        </span>
        {p.onClose ? (
          <button type="button" className={s.tiny} onClick={p.onClose} aria-label="Hide the assistant" title="Hide the assistant">
            <CloseIcon />
          </button>
        ) : null}
      </div>
      <div className={s.chatScroll}>
        <Thread>
          <AgentMessage>
            <p className="t-s">
              I can reword, reorder, trim and tailor this version while you watch. I only use facts already on it, on your confirmed portrait, or that you tell me here. Every change is marked on the page with its own Undo.
            </p>
          </AgentMessage>
          {p.thread.map((m) =>
            m.role === 'user' ? (
              <UserMessage key={m.id}>
                <Paras text={m.body} />
              </UserMessage>
            ) : (
              <AgentMessage key={m.id}>
                <Paras text={m.body} />
                <Changes id={String(m.id)} receipts={m.receipts as unknown as ResumeReceipt[]} />
              </AgentMessage>
            ),
          )}
          {p.live ? (
            <>
              <UserMessage>
                <Paras text={p.live.user} />
              </UserMessage>
              {p.live.reply || p.live.receipts.length ? (
                <AgentMessage>
                  {p.live.reply ? <Paras text={p.live.reply} /> : null}
                  <Changes id="live" receipts={p.live.receipts} />
                </AgentMessage>
              ) : null}
              <StatusLine>{p.live.receipts.length ? 'Changing your résumé' : 'Reading your résumé'}</StatusLine>
            </>
          ) : null}
          {p.onShowPage && !p.busy && p.thread.at(-1)?.receipts.length ? (
            <button type="button" className={s.undoLink} onClick={p.onShowPage}>
              See the changes on the page
            </button>
          ) : null}
          {!p.ready && p.note ? (
            <AgentMessage>
              <p className="t-s c2">{p.note}</p>
            </AgentMessage>
          ) : null}
          <div ref={end} />
        </Thread>
      </div>
      <div className={s.chatFoot}>
        <Composer
          key={draft.n}
          defaultText={draft.text}
          placeholder="Ask for a change, or paste a job posting"
          suggestions={(empty || letterEmpty) && p.ready && !p.busy ? starters : undefined}
          onSuggestion={(text) => {
            if (PASTE[text]) setDraft((d) => ({ text: PASTE[text]!, n: d.n + 1 }));
            else p.onSend(text);
          }}
          onSend={(text) => {
            const ok = p.onSend(text);
            if (ok !== false) setDraft((d) => ({ text: '', n: d.n }));
            return ok;
          }}
          disabled={p.busy || !p.ready}
          error={p.error}
          rows={3}
          attach={false}
          onDictate={p.voice ? dictate : undefined}
        />
      </div>
    </aside>
  );
}
