import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CandidateFrame } from '@/components/hire/CandidateFrame';
import { CandidateNightHeron } from '@/components/hire/CandidateNightHeron';
import { CandidateQuietOtter } from '@/components/hire/CandidateQuietOtter';
import { frameBySlug, frameSlug, sheetFrames } from '@/lib/data/hire';

type Props = { params: Promise<{ frame: string }> };

export function generateStaticParams() {
  return sheetFrames.map((f) => ({ frame: frameSlug(f.no) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const f = frameBySlug((await params).frame);
  if (!f) return {};
  // 07A is the board drawn with the agent panel open (V2-S01b).
  return { title: f.no === '07A' ? 'Talk · startup looking at a candidate' : `Candidate · ${f.no}` };
}

/** One frame of the contact sheet: 08A is V2-S07, 07A is V2-S01b; the rest reuse S07's layout. */
export default async function FramePage({ params }: Props) {
  const f = frameBySlug((await params).frame);
  if (!f) notFound();
  if (f.no === '08A') return <CandidateQuietOtter />;
  if (f.no === '07A') return <CandidateNightHeron />;
  return <CandidateFrame frame={f} />;
}
