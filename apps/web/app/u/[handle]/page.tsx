import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DrawnPortrait } from '@/components/portrait/DrawnPortrait';
import { StoryPortrait } from '@/components/portrait/StoryPortrait';
import { WorkPortrait } from '@/components/portrait/WorkPortrait';
import { handles, isHandle, portraitTitles, storyPortrait, workPortrait } from '@/lib/data/portraits';
import { HANDLE_PATTERN } from '@/lib/account';
import { getPublicPortrait } from '@/lib/supabase/public';

// Public portraits. /@handle is rewritten here (next.config.ts). The canvas's examples keep their
// handles (lin → S02, maya → S02-Maya); every other handle is read from the database's
// public_portraits view, which holds published portraits of people who chose Public.
type Props = { params: Promise<{ handle: string }> };

// Cached at the CDN and refreshed when someone publishes or changes who can see their page
// (revalidatePath in lib/account-actions.ts); the minute is a backstop.
export const revalidate = 60;

export function generateStaticParams() {
  return handles.map((handle) => ({ handle }));
}

async function lookup(raw: string) {
  const handle = decodeURIComponent(raw).toLowerCase();
  return HANDLE_PATTERN.test(handle) ? getPublicPortrait(handle) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  if (isHandle(handle)) {
    // The S02 board's title already ends in "· Portrait", so it skips the site's title template.
    return handle === 'lin' ? { title: { absolute: portraitTitles.lin } } : { title: portraitTitles.maya };
  }
  const portrait = await lookup(handle);
  return portrait ? { title: portrait.display_name || `@${portrait.handle}` } : {};
}

export default async function PortraitPage({ params }: Props) {
  const { handle } = await params;
  if (isHandle(handle)) {
    return handle === 'lin' ? <StoryPortrait data={storyPortrait('public')} /> : <WorkPortrait data={workPortrait()} />;
  }
  const portrait = await lookup(handle);
  if (!portrait) notFound();
  return <DrawnPortrait portrait={portrait} />;
}
