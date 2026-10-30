import { canConnect, isConnectorId } from '@/lib/connectors/catalog';
import { canSeal } from '@/lib/connectors/seal';
import { startSignIn } from '@/lib/connectors/signin';
import { routes } from '@/lib/routes';
import { supabaseServer } from '@/lib/supabase/server';

// POST /api/connectors/<id>/start — from a "Connect" button (the studio, the chat, the app store)
// to the app's sign-in page. A POST, so another site can't start one in the person's name (session
// cookies are SameSite=Lax) and knock out a connection that works. The form's `from` says where
// to come back to; a short-lived cookie carries it through the app's sign-in.

export const dynamic = 'force-dynamic';

const BACK_COOKIE = 'connector_back';

export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const origin = new URL(req.url).origin;
  const from = (await req.formData().catch(() => null))?.get('from') === 'apps' ? 'apps' : 'studio';
  const page = from === 'apps' ? routes.apps : routes.studio;
  const back = (result: string) => Response.redirect(`${origin}${page}?connector=${encodeURIComponent(provider)}&result=${result}`, 303);
  if (!isConnectorId(provider) || !canConnect(provider) || !canSeal()) return back('unavailable');
  const supabase = await supabaseServer();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) return Response.redirect(`${origin}${routes.login}?next=${encodeURIComponent(page)}`, 303);
  try {
    const to = await startSignIn(supabase, user.id, provider, origin);
    const secure = origin.startsWith('https:') ? '; Secure' : '';
    return new Response(null, {
      status: 303,
      headers: { Location: to.toString(), 'Set-Cookie': `${BACK_COOKIE}=${from}; Path=/api/connectors; Max-Age=900; HttpOnly; SameSite=Lax${secure}` },
    });
  } catch (e) {
    console.error('connector sign-in failed to start', { provider, error: e instanceof Error ? e.message : e });
    return back('failed');
  }
}
