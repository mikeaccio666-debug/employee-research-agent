import { isConnectorId } from '@/lib/connectors/catalog';
import { canSeal } from '@/lib/connectors/seal';
import { startSignIn } from '@/lib/connectors/signin';
import { routes } from '@/lib/routes';
import { supabaseServer } from '@/lib/supabase/server';

// POST /api/connectors/<id>/start — from the studio's "Connect" button to the app's sign-in page.
// A POST, so another site can't start one in the person's name (session cookies are SameSite=Lax)
// and knock out a connection that works.

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const origin = new URL(req.url).origin;
  const back = (result: string) => Response.redirect(`${origin}${routes.studio}?connector=${encodeURIComponent(provider)}&result=${result}`, 303);
  if (!isConnectorId(provider) || !canSeal()) return back('unavailable');
  const supabase = await supabaseServer();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) return Response.redirect(`${origin}${routes.login}?next=${encodeURIComponent(routes.studio)}`, 303);
  try {
    return Response.redirect((await startSignIn(supabase, user.id, provider, origin)).toString(), 303);
  } catch (e) {
    console.error('connector sign-in failed to start', { provider, error: e instanceof Error ? e.message : e });
    return back('failed');
  }
}
