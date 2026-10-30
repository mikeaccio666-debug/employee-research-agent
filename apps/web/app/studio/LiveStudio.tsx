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
import { disconnectApp } from '@/lib/connector-actions';
import {
  chooseHeadline,
  clearPreference,
  confirmHeadline,
  confirmLine,
  editLine,
  loadHistory,
  rejectLine,
  restoreTo,
  undoChange,
  updatePage,
} from '@/lib/portrait-actions';
import { LIMITS } from '@/lib/portrait/spec';
import type { VersionEntry } from '@/lib/portrait/history';
import { PREFERENCE_FIELDS, prefSet, toConfirm, type Claim, type PreferenceField, type Preferences, type Spec } from '@/lib/portrait/spec';
import type { Effort, ModelChoice, Provider } from '@/lib/agent/env';
import type { Attachment, Receipt as ReceiptData, ThreadMessage } from '@/lib/agent/store';
import { supabaseBrowser } from '@/lib/supabase/client';
import { OPENER } from '@/lib/agent/opener';
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
  /** For people allowed to switch the agent's model: the choices and the defaults. */
  models: { choices: ModelChoice[]; current: Provider | null; effort: Effort } | null;
  /** The apps the agent can read from, and whether each is connected; null where connectors aren't set up. */
  apps: AppConnection[] | null;
  /** How the last attempt to connect an app went, when the studio was opened from its sign-in. */
  appNotice: { app: string; result: string } | null;
};

export type AppConnection = { id: string; name: string; holds: string; connected: boolean };

/** Which provider, model and thinking level answer. */
type ModelPick = { provider: Provider; model: string; effort: Effort };

const MODEL_KEY = 'studio.model';
const LEVELS: { value: Effort; label: string }[] = [
  { value: 'low', label: 'Quick' },
  { value: 'medium', label: 'Balanced' },
  { value: 'high', label: 'Deep' },
];
// claude-opus-5-5 → Opus 5.5, gpt-6-luna → GPT-6 Luna; ids we don't know read as they are.
const title = (w: string) => `${w[0]!.toUpperCase()}${w.slice(1)}`;
const modelName = (id: string) => {
  const claude = /^claude-([a-z]+)-(\d+)(?:-(\d+))?$/.exec(id);
  if (claude) return `${title(claude[1]!)} ${claude[2]}${claude[3] ? `.${claude[3]}` : ''}`;
  const gpt = /^gpt-([\d.]+)-([a-z]+)$/.exec(id);
  return gpt ? `GPT-${gpt[1]} ${title(gpt[2]!)}` : id;
};
// What someone typed on the landing page before signing in (components/entry/Landing.tsx).
const LANDING_DRAFT_KEY = 'pv-landing-draft';

type Live = { user: string; reply: string; receipts: ReceiptData[]; attachments: Attachment[]; status: string | null };
type Resume = { path: string; name: string };

