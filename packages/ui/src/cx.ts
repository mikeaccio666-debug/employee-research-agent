export type ClassValue = string | false | null | undefined | 0;

/** Joins class names, skipping falsy parts: cx('chip', on && 'on'). */
export function cx(...parts: ClassValue[]): string {
  let out = '';
  for (const part of parts) {
    if (part) out = out ? `${out} ${part}` : part;
  }
  return out;
}
