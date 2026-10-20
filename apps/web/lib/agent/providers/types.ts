// What lib/agent/turn.ts needs from a model provider. Each provider keeps its own message format
// in the history (replayed verbatim to that provider) and can also write plain text messages,
// which is how one provider reads a stretch of conversation another one had.

/** One history entry in the provider's own format. */
export type Item = Record<string, unknown>;

export type Call = { id: string; name: string; input: string };

export type Step = {
  /** The model's answer as API items, stored and replayed as they are. */
  items: Item[];
  text: string | null;
  calls: Call[];
  /** The model declined to answer. */
  declined: boolean;
  /** The answer was cut off, so its tool calls may be incomplete and must not run. */
  cutOff: boolean;
  log: { model: string; input_tokens: number | null; output_tokens: number | null; cached_tokens: number | null; stop_reason: string };
};

export type Adapter = {
  /** One call to the model with the history so far; text streams out through onText. Throws on failure. */
  step(history: Item[], onText: (text: string) => void, signal?: AbortSignal): Promise<Step>;
  /** The person's message (may be empty), followed by blocks the app adds: shared documents, the portrait's state. */
  user(text: string, extras: string[]): Item[];
  /** A plain text message, for history written by another provider. */
  text(role: 'user' | 'assistant', text: string): Item;
  /** The answers to a step's tool calls. */
  results(results: { call: Call; output: string; failed: boolean }[]): Item[];
  /** The tool calls in a stored answer. */
  calls(items: Item[]): Call[];
  /** One plain call without tools or history (used to summarize older conversation). Throws on failure. */
  summarize(instructions: string, text: string, signal?: AbortSignal): Promise<{ text: string; log: Step['log'] }>;
};