const RESUME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};
/** Images they can attach: a portfolio slide, a certificate, a screenshot (lib/agent/images.ts). */
const IMAGE_TYPES: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };
const MAX_IMAGE_MB = 5;
const extOf = (name: string) => name.split('.').pop()?.toLowerCase() ?? '';
const KIND_LABEL: Partial<Record<Attachment['kind'], string>> = { resume: 'Résumé', image: 'Image', website: 'Link', github: 'GitHub', notion: 'Notion' };

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
  const [apps, setApps] = useState(props.apps);
  // The line being rewritten in place, and what the box holds.
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  // The version history, loaded when opened and again after each change while it is open.
  const [history, setHistory] = useState<VersionEntry[] | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const [host, setHost] = useState('');
  const firstPick = (): ModelPick | null => {
    const m = props.models;
    const choice = m?.choices.find((c) => c.value === m.current) ?? m?.choices[0];
    return m && choice ? { provider: choice.value, model: choice.models[0]!, effort: m.effort } : null;
  };
  const [pick, setPick] = useState<ModelPick | null>(firstPick);
  const [landingDraft, setLandingDraft] = useState('');
  useEffect(() => {
    // Carried into the box, not sent: the person sends it when they're ready.
    try {
      const saved = sessionStorage.getItem(LANDING_DRAFT_KEY);
      if (saved) {
        setLandingDraft(saved);
        sessionStorage.removeItem(LANDING_DRAFT_KEY);
      }
    } catch {}
  }, []);
  useEffect(() => {
    setHost(window.location.host);
    // The last model and level this person picked, if they are still on offer.
    try {
      const saved = JSON.parse(localStorage.getItem(MODEL_KEY) ?? 'null') as Partial<ModelPick> | null;
      const choice = props.models?.choices.find((c) => c.value === saved?.provider);
      if (saved && choice) {
        setPick({
          provider: choice.value,
          model: choice.models.includes(saved.model ?? '') ? saved.model! : choice.models[0]!,
          effort: LEVELS.some((l) => l.value === saved.effort) ? saved.effort! : props.models!.effort,
        });
      }
    } catch {}
  }, [props.models]);
  const choose = (change: Partial<ModelPick>) => {
    if (!pick) return;
    const next = { ...pick, ...change };
    // A new provider starts on its default model.
    if (change.provider && change.provider !== pick.provider) {
      next.model = props.models?.choices.find((c) => c.value === change.provider)?.models[0] ?? next.model;
    }
    setPick(next);
    try {
      localStorage.setItem(MODEL_KEY, JSON.stringify(next));
    } catch {}
  };

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [thread.length, live?.reply, live?.receipts.length]);

  const busy = live !== null;

  /** Sends a message (and a résumé or an image, once uploaded) and plays the agent's answer in as it streams. */
  const send = (text: string, file?: File) => {
    if (busy || !agentReady) return false;
    setError(null);
    const image = !!file && !!IMAGE_TYPES[extOf(file.name)];
    const what = image ? 'image' : 'résumé';
    const turn: Live = {
      user: text,
      reply: '',
      receipts: [],
      attachments: file ? [{ kind: image ? 'image' : 'resume', name: file.name }] : [],
      status: file ? `Uploading your ${what}` : null,
    };
    setLive(turn);
    void (async () => {
      let failed: string | null = null;
      try {
        let resume: Resume | undefined;
        if (file) {
          resume = await upload(file);
          turn.status = `Reading your ${what}`;
          setLive({ ...turn });
        }
        const res = await fetch('/api/agent/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, resume, ...(props.models && pick ? pick : {}) }),
        });
        if (!res.ok || !res.body) {
          const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
          throw new Error(body?.error?.message ?? 'That didn’t go through. Try again in a moment.');
        }
        await readEvents(res.body, (event, data) => {
          if (event === 'source.read') {
            const read = data as Attachment;
            const own = read.kind === 'resume' || read.kind === 'image';
            if (!own) turn.attachments = [...turn.attachments, read];
            turn.status = own ? `Drawing from your ${what}` : `Read ${read.name}`;
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
    const ext = extOf(file.name);
    const path = `${props.ownerId}/${crypto.randomUUID()}.${ext}`;
    const { error: failed } = await supabase.storage.from('sources').upload(path, file, { contentType: RESUME_TYPES[ext] ?? IMAGE_TYPES[ext] });
    if (failed) throw new Error('The upload didn’t go through. Try again.');
    return { path, name: file.name };
  };

  const attach = (file: File | undefined) => {
    if (!file) return;
    const ext = extOf(file.name);
    if (IMAGE_TYPES[ext]) {
      if (file.size > MAX_IMAGE_MB * 1024 * 1024) return setError(`That image is over ${MAX_IMAGE_MB} MB.`);
      return send('', file);
    }
    if (!RESUME_TYPES[ext]) return setError('Attach a PDF or Word (.docx) résumé, or a PNG, JPEG or WebP image.');
    if (file.size > 10 * 1024 * 1024) return setError('That file is over 10 MB.');
    send('', file);
  };

  const refreshHistory = async () => {
    const r = await loadHistory();
    if (r.ok) setHistory(r.versions);
    else setError(r.error);
  };

  const answer = (action: () => Promise<{ ok: true; spec: Spec } | { ok: false; error: string }>, done: string, after?: () => void) =>
    startSaving(async () => {
      const r = await action();
      if (r.ok) {
        setSpec(r.spec);
        setAnnounce(done);
        after?.();
      } else setError(r.error);
    });

  const toggleHistory = () => {
    if (history) return setHistory(null);
    startSaving(refreshHistory);
  };
  const showHistory = () => {
    if (!history) toggleHistory();
    document.getElementById('history')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // While history is open, a turn that changed the portrait shows up in it too.
  const historyOpen = history !== null;
  const rev = spec.rev;
  useEffect(() => {
    if (historyOpen && !busy) void refreshHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rev, busy]);

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
    editing?.id === c.id ? (
      <form
        className="mt-2 flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          answer(() => editLine(c.id, editing.text), 'Line saved', () => setEditing(null));
        }}
      >
        <label className="sr" htmlFor={`edit-${c.id}`}>
          Rewrite this line
        </label>
        <textarea
          id={`edit-${c.id}`}
          className="inp min-h-[72px] resize-y py-2"
          value={editing.text}
          maxLength={LIMITS.statement}
          autoFocus
          onChange={(e) => setEditing({ id: c.id, text: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setEditing(null);
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" size="sm" disabled={saving}>
            Save
          </Button>
          <Button type="button" variant="quiet" size="sm" onClick={() => setEditing(null)}>
            Cancel
          </Button>
          <span className="t-xs c2">Your words stay as you write them; I’ll ask before changing this line.</span>
        </div>
      </form>
    ) : (
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {c.status === 'draft' && c.basis === 'inferred' ? <span className="t-xs c2">My reading — is it right?</span> : null}
        {c.status === 'draft' ? (
          <>
            <Chip size="sm" tone="wall" disabled={saving} onClick={() => answer(() => confirmLine(c.id), 'Line confirmed')}>
              Right
            </Chip>
            <Chip size="sm" tone="wall" disabled={saving} onClick={() => answer(() => rejectLine(c.id), 'Line removed')}>
              Not right
            </Chip>
          </>
        ) : null}
        <Chip size="sm" tone="wall" disabled={saving || busy} onClick={() => setEditing({ id: c.id, text: c.statement })}>
          Edit
        </Chip>
      </div>
    );

  const [copied, setCopied] = useState(false);
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/@${handle}`);
      setCopied(true);
      setAnnounce('Link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Couldn’t copy. Select the link and copy it instead.');
    }
  };

  const top = (
    <>
      <span className={s.cap}>
        <span className="t-s">{handle ? `${host}/@${handle}` : 'No link yet'}</span>
        <span className={s.pill}>{visibilityLabel}</span>
      </span>
      {published && handle ? (
        <Button variant="quiet" onClick={copyLink}>
          {copied ? 'Copied' : 'Copy link'}
        </Button>
      ) : null}
      <span className="flex-1" />
      <Button variant="quiet" onClick={showHistory}>
        History
      </Button>
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

  // Which model answers, and how hard it thinks: in the composer, so it is there on phones too.
  const models = props.models;
  const choice = models?.choices.find((c) => c.value === pick?.provider);
  const modelPicker =
    models && pick && choice ? (
      <div className="mb-2 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="t-xs c2">Model</span>
          {models.choices.length > 1 ? (
            <Segmented<Provider>
              label="Provider"
              value={pick.provider}
              onChange={(provider) => choose({ provider })}
              options={models.choices.map((c) => ({ value: c.value, label: c.label }))}
            />
          ) : null}
          {choice.models.length > 1 ? (
            <Segmented<string>
              label="Model"
              value={pick.model}
              onChange={(model) => choose({ model })}
              options={choice.models.map((m) => ({ value: m, label: modelName(m) }))}
            />
          ) : (
            <span className="t-xs c2">{modelName(pick.model)}</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="t-xs c2">Thinking</span>
          <Segmented<Effort> label="Thinking" value={pick.effort} onChange={(effort) => choose({ effort })} options={LEVELS} />
        </div>
      </div>
    ) : null;

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
          <Turn key={m.id} body={m.body} receipts={m.receipts} apps={apps} />
        ),
      )}
      {live ? (
        <>
          <UserMessage>
            <Paras text={live.user} />
            <Shared attachments={live.attachments} />
          </UserMessage>
          {live.reply || live.receipts.length ? <Turn body={live.reply} receipts={live.receipts} apps={apps} /> : null}
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
            key={landingDraft ? 'landing' : 'empty'}
            defaultText={landingDraft}
            id="msg"
            context={modelPicker}
            placeholder="Tell me what you’ve done, attach your résumé or a picture of your work, or paste a link — in any language"
            onSend={(text) => send(text)}
            onAttach={() => picker.current?.click()}
            disabled={busy || !agentReady}
            error={error}
          />
          <input
            ref={picker}
            type="file"
            accept=".pdf,.docx,.png,.jpg,.jpeg,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp"
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
              {spec.headline.status === 'draft' && spec.headline.alternatives.length ? (
                <div className="mt-4">
                  <p className="t-xs c2">Or pick one of these</p>
                  <ul className="mt-1.5 flex flex-col gap-2">
                    {spec.headline.alternatives.map((a, i) => (
                      <li key={a.text} className="flex items-baseline justify-between gap-3">
                        <span className="t-body">{a.text}</span>
                        <Chip size="sm" tone="wall" disabled={saving} onClick={() => answer(() => chooseHeadline(i), 'Headline chosen')}>
                          Use this
                        </Chip>
                      </li>
                    ))}
                  </ul>
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
      <History
        open={historyOpen}
        versions={history}
        disabled={saving || busy}
        onToggle={toggleHistory}
        onUndo={(id) =>
          answer(async () => {
            const r = await undoChange(id);
            if (r.ok && r.skipped) setError(`Undone, except ${r.skipped === 1 ? 'one part that has' : `${r.skipped} parts that have`} changed again since.`);
            return r;
          }, 'Change undone')
        }
        onRestore={(id) => answer(() => restoreTo(id), 'Portrait brought back to that version')}
      />
      <ResumeLinks spec={spec} />
      {apps ? (
        <ConnectedApps
          apps={apps}
          notice={props.appNotice}
          disabled={saving}
          onDisconnect={(app) =>
            startSaving(async () => {
              const r = await disconnectApp(app.id);
              if (!r.ok) return setError(r.error);
              setApps((all) => all?.map((a) => (a.id === app.id ? { ...a, connected: false } : a)) ?? null);
              setAnnounce(`${app.name} disconnected`);
            })
          }
        />
      ) : null}
      <SearchPreferences
        preferences={spec.preferences}
        disabled={saving}
        onClear={(f) => answer(() => clearPreference(f), `${PREFERENCE_LABEL[f]} cleared`)}
      />
    </Workspace>
  );
}

const MADE_BY: Record<VersionEntry['madeBy'], string> = { agent: 'Portrait', person: 'You', undo: 'You · undo' };

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

/**
 * Version history (STU-10): every change to the page, newest first. Any one change can be undone
 * on its own, or the portrait taken back to how it was at a version; neither erases the history.
 */
function History({
  open,
  versions,
  disabled,
  onToggle,
  onUndo,
  onRestore,
}: {
  open: boolean;
  versions: VersionEntry[] | null;
  disabled: boolean;
  onToggle: () => void;
  onUndo: (id: number) => void;
  onRestore: (id: number) => void;
}) {
  return (
    <section className="mt-6 max-w-[520px] scroll-mt-20 px-1" id="history" aria-label="Version history">
      <div className="flex items-center justify-between gap-3">
        <p className="t-xs c2">History · undo any change, yours or mine</p>
        <Chip size="sm" tone="wall" aria-expanded={open} disabled={disabled && !open} onClick={onToggle}>
          {open ? 'Hide' : 'Show history'}
        </Chip>
      </div>
      {open && versions ? (
        versions.length ? (
          <ol className="mt-2 flex flex-col gap-3">
            {versions.map((v, i) => (
              <li key={v.id} className="flex flex-col gap-1">
                <p className="t-xs c2">
                  {when(v.at)} · {MADE_BY[v.madeBy]}
                  {i === 0 ? ' · now' : ''}
                </p>
                <p className="t-s">{v.summary}</p>
                <div className="flex flex-wrap gap-2">
                  {v.undoable ? (
                    <Chip size="sm" tone="wall" disabled={disabled} onClick={() => onUndo(v.id)}>
                      Undo this change
                    </Chip>
                  ) : null}
                  {i > 0 ? (
                    <Chip size="sm" tone="wall" disabled={disabled} onClick={() => onRestore(v.id)}>
                      Go back to this version
                    </Chip>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="t-s c2 mt-2">No changes yet.</p>
        )
      ) : null}
    </section>
  );
}

/** The résumé PDFs (app/api/resume): every confirmed line, and the one tailored for a role. */
function ResumeLinks({ spec }: { spec: Spec }) {
  if (!spec.claims.some((c) => c.status === 'confirmed' && c.layer === 'experience')) return null;
  return (
    <section className="mt-6 max-w-[520px] px-1" aria-label="Résumé">
      <p className="t-xs c2">Résumé · a PDF of the lines you confirmed, nothing else</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <a href="/api/resume" download className={buttonClass()}>
          Download résumé
        </a>
        {spec.resume ? (
          <a href="/api/resume?for=tailored" download className={buttonClass()}>
            {spec.resume.target ? `Résumé for ${spec.resume.target}` : 'Tailored résumé'}
          </a>
        ) : null}
      </div>
    </section>
  );
}

const APP_NOTICE: Record<string, string> = {
  connected: 'is connected. Ask the agent to look for something there.',
  declined: 'wasn’t connected: the sign-in was cancelled.',
  failed: 'couldn’t be connected. Try again in a moment.',
  unavailable: 'can’t be connected here yet.',
};

/**
 * Apps the agent may read from (lib/connectors): connect one by signing in to it, disconnect to
 * delete the tokens. The agent only ever reads.
 */
function ConnectedApps({
  apps,
  notice,
  disabled,
  onDisconnect,
}: {
  apps: AppConnection[];
  notice: LiveStudioProps['appNotice'];
  disabled: boolean;
  onDisconnect: (app: AppConnection) => void;
}) {
  const noted = notice ? apps.find((a) => a.id === notice.app) : null;
  return (
    <section className="mt-6 max-w-[520px] px-1" aria-label="Connected apps">
      <p className="t-xs c2">
        Connected apps · the agent can search and read them for evidence, never change anything ·{' '}
        <Link href={routes.apps} className="linklike">
          All apps
        </Link>
      </p>
      {noted && APP_NOTICE[notice!.result] ? (
        <p className="t-xs mt-1" role="status">
          {noted.name} {APP_NOTICE[notice!.result]}
        </p>
      ) : null}
      <ul className="mt-2 flex flex-col gap-2">
        {apps.map((a) => (
          <li key={a.id} className="flex items-baseline justify-between gap-3">
            <div>
              <p className="t-body">{a.name}</p>
              <p className="t-xs c2">{a.connected ? 'Connected' : `Lets the agent read ${a.holds}`}</p>
            </div>
            {a.connected ? (
              <Chip size="sm" tone="wall" disabled={disabled} onClick={() => onDisconnect(a)}>
                Disconnect
              </Chip>
            ) : (
              <form method="post" action={`/api/connectors/${a.id}/start`}>
                <button type="submit" className={buttonClass()} disabled={disabled}>
                  Connect
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

const PREFERENCE_LABEL: Record<PreferenceField, string> = {
  roles: 'Roles',
  jobTypes: 'Job type',
  locations: 'Where',
  workModes: 'Way of working',
  start: 'Can start',
  workAuth: 'Work authorization',
};

/**
 * What they're looking for, as matching reads it: off the page, so it sits below the sheet. They
 * can clear anything the agent saved.
 */
function SearchPreferences({ preferences, disabled, onClear }: { preferences: Preferences; disabled: boolean; onClear: (f: PreferenceField) => void }) {
  const fields = PREFERENCE_FIELDS.filter((f) => prefSet(preferences, f));
  if (!fields.length) return null;
  return (
    <section className="mt-6 max-w-[520px] px-1" aria-label="What you’re looking for">
      <p className="t-xs c2">What you’re looking for · used to match you, never shown on your page</p>
      <dl className="mt-2 flex flex-col gap-2">
        {fields.map((f) => {
          const v = preferences[f];
          return (
            <div key={f} className="flex items-baseline justify-between gap-3">
              <div>
                <dt className="t-xs c2">{PREFERENCE_LABEL[f]}</dt>
                <dd className="t-body">{Array.isArray(v) ? v.join(', ') : v}</dd>
              </div>
              <Chip size="sm" tone="wall" disabled={disabled} onClick={() => onClear(f)}>
                Clear
              </Chip>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

/** The résumés and links shared with a message, under its text. */
function Shared({ attachments }: { attachments?: Attachment[] }) {
  if (!attachments?.length) return null;
  return (
    <ul className="mt-1 flex flex-col gap-0.5">
      {attachments.map((a, i) => (
        <li key={i} className="t-xs c2">
          {KIND_LABEL[a.kind] ?? a.kind} · {a.name}
        </li>
      ))}
    </ul>
  );
}

function Turn({ body, receipts, apps }: { body: string; receipts: ReceiptData[]; apps: AppConnection[] | null }) {
  return (
    <AgentMessage>
      {body ? <Paras text={body} /> : null}
      {receipts.map((r, i) => {
        // The agent's offer to connect an app: a button while the app isn't connected yet.
        if (r.connect) {
          const app = apps?.find((a) => a.id === r.connect);
          if (!app || app.connected) return null;
          return (
            <form key={i} method="post" action={`/api/connectors/${app.id}/start`} className="mt-2">
              <button type="submit" className={buttonClass()}>
                Connect {app.name}
              </button>
            </form>
          );
        }
        return (
          <Receipt key={i} dashed={r.dashed}>
            {r.note}
          </Receipt>
        );
      })}
    </AgentMessage>
  );
}
