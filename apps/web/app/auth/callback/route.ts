import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { safeNext } from '@/lib/safe-next';

// Google, GitHub and LinkedIn sign-in and the link in the sign-in email land here with a one-time
// code, which becomes the session cookie. Linking an account to an anonymous sign-in lands here
// too, with an error when that account already belongs to someone.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const next = safeNext(searchParams.get('next'));
  const back = (error: string) => NextResponse.redirect(`${origin}/login?error=${error}&next=${encodeURIComponent(next)}`);
  const failure = searchParams.get('error_code');
  if (failure === 'identity_already_exists' || failure === 'email_exists') return back('taken');
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const supabase = await supabaseServer();
  if (supabase && code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  // A confirmation link in the token-hash form (an email added to an anonymous sign-in).
  if (supabase && tokenHash && (type === 'email_change' || type === 'email' || type === 'magiclink')) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return back('link');
}
