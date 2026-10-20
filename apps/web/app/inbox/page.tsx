import type { Metadata } from 'next';
import { Inbox } from './Inbox';

export const metadata: Metadata = { title: 'Inbox · requests' };

/** V2-S08-Inbox: Lin's requests — accept, or decline in place. */
export default function InboxPage() {
  return <Inbox />;
}
