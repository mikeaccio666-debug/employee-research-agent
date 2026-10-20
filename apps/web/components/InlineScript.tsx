'use client';

/**
 * An inline script that only runs from the server HTML. In the browser it renders as
 * text/plain, so React never creates a live <script> (nor warns about one) when it renders
 * this part of the tree itself. Pattern from Next's "Preventing flash before hydration" guide.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
