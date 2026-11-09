import type { CSSProperties } from 'react';
import { cx } from '../cx';

/**
 * The Skystep 青云步 mark: three steps rising into a cloud (logo 02 "青云").
 * Colours come from --sky-1/2/3, so the mark follows light 晨 and dark 夜.
 * Decorative by default; pass `title` when the mark stands alone.
 */
export function Mark({ size = 20, title, className, style }: { size?: number; title?: string; className?: string; style?: CSSProperties }) {
  return (
    <svg
      viewBox="12 21.4 96 80.6"
      width={size * (96 / 80.6)}
      height={size}
      className={cx('mark-sky', className)}
      style={style}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <rect x="12" y="84" width="96" height="18" rx="9" fill="var(--sky-1)" />
      <rect x="30" y="60" width="78" height="18" rx="9" fill="var(--sky-2)" />
      <g fill="var(--sky-3)">
        <rect x="48" y="36" width="60" height="18" rx="9" />
        <circle cx="75.4" cy="36" r="14.6" />
        <circle cx="99" cy="36" r="9" />
        <rect x="90" y="36" width="18" height="9" />
      </g>
    </svg>
  );
}

/** Mark + name. `zh` shows 青云步 instead of Skystep (Chinese-only surfaces). */
export function Wordmark({ size = 20, zh, className }: { size?: number; zh?: boolean; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-2 font-extrabold tracking-[-0.02em]', className)}>
      <Mark size={size} />
      <span>{zh ? '青云步' : 'Skystep'}</span>
    </span>
  );
}

export const BRAND = { name: 'Skystep', zh: '青云步', agent: 'Tadu', agentZh: '踏渡' } as const;
