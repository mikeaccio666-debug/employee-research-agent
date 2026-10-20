import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EventInApp } from '@/components/events/EventInApp';
import { AMA_SLUG } from '@/lib/data/events';

export const metadata: Metadata = { title: 'Talk · seeker looking at an event' };

export function generateStaticParams() {
  return [{ slug: AMA_SLUG }];
}

/** V2-S01b-Agent-Event · the in-app event page, drawn with the agent panel open. */
export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== AMA_SLUG) notFound();
  return <EventInApp />;
}
