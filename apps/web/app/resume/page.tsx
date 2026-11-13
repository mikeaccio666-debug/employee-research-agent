import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { AppShell, ShellMain } from '@/components/shell/AppShell';
import { ResumeEditor } from '@/components/resume/ResumeEditor';
import { loadPortrait } from '@/lib/agent/store';
import { defaultStyle, docFromPortrait, exampleDoc } from '@/lib/resume/doc';
import { insertVersion, versionsOf, type ResumeVersion } from '@/lib/resume/store';
import { talentNav } from '@/lib/nav';
import { routes } from '@/lib/routes';
import { accountFor, getViewer, supabaseServer } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Résumé' };

const example = (): ResumeVersion => ({
  id: '00000000-0000-0000-0000-000000000000',
  name: 'Default',
  isDefault: true,
  target: '',
  doc: exampleDoc(),
  style: defaultStyle(),
  updatedAt: new Date(0).toISOString(),
});

/**
 * The résumé editor (PRD COACH-12): a traditional one-page résumé for people and places that still
 * want one. The first visit makes a "Default" version from the confirmed lines of the portrait.
 * Without Supabase it shows Lin Zhou's, the example person of the other boards, and nothing saves.
 */
export default async function ResumePage() {
  const account = await accountFor(routes.resume);
  const [viewer, supabase] = account ? await Promise.all([getViewer(), supabaseServer()]) : [null, null];

  let versions: ResumeVersion[] = [example()];
  let canSave = false;
  let notice: string | null = null;

  if (viewer && supabase) {
    try {
      versions = await versionsOf(supabase, viewer.user.id);
      if (!versions.length) {
        const { spec } = await loadPortrait(supabase, viewer.user.id);
        const p = viewer.profile;
        const host = (await headers()).get('host');
        const link = p?.handle && p.visibility === 'public' && host ? `${host}${routes.portrait(p.handle)}` : null;
        const doc = docFromPortrait(spec, { name: p?.display_name || '', email: viewer.user.email ?? null, link });
        versions = [await insertVersion(supabase, viewer.user.id, { name: 'Default', isDefault: true, doc, style: defaultStyle() })];
      }
      canSave = viewer.user.is_anonymous !== true;
      if (!canSave) notice = 'You’re trying Skystep without an account. Sign up to keep this résumé.';
    } catch {
      // Most likely the resumes table isn't on this database yet (a migration to run).
      versions = [example()];
      notice = 'Résumé versions can’t be saved here yet. This is an example; nothing you change is kept.';
    }
  }

  return (
    <AppShell nav={talentNav} active="resume" footer={account ? undefined : 'Lin Zhou · @lin'} agent={false}>
      <ShellMain plain style={{ flex: 1, minWidth: 0 }}>
        <ResumeEditor versions={versions} canSave={canSave} notice={notice} />
      </ShellMain>
    </AppShell>
  );
}
