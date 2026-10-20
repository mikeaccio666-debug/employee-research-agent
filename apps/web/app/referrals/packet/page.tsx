import type { Metadata } from 'next';
import { Packet } from './Packet';

export const metadata: Metadata = { title: 'Referral packet · Fernway' };

export default function PacketPage() {
  return <Packet />;
}
