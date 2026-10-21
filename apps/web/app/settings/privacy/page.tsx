import type { Metadata } from 'next';
import { AppShell } from '@/components/shell/AppShell';
import { talentNav } from '@/lib/nav';
import { routes } from '@/lib/routes';
import { loadPortrait } from '@/lib/agent/store';
import type { FieldLevels } from '@/lib/account-actions';
import { accountFor, getViewer, supabaseServer } from '@/lib/supabase/server';
import { Privacy, type PrivateFields } from './Privacy';

export const metadata: Metadata = { title: 'Privacy and visibility' };

/** S12 · privacy and visibility (V2-S12-Privacy), in the talent shell. */
export default async function PrivacyPage() {
  const account = await accountFor(routes.privacy);
  const fields = account ? await privateFields() : null;
  return (
    <AppShell nav={talentNav} active="settings" footer="Lin Zhou · @lin" agent={{ context: 'Privacy and visibility' }}>
      <Privacy account={account} fields={fields} />
    </AppShell>
  );
}

/** The sensitive fields as they stand for this person, and who they chose may see each. */
async function privateFields(): Promise<PrivateFields | null> {
  const [viewer, supabase] = await Promise.all([getViewer(), supabaseServer()]);
  if (!viewer || !supabase) return null;
  const [{ spec }, levels] = await Promise.all([
    loadPortrait(supabase, viewer.user.id),
    // field_levels arrives with the privacy migration; until it runs, the defaults show and saving says so.
    supabase.from('profiles').select('field_levels').eq('id', viewer.user.id).maybeSingle<{ field_levels: FieldLevels }>(),
  ]);
  return {
    levels: levels.data?.field_levels ?? null,
    values: {
      wa: spec.preferences.workAuth ?? 'Not set',
      pay: 'Not set',
      ct: viewer.user.email ?? 'Not set',
    },
  };
}
