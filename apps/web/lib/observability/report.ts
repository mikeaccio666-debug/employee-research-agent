import * as Sentry from '@sentry/nextjs';

type Context = Record<string, string | number | boolean | null | undefined>;

/**
 * An error we caught and handled (a failed agent turn, a connector call that failed) still needs
 * someone to hear about it. Logs it as before, and sends it to Sentry when Sentry is set up.
 * Context is ids and names only, never what people wrote.
 */
export function reportError(what: string, error: unknown, context: Context = {}) {
  console.error(what, { ...context, error: error instanceof Error ? error.message : error });
  Sentry.captureException(error, { tags: { what }, extra: context });
}
