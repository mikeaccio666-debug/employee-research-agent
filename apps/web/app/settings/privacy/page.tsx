import type { Metadata } from 'next';
import { AppShell } from '@/components/shell/AppShell';
import { talentNav } from '@/lib/nav';
import { routes } from '@/lib/routes';
import { accountFor } from '@/lib/supabase/server';
import { Privacy } from './Privacy';

export const metadata: Metadata = { title: 'Privacy and visibility' };

/** S12 · privacy and visibility (V2-S12-Privacy), in the talent shell. */
export default async function PrivacyPage() {
  const account = await accountFor(routes.privacy);
  return (
    <AppShell nav={talentNav} active="settings" footer="Lin Zhou · @lin" agent={{ context: 'Privacy and visibility' }}>
      <Privacy account={account} />
    </AppShell>
  );
}
