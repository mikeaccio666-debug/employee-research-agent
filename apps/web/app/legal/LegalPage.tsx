import Link from 'next/link';
import type { ReactNode } from 'react';
import { routes } from '@/lib/routes';

// The privacy policy and terms (app/legal): plain pages anyone can read, signed in or not. The
// app stores and sign-in screens of the apps people connect (Google, GitHub) link to them.

/** Where people can write to us, once there is an address (LEGAL_CONTACT_EMAIL). */
export const contact = () => process.env.LEGAL_CONTACT_EMAIL || null;

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-[68ch] px-4 py-10">
      <p className="t-xs c2">
        <Link href={routes.landing} className="linklike">
          Portrait
        </Link>{' '}
        ·{' '}
        <Link href={routes.privacyPolicy} className="linklike">
          Privacy
        </Link>{' '}
        ·{' '}
        <Link href={routes.terms} className="linklike">
          Terms
        </Link>
      </p>
      <h1 className="t-h1 mt-4">{title}</h1>
      <p className="t-xs c2 mt-1">Last updated {updated}</p>
      <div className="mt-6 flex flex-col gap-4 t-body">{children}</div>
    </main>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="t-h3 mt-2">{title}</h2>
      {children}
    </section>
  );
}
