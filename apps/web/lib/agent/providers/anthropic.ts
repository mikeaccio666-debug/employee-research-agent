import Anthropic from '@anthropic-ai/sdk';
import type { AgentEnv } from '../env';
import { STUDIO_INSTRUCTIONS } from '../prompt';
import { TOOL_DEFS } from '../tools';
import type { Adapter, Call, Item } from './types';

// Claude through the Messages API. Its history is replayed verbatim, thinking blocks included:
// Claude ties its thinking to the exact conversation it was written in, so nothing already sent
// is ever edited.

type Message = Anthropic.Beta.BetaMessageParam;

/**
 * Strict tool use takes a subset of JSON schema: no length or numeric limits, and nullable fields
 * spelled with anyOf. The limits still hold, because runTool checks every argument before use.
 */
function forStrictMode(schema: unknown): Anthropic.Beta.BetaTool.InputSchema {
  const DROP = new Set(['maxLength', 'minLength', 'minimum', 'maximum', 'minItems', 'maxItems']);
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (!node || typeof node !== 'object') return node;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) if (!DROP.has(key)) out[key] = walk(value);
    if (Array.isArray(out.type)) {
      const { type, description, ...rest } = out as { type: string[]; description?: string };
      return { anyOf: type.map((t) => ({ ...(t === 'null' ? {} : rest), type: t })), ...(description ? { description } : {}) };
    }
    return out;
  };
  return walk(schema) as Anthropic.Beta.BetaTool.InputSchema;
}

const TOOLS: Anthropic.Beta.BetaTool[] = TOOL_DEFS.map((t) => ({
  name: t.name,
  description: t.description,
  input_schema: forStrictMode(t.parameters),
  strict: true,
}));

export function anthropicAdapter(env: AgentEnv): Adapter {
  const client = new Anthropic({ apiKey: env.apiKey, baseURL: env.baseURL });

  /** One call without tools or history. */
  async function once(instructions: string, content: Message['content'], signal?: AbortSignal) {
    const message = await client.beta.messages.create(
      {
        model: env.model,
        max_tokens: 8000,
        system: instructions,
        messages: [{ role: 'user', content }],
        output_config: { effort: env.effort },
      },
      { signal },
    );
    const out = message.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
    if (!out || message.stop_reason === 'refusal') throw new Error('The answer came back empty');
    return {
      text: out,
      log: {
        model: message.model,
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
        cached_tokens: message.usage.cache_read_input_tokens ?? null,
        stop_reason: message.stop_reason ?? 'unknown',
      },
    };
  }

  return {
    async step(history, onText, signal) {
      let message: Anthropic.Beta.BetaMessage;
      try {
        const stream = client.beta.messages.stream(
          {
            model: env.model,
            max_tokens: 16000,
            system: STUDIO_INSTRUCTIONS,
            tools: TOOLS,
            tool_choice: { type: 'auto' },
            messages: history as unknown as Message[],
            output_config: { effort: env.effort },
            // Caches the conversation so far; each turn pays full price only for what is new.
            cache_control: { type: 'ephemeral' },
            // A safety decline is retried on the model Anthropic recommends for it, in the same call.
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
          },
          { signal },
        );
        stream.on('text', onText);
        message = await stream.finalMessage();
      } catch (e) {
        throw new Error(e instanceof Anthropic.APIError ? `${e.status ?? ''} ${e.message}`.trim() : e instanceof Error ? e.message : String(e));
      }
      const items: Item[] = [{ role: 'assistant', content: message.content }];
      return {
        items,
        text:
          message.content
            .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
            .map((b) => b.text)
            .join('')
            .trim() || null,
        calls: this.calls(items),
        declined: message.stop_reason === 'refusal',
        cutOff: message.stop_reason === 'max_tokens',
        log: {
          model: message.model,
          input_tokens: message.usage.input_tokens,
          output_tokens: message.usage.output_tokens,
          cached_tokens: message.usage.cache_read_input_tokens ?? null,
          stop_reason: message.stop_reason ?? 'unknown',
        },
      };
    },

    user: (text, extras) => [{ role: 'user', content: [text, ...extras].filter(Boolean).map((t) => ({ type: 'text', text: t })) }],

    text: (role, text) => ({ role, content: text }),

    results: (results) => [
      {
        role: 'user',
        content: results.map(({ call, output, failed }) => ({ type: 'tool_result', tool_use_id: call.id, content: output, is_error: failed })),
      },
    ],

    calls: (items) =>
      items.flatMap((item): Call[] =>
        item.role === 'assistant' && Array.isArray(item.content)
          ? (item.content as Anthropic.Beta.BetaContentBlockParam[])
              .filter((b): b is Anthropic.Beta.BetaToolUseBlockParam => b.type === 'tool_use')
              .map((b) => ({ id: b.id, name: b.name, input: JSON.stringify(b.input) }))
          : [],
      ),

    summarize: (instructions, text, signal) => once(instructions, text, signal),

    see: (instructions, image, signal) =>
      once(instructions, [{ type: 'image', source: { type: 'base64', media_type: image.mime, data: image.data } }], signal),
  };
}
