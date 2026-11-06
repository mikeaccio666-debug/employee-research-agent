import type { Metadata } from 'next';
import { routes } from '@/lib/routes';
import { redirect } from 'next/navigation';
import { accountFor, getViewer } from '@/lib/supabase/server';
import { FirstPublish } from './FirstPublish';

export const metadata: Metadata = { title: 'First publish' };

/** S15 · first publish (V2-S15-FirstPublish): the first line drawn on the doorframe. */
export default async function FirstPublishPage() {
  const account = await accountFor(routes.firstPublish);
  // Publishing needs an account; someone who started without one makes it first.
  if ((await getViewer())?.user.is_anonymous) redirect(`${routes.login}?next=${encodeURIComponent(routes.firstPublish)}`);
  return <FirstPublish account={account} />;
}
