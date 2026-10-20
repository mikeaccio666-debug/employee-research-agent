import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

// POST only, so a link or a prefetch can never sign someone out.
export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  await supabase?.auth.signOut();
  return NextResponse.redirect(new URL('/', request.url), { status: 303 });
}
