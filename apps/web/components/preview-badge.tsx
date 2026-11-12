import { isPreview, productionRefused, supabaseEnv } from '@/lib/supabase/env';

/** The start of the Supabase project's address, enough to tell the test project from any other. */
function projectName(url: string) {
  try {
    return new URL(url).hostname.split('.')[0]!.slice(0, 8);
  } catch {
    return '';
  }
}

/**
 * A tag at the top of every page on a preview deployment, so nobody mistakes it for the real site,
 * and so it is plain which database the preview uses: the test project, or none (lib/supabase/env.ts).
 */
export function PreviewBadge() {
  if (!isPreview) return null;
  const text = productionRefused
    ? 'Preview · production database refused · example data'
    : supabaseEnv
      ? `Preview · test data · ${projectName(supabaseEnv.url)}`
      : 'Preview · example data, no sign-in';
  return (
    <div
      role="note"
      className="pointer-events-none fixed top-0 left-1/2 z-[1000] -translate-x-1/2 rounded-b-md bg-chalk px-2.5 py-0.5 text-[12px] w-max max-w-[92vw] text-center font-bold text-on-chalk"
    >
      {text}
    </div>
  );
}
