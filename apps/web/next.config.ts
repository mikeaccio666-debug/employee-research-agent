import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The design system ships as TypeScript source.
  transpilePackages: ['@portrait/ui'],
  // The dev badge sits on top of bottom-left UI (composer Attach) in reviews.
  devIndicators: false,
  async rewrites() {
    // Portraits live at {domain}/@handle. Folders starting with "@" are parallel
    // routes in the App Router, so the page itself sits at /u/[handle].
    return [{ source: '/@:handle', destination: '/u/:handle' }];
  },
};

export default nextConfig;
