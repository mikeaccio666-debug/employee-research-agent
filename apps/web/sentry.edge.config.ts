// Error reports from the edge runtime. Loaded by instrumentation.ts.
// See lib/observability/sentry-options.ts for what is and isn't sent.
import * as Sentry from '@sentry/nextjs';
import { sentryOptions } from '@/lib/observability/sentry-options';

Sentry.init(sentryOptions);
