'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

/**
 * The last fallback, when the root layout itself breaks. It replaces the whole document, so it
 * can't count on the app's styles or fonts: plain system type, light or dark with the system.
 * Server errors are already reported by instrumentation.ts; browser errors are reported here.
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = typeof error === 'object' && error !== null && 'digest' in error ? String(error.digest) : undefined;
  useEffect(() => {
    if (!digest) Sentry.captureException(error);
  }, [error, digest]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
          colorScheme: 'light dark',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <title>Something went wrong · Skystep</title>
        <main style={{ maxWidth: 480, padding: 24 }}>
          <h1 style={{ fontSize: 28, margin: '0 0 8px' }}>Something went wrong on our side.</h1>
          <p style={{ margin: '0 0 20px', opacity: 0.75 }}>It isn’t anything you did. Trying again usually works.</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ font: 'inherit', padding: '8px 16px', borderRadius: 8, border: '1px solid currentColor', background: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            Try again
          </button>
          {digest && <p style={{ marginTop: 24, fontSize: 13, opacity: 0.6 }}>Reference: {digest}</p>}
        </main>
      </body>
    </html>
  );
}
