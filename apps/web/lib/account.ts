import type { Visibility as DbVisibility } from '@/lib/supabase/server';
import type { Visibility } from '@/lib/data/entry';

// The screens say "anon"; the database says "anonymous". These two keep the mapping in one place.
export const toUiVisibility = (v: DbVisibility): Visibility => (v === 'anonymous' ? 'anon' : v);
export const toDbVisibility = (v: Visibility): DbVisibility => (v === 'anon' ? 'anonymous' : v);

/** The signed-in person's account, as the settings and publish screens need it. */
export type Account = {
  handle: string | null;
  displayName: string | null;
  alias: string;
  visibility: Visibility;
  published: boolean;
};

// Same rule as the profiles.handle check in the migration.
export const HANDLE_PATTERN = /^[a-z0-9][a-z0-9-]{1,29}$/;

// The canvas's example portraits keep their links while they are still on the site, and a few
// words stay free for the product itself.
const RESERVED = new Set([
  'lin',
  'maya',
  'admin',
  'api',
  'help',
  'login',
  'portrait',
  'settings',
  'studio',
  'support',
  'www',
]);

/** Lowercases and trims what someone typed, the way the field shows it back. */
export const normalizeHandle = (raw: string) => raw.trim().replace(/^@/, '').toLowerCase();

/** Why a handle can't be used, in the field's words, or null when it can be tried. */
export function handleProblem(handle: string): string | null {
  if (handle.length < 2) return 'At least 2 characters.';
  if (handle.length > 30) return 'At most 30 characters.';
  if (!HANDLE_PATTERN.test(handle)) return 'Letters, numbers and hyphens only, starting with a letter or number.';
  if (RESERVED.has(handle)) return 'That one is taken.';
  return null;
}
