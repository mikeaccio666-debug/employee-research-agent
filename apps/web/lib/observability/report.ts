import * as Sentry from '@sentry/nextjs';

type Context = Record<string, string | number | boolean | null | undefined>;

/**
 * An error we caught and handled (a failed agent turn, a connector call that failed) still needs
 * someone to hear about it. Logs it as before, and sends it to Sentry when Sentry is set up.
 *
 * Sentry never gets the original message: messages can carry what people wrote (JSON.parse quotes
 * the text it choked on, and the headline critic parses text built from someone's portrait). It gets
 * `what`, the error's type, its stack frames, and a status or error code when the error has one.
 * Context is ids and names only.
 */
export function reportError(what: string, error: unknown, context: Context = {}) {
  console.error(what, { ...context, error: error instanceof Error ? error.message : error });
  Sentry.captureException(withoutMessage(what, error), { tags: { what }, extra: { ...context, ...codesOf(error) } });
}

export function withoutMessage(what: string, error: unknown): Error {
  const type = error instanceof Error ? error.name : typeof error;
  const safe = new Error(what);
  safe.name = type;
  if (error instanceof Error && error.stack) {
    // Keep the frames; the first line of a stack repeats the message, so it's rebuilt from `what`.
    const frames = error.stack.split('\n').filter((line) => /^\s+at /.test(line));
    safe.stack = [`${type}: ${what}`, ...frames].join('\n');
  }
  return safe;
}

/** HTTP status and error codes (an API's 429, Postgres's 23505) say what went wrong without content. */
function codesOf(error: unknown): Context {
  if (typeof error !== 'object' || error === null) return {};
  const { status, code } = error as { status?: unknown; code?: unknown };
  return {
    status: typeof status === 'number' ? status : undefined,
    code: typeof code === 'string' && /^[\w.-]{1,40}$/.test(code) ? code : undefined,
  };
}
