import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
// Self-hosted fonts (the canvas loads the same families from Google Fonts).
import '@fontsource/atkinson-hyperlegible-next/400.css';
import '@fontsource/atkinson-hyperlegible-next/400-italic.css';
import '@fontsource/atkinson-hyperlegible-next/500.css';
import '@fontsource/atkinson-hyperlegible-next/700.css';
import '@fontsource/atkinson-hyperlegible-next/800.css';
import '@fontsource/shantell-sans/400.css';
import '@fontsource/shantell-sans/500.css';
import '@fontsource/shantell-sans/600.css';
import '@fontsource/noto-sans-sc/400.css';
import '@fontsource/noto-sans-sc/500.css';
import '@fontsource/noto-sans-sc/700.css';
import 'lxgw-wenkai-webfont/lxgwwenkai-regular.css';
import './globals.css';
import { PreviewBadge } from '@/components/preview-badge';
import { THEME_BOOT } from '@/lib/theme';

export const metadata: Metadata = {
  title: { default: 'Skystep', template: '%s · Skystep' },
  description: 'A portrait drawn from what you have actually done — found by the startups that need it.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'oklch(0.968 0.003 200)' },
    { media: '(prefers-color-scheme: dark)', color: 'oklch(0.205 0.004 240)' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // Light by default; system.css switches the tokens to dark when the system is in dark mode.
    <html lang="en">
      {/* .pv sits on <body>, not <html>, so rem stays 16px as on the canvas. */}
      {/* The boot script may add `morning` (the optional 晨光 theme) before React hydrates. */}
      <body className="pv" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        {children}
        <PreviewBadge />
      </body>
    </html>
  );
}
