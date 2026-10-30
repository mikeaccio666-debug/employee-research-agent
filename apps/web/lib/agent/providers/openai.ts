import OpenAI from 'openai';
import type { AgentEnv } from '../env';
import { STUDIO_INSTRUCTIONS } from '../prompt';
import { TOOL_DEFS } from '../tools';
import type { Adapter, Call, Item } from './types';

// OpenAI through the Responses API. History is ours (append-only in Postgres), so nothing is kept
// on OpenAI's side; reasoning comes back encrypted so it can be replayed next turn.

// Older chat models don't reason; everything current does.
const reasoningModel = (model: string) => !/^gpt-4|chat/.test(model);

/**
 * OpenAI's strict mode refuses some JSON-schema keywords (string lengths among them); the limits
 * still hold, because runTool checks every argument before it is used.
 */
function forStrictMode(schema: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(schema, (key, value) => (key === 'maxLength' || key === 'minLength' ? undefined : value)));
}

const TOOLS = TOOL_DEFS.map((t) => ({
  type: 'function' as const,
  name: t.name,
  description: t.description,
  parameters: forStrictMode(t.parameters),
  strict: true,
}));

export function openaiAdapter(env: AgentEnv): Adapter {
  const client = new OpenAI({ apiKey: env.apiKey, baseURL: env.baseURL });
  const reasoning = reasoningModel(env.model);

  /** One call without tools or history. */
  async function once(instructions: string, input: string | OpenAI.Responses.ResponseInput, signal?: AbortSignal) {
    const response = await client.responses.create(
      {
        model: env.model,
        instructions,
        input,
        store: false,
        ...(reasoning ? { reasoning: { effort: env.effort } } : {}),
      },
      { signal },
    );
    const out = response.output_text.trim();
    if (!out) throw new Error('The answer came back empty');
    return {
      text: out,
      log: {
        model: response.model ?? env.model,
        input_tokens: response.usage?.input_tokens ?? null,
        output_tokens: response.usage?.output_tokens ?? null,
        cached_tokens: response.usage?.input_tokens_details?.cached_tokens ?? null,
        stop_reason: response.incomplete_details?.reason ?? response.status ?? 'unknown',
      },
    };
  }

  return {
    async step(history, onText, signal, cacheKey) {
      let response: OpenAI.Responses.Response | null = null;
      let failure: string | null = null;
      try {
        const stream = await client.responses.create(
          {
            model: env.model,
            instructions: STUDIO_INSTRUCTIONS,
            input: history as unknown as OpenAI.Responses.ResponseInput,
            tools: TOOLS,
            tool_choice: 'auto',
            parallel_tool_calls: true,
            store: false,
            // Requests with the same key go to the same cache, so a conversation's prefix stays warm.
            ...(cacheKey ? { prompt_cache_key: cacheKey } : {}),
            ...(reasoning ? { include: ['reasoning.encrypted_content' as const], reasoning: { effort: env.effort } } : {}),
            stream: true,
          },
          { signal },
        );
        for await (const ev of stream) {
          if (ev.type === 'response.output_text.delta') onText(ev.delta);
          else if (ev.type === 'response.completed' || ev.type === 'response.incomplete') response = ev.response;
          else if (ev.type === 'response.failed') failure = ev.response.error?.message ?? 'The model failed';
          else if (ev.type === 'error') failure = ev.message;
        }
      } catch (e) {
        failure = e instanceof Error ? e.message : String(e);
      }
      if (!response) throw new Error(failure ?? 'The model returned nothing');

      const items = response.output as unknown as Item[];
      const content = items.filter((i) => i.type === 'message').flatMap((i) => i.content as { type: string; text?: string }[]);
      return {
        items,
        // Streamed responses don't carry the SDK's output_text convenience; read the message items.
        text:
          content
            .filter((c) => c.type === 'output_text')
            .map((c) => c.text ?? '')
            .join('')
            .trim() || null,
        calls: this.calls(items),
        declined: content.some((c) => c.type === 'refusal'),
        cutOff: response.status === 'incomplete',
        log: {
          model: response.model ?? env.model,
          input_tokens: response.usage?.input_tokens ?? null,
          output_tokens: response.usage?.output_tokens ?? null,
          cached_tokens: response.usage?.input_tokens_details?.cached_tokens ?? null,
          stop_reason: response.incomplete_details?.reason ?? response.status ?? 'unknown',
        },
      };
    },

    user: (text, extras) => [{ role: 'user', content: [text, ...extras].filter(Boolean).map((t) => ({ type: 'input_text', text: t })) }],

    text: (role, text) => ({ role, content: text }),

    results: (results) => results.map(({ call, output }) => ({ type: 'function_call_output', call_id: call.id, output })),

    calls: (items) =>
      items
        .filter((i) => i.type === 'function_call')
        .map((i) => ({ id: String(i.call_id), name: String(i.name), input: String(i.arguments) })),

    summarize: (instructions, text, signal) => once(instructions, text, signal),

    see: (instructions, image, signal) =>
      once(
        instructions,
        [{ role: 'user', content: [{ type: 'input_image', image_url: `data:${image.mime};base64,${image.data}`, detail: 'high' }] }],
        signal,
      ),
  };
}
