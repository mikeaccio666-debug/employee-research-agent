'use client';

import { usePathname } from 'next/navigation';

/** The link someone tried, written the way the canvas writes links: "portrait.so/linzhou". */
export function RequestedPath() {
  const path = usePathname() ?? '';
  let shown = path;
  try {
    shown = decodeURIComponent(path);
  } catch {
    // A malformed escape: show the path as it came.
  }
  return <>portrait.so{shown === '/' ? '' : shown}</>;
}
