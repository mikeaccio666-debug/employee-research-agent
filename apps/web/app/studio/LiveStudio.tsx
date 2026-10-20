'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import {
  AgentMessage,
  Button,
  Chip,
  Composer,
  Pending,
  Receipt,
  Ruler,
  StatusLine,
  UserMessage,
  buttonClass,
  cx,
} from '@portrait/ui';
import { Workspace } from '@/components/workspace/Workspace';
import { IdentityLines, SpecSections } from '@/components/portrait/SpecSections';
import { confirmHeadline, confirmLine, rejectLine, updatePage } from '@/lib/portrait-actions';
import { toConfirm, type Claim, type Spec } from '@/lib/portrait/spec';
import type { Receipt as ReceiptData, ThreadMessage } from '@/lib/agent/store';
import { OPENER } from '@/lib/agent/prompt';
import { routes } from '@/lib/routes';
import s from './studio.module.css';

export type LiveStudioProps = {
  name: string;
  /** First name for the greeting, when the person gave one. */
  greet: string | null;
  handle: string | null;
  visibilityLabel: string;
  spec: Spec;
  thread: ThreadMessage[];
  published: boolean;
  publishedRev: number | null;
  /** False when the deployment has no model key: the studio says so instead of pretending. */
  agentReady: boolean;
};

type Live = { user: string; reply: string; receipts: ReceiptData[] };

/** Reads server-sent events from a fetch body: `event: x` / `data: {...}` blocks. */
async function readEvents(body: ReadableStream<Uint8Array>, on: (event: string, data: unknown) => void) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let cut: number;
    while ((cut = buf.indexOf('\n\n')) >= 0) {
      const block = buf.slice(0, cut);
      buf = buf.slice(cut + 2);
      let event = 'message';
      let data = '';
      for (const line of block.split('\n')) {
        if (line.startsWith('event: ')) event = line.slice(7);
        else if (line.startsWith('data: ')) data += line.slice(6);
      }
      if (data) on(event, JSON.parse(data));
    }
  }
}

/** Plain text with blank lines as paragraph breaks. */
function Paras({ text, className }: { text: string; className?: string }) {
  return (
    <>
      {text
        .split(/\n{2,}/)
        .filter(Boolean)
        .map((p, i) => (
          <p key={i} className={cx('whitespace-pre-line', i > 0 && 'mt-2', className)}>
            {p}
          </p>
        ))}
    </>
  );
}

