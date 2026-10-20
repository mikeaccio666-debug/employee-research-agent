import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ShareCards } from '@/components/portrait/ShareCards';
import { portraitTitles } from '@/lib/data/portraits';

// V2-S02-Share-Cards: the named, anonymous and work cards, drawn for Lin's portrait.
type Props = { params: Promise<{ handle: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ handle: 'lin' }];
}

export const metadata: Metadata = { title: portraitTitles.cards };

export default async function ShareCardsPage({ params }: Props) {
  const { handle } = await params;
  if (handle !== 'lin') notFound();
  return <ShareCards />;
}
