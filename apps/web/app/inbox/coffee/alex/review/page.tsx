import type { Metadata } from 'next';
import { Review } from './Review';

export const metadata: Metadata = { title: 'After a coffee chat' };

/** V2-S20-Review: both sides review after a coffee chat — tally marks, double-blind. Drawn without app chrome. */
export default function ReviewPage() {
  return <Review />;
}
