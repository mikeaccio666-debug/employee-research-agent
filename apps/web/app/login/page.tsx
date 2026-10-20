import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Ruler } from '@portrait/ui';
import { PublicHeader } from '@/components/chrome';
import { supabaseConfigured } from '@/lib/supabase/env';
import { getViewer } from '@/lib/supabase/server';
import { safeNext } from '@/lib/safe-next';
import { Login } from './Login';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } };

type Props = { searchParams: Promise<{ next?: string; error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next: rawNext, error } = await searchParams;
  const next = safeNext(rawNext);
  if (await getViewer()) redirect(next);
  return (
    <div className="relative min-h-screen overflow-hidden bg-wall-2">
      <Ruler />
      <PublicHeader />
      <main className="wrap flex justify-center pt-16 pb-24 max-sm:pt-8">
        <div className="w-full max-w-[400px]">
          <Login next={next} linkFailed={error === 'link'} configured={supabaseConfigured} />
        </div>
      </main>
    </div>
  );
}
