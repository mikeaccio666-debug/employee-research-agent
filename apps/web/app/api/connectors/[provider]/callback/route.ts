import { canConnect, isConnectorId } from '@/lib/connectors/catalog';
import { canSeal } from '@/lib/connectors/seal';
import { finishSignIn } from '@/lib/connectors/signin';
import { routes } from '@/lib/routes';
import { supabaseServer } from '@/lib/supabase/server';

// GET /api/connectors/<id>/callback — where the app sends the person back after they sign in
// (or decline), and on to the page they connected from.

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const url = new URL(req.url);
  const page = /(?:^|;\s*)connector_back=apps(?:;|$)/.test(req.headers.get('cookie') ?? '') ? routes.apps : routes.studio;
  const back = (result: string) => Response.redirect(`${url.origin}${page}?connector=${encodeURIComponent(provider)}&result=${result}`, 303);
  if (!isConnectorId(provider) || !canConnect(provider) || !canSeal()) return back('unavailable');
  const supabase = await supabaseServer();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) return Response.redirect(`${url.origin}${routes.login}?next=${encodeURIComponent(page)}`, 303);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) return back(url.searchParams.get('error') === 'access_denied' ? 'declined' : 'failed');
  try {
    return back((await finishSignIn(supabase, user.id, provider, url.origin, { code, state })) ? 'connected' : 'failed');
  } catch (e) {
    console.error('connector sign-in failed to finish', { provider, error: e instanceof Error ? e.message : e });
    return back('failed');
  }
}
