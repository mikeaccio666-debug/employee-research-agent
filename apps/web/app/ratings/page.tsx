import type { Metadata } from 'next';
import { Ratings } from './Ratings';

export const metadata: Metadata = { title: 'Scores and disputes' };

/** V2-S20b-Ratings: how a score is shown, and how a flagged line is argued. Drawn without app chrome. */
export default function RatingsPage() {
  return <Ratings />;
}
