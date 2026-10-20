import type { Metadata } from 'next';
import { BriefStudio } from '@/components/hire/BriefStudio';

export const metadata: Metadata = { title: 'Brief studio' };

export default function BriefPage() {
  return <BriefStudio />;
}
