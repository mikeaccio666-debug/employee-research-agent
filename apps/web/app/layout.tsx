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
import { ThemeScript } from '@/components/theme';

export const metadata: Metadata = {
  title: { default: 'Portrait', template: '%s · Portrait' },
  description: 'A portrait drawn from what you have actually done — found by the startups that need it.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'oklch(0.935 0.016 215)' },
    { media: '(prefers-color-scheme: dark)', color: 'oklch(0.245 0.030 250)' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // The theme script adds .light/.dark to <html> before React hydrates.
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      {/* .pv sits on <body>, not <html>, so rem stays 16px as on the canvas. */}
      <body className="pv">{children}</body>
    </html>
  );
}
