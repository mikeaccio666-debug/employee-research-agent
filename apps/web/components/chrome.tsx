import Link from 'next/link';
import type { ReactNode } from 'react';
import { cx } from '@portrait/ui';
import { routes } from '@/lib/routes';

/**
 * Header of public pages (S02, S03, S10b, S11, S13): brand left, links right, inside `.wrap`.
 * The canvas draws the brand at 20px, and 22px on the landing page.
 */
export function PublicHeader({
  brandSize = 20,
  children,
  className,
}: {
  brandSize?: 20 | 22;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cx('wrap flex min-h-[72px] items-center justify-between', className)}>
      <Link
        href={routes.landing}
        className={cx('font-extrabold tracking-[-0.02em] no-underline', brandSize === 22 ? 'text-[22px]' : 'text-[20px]')}
      >
        Portrait
      </Link>
      {children}
    </header>
  );
}

/** Top bar of focused flows (S15 first publish, S19b packet): wall-2, 64px, lined up with the ruler column. */
export function FlowBar({ left, right, className }: { left: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <header
      className={cx(
        'flex min-h-16 flex-wrap items-center justify-between gap-3.5 bg-wall-2 pr-6 pl-24 max-sm:px-4',
        className,
      )}
    >
      {left}
      {right}
    </header>
  );
}
