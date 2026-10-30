import type { Metadata } from 'next';
import { AppShell } from '@/components/shell/AppShell';
import { CATEGORY_LABEL, canConnect, CONNECTOR_IDS, CONNECTORS } from '@/lib/connectors/catalog';
import { requestsOf } from '@/lib/connectors/requests';
import { canSeal } from '@/lib/connectors/seal';
import { connectionsOf } from '@/lib/connectors/store';
import { talentNav } from '@/lib/nav';
import { routes } from '@/lib/routes';
import { accountFor, getViewer, supabaseServer } from '@/lib/supabase/server';
import { AppStore, type StoreApp } from './AppStore';

export const metadata: Metadata = { title: 'Apps' };

/**
 * The app store: every app in the catalog (lib/connectors/catalog.ts), to connect, disconnect, or
 * ask for while it isn't here yet. The agent only ever reads from them.
 */
export default async function AppsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const account = await accountFor(routes.apps);
  const viewer = account ? await getViewer() : null;
  const supabase = await supabaseServer();
  const sealing = canSeal();
  const [connections, requests, query] = await Promise.all([
    supabase && viewer && sealing ? connectionsOf(supabase, viewer.user.id) : Promise.resolve([]),
    supabase && viewer ? requestsOf(supabase, viewer.user.id) : Promise.resolve([]),
    searchParams,
  ]);
  const apps: StoreApp[] = CONNECTOR_IDS.map((id) => {
    const c = CONNECTORS[id];
    const connected = connections.some((x) => x.provider === id && x.status === 'active');
    return {
      id,
      name: c.name,
      blurb: c.blurb,
      category: CATEGORY_LABEL[c.category],
      state: connected ? 'connected' : sealing && canConnect(id) ? 'available' : 'soon',
      requested: requests.includes(id),
    };
  });
  const notice = typeof query.connector === 'string' && typeof query.result === 'string' ? { app: query.connector, result: query.result } : null;
  const known = new Set<string>(CONNECTOR_IDS);
  return (
    <AppShell nav={talentNav} active="apps" footer={account ? undefined : 'Lin Zhou · @lin'} agent={{ context: 'Apps' }}>
      <AppStore apps={apps} others={requests.filter((r) => !known.has(r))} notice={notice} signedIn={!!viewer} />
    </AppShell>
  );
}
