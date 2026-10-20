import type { Metadata } from 'next';
import { EventCreate } from '@/components/events/EventCreate';

export const metadata: Metadata = { title: 'New event' };

/** V2-S10c · Northwind creates an event in the workspace; click a field to edit it in the conversation. */
export default function NewEventPage() {
  return <EventCreate />;
}
