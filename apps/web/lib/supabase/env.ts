// Supabase settings come from the deployment's environment variables (Vercel project settings,
// or .env.local in development). Without them the app runs on the canvas fixtures, as before.
//
// Vercel holds two sets of values under the same two names: the production project's, for the
// Production environment only, and a separate test project's, for Preview (the builds of pull
// requests and branches). That is what keeps previews away from real people's data.
//
// The check here is the second lock. A Vercel deployment that is not the production one refuses
// the production project and runs on the fixtures, so sharing the production values with
// previews by mistake cannot connect a preview to the production database.

/**
 * What marks a Supabase address as the production project: its project ref, plus any custom
 * domain put in front of it later. Not a secret: the address ships in the site's JavaScript.
 * When production moves to another project or gets a custom domain, add it here in that change.
 */
export const PRODUCTION_PROJECTS = ['mforvnqyfnqgvbqcsuta'];

export type SupabaseEnv = { url: string; key: string };

type Settings = {
  /** Vercel's VERCEL_ENV at build time: production, preview, development, or empty off Vercel. */
  deployment: string | undefined;
  url: string | undefined;
  key: string | undefined;
};

/** A deployment on Vercel that is not the production one: a preview, a custom environment, `vercel dev`. */
export function notProduction(deployment: string | undefined) {
  const name = (deployment ?? '').trim().toLowerCase();
  return name !== '' && name !== 'production';
}

/** True when a deployment that is not production was handed the production project. */
export function refusesProduction(s: Pick<Settings, 'deployment' | 'url'>, production = PRODUCTION_PROJECTS) {
  const url = (s.url ?? '').toLowerCase();
  return notProduction(s.deployment) && production.some((mark) => mark !== '' && url.includes(mark.toLowerCase()));
}

/** The Supabase project a deployment talks to, or null to run on the fixtures. */
export function pickSupabase(s: Settings, production = PRODUCTION_PROJECTS): SupabaseEnv | null {
  if (!s.url || !s.key || refusesProduction(s, production)) return null;
  return { url: s.url, key: s.key };
}

// DEPLOY_ENV is VERCEL_ENV, written into the code at build time (next.config.ts). Each variable is
// read by name so Next.js can write its value into the browser bundle too.
const settings: Settings = {
  deployment: process.env.DEPLOY_ENV,
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  // Supabase's newer "publishable" key, or the older anon key: both are safe to ship to the browser.
  key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};

/** True on a Vercel deployment that is not production. */
export const isPreview = notProduction(settings.deployment);
export const supabaseEnv = pickSupabase(settings);
export const supabaseConfigured = supabaseEnv !== null;
/** True when this deployment was given the production project and refused it. */
export const productionRefused = refusesProduction(settings);
