'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from './client';

/** Who is signed in, as the browser sees it: enough for a name in the nav, nothing more. */
export type BrowserViewer = { name: string; handle: string | null; alias: string };

type State = { status: 'loading' } | { status: 'out' } | { status: 'in'; viewer: BrowserViewer };

// One lookup per page load, shared by every component that asks.
let pending: Promise<BrowserViewer | null> | null = null;

async function lookup(): Promise<BrowserViewer | null> {
  const supabase = supabaseBrowser();
  if (!supabase) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('handle, display_name, alias')
    .eq('id', user.id)
    .maybeSingle<{ handle: string | null; display_name: string | null; alias: string }>();
  return {
    name: data?.display_name || user.email || 'You',
    handle: data?.handle ?? null,
    alias: data?.alias ?? '',
  };
}

/**
 * The signed-in person, read in the browser so static and cached pages stay static.
 * "loading" until the first answer; "out" when signed out or Supabase isn't set up.
 */
export function useViewer(): State {
  const [state, setState] = useState<State>({ status: 'loading' });
  useEffect(() => {
    let live = true;
    pending ??= lookup().catch(() => null);
    pending.then((viewer) => {
      if (live) setState(viewer ? { status: 'in', viewer } : { status: 'out' });
    });
    return () => {
      live = false;
    };
  }, []);
  return state;
}
