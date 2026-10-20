import type { Metadata } from 'next';
import { ContactSheet } from '@/components/hire/ContactSheet';

export const metadata: Metadata = { title: 'Contact sheet · Northwind' };

export default function ContactSheetPage() {
  return <ContactSheet />;
}
