import type { Metadata } from 'next';
import { agentEnv, canSwitchModel, modelChoices } from '@/lib/agent/env';
import { conversationFor, history, loadPortrait, toThread } from '@/lib/agent/store';
import { privacyVisibility } from '@/lib/data/entry';
import { routes } from '@/lib/routes';
import { accountFor, getViewer, supabaseServer } from '@/lib/supabase/server';
import { LiveStudio } from './LiveStudio';
import { Studio } from './Studio';

export const metadata: Metadata = { title: 'Studio' };

/**
 * S01 · the portrait studio. With Supabase set up, signed-out people sign in first and a real
 * account talks to the agent about its own portrait; without it, the canvas's Lin example stays.
 */
export default async function StudioPage() {
  const account = await accountFor(routes.studio);
  const viewer = account ? await getViewer() : null;
  const supabase = await supabaseServer();
  if (!account || !viewer || !supabase) return <Studio />;

  const id = viewer.user.id;
  const conversationId = await conversationFor(supabase, id, false);
  const [rows, portrait] = await Promise.all([
    conversationId ? history(supabase, conversationId) : Promise.resolve([]),
    loadPortrait(supabase, id),
  ]);
  const visibility = privacyVisibility.find((v) => v.value === account.visibility)?.title ?? 'Hidden';

  return (
    <LiveStudio
      ownerId={id}
      name={account.displayName || account.alias}
      greet={account.displayName?.split(/\s+/)[0] || null}
      handle={account.handle}
      visibilityLabel={visibility}
      spec={portrait.spec}
      thread={toThread(rows)}
      published={portrait.published}
      publishedRev={portrait.publishedRev}
      agentReady={agentEnv !== null}
      models={canSwitchModel(viewer.user.email) ? { choices: modelChoices(), current: agentEnv?.provider ?? null } : null}
    />
  );
}
