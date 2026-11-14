import type { SupabaseClient } from '@supabase/supabase-js';
import { readDoc, readLetter, readStyle, type ResumeDoc, type ResumeLetter, type ResumeStyle } from './doc';

// Résumé versions, read and written as the signed-in person; row-level security keeps every
// query to their own rows (supabase/migrations/20261114000000_resumes.sql).

export type ResumeVersion = {
  id: string;
  name: string;
  isDefault: boolean;
  target: string;
  doc: ResumeDoc;
  style: ResumeStyle;
  letter: ResumeLetter;
  updatedAt: string;
};

type Row = { id: string; name: string; is_default: boolean; target: string; doc: unknown; style: unknown; letter: unknown; updated_at: string };

const COLUMNS = 'id, name, is_default, target, doc, style, letter, updated_at';

const toVersion = (r: Row): ResumeVersion => ({
  id: r.id,
  name: r.name,
  isDefault: r.is_default,
  target: r.target,
  doc: readDoc(r.doc),
  style: readStyle(r.style),
  letter: readLetter(r.letter),
  updatedAt: r.updated_at,
});

/** Their versions, the default first, then the most recently changed. */
export async function versionsOf(supabase: SupabaseClient, ownerId: string): Promise<ResumeVersion[]> {
  const { data, error } = await supabase
    .from('resumes')
    .select(COLUMNS)
    .eq('owner_id', ownerId)
    .order('is_default', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(50)
    .returns<Row[]>();
  if (error) throw new Error(error.message);
  return (data ?? []).map(toVersion);
}

export async function versionOf(supabase: SupabaseClient, ownerId: string, id: string): Promise<ResumeVersion | null> {
  const { data, error } = await supabase.from('resumes').select(COLUMNS).eq('owner_id', ownerId).eq('id', id).maybeSingle<Row>();
  if (error) throw new Error(error.message);
  return data ? toVersion(data) : null;
}

export async function insertVersion(
  supabase: SupabaseClient,
  ownerId: string,
  v: { name: string; isDefault: boolean; target?: string; doc: ResumeDoc; style: ResumeStyle; letter?: ResumeLetter },
): Promise<ResumeVersion> {
  const { data, error } = await supabase
    .from('resumes')
    .insert({ owner_id: ownerId, name: v.name, is_default: v.isDefault, target: v.target ?? '', doc: v.doc, style: v.style, ...(v.letter ? { letter: v.letter } : {}) })
    .select(COLUMNS)
    .single<Row>();
  if (error || !data) throw new Error(error?.message ?? 'Could not make the version');
  return toVersion(data);
}
