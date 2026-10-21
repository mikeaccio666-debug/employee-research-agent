import type { SupabaseClient } from '@supabase/supabase-js';
import type { Spec } from '@/lib/portrait/spec';
import type { Row } from '@/lib/agent/store';

// A stand-in for the three tables one studio turn writes (lib/agent/store.ts): the conversation's
// messages, the model call log, and the portrait. It answers just the query shapes the turn uses,
// so evals run the real runTurn without a database.

export type Call = {
  provider: string;
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
  cached_tokens: number | null;
  latency_ms: number;
  stop_reason: string;
  error: string | null;
};

export function memoryStore(start: Spec) {
  const rows: Row[] = [];
  const calls: Call[] = [];
  let spec = start;
  // Strictly increasing times, so "sent after it was rejected" holds as it would in Postgres.
  let clock = Date.UTC(2026, 0, 1);
  const now = () => new Date((clock += 1000)).toISOString();

  const insert = (table: string, value: Record<string, unknown>) => {
    if (table === 'conversation_messages') {
      const row: Row = {
        id: rows.length + 1,
        role: value.role as Row['role'],
        items: value.items as unknown[],
        body: (value.body as string | null) ?? null,
        created_at: now(),
      };
      rows.push(row);
      return { data: { id: row.id }, error: null };
    }
    if (table === 'model_calls') calls.push(value as unknown as Call);
    return { data: null, error: null };
  };

  const supabase = {
    from(table: string) {
      return {
        insert(value: Record<string, unknown>) {
          const result = insert(table, value);
          const done = Promise.resolve(result);
          return Object.assign(done, { select: () => ({ single: () => done }) });
        },
        update(value: { spec: Spec }) {
          return {
            eq: async () => {
              if (table === 'portraits') spec = value.spec;
              return { error: null };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;

  return {
    supabase,
    rows,
    calls,
    get spec() {
      return spec;
    },
    /** A person confirming or rejecting lines on the page. */
    setSpec(next: Spec) {
      spec = next;
    },
  };
}
