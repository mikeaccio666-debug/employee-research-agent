import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Paywall } from '@/components/hire/Paywall';

type Props = { params: Promise<{ frame: string }> };

export const metadata: Metadata = { title: 'Out of requests' };

// The canvas draws this moment for frame 07A only.
export function generateStaticParams() {
  return [{ frame: '07a' }];
}

/** V2-S13b: a request to frame 07A when the month's requests are used up. */
export default async function RequestPage({ params }: Props) {
  if ((await params).frame.toLowerCase() !== '07a') notFound();
  return <Paywall />;
}
