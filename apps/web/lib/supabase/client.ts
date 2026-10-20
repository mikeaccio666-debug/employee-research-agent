'use client';

import { createBrowserClient } from '@supabase/ssr';
import { supabaseEnv } from './env';

/** Supabase in the browser (sign-in flows). Null when the deployment has no Supabase settings. */
export function supabaseBrowser() {
  return supabaseEnv ? createBrowserClient(supabaseEnv.url, supabaseEnv.key) : null;
}
