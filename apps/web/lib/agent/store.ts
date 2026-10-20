import type { SupabaseClient } from '@supabase/supabase-js';
import { readSpec, type Spec } from '@/lib/portrait/spec';

// The studio conversation and portrait, read and written as the signed-in person. Row-level
// security (supabase/migrations) keeps every query to their own rows; nothing here needs the
// service role.

export type Row = {
  id: number;
  role: 'user' | 'assistant' | 'tool';
  items: unknown[];
  body: string | null;
  created_at: string;
};

/** What the thread shows for one message. */
export type ThreadMessage = { id: number; role: 'user' | 'assistant'; body: string; receipts: Receipt[]; attachments?: Attachment[] };
/** A résumé or link shared with a message. */
export type Attachment = { kind: 'resume' | 'website' | 'github'; name: string };
export type Receipt = { note: string; dashed: boolean; claimId?: string };

/** The person's studio conversation, started on their first message. */
export async function conversationFor(supabase: SupabaseClient, ownerId: string, create: boolean): Promise<string | null> {
  const { data } = await supabase
    .from('conversations')
    .select('id')
    .eq('owner_id', ownerId)
    .eq('purpose', 'companion')
    .maybeSingle<{ id: string }>();
  if (data || !create) return data?.id ?? null;
  const { data: made, error } = await supabase
    .from('conversations')
    .insert({ owner_id: ownerId, purpose: 'companion' })
    .select('id')
    .single<{ id: string }>();
  if (made) return made.id;
  // Two first messages at once: the other one made it.
  if (error?.code === '23505') return conversationFor(supabase, ownerId, false);
  throw new Error(error?.message ?? 'Could not start the conversation');
}

export async function history(supabase: SupabaseClient, conversationId: string): Promise<Row[]> {
  const { data, error } = await supabase
    .from('conversation_messages')
    .select('id, role, items, body, created_at')
    .eq('conversation_id', conversationId)
    .order('id', { ascending: true })
    .limit(2000)
    .returns<Row[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function append(
  supabase: SupabaseClient,
  conversationId: string,
  role: Row['role'],
  items: unknown[],
  body: string | null,
): Promise<number> {
  const { data, error } = await supabase
    .from('conversation_messages')
    .insert({ conversation_id: conversationId, role, items, body })
    .select('id')
    .single<{ id: number }>();
  if (error || !data) throw new Error(error?.message ?? 'Could not save the message');
  return data.id;
}

/** Messages the person sent in the last 24 hours, to one provider's model or to any. */
export async function sentToday(supabase: SupabaseClient, conversationId: string, via?: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  let query = supabase
    .from('conversation_messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .eq('role', 'user')
    .gte('created_at', since);
  // Each stored message is marked with the provider it went to (lib/agent/turn.ts).
  if (via) query = query.eq('items->0->>via', via);
  const { count } = await query;
  return count ?? 0;
}

export async function loadPortrait(supabase: SupabaseClient, ownerId: string) {
  const { data } = await supabase
    .from('portraits')
    .select('spec, published_spec, status')
    .eq('owner_id', ownerId)
    .maybeSingle<{ spec: unknown; published_spec: unknown; status: 'draft' | 'published' }>();
  return {
    spec: readSpec(data?.spec),
    published: data?.status === 'published',
    // The rev last published, to tell the studio whether the page is behind the draft.
    publishedRev: data?.status === 'published' ? readSpec(data.published_spec).rev : null,
  };
}

export async function saveSpec(supabase: SupabaseClient, ownerId: string, spec: Spec) {
  const { error } = await supabase.from('portraits').update({ spec }).eq('owner_id', ownerId);
  if (error) throw new Error(error.message);
}

export async function logCall(supabase: SupabaseClient, conversationId: string, call: Record<string, unknown>) {
  // Best effort: a missing log line must never cost the person their answer.
  await supabase.from('model_calls').insert({ conversation_id: conversationId, ...call });
}

/**
 * The thread as the person sees it: their messages and the agent's replies, with the changes
 * each turn made (kept on the tool rows) shown as receipts under the reply that follows them.
 */
export function toThread(rows: Row[]): ThreadMessage[] {
  const out: ThreadMessage[] = [];
  let pending: Receipt[] = [];
  for (const row of rows) {
    if (row.role === 'tool') {
      for (const item of row.items as { receipt?: Receipt; receipts?: Receipt[] }[]) {
        if (item.receipt) pending.push(item.receipt);
        if (item.receipts) pending.push(...item.receipts);
      }
      continue;
    }
    if (row.role === 'user') {
      const attachments = (row.items[0] as { attachments?: Attachment[] } | undefined)?.attachments;
      out.push({ id: row.id, role: 'user', body: row.body ?? '', receipts: [], ...(attachments?.length ? { attachments } : {}) });
      pending = [];
      continue;
    }
    if (!row.body) continue;
    out.push({ id: row.id, role: 'assistant', body: row.body, receipts: pending });
    pending = [];
  }
  return out;
}
