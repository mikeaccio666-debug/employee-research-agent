'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Button, ChipTag, Grow, MarginNote, Segmented, buttonClass, cx, withViewTransition } from '@portrait/ui';
import { ShellMain, useShell } from '@/components/shell/AppShell';
import { HandleField } from '@/components/account/HandleField';
import { VisibilityOptions } from '@/components/entry/VisibilityOptions';
import type { Account } from '@/lib/account';
import { deleteAccount, renewAlias, saveFieldLevels, saveVisibility, type FieldLevels } from '@/lib/account-actions';
import {
  fieldLevelLabels,
  initialFieldLevels,
  privacyPreview,
  privacyVisibility,
  sensitiveFields,
  type FieldLevel,
  type Visibility,
} from '@/lib/data/entry';
import { routes } from '@/lib/routes';
import s from './privacy.module.css';

const SECTIONS = [
  { id: 'vis', label: 'Visibility' },
  { id: 'sens', label: 'Sensitive fields' },
  { id: 'alias', label: 'Alias' },
  { id: 'data', label: 'Your data' },
] as const;
type SectionId = (typeof SECTIONS)[number]['id'];

const LEVELS = ([0, 1, 2] as FieldLevel[]).map((l) => ({ value: String(l), label: fieldLevelLabels[l] }));

/** Which sub-nav item matches the scroll position: the last section whose top passed 35% of the window. */
function useSectionSpy(initial: SectionId) {
  const [active, setActive] = useState<SectionId>(initial);
  const lockUntil = useRef(0);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (Date.now() < lockUntil.current) return;
        let current: SectionId = SECTIONS[0].id;
        for (const { id } of SECTIONS) {
          const el = document.getElementById(id);
          if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.35) current = id;
        }
        const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
        setActive(atEnd ? 'data' : current);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  // A click names the section outright; the jump it causes should not re-pick another one.
  const pick = (id: SectionId) => {
    lockUntil.current = Date.now() + 200;
    setActive(id);
  };
  return [active, pick] as const;
}

/**
 * S12 · privacy and visibility. The preview on the right follows every change. Signed in, the
 * visibility saves as it changes and the alias is the person's own; without an account (Supabase
 * not set up) the screen shows the canvas's example.
 */
/** A real account's sensitive fields: what each holds now, and who they chose may see it. */
export type PrivateFields = { levels: FieldLevels | null; values: Record<keyof FieldLevels, string> };

