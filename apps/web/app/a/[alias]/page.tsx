import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StoryPortrait } from '@/components/portrait/StoryPortrait';
import { aliases, isAlias, portraitTitles, storyPortrait } from '@/lib/data/portraits';

// The anonymous view of a portrait (S02 mode "anonymous", S02-Mobile phone 3).
// It is rendered from anonymized data only: no real name, handle or photo reaches this page.
type Props = { params: Promise<{ alias: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return aliases.map((alias) => ({ alias }));
}

export const metadata: Metadata = { title: portraitTitles.anonymous };

export default async function AnonymousPortraitPage({ params }: Props) {
  const { alias } = await params;
  if (!isAlias(alias)) notFound();
  return <StoryPortrait anonymous data={storyPortrait('anonymous')} />;
}
