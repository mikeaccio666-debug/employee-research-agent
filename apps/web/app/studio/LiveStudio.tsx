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
  Segmented,
  StatusLine,
  UserMessage,
  buttonClass,
  cx,
} from '@portrait/ui';
import { Workspace } from '@/components/workspace/Workspace';
import { IdentityLines, SpecSections } from '@/components/portrait/SpecSections';
import { confirmHeadline, confirmLine, rejectLine, updatePage } from '@/lib/portrait-actions';
import { toConfirm, type Claim, type Spec } from '@/lib/portrait/spec';
import type { ModelChoice, Provider } from '@/lib/agent/env';
import type { Attachment, Receipt as ReceiptData, ThreadMessage } from '@/lib/agent/store';
import { supabaseBrowser } from '@/lib/supabase/client';
import { OPENER } from '@/lib/agent/prompt';
import { routes } from '@/lib/routes';
import s from './studio.module.css';

export type LiveStudioProps = {
  /** The person's id: their résumé uploads go in a storage folder named after it. */
  ownerId: string;
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
  /** For people allowed to switch the agent's model (testing): the choices and the default. */
  models: { choices: ModelChoice[]; current: Provider | null } | null;
};

const MODEL_KEY = 'studio.provider';

type Live = { user: string; reply: string; receipts: ReceiptData[]; attachments: Attachment[]; status: string | null };
type Resume = { path: string; name: string };

const RESUME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};
const KIND_LABEL: Record<Attachment['kind'], string> = { resume: 'Résumé', website: 'Link', github: 'GitHub' };

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
  const picker = useRef<HTMLInputElement>(null);
  const [host, setHost] = useState('');
  const [provider, setProvider] = useState(props.models?.current ?? null);
  useEffect(() => {
    setHost(window.location.host);
    // The last model this person picked, if it is still on offer.
    try {
      const saved = localStorage.getItem(MODEL_KEY);
      if (props.models?.choices.some((c) => c.value === saved)) setProvider(saved as Provider);
    } catch {}
  }, [props.models]);
  const pickModel = (p: Provider) => {
    setProvider(p);
    try {
      localStorage.setItem(MODEL_KEY, p);
    } catch {}
  };

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [thread.length, live?.reply, live?.receipts.length]);

  const busy = live !== null;

  /** Sends a message (and a résumé, once uploaded) and plays the agent's answer in as it streams. */
  const send = (text: string, file?: File) => {
    if (busy || !agentReady) return false;
    setError(null);
    const turn: Live = {
      user: text,
      reply: '',
      receipts: [],
      attachments: file ? [{ kind: 'resume', name: file.name }] : [],
      status: file ? 'Uploading your résumé' : null,
    };
    setLive(turn);
    void (async () => {
      let failed: string | null = null;
      try {
        let resume: Resume | undefined;
        if (file) {
          resume = await upload(file);
          turn.status = 'Reading your résumé';
          setLive({ ...turn });
        }
        const res = await fetch('/api/agent/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, resume, ...(props.models && provider ? { provider } : {}) }),
        });
        if (!res.ok || !res.body) {
          const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
          throw new Error(body?.error?.message ?? 'That didn’t go through. Try again in a moment.');
        }
        await readEvents(res.body, (event, data) => {
          if (event === 'source.read') {
            const read = data as Attachment;
            if (read.kind !== 'resume') turn.attachments = [...turn.attachments, read];
            turn.status = read.kind === 'resume' ? 'Drawing from your résumé' : `Read ${read.name}`;
          } else if (event === 'message.delta') {
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
        { id: -Date.now(), role: 'user', body: text, receipts: [], attachments: turn.attachments },
        ...(turn.reply.trim() || turn.receipts.length
          ? [{ id: -Date.now() - 1, role: 'assistant' as const, body: turn.reply.trim(), receipts: turn.receipts }]
          : []),
      ]);
      setLive(null);
      setError(failed);
    })();
  };

  /** Puts the file in the person's own folder of the private `sources` bucket. */
  const upload = async (file: File): Promise<Resume> => {
    const supabase = supabaseBrowser();
    if (!supabase) throw new Error('Uploads aren’t set up here.');
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const path = `${props.ownerId}/${crypto.randomUUID()}.${ext}`;
    const { error: failed } = await supabase.storage.from('sources').upload(path, file, { contentType: RESUME_TYPES[ext] });
    if (failed) throw new Error('The upload didn’t go through. Try again.');
    return { path, name: file.name };
  };

  const attach = (file: File | undefined) => {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!RESUME_TYPES[ext]) return setError('Attach a PDF or Word (.docx) résumé.');
    if (file.size > 10 * 1024 * 1024) return setError('That file is over 10 MB.');
    send('', file);
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
      {props.models && props.models.choices.length > 1 && provider ? (
        <span className="flex items-center gap-2">
          <Segmented<Provider>
            label="Model"
            value={provider}
            onChange={pickModel}
            options={props.models.choices.map((c) => ({ value: c.value, label: c.label }))}
          />
          <span className="t-xs c2 whitespace-nowrap">{props.models.choices.find((c) => c.value === provider)?.model}</span>
        </span>
      ) : null}
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
            <Shared attachments={m.attachments} />
          </UserMessage>
        ) : (
          <Turn key={m.id} body={m.body} receipts={m.receipts} />
        ),
      )}
      {live ? (
        <>
          <UserMessage>
            <Paras text={live.user} />
            <Shared attachments={live.attachments} />
          </UserMessage>
          {live.reply || live.receipts.length ? <Turn body={live.reply} receipts={live.receipts} /> : null}
          <StatusLine>{live.receipts.length ? 'Drawing your portrait' : (live.status ?? 'Thinking')}</StatusLine>
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
        <>
          <Composer
            id="msg"
            placeholder="Tell me what you’ve done, attach your résumé, or paste a link — in any language"
            onSend={(text) => send(text)}
            onAttach={() => picker.current?.click()}
            disabled={busy || !agentReady}
            error={error}
          />
          <input
            ref={picker}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="sr"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              attach(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </>
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

/** The résumés and links shared with a message, under its text. */
function Shared({ attachments }: { attachments?: Attachment[] }) {
  if (!attachments?.length) return null;
  return (
    <ul className="mt-1 flex flex-col gap-0.5">
      {attachments.map((a, i) => (
        <li key={i} className="t-xs c2">
          {KIND_LABEL[a.kind]} · {a.name}
        </li>
      ))}
    </ul>
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
