import type { Metadata } from 'next';
import { Requests } from './Requests';

export const metadata: Metadata = { title: 'Talk · insider looking at requests' };

export default function InsiderRequestsPage() {
  return <Requests />;
}
