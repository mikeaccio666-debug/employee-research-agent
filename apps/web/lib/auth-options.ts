// Which sign-ins this deployment offers. Each provider also has to be turned on in Supabase
// (Authentication → Sign In / Providers), so a button only shows once it is listed here too.

export type Provider = 'google' | 'github' | 'linkedin_oidc';

export const PROVIDER_LABEL: Record<Provider, string> = {
  google: 'Google',
  github: 'GitHub',
  linkedin_oidc: 'LinkedIn',
};

const KNOWN = Object.keys(PROVIDER_LABEL) as Provider[];

/** NEXT_PUBLIC_AUTH_PROVIDERS, comma-separated (google,github,linkedin_oidc); Google alone by default. */
export const authProviders: Provider[] = (() => {
  const listed = (process.env.NEXT_PUBLIC_AUTH_PROVIDERS ?? 'google')
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .map((p) => (p === 'linkedin' ? 'linkedin_oidc' : p));
  const out = KNOWN.filter((p) => listed.includes(p));
  return out.length ? out : ['google'];
})();

/**
 * Talking to the agent before making an account (PRD ACC-02), on an anonymous sign-in. Off unless
 * NEXT_PUBLIC_ANONYMOUS_TRIAL=on, and it also needs "Allow anonymous sign-ins" in Supabase.
 */
export const anonymousTrial = process.env.NEXT_PUBLIC_ANONYMOUS_TRIAL === 'on';

/** How many messages someone can send before signing up (the database holds the same number). */
export const TRIAL_MESSAGES = 30;
