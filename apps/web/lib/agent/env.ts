// The model behind the studio agent comes from the deployment's environment (Vercel project
// settings, or .env.local), so it can change without new code. Two providers sit behind
// lib/agent/turn.ts: OpenAI and Anthropic. AGENT_PROVIDER picks one; left unset, it is whichever
// has a key, OpenAI first. Server-only: never NEXT_PUBLIC.

export type Provider = 'openai' | 'anthropic';
export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

const keys: Record<Provider, string | undefined> = {
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
};

const chosen = process.env.AGENT_PROVIDER as Provider | undefined;
const provider: Provider | null =
  chosen === 'openai' || chosen === 'anthropic' ? (keys[chosen] ? chosen : null) : keys.openai ? 'openai' : keys.anthropic ? 'anthropic' : null;

const MODELS: Record<Provider, string> = {
  openai: process.env.OPENAI_MODEL || 'gpt-6.1-sol',
  anthropic: process.env.ANTHROPIC_MODEL || 'claude-opus-5-5',
};
const BASE_URLS: Record<Provider, string | undefined> = {
  // Optional: another endpoint for the same API (a gateway, or a local stand-in in tests).
  openai: process.env.OPENAI_BASE_URL || undefined,
  anthropic: process.env.ANTHROPIC_BASE_URL || undefined,
};

export const agentEnv = provider
  ? {
      provider,
      apiKey: keys[provider]!,
      model: MODELS[provider],
      // How hard the model thinks before answering; medium suits a live interview.
      effort: (process.env.AGENT_EFFORT || 'medium') as Effort,
      baseURL: BASE_URLS[provider],
    }
  : null;

export type AgentEnv = NonNullable<typeof agentEnv>;

/** How many messages one person may send the agent in 24 hours (a cost backstop). */
export const DAILY_MESSAGES = Number(process.env.AGENT_DAILY_MESSAGES || 200);
