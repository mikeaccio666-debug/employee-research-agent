import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs/config';

// Preview deployments use a separate test Supabase project, or none (lib/supabase/env.ts).
const deployment = process.env.VERCEL_ENV ?? '';
if (deployment === 'preview') {
  console.log(
    process.env.NEXT_PUBLIC_SUPABASE_PREVIEW_URL && process.env.NEXT_PUBLIC_SUPABASE_PREVIEW_PUBLISHABLE_KEY
      ? `Preview build: Supabase is the test project at ${process.env.NEXT_PUBLIC_SUPABASE_PREVIEW_URL}`
      : 'Preview build: no NEXT_PUBLIC_SUPABASE_PREVIEW_URL / _PUBLISHABLE_KEY, so this preview runs on the example data, without sign-in',
  );
}

const nextConfig: NextConfig = {
  // Written into the server and browser code at build time: production, preview, development, or
  // empty off Vercel. Vercel sets VERCEL_ENV during the build.
  env: { DEPLOY_ENV: deployment },
  // The design system ships as TypeScript source.
  transpilePackages: ['@portrait/ui'],
  // The dev badge sits on top of bottom-left UI (composer Attach) in reviews.
  devIndicators: false,
  // Read from disk at run time: the studio agent's skills (lib/agent/skills.ts) and the fonts
  // résumé PDFs embed (lib/resume/pdf.ts).
  outputFileTracingIncludes: { '/api/agent/chat': ['./lib/agent/skills/**/*'], '/api/resume': ['./lib/resume/fonts/*.woff'],
    // Share cards fall back to the résumé's Chinese font for names Atkinson can't draw.
    '/u/[handle]/opengraph-image': ['./lib/resume/fonts/noto-sans-sc-400.woff'],
  },
  async rewrites() {
    // Portraits live at {domain}/@handle. Folders starting with "@" are parallel
    // routes in the App Router, so the page itself sits at /u/[handle].
    return [{ source: '/@:handle', destination: '/u/:handle' }];
  },
};

// Error reports (see lib/observability/sentry-options.ts). With SENTRY_AUTH_TOKEN, SENTRY_ORG and
// SENTRY_PROJECT set, the build uploads source maps so stack traces in Sentry point at our code, then
// deletes the browser ones so they aren't served. Without them, nothing is uploaded.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  widenClientFileUpload: true,
  silent: !process.env.CI,
  telemetry: false,
});
