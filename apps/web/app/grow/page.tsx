import type { Metadata } from 'next';
import { GrowPlan } from './GrowPlan';

export const metadata: Metadata = { title: 'Grow · plan' };

export default function GrowPage() {
  return <GrowPlan />;
}
