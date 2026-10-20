import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StoryPortrait } from '@/components/portrait/StoryPortrait';
import { WorkPortrait } from '@/components/portrait/WorkPortrait';
import { handles, portraitTitles, storyPortrait, workPortrait } from '@/lib/data/portraits';

// Public portraits. /@handle is rewritten here (next.config.ts): lin → S02, maya → S02-Maya.
type Props = { params: Promise<{ handle: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return handles.map((handle) => ({ handle }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  // The S02 board's title already ends in "· Portrait", so it skips the site template.
  if (handle === 'lin') return { title: { absolute: portraitTitles.lin } };
  if (handle === 'maya') return { title: portraitTitles.maya };
  return {};
}

export default async function PortraitPage({ params }: Props) {
  const { handle } = await params;
  if (handle === 'lin') return <StoryPortrait data={storyPortrait('public')} />;
  if (handle === 'maya') return <WorkPortrait data={workPortrait()} />;
  notFound();
}
