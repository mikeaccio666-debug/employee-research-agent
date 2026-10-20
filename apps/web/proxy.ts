import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { supabaseEnv } from '@/lib/supabase/env';

// Keeps the Supabase session fresh: Server Components can read cookies but not write them,
// so an expiring session is refreshed here, before the page renders.
export async function proxy(request: NextRequest) {
  if (!supabaseEnv) return NextResponse.next();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseEnv.url, supabaseEnv.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  // Validates the session with Supabase and refreshes it when needed. Nothing may run between
  // creating the client and this call, or the person can be signed out at random.
  await supabase.auth.getUser();
  return response;
}

export const config = {
  // Skip static files, images and the icon; everything else may carry a session.
  matcher: ['/((?!_next/static|_next/image|icon.svg|.*\\.(?:png|jpg|jpeg|gif|svg|webp|woff2?)$).*)'],
};
