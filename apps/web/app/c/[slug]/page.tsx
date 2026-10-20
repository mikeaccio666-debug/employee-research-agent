import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Ruler, buttonClass } from '@portrait/ui';
import { PublicHeader } from '@/components/chrome';
import { northwind } from '@/lib/data/cast';
import { routes } from '@/lib/routes';
import { Company } from './Company';

export const metadata: Metadata = { title: 'Northwind · company' };

/** Only Northwind has a company page in the canvas. */
export function generateStaticParams() {
  return [{ slug: northwind.slug }];
}

/** V2-S11-Company: Northwind's public page, with the company's own height line (3 → 40 kitchens). */
export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== northwind.slug) notFound();
  return (
    <div className="relative min-h-screen overflow-hidden">
      <Ruler />
      <PublicHeader>
        <Link className={buttonClass({ variant: 'quiet' })} href={routes.birth}>
          Draw yours
        </Link>
      </PublicHeader>
      <Company />
    </div>
  );
}
