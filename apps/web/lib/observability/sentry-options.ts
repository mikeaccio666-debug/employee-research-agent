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
};
