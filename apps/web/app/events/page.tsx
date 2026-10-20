import type { Metadata } from 'next';
import { Program } from '@/components/events/Program';

export const metadata: Metadata = { title: 'Events · the program' };

/** V2-S10 · the event program: registering circles the date. */
export default function EventsPage() {
  return <Program />;
}
