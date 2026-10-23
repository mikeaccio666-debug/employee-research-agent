'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Chip, buttonClass, cx } from '@portrait/ui';
import { ShellMain } from '@/components/shell/AppShell';
import { askForApp, disconnectApp, withdrawAppRequest } from '@/lib/connector-actions';
import { routes } from '@/lib/routes';
import s from './apps.module.css';

export type StoreApp = {
  id: string;
  name: string;
  blurb: string;
  category: string;
  /** connected: signed in; available: can be connected now; soon: not here yet. */
  state: 'connected' | 'available' | 'soon';
  /** They asked for it while it was coming soon. */
  requested: boolean;
};

const NOTICE: Record<string, string> = {
  connected: 'is connected. Ask the agent in the studio to look for something there.',
  declined: 'wasn’t connected: the sign-in was cancelled.',
  failed: 'couldn’t be connected. Try again in a moment.',
  unavailable: 'can’t be connected here yet.',
};

/** The app store's page: apps to connect, the ones not here yet, and a box to ask for another. */
export function AppStore({
  apps: initial,
  others: initialOthers,
  notice,
  signedIn,
}: {
  apps: StoreApp[];
  /** Apps outside the catalog they asked for, by the name they gave. */
  others: string[];
  notice: { app: string; result: string } | null;
  signedIn: boolean;
}) {
  const [apps, setApps] = useState(initial);
  const [others, setOthers] = useState(initialOthers);
  const [other, setOther] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [saving, startSaving] = useTransition();
  const noted = notice ? apps.find((a) => a.id === notice.app) : null;
  const set = (id: string, patch: Partial<StoreApp>) => setApps((all) => all.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  const run = (work: () => Promise<{ ok: boolean; error?: string }>, done: string, then: () => void) =>
    startSaving(async () => {
      setError('');
      const r = await work();
      if (!r.ok) return setError(r.error ?? 'That didn’t save.');
      then();
      setStatus(done);
    });

  const groups = [...new Set(apps.map((a) => a.category))];
  return (
    <ShellMain className={s.main}>
      <h1 className="t-h1">Apps</h1>
      <p className="t-s c2 mt-1.5 max-w-[60ch]">
        Connect an app and the agent can search and read what you keep there, to find evidence for your portrait. It only ever reads:
        it never changes, sends or deletes anything, and lines it draws from a page quote that page. Disconnect any time.{' '}
        <Link href={routes.privacyPolicy} className="linklike">
          How we handle it
        </Link>
      </p>
      {noted && NOTICE[notice!.result] ? (
        <p className="t-s mt-3" role="status">
          {noted.name} {NOTICE[notice!.result]}
        </p>
      ) : null}
      <p className={cx('t-xs mt-2', error ? 'err' : 'c2')} role="status" aria-live="polite">
        {error || status}
      </p>

      {groups.map((g) => (
        <section key={g} className="mt-6" aria-label={g}>
          <h2 className="lab">{g}</h2>
          <ul className={s.grid}>
            {apps
              .filter((a) => a.category === g)
              .map((a) => (
                <li key={a.id} className={s.card}>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="t-h3">{a.name}</p>
                    <p className="t-xs c2 shrink-0 whitespace-nowrap">{a.state === 'connected' ? 'Connected' : a.state === 'soon' ? 'Coming soon' : ''}</p>
                  </div>
                  <p className="t-s c2 mt-1">{a.blurb}</p>
                  <div className="mt-3">
                    {!signedIn ? null : a.state === 'connected' ? (
                      <Chip
                        size="sm"
                        tone="wall"
                        disabled={saving}
                        onClick={() => run(() => disconnectApp(a.id), `${a.name} disconnected`, () => set(a.id, { state: 'available' }))}
                      >
                        Disconnect
                      </Chip>
                    ) : a.state === 'available' ? (
                      <form method="post" action={`/api/connectors/${a.id}/start`}>
                        <input type="hidden" name="from" value="apps" />
                        <button type="submit" className={buttonClass()} disabled={saving}>
                          Connect
                        </button>
                      </form>
                    ) : a.requested ? (
                      <Chip
                        size="sm"
                        tone="wall"
                        disabled={saving}
                        onClick={() => run(() => withdrawAppRequest(a.id), `Took back your request for ${a.name}`, () => set(a.id, { requested: false }))}
                      >
                        Asked for · undo
                      </Chip>
                    ) : (
                      <Chip
                        size="sm"
                        disabled={saving}
                        onClick={() => run(() => askForApp(a.id), `Noted: you’d like ${a.name}`, () => set(a.id, { requested: true }))}
                      >
                        I want this
                      </Chip>
                    )}
                  </div>
                </li>
              ))}
          </ul>
        </section>
      ))}

      {signedIn ? (
        <section className="mt-8 max-w-[520px]" aria-labelledby="ask-h">
          <h2 className="lab" id="ask-h">
            Something else?
          </h2>
          <p className="t-s c2 mt-1">Tell us which app your work lives in. The ones people ask for most come first.</p>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const name = other.trim();
              if (!name) return;
              startSaving(async () => {
                setError('');
                const r = await askForApp(name);
                if (!r.ok) return setError(r.error);
                setOthers((all) => (all.includes(r.app) ? all : [...all, r.app]));
                setOther('');
                setStatus(`Noted: you’d like ${name}`);
              });
            }}
          >
            <input
              className={s.input}
              value={other}
              maxLength={40}
              onChange={(e) => setOther(e.target.value)}
              placeholder="Behance, LinkedIn, Dribbble…"
              aria-label="App name"
            />
            <button type="submit" className={buttonClass()} disabled={saving || !other.trim()}>
              Ask for it
            </button>
          </form>
          {others.length ? (
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="Apps you asked for">
              {others.map((o) => (
                <li key={o}>
                  <Chip
                    size="sm"
                    tone="wall"
                    disabled={saving}
                    onClick={() => run(() => withdrawAppRequest(o), `Took back your request for ${o}`, () => setOthers((all) => all.filter((x) => x !== o)))}
                  >
                    {o} · undo
                  </Chip>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </ShellMain>
  );
}
