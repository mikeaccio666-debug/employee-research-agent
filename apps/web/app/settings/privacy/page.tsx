import type { Metadata } from 'next';
import { AppShell } from '@/components/shell/AppShell';
import { talentNav } from '@/lib/nav';
import { Privacy } from './Privacy';

export const metadata: Metadata = { title: 'Privacy and visibility' };

/** S12 · privacy and visibility (V2-S12-Privacy), in the talent shell. */
export default function PrivacyPage() {
  return (
    <AppShell nav={talentNav} active="settings" footer="Lin Zhou · @lin" agent={{ context: 'Privacy and visibility' }}>
      <Privacy />
    </AppShell>
  );
}
