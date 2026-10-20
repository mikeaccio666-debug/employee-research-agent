import type { Metadata } from 'next';
import { Landing } from '@/components/entry/Landing';

export const metadata: Metadata = { title: { absolute: 'Portrait · landing' } };

/** S03 · the landing page (V2-S03-Landing). */
export default function LandingPage() {
  return <Landing />;
}
