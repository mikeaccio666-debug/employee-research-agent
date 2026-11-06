// Error reports to Sentry, shared by the browser, server and edge set-ups (instrumentation-client.ts,
// sentry.server.config.ts, sentry.edge.config.ts).
//
// Off until NEXT_PUBLIC_SENTRY_DSN is set in Vercel (and the app is redeployed): without a DSN,
// Sentry.init does nothing and every capture is a no-op.
//
// Errors only by default: no performance traces unless NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE is set,
// and no session replay. The studio handles résumés and conversations, so nothing people write is
// sent: no request or response bodies, cookies, query strings (OAuth callbacks carry codes there),
// AI or MCP inputs and outputs, database query values, or local variables in stack frames.
// Sentry v11 collects most of these by default, so each one is turned off here explicitly.
//
// Error messages and breadcrumbs can carry text too, so before anything is sent: quoted text in
// error messages is replaced (JSON.parse, for one, quotes the input it failed on), console output
// isn't kept as breadcrumbs, and query strings come off breadcrumb URLs. Errors we catch ourselves
// go through lib/observability/report.ts, which doesn't send their message at all.
import type { Breadcrumb, ErrorEvent } from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || undefined;
const traces = Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE);

export const sentryOptions = {
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate: Number.isFinite(traces) && traces > 0 && traces <= 1 ? traces : 0,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: { request: { allow: ['user-agent', 'content-type', 'accept-language'] }, response: false },
    httpBodies: [] as never[],
    urlQueryParams: false,
    graphQL: { document: false, variables: false },
    genAI: { inputs: false, outputs: false },
    mcp: { inputs: false, outputs: false },
    databaseQueryData: false,
    queues: false,
    stackFrameVariables: false,
  },
  beforeSend(event: ErrorEvent) {
    if (event.message) event.message = scrubText(event.message);
    for (const ex of event.exception?.values ?? []) if (ex.value) ex.value = scrubText(ex.value);
    return event;
  },
  beforeBreadcrumb(crumb: Breadcrumb) {
    if (crumb.category === 'console') return null;
    if (crumb.message) crumb.message = stripQuery(crumb.message);
    if (crumb.data && typeof crumb.data.url === 'string') crumb.data = { ...crumb.data, url: stripQuery(crumb.data.url) };
    return crumb;
  },
};

/** Quoted text in a message ("...", '...', `...`, “...”) may be someone's words; the rest is ours. */
export function scrubText(text: string) {
  return text
    .replace(/(["'`])(?:(?!\1)[^\n])+\1/g, '[Filtered]')
    .replace(/[“‘][^”’\n]+[”’]/g, '[Filtered]')
    .slice(0, 500);
}

function stripQuery(text: string) {
  return text.replace(/\?[^\s#]*/g, '');
}
