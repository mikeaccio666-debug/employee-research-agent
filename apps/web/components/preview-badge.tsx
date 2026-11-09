import { isPreview, supabaseConfigured } from '@/lib/supabase/env';

/**
 * A tag at the top of every page on a preview deployment, so nobody mistakes it for the real site.
 * Previews use the test Supabase project, or no database at all (lib/supabase/env.ts).
 */
export function PreviewBadge() {
  if (!isPreview) return null;
  return (
    <div
      role="note"
      className="pointer-events-none fixed top-0 left-1/2 z-[1000] -translate-x-1/2 rounded-b-md bg-chalk px-2.5 py-0.5 text-[12px] font-bold text-on-chalk"
    >
      {supabaseConfigured ? 'Preview · test data' : 'Preview · example data, no sign-in'}
    </div>
  );
}
