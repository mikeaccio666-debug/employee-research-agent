// The model behind the studio agent comes from the deployment's environment (Vercel project
// settings, or .env.local). OpenAI first, as decided for the MVP; the provider sits behind
// lib/agent/turn.ts so it can change without touching the screens. Server-only: never NEXT_PUBLIC.
const apiKey = process.env.OPENAI_API_KEY;

export const agentEnv = apiKey
  ? {
      provider: 'openai' as const,
      apiKey,
      model: process.env.OPENAI_MODEL || 'gpt-5',
      // Reasoning models only; leave unset for models without reasoning.
      effort: (process.env.OPENAI_REASONING_EFFORT || null) as 'minimal' | 'low' | 'medium' | 'high' | null,
      // Optional: an OpenAI-compatible endpoint (a proxy or gateway).
      baseURL: process.env.OPENAI_BASE_URL || undefined,
    }
  : null;

/** How many messages one person may send the agent in 24 hours (a cost backstop). */
export const DAILY_MESSAGES = Number(process.env.AGENT_DAILY_MESSAGES || 200);
