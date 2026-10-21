import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The design system ships as TypeScript source.
  transpilePackages: ['@portrait/ui'],
  // The dev badge sits on top of bottom-left UI (composer Attach) in reviews.
  devIndicators: false,
  // Read from disk at run time: the studio agent's skills (lib/agent/skills.ts) and the fonts
  // résumé PDFs embed (lib/resume/pdf.ts).
  outputFileTracingIncludes: { '/api/agent/chat': ['./lib/agent/skills/**/*'], '/api/resume': ['./lib/resume/fonts/*.woff'] },
  async rewrites() {
    // Portraits live at {domain}/@handle. Folders starting with "@" are parallel
    // routes in the App Router, so the page itself sits at /u/[handle].
    return [{ source: '/@:handle', destination: '/u/:handle' }];
  },
};

export default nextConfig;
