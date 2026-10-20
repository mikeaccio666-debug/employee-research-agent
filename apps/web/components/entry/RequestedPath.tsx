'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * The link someone tried, written the way the canvas writes links: "portrait.so/linzhou".
 * The 404 page is prerendered once, so the server cannot know the path: it writes
 * "portrait.so/…" and the browser fills in the real one after hydration.
 */
export function RequestedPath() {
  const path = useSyncExternalStore(
    subscribe,
    () => window.location.pathname,
    () => null,
  );
  if (path === null) return <>portrait.so/…</>;
  let shown = path;
  try {
    shown = decodeURIComponent(path);
  } catch {
    // A malformed escape: show the path as it came.
  }
  return <>portrait.so{shown === '/' ? '' : shown}</>;
}
