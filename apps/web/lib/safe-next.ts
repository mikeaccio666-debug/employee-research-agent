/** Where to send someone after signing in: only paths on this site, never another origin. */
export function safeNext(next: string | null | undefined, fallback = '/studio'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return next;
}
