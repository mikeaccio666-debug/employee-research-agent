// The model behind the studio agent comes from the deployment's environment (Vercel project
// settings, or .env.local), so it can change without new code. Two providers sit behind
// lib/agent/turn.ts: OpenAI and Anthropic. AGENT_PROVIDER picks the default; left unset, it is
// whichever has a key, OpenAI first. People pick between the providers that have a key in the
// studio (AGENT_MODEL_SWITCHER decides who), each with its own daily cap if set. Server-only:
// never NEXT_PUBLIC.

export const PROVIDERS = ['openai', 'anthropic'] as const;
export type Provider = (typeof PROVIDERS)[number];
export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';
/** The thinking levels people can pick in the studio. */
export const EFFORTS = ['low', 'medium', 'high'] as const satisfies readonly Effort[];

const KEYS: Record<Provider, string | undefined> = {
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
};
const MODELS: Record<Provider, string> = {
  openai: process.env.OPENAI_MODEL || 'gpt-6.1-sol',
  anthropic: process.env.ANTHROPIC_MODEL || 'claude-opus-5-5',
};
/**
 * The models people can pick for each provider, the default first: OPENAI_MODELS and
 * ANTHROPIC_MODELS (comma-separated ids), or the defaults below.
 */
const MODEL_LISTS: Record<Provider, string[]> = {
  openai: list(process.env.OPENAI_MODELS, [MODELS.openai]),
  anthropic: list(process.env.ANTHROPIC_MODELS, [MODELS.anthropic, 'claude-sonnet-5-5', 'claude-haiku-5-5']),
};
function list(raw: string | undefined, fallback: string[]) {
  const ids = raw ? raw.split(',').map((m) => m.trim()).filter(Boolean) : fallback;
  return [...new Set(ids)];
}
const DEFAULT_EFFORT = (process.env.AGENT_EFFORT || 'medium') as Effort;
const BASE_URLS: Record<Provider, string | undefined> = {
  // Optional: another endpoint for the same API (a gateway, or a local stand-in in tests).
  openai: process.env.OPENAI_BASE_URL || undefined,
  anthropic: process.env.ANTHROPIC_BASE_URL || undefined,
};

export type AgentEnv = { provider: Provider; apiKey: string; model: string; effort: Effort; baseURL: string | undefined };

/** The model a provider uses unless someone picks another. */
export const defaultModel = (provider: Provider) => MODELS[provider];

/**
 * The settings for one provider, or null when it has no key. A model or thinking level that isn't
 * on offer falls back to the default.
 */
export function agentFor(provider: Provider, pick: { model?: string; effort?: Effort } = {}): AgentEnv | null {
  const apiKey = KEYS[provider];
  if (!apiKey) return null;
  return {
    provider,
    apiKey,
    model: pick.model && MODEL_LISTS[provider].includes(pick.model) ? pick.model : MODELS[provider],
    // How hard the model thinks before answering; medium suits a live interview.
    effort: pick.effort && (EFFORTS as readonly string[]).includes(pick.effort) ? pick.effort : DEFAULT_EFFORT,
    baseURL: BASE_URLS[provider],
  };
}

/** Providers with a key. */
export const availableProviders: Provider[] = PROVIDERS.filter((p) => KEYS[p]);

const chosen = process.env.AGENT_PROVIDER as Provider | undefined;
export const agentEnv: AgentEnv | null = PROVIDERS.includes(chosen as Provider)
  ? agentFor(chosen!)
  : availableProviders[0]
    ? agentFor(availableProviders[0])
    : null;

/** The studio's switcher: each provider with a key, by name, with its models (the default first). */
export const modelChoices = () =>
  availableProviders.map((p) => ({ value: p, label: p === 'openai' ? 'OpenAI' : 'Claude', models: MODEL_LISTS[p] }));
/** The thinking level used unless someone picks another. */
export const defaultEffort = (): Effort => ((EFFORTS as readonly string[]).includes(DEFAULT_EFFORT) ? DEFAULT_EFFORT : 'medium');
export type ModelChoice = ReturnType<typeof modelChoices>[number];

const ADMINS = new Set(
  (process.env.AGENT_ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

// everyone (default): every signed-in person; admins: only AGENT_ADMIN_EMAILS; off: nobody.
const SWITCHER = process.env.AGENT_MODEL_SWITCHER || 'everyone';

/** Whether this signed-in person may switch the agent's provider from the studio. */
export const canSwitchModel = (email: string | null | undefined) =>
  SWITCHER === 'everyone' || (SWITCHER === 'admins' && !!email && ADMINS.has(email.toLowerCase()));

/** How many messages one person may send the agent in 24 hours, on all models together (a cost backstop). */
export const DAILY_MESSAGES = Number(process.env.AGENT_DAILY_MESSAGES || 200);

/**
 * The same, per provider (AGENT_DAILY_MESSAGES_OPENAI, AGENT_DAILY_MESSAGES_ANTHROPIC), so a
 * pricier model can get a smaller allowance. Null when unset: only the overall cap applies.
 */
export const dailyMessagesFor = (p: Provider): number | null => {
  const raw = process.env[`AGENT_DAILY_MESSAGES_${p.toUpperCase()}`];
  return raw ? Number(raw) : null;
};
