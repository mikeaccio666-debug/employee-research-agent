import type { SupabaseClient } from '@supabase/supabase-js';
import { CONNECTORS, type Action, type ConnectorId } from '@/lib/connectors/catalog';
import { callConnector } from '@/lib/connectors/client';
import { canSeal } from '@/lib/connectors/seal';
import { ConnectionAuth, connectionsOf, loadConnection, saveConnection } from '@/lib/connectors/store';
import { cap, saveSource, tidy, type Source } from './sources';

// The apps the person connected, as one turn's tools see them (read_connector in tools.ts). A
// page the agent reads whole becomes one of the person's sources, like a link they shared, so
// lines drawn from it quote it and the quote is checked against it later. Search results are only
// a list to choose from and are not kept.

export type ConnectorRead = { ok: true; text: string; source: Source | null } | { ok: false; error: string };

export type Connectors = {
  /** The apps connected and signed in. */
  connected: ConnectorId[];
  read(id: ConnectorId, action: Action, input: string): Promise<ConnectorRead>;
};

export const NO_CONNECTORS: Connectors = { connected: [], read: async () => ({ ok: false, error: 'no apps are connected' }) };

/** Where an app sends the person back after they sign in. */
export const callbackUrl = (origin: string, id: ConnectorId) => `${origin}/api/connectors/${id}/callback`;

const SEARCH_CHARS = 6_000;

/** A page's name: its first heading or line, without markup. */
const titleOf = (text: string) =>
  text
    .split('\n')
    .map((l) => l.replace(/<[^>]+>/g, '').replace(/^[#>*\-\s]+/, '').trim())
    .find((l) => l.length >= 2)
    ?.slice(0, 80) ?? null;

export async function connectorsFor(supabase: SupabaseClient, ownerId: string, origin: string, sources: Source[]): Promise<Connectors> {
  if (!canSeal()) return NO_CONNECTORS;
  const connected = (await connectionsOf(supabase, ownerId)).filter((c) => c.status === 'active').map((c) => c.provider);
  return {
    connected,
    async read(id, action, input) {
      const conn = await loadConnection(supabase, ownerId, id);
      if (!conn || conn.status !== 'active') return { ok: false, error: `${CONNECTORS[id].name} isn’t connected` };
      const auth = new ConnectionAuth(conn.secret, callbackUrl(origin, id), null, (secret) => saveConnection(supabase, ownerId, { ...conn, secret }));
      const reached = await callConnector(CONNECTORS[id], auth, action, input);
      if (!reached.ok) {
        // Signed out on the app's side: forget the tokens, so the studio offers to connect again.
        if (reached.reconnect) await saveConnection(supabase, ownerId, { provider: id, status: 'pending', state: null, secret: {} }).catch(() => {});
        return reached;
      }
      const text = tidy(reached.text);
      if (action === 'search') return { ok: true, text: text.slice(0, SEARCH_CHARS), source: null };
      if (text.length < 20) return { ok: false, error: 'that page has no text to read' };
      const url = /^https?:\/\//.test(input.trim()) ? input.trim() : null;
      const name = `${CONNECTORS[id].name} · ${titleOf(text) ?? input.slice(0, 60)}`;
      // The same page read again, unchanged, is the same source.
      const same = sources.find((s) => s.kind === id && s.name === name && s.pages[0]?.text === cap([{ page: null, text }])[0]?.text);
      if (same) return { ok: true, text, source: same };
      const source = await saveSource(supabase, ownerId, { ok: true, kind: id, name, url, pages: cap([{ page: null, text }]) }, null);
      return { ok: true, text, source };
    },
  };
}
