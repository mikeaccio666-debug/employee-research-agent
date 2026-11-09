// Supabase settings come from the deployment's environment variables (Vercel project settings,
// or .env.local in development). Without them the app runs on the canvas fixtures, as before.
//
// Preview deployments (Vercel's builds of pull requests and branches) read their own pair of
// settings, for a separate test project, and never the production pair. So a preview can't reach
// real people's data, even while the production settings are shared with every environment. A
// preview without its own pair runs on the fixtures.

export type SupabaseEnv = { url: string; key: string };

type Settings = {
  /** Vercel's VERCEL_ENV at build time: production, preview, development, or empty off Vercel. */
  deployment: string | undefined;
  url: string | undefined;
  key: string | undefined;
  previewUrl: string | undefined;
  previewKey: string | undefined;
};

/** The Supabase project a deployment talks to, or null to run on the fixtures. */
export function pickSupabase(s: Settings): SupabaseEnv | null {
  if (s.deployment === 'preview') {
    if (!s.previewUrl || !s.previewKey) return null;
    // The production address pasted into the preview slot by mistake.
    if (s.url && sameProject(s.previewUrl, s.url)) return null;
    return { url: s.previewUrl, key: s.previewKey };
  }
  return s.url && s.key ? { url: s.url, key: s.key } : null;
}

function sameProject(a: string, b: string) {
  const host = (u: string) => {
    try {
      return new URL(u).host.toLowerCase();
    } catch {
      return u.trim().toLowerCase();
    }
  };
  return host(a) === host(b);
}

/** True on a Vercel preview deployment. DEPLOY_ENV is VERCEL_ENV, set at build time in next.config.ts. */
export const isPreview = process.env.DEPLOY_ENV === 'preview';

// Each variable is read by name so Next.js can write its value into the browser bundle.
export const supabaseEnv = pickSupabase({
  deployment: process.env.DEPLOY_ENV,
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  // Supabase's newer "publishable" key, or the older anon key: both are safe to ship to the browser.
  key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  previewUrl: process.env.NEXT_PUBLIC_SUPABASE_PREVIEW_URL,
  previewKey: process.env.NEXT_PUBLIC_SUPABASE_PREVIEW_PUBLISHABLE_KEY,
});
export const supabaseConfigured = supabaseEnv !== null;
