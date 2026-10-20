import type { Metadata } from 'next';
import { Feed } from '@/components/feed/Feed';

export const metadata: Metadata = { title: 'Feed' };

/** V2-S09 · the feed: anonymity check and a blurred logo before posting under an alias. */
export default function FeedPage() {
  return <Feed />;
}