export function Privacy({ account, fields }: { account: Account | null; fields?: PrivateFields | null }) {
  const { openAgent } = useShell();
  const [vis, setVis] = useState<Visibility>(account?.visibility ?? 'anon');
  const [saveNote, setSaveNote] = useState<{ error: boolean; text: string } | null>(null);
  const [saving, startSaving] = useTransition();
  const [alias, setAlias] = useState(account?.alias ?? 'quiet-otter');
  const [levels, setLevels] = useState<FieldLevels>(fields?.levels ?? initialFieldLevels);
  const [fieldNote, setFieldNote] = useState<{ error: boolean; text: string } | null>(null);
  const [aliasNote, setAliasNote] = useState<{ error: boolean; text: string } | null>(null);
  const [newAlias, setNewAlias] = useState(false);
  const [del, setDel] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [delNote, setDelNote] = useState<string | null>(null);
  const rows = account && fields ? sensitiveFields.map((f) => ({ ...f, value: fields.values[f.id] })) : sensitiveFields;
  const [active, pick] = useSectionSpy('vis');
  const newToggle = useRef<HTMLButtonElement>(null);
  const delToggle = useRef<HTMLButtonElement>(null);

  const named = vis === 'public';
  const shown = vis === 'public' || vis === 'anon';
  const example = named ? privacyPreview.named : privacyPreview.anon;
  // A real account shows its own name or alias; its lines arrive once the portrait is drawn (step 2).
  const card = account
    ? {
        name: named ? account.displayName || 'Your name' : alias,
        ctx: '',
        line: 'Your first lines show here once your portrait has them.',
        links: '',
      }
    : example;
  const options = account
    ? privacyVisibility.map((o) => ({ ...o, description: o.description.replace('quiet-otter', alias) }))
    : privacyVisibility;

  const changeVis = (next: Visibility) => {
    const before = vis;
    withViewTransition(() => setVis(next));
    if (!account) return;
    setSaveNote(null);
    startSaving(async () => {
      const result = await saveVisibility(next);
      if (result.ok) setSaveNote({ error: false, text: 'Saved' });
      else {
        setVis(before);
        setSaveNote({ error: true, text: result.error });
      }
    });
  };
  const after = sensitiveFields.filter((f) => levels[f.id] === 1).map((f) => f.name.toLowerCase());
  const everyone = sensitiveFields.filter((f) => levels[f.id] === 2).map((f) => f.name.toLowerCase());
  const note =
    vis === 'anon' ? privacyPreview.note.anon : vis === 'public' ? privacyPreview.note.public : privacyPreview.note.other;

  const changeLevel = (id: keyof FieldLevels, level: FieldLevel) => {
    const before = levels;
    const next = { ...levels, [id]: level };
    withViewTransition(() => setLevels(next));
    if (!account) return;
    setFieldNote(null);
    startSaving(async () => {
      const r = await saveFieldLevels(next);
      if (r.ok) setFieldNote({ error: false, text: 'Saved' });
      else {
        setLevels(before);
        setFieldNote({ error: true, text: r.error });
      }
    });
  };

  const newAliasNow = () => {
    if (!account) return;
    setAliasNote(null);
    startSaving(async () => {
      const r = await renewAlias();
      if (r.ok) {
        setAlias(r.alias);
        setAliasNote({ error: false, text: `You’re ${r.alias} now.` });
      } else setAliasNote({ error: true, text: r.error });
    });
  };

  const deleteNow = () =>
    startSaving(async () => {
      const r = await deleteAccount(confirmText);
      if (r.ok) window.location.assign('/');
      else setDelNote(r.error);
    });

  // The alias context is edited by talking to Portrait: open the agent with the cursor in its box.
  const editContext = () => openAgent({ focus: true });
  const closeNewAlias = () => {
    setNewAlias(false);
    newToggle.current?.focus();
  };
  const closeDelete = () => {
    setDel(false);
    delToggle.current?.focus();
  };

  return (
    <ShellMain className={s.main}>
      <div className={s.cols}>
        <nav className={s.sub} aria-label="Settings">
          {SECTIONS.map((sec) => (
            <a
              key={sec.id}
              href={`#${sec.id}`}
              className={cx(active === sec.id && s.on)}
              aria-current={active === sec.id ? 'true' : undefined}
              onClick={() => pick(sec.id)}
            >
              {sec.label}
            </a>
          ))}
          <Link href={routes.inbox}>Notifications</Link>
        </nav>

        <section className={s.sec} id="vis" aria-labelledby="vis-h">
          <h1 className="t-h1" id="vis-h">
            Who can see your portrait
          </h1>
          <p className="t-s c2 mt-1.5">Switch any time. The preview on the right shows exactly what a startup sees.</p>
          <VisibilityOptions className="mt-4" options={options} value={vis} onChange={changeVis} />
          {account ? (
            <>
              <p className={cx('t-xs mt-2', saveNote?.error ? 'err' : 'c2')} role="status">
                {saving ? 'Saving…' : saveNote?.text}
              </p>
              <HandleField className="mt-4 max-w-[440px]" initial={account.handle} />
            </>
          ) : null}
        </section>

        <aside className={s.preview} aria-labelledby="pv-lab">
          <p className="lab" id="pv-lab">
            As a startup sees it
          </p>
          <div className={cx(s.card, 'mt-2.5')} aria-live="polite">
            {shown ? (
              <div>
                <p className={s.fno}>08A</p>
                <p className="t-h3 mt-1.5">{card.name}</p>
                {card.ctx ? <p className="t-xs c2">{card.ctx}</p> : null}
                <p className="t-s mt-2.5">{card.line}</p>
                {card.links ? <p className="t-xs c2 mt-2.5">{card.links}</p> : null}
                {after.length ? (
                  <p className="t-xs mt-2.5">
                    <b>After you connect:</b> {after.join(', ')}
                  </p>
                ) : null}
                {everyone.length ? (
                  <p className="t-xs mt-1.5">
                    <b>Shown to everyone:</b> {everyone.join(', ')}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="t-s">{vis === 'link' ? privacyPreview.hidden.link : privacyPreview.hidden.hidden}</p>
            )}
          </div>
          <MarginNote className="mt-2.5">{note}</MarginNote>
        </aside>

        <section className={cx(s.sec, s.next)} id="sens" aria-labelledby="sens-h">
          <h2 className="t-h2" id="sens-h">
            Sensitive fields
          </h2>
          <p className="t-s c2 mt-1.5">“Matching only” means we use it to find fits, and never show it.</p>
          <div className="mt-2.5">
            {rows.map((f) => (
              <div key={f.id} className={s.frow}>
                <div>
                  <p className="t-s b">{f.name}</p>
                  <p className="t-xs c2">{f.value}</p>
                </div>
                <Segmented
                  mode="radio"
                  label={f.name}
                  options={LEVELS}
                  value={String(levels[f.id])}
                  onChange={(v) => changeLevel(f.id, Number(v) as FieldLevel)}
                />
              </div>
            ))}
          </div>
          {account ? (
            <p className={cx('t-xs mt-2', fieldNote?.error ? 'err' : 'c2')} role="status">
              {fieldNote?.text}
            </p>
          ) : null}
        </section>

        <section className={cx(s.sec, s.next)} id="alias" aria-labelledby="alias-h">
          <h2 className="t-h2" id="alias-h">
            Alias
          </h2>
          <div className="mt-3 flex flex-wrap items-baseline gap-3.5">
            <p className="hand text-[30px] font-semibold">{alias}</p>
            {account ? null : (
              <>
                <ChipTag size="sm">CS</ChipTag>
                <ChipTag size="sm">Junior</ChipTag>
                <ChipTag size="sm">SoCal</ChipTag>
              </>
            )}
            <Button variant="quiet" size="sm" onClick={editContext}>
              Edit context
            </Button>
          </div>
          <button
            ref={newToggle}
            type="button"
            className={buttonClass({ variant: 'quiet', size: 'sm', className: 'mt-2 -ml-2' })}
            aria-expanded={newAlias}
            aria-controls="new-alias"
            onClick={() => setNewAlias((v) => !v)}
          >
            Get a new alias…
          </button>
          <Grow open={newAlias} id="new-alias">
            <div className="gl mt-2">
              <p className="ln t-s max-w-[52ch]">
                Your alias stays the same so it can build followers. A new one starts from zero, and your old posts keep
                the old name.
              </p>
              <div className="ln mt-2.5 flex gap-2">
                <Button variant="secondary" size="sm" disabled={saving} onClick={newAliasNow}>
                  Get a new alias
                </Button>
                <Button variant="quiet" size="sm" onClick={closeNewAlias}>
                  Keep {alias}
                </Button>
              </div>
              {aliasNote ? (
                <p className={cx('ln t-xs mt-2', aliasNote.error ? 'err' : 'c2')} role="status">
                  {aliasNote.text}
                </p>
              ) : null}
            </div>
          </Grow>
        </section>

        <section className={cx(s.sec, s.next)} id="data" aria-labelledby="data-h">
          <h2 className="t-h2" id="data-h">
            Your data
          </h2>
          <div className={s.frow}>
            <div>
              <p className="t-s b">Download everything</p>
              <p className="t-xs c2">Portrait, chats, sources and history as JSON · your confirmed lines as a PDF</p>
            </div>
            {account ? (
              <div className="flex flex-wrap gap-2">
                <a href="/api/export" download className={buttonClass({ variant: 'secondary', size: 'sm' })}>
                  JSON
                </a>
                <a href="/api/resume" download className={buttonClass({ variant: 'secondary', size: 'sm' })}>
                  PDF
                </a>
              </div>
            ) : (
              <Button variant="secondary" size="sm">
                Request export
              </Button>
            )}
          </div>
          <div className={s.frow}>
            <div>
              <p className="t-s b">Delete account</p>
              <p className="t-xs c2">
                {account
                  ? 'Removes your portrait, alias, chats, résumés and history right away.'
                  : 'Removes your portrait, alias, chats and search index within 30 days.'}
              </p>
            </div>
            <button
              ref={delToggle}
              type="button"
              className={buttonClass({ variant: 'quiet', size: 'sm' })}
              aria-expanded={del}
              aria-controls="delete-account"
              onClick={() => setDel((v) => !v)}
            >
              Delete account…
            </button>
          </div>
          <Grow open={del} id="delete-account">
            <div className={s.danger}>
              {account ? (
                <>
                  <p className="t-s">
                    This deletes everything now and can’t be undone. Download your data first if you want a copy.
                  </p>
                  <label className="t-xs c2 mt-2.5 block" htmlFor="confirm-delete">
                    Type <b>delete</b> to confirm
                  </label>
                  <input
                    id="confirm-delete"
                    className="inp mt-1 max-w-[240px]"
                    value={confirmText}
                    autoComplete="off"
                    onChange={(e) => setConfirmText(e.target.value)}
                  />
                  {delNote ? (
                    <p className="t-xs err mt-1.5" role="alert">
                      {delNote}
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="t-s">
                  This can’t be undone after 30 days. Startups you’ve talked to keep the messages you sent them, but not
                  your portrait.
                </p>
              )}
              <div className="mt-2.5 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={saving || (!!account && confirmText.trim().toLowerCase() !== 'delete')}
                  onClick={account ? deleteNow : undefined}
                >
                  Delete my account
                </Button>
                <Button variant="quiet" size="sm" onClick={closeDelete}>
                  Cancel
                </Button>
              </div>
            </div>
          </Grow>
        </section>
      </div>
    </ShellMain>
  );
}
