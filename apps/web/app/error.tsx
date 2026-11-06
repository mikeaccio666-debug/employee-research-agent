'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import * as Sentry from '@sentry/nextjs';
import { Ruler, SectionMark, buttonClass } from '@portrait/ui';
import { PublicHeader } from '@/components/chrome';
import { routes } from '@/lib/routes';

/** The digest Next.js gives a server error; the same id is in the server logs and in Sentry. */
function digestOf(error: unknown) {
  return typeof error === 'object' && error !== null && 'digest' in error ? String(error.digest) : undefined;
}

/**
 * Something on the page broke. One plain sentence, a way to try again, and a reference the person
 * can send us. Server errors are already reported by instrumentation.ts (they carry a digest), so
 * only errors thrown in the browser are reported here.
 */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = digestOf(error);
  useEffect(() => {
    if (!digest) Sentry.captureException(error);
  }, [error, digest]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <title>Something went wrong · Portrait</title>
      <Ruler />
      <PublicHeader />
      <main className="wrap relative pt-24 pb-24 max-sm:pt-16">
        <SectionMark vw={200} d="M2 6 C50 3 120 7 198 4" dash="6 8" className="top-[78px] w-[160px] opacity-50" />
        <h1 className="t-h1">Something went wrong on our side.</h1>
        <p className="t-body c2 mt-2.5">It isn’t anything you did. Trying again usually works.</p>
        <div className="mt-[18px] flex flex-wrap items-center gap-2">
          <button type="button" className={buttonClass({ size: 'sm' })} onClick={() => retry()}>
            Try again
          </button>
          <Link className={buttonClass({ variant: 'quiet', size: 'sm' })} href={routes.landing}>
            Go home
          </Link>
        </div>
        {digest && <p className="t-xs c2 mt-6">Reference: {digest}</p>}
      </main>
    </div>
  );
}