/** S01 for a real account: the conversation with the agent beside the portrait it draws. */
export function LiveStudio(props: LiveStudioProps) {
  const { name, handle, visibilityLabel, published, agentReady } = props;
  const [spec, setSpec] = useState(props.spec);
  const [thread, setThread] = useState(props.thread);
  const [publishedRev, setPublishedRev] = useState(props.publishedRev);
  const [live, setLive] = useState<Live | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lit, setLit] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('');
  const [saving, startSaving] = useTransition();
  const end = useRef<HTMLDivElement>(null);
  const [host, setHost] = useState('');
  useEffect(() => setHost(window.location.host), []);

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [thread.length, live?.reply, live?.receipts.length]);

  const busy = live !== null;

  const send = (text: string) => {
    if (busy || !agentReady) return false;
    setError(null);
    const turn: Live = { user: text, reply: '', receipts: [] };
    setLive(turn);
    void (async () => {
      let failed: string | null = null;
      try {
        const res = await fetch('/api/agent/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text }),
        });
        if (!res.ok || !res.body) {
          const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
          throw new Error(body?.error?.message ?? 'That didn’t go through. Try again in a moment.');
        }
        await readEvents(res.body, (event, data) => {
          if (event === 'message.delta') {
            turn.reply += (data as { text: string }).text;
          } else if (event === 'portrait.patch') {
            const { ops, receipt } = data as { ops: { value: Spec }[]; receipt: ReceiptData };
            const next = ops.at(-1)?.value;
            if (next) setSpec(next);
            turn.receipts = [...turn.receipts, receipt];
            setLit(receipt.claimId ?? null);
            setAnnounce(receipt.note);
          } else if (event === 'error') {
            failed = (data as { message: string }).message;
          }
          setLive({ ...turn });
        });
      } catch (e) {
        failed = e instanceof Error ? e.message : 'That didn’t go through.';
      }
      // The turn is in the database now; keep it in the thread as it was streamed.
      setThread((t) => [
        ...t,
        { id: -Date.now(), role: 'user', body: text, receipts: [] },
        ...(turn.reply.trim() || turn.receipts.length
          ? [{ id: -Date.now() - 1, role: 'assistant' as const, body: turn.reply.trim(), receipts: turn.receipts }]
          : []),
      ]);
      setLive(null);
      setError(failed);
    })();
  };

  const answer = (action: () => Promise<{ ok: true; spec: Spec } | { ok: false; error: string }>, done: string) =>
    startSaving(async () => {
      const r = await action();
      if (r.ok) {
        setSpec(r.spec);
        setAnnounce(done);
      } else setError(r.error);
    });

  const publishUpdate = () =>
    startSaving(async () => {
      const r = await updatePage();
      if (r.ok) {
        setPublishedRev(spec.rev);
        setAnnounce('Your page is up to date');
      } else setError(r.error);
    });

  const pendingCount = toConfirm(spec);
  const shown = spec.claims.filter((c) => c.status !== 'rejected');
  const behind = published && publishedRev !== spec.rev;

  const lineActions = (c: Claim) =>
    c.status === 'draft' ? (
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {c.basis === 'inferred' ? <span className="t-xs c2">My reading — is it right?</span> : null}
        <Chip size="sm" tone="wall" disabled={saving} onClick={() => answer(() => confirmLine(c.id), 'Line confirmed')}>
          Right
        </Chip>
        <Chip size="sm" tone="wall" disabled={saving} onClick={() => answer(() => rejectLine(c.id), 'Line removed')}>
          Not right
        </Chip>
      </div>
    ) : null;

  const top = (
    <>
      <span className={s.cap}>
        <span className="t-s">{handle ? `${host}/@${handle}` : 'No link yet'}</span>
        <span className={s.pill}>{visibilityLabel}</span>
      </span>
      <span className="flex-1" />
      <span className="t-xs c2 whitespace-nowrap">
        {pendingCount ? `${pendingCount} ${pendingCount === 1 ? 'thing' : 'things'} to confirm` : 'All confirmed'}
      </span>
      {published ? (
        <Button onClick={publishUpdate} disabled={!behind || saving}>
          {behind ? 'Update page' : 'Page is up to date'}
        </Button>
      ) : (
        <Link href={routes.firstPublish} className={buttonClass()}>
          Publish
        </Link>
      )}
    </>
  );

  const talk = (
    <>
      <AgentMessage>
        <p>
          Hi{props.greet ? `, ${props.greet}` : ''}. {OPENER}
        </p>
      </AgentMessage>
      {thread.map((m) =>
        m.role === 'user' ? (
          <UserMessage key={m.id}>
            <Paras text={m.body} />
          </UserMessage>
        ) : (
          <Turn key={m.id} body={m.body} receipts={m.receipts} />
        ),
      )}
      {live ? (
        <>
          <UserMessage>
            <Paras text={live.user} />
          </UserMessage>
          {live.reply || live.receipts.length ? <Turn body={live.reply} receipts={live.receipts} /> : null}
          <StatusLine>{live.receipts.length ? 'Drawing your portrait' : 'Thinking'}</StatusLine>
        </>
      ) : null}
      {!agentReady ? (
        <AgentMessage>
          <p className="t-s c2">The agent isn’t connected on this deployment yet, so I can’t answer here.</p>
        </AgentMessage>
      ) : null}
      <div ref={end} />
    </>
  );

  return (
    <Workspace
      top={top}
      talk={talk}
      composer={
        <Composer
          id="msg"
          placeholder="Tell me what you’ve done — in any language"
          onSend={send}
          disabled={busy || !agentReady}
          error={error}
        />
      }
      canvasLabel="Your portrait, live"
      resizable
      mobile={{
        status: visibilityLabel,
        canvasNote: 'Drafts are dashed until you confirm them',
        previewLabel: 'Your portrait',
        previewTitle: pendingCount ? `${pendingCount} to confirm` : 'Open the preview',
      }}
    >
      <p className="sr" aria-live="polite">
        {announce}
      </p>
      <div className={s.sheet}>
        <Ruler />
        <div className="g12 max-w-[760px] gap-y-2">
          <h1 className={cx('t-name col-[1/span_9]', s.name)}>{name}</h1>
          <div className="col-[10/span_3] self-end">
            <IdentityLines claims={shown} />
          </div>
          {spec.headline ? (
            <div className="col-[1/span_10] mt-3.5">
              <p className="t-h2">
                <Pending pending={spec.headline.status === 'draft'}>{spec.headline.text}</Pending>
              </p>
              {spec.headline.status === 'draft' ? (
                <div className="mt-2 flex gap-2">
                  <Chip size="sm" tone="wall" disabled={saving} onClick={() => answer(confirmHeadline, 'Headline confirmed')}>
                    Right
                  </Chip>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        {shown.some((c) => c.layer !== 'identity') ? (
          <SpecSections claims={shown} order={spec.order} actions={lineActions} lit={lit} className="mt-8 max-w-[520px]" />
        ) : (
          <p className="t-body c2 mt-8 max-w-[44ch]">
            Your portrait starts here. Each thing you tell me becomes a line on this page, dashed until you say it’s right.
          </p>
        )}
      </div>
    </Workspace>
  );
}

function Turn({ body, receipts }: { body: string; receipts: ReceiptData[] }) {
  return (
    <AgentMessage>
      {body ? <Paras text={body} /> : null}
      {receipts.map((r, i) => (
        <Receipt key={i} dashed={r.dashed}>
          {r.note}
        </Receipt>
      ))}
    </AgentMessage>
  );
}
