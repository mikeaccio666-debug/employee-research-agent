'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { buttonClass, cx } from '@portrait/ui';
import { routes } from '@/lib/routes';
import { useViewer } from '@/lib/supabase/use-viewer';

/** Sign out is a POST (see app/auth/signout), so it is a form, never a link. */
export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action="/auth/signout" method="post" className="inline">
      <button type="submit" className={cx('linklike', className)}>
        Sign out
      </button>
    </form>
  );
}

/**
 * The line at the bottom of the left nav. Signed in, it names the person (and their link once
 * they have one) with Sign out; signed out, the canvas's example line stays.
 */
export function NavFooter({ fallback, className }: { fallback?: ReactNode; className?: string }) {
  const state = useViewer();
  if (state.status === 'in') {
    const { name, handle } = state.viewer;
    return (
      <div className={cx('t-xs c2', className)}>
        <p>{handle ? `${name} · @${handle}` : name}</p>
        <SignOutButton className="mt-1 t-xs" />
      </div>
    );
  }
  // While loading, keep the space so the nav doesn't jump.
  if (!fallback) return null;
  return <p className={cx('t-xs c2', className, state.status === 'loading' && 'invisible')}>{fallback}</p>;
}

/** "Log in" in a public header, or the way back to the studio for someone signed in. */
export function AccountLink({ className, variant = 'secondary' }: { className?: string; variant?: 'secondary' | 'quiet' }) {
  const state = useViewer();
  const signedIn = state.status === 'in';
  return (
    <Link className={buttonClass({ variant, size: 'sm', className })} href={signedIn ? routes.studio : routes.login}>
      {signedIn ? 'Your studio' : 'Log in'}
    </Link>
  );
}
