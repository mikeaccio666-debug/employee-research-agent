// Error reports from the browser. See lib/observability/sentry-options.ts for what is and isn't sent.
import * as Sentry from '@sentry/nextjs';
import { sentryOptions } from '@/lib/observability/sentry-options';

Sentry.init(sentryOptions);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
