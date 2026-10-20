// Supabase settings come from the deployment's environment variables (Vercel project settings,
// or .env.local in development). Without them the app runs on the canvas fixtures, as before.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Supabase's newer "publishable" key, or the older anon key: both are safe to ship to the browser.
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseEnv = url && key ? { url, key } : null;

export const supabaseConfigured = supabaseEnv !== null;
