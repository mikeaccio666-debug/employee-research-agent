import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EventPublic } from '@/components/events/EventPublic';
import { AMA_SLUG } from '@/lib/data/events';

export const metadata: Metadata = { title: 'Event · Northwind AMA' };

export function generateStaticParams() {
  return [{ slug: AMA_SLUG }];
}

/** V2-S10b · the public event page. Only Northwind's AMA exists so far. */
export default async function PublicEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== AMA_SLUG) notFound();
  return <EventPublic />;
}
