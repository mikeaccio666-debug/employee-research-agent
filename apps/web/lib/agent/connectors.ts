import type { SupabaseClient } from '@supabase/supabase-js';
import { canConnect, CONNECTOR_IDS, CONNECTORS, registeredClient, type Action, type ConnectorId } from '@/lib/connectors/catalog';
import { callConnector } from '@/lib/connectors/client';
import { requestApp } from '@/lib/connectors/requests';
import { canSeal } from '@/lib/connectors/seal';
import { ConnectionAuth, connectionsOf, loadConnection, saveConnection } from '@/lib/connectors/store';
import { MAX_IMAGE_BYTES, readImage, type See } from './images';
import { cap, saveSource, tidy, type Source } from './sources';

// The apps the person connected, as one turn's tools see them (read_connector in tools.ts). A
// page the agent reads whole becomes one of the person's sources, like a link they shared, so
// lines drawn from it quote it and the quote is checked against it later. Search results are only
// a list to choose from and are not kept.

export type ConnectorRead = { ok: true; text: string; source: Source | null } | { ok: false; error: string };

export type Connectors = {
  /** The apps connected and signed in. */
  connected: ConnectorId[];
  /** The apps they could connect here and haven't (offer_connect offers one). */
  available: ConnectorId[];
  read(id: ConnectorId, action: Action, input: string): Promise<ConnectorRead>;
  /** Counts an app they mentioned that can't be connected here yet (lib/connectors/requests.ts). */
  request(name: string): Promise<void>;
};

export const NO_CONNECTORS: Connectors = {
  connected: [],
  available: [],
  read: async () => ({ ok: false, error: 'no apps are connected' }),
  request: async () => {},
};

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

/** Pictures in one page read into text, at most this many. */
const PAGE_IMAGES = 3;

export async function connectorsFor(supabase: SupabaseClient, ownerId: string, origin: string, sources: Source[], see?: See): Promise<Connectors> {
  const request = (name: string) => requestApp(supabase, ownerId, name, 'chat').catch(() => {});
  if (!canSeal()) return { ...NO_CONNECTORS, request };
  const connected = (await connectionsOf(supabase, ownerId)).filter((c) => c.status === 'active' && canConnect(c.provider)).map((c) => c.provider);
  return {
    connected,
    available: CONNECTOR_IDS.filter((id) => canConnect(id) && !connected.includes(id)),
    request,
    async read(id, action, input) {
      const conn = await loadConnection(supabase, ownerId, id);
      if (!conn || conn.status !== 'active') return { ok: false, error: `${CONNECTORS[id].name} isn’t connected` };
      const registered = CONNECTORS[id].signIn === 'registered' ? registeredClient(id) : null;
      const auth = new ConnectionAuth(conn.secret, callbackUrl(origin, id), null, (secret) => saveConnection(supabase, ownerId, { ...conn, secret }), registered);
      const reached = await callConnector(CONNECTORS[id], auth, action, input);
      if (!reached.ok) {
        // Signed out on the app's side: forget the tokens, so the studio offers to connect again.
        if (reached.reconnect) await saveConnection(supabase, ownerId, { provider: id, status: 'pending', state: null, secret: {} }).catch(() => {});
        return reached;
      }
      if (action === 'search') return { ok: true, text: tidy(reached.text).slice(0, SEARCH_CHARS), source: null };
      // A page's pictures (a design, a chart) join its text, read once like an image they shared.
      const pictures: string[] = [];
      for (const [i, image] of (see ? (reached.images ?? []) : []).slice(0, PAGE_IMAGES).entries()) {
        const bytes = Buffer.from(image.data, 'base64');
        if (bytes.length > MAX_IMAGE_BYTES) continue;
        const read = await readImage(see!, bytes, `picture ${i + 1}`);
        if (read.ok) pictures.push(`[Picture ${i + 1} in the page]\n${read.pages[0]!.text}`);
      }
      const text = tidy([reached.text, ...pictures].join('\n\n'));
      if (text.length < 20) return { ok: false, error: 'that page has no text to read' };
      const url = reached.url ?? (/^https?:\/\//.test(input.trim()) ? input.trim() : null);
      const name = `${CONNECTORS[id].name} · ${titleOf(text) ?? input.slice(0, 60)}`;
      // The same page read again, unchanged, is the same source.
      const same = sources.find((s) => s.kind === id && s.name === name && s.pages[0]?.text === cap([{ page: null, text }])[0]?.text);
      if (same) return { ok: true, text, source: same };
      const source = await saveSource(supabase, ownerId, { ok: true, kind: id, name, url, pages: cap([{ page: null, text }]) }, null);
      return { ok: true, text, source };
    },
  };
}
