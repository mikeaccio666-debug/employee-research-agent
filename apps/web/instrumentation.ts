import * as Sentry from '@sentry/nextjs';

// Runs once when a server instance starts: sets up error reports for its runtime.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') await import('./sentry.server.config');
  if (process.env.NEXT_RUNTIME === 'edge') await import('./sentry.edge.config');
}

// Errors thrown while rendering pages, in API routes and in the proxy.
export const onRequestError = Sentry.captureRequestError;
