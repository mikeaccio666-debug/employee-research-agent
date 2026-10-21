import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

// "Download everything" (PRD PRIV-06): the signed-in person's own data as one JSON file. Read as
// them, so row-level security decides what is theirs; nothing here uses a service key.

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await supabaseServer();
  if (!supabase) return NextResponse.json({ error: { message: 'Not set up here.' } }, { status: 503 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: { message: 'Sign in first.' } }, { status: 401 });

  const [profile, portrait, versions, conversations, sources] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('portraits').select('spec, published_spec, status, published_at, created_at, updated_at').eq('owner_id', user.id).maybeSingle(),
    // Missing before the version-history migration runs; the export goes on without it.
    supabase.from('portrait_versions').select('rev, made_by, spec, created_at').order('id'),
    supabase.from('conversations').select('id, purpose, created_at').eq('owner_id', user.id),
    supabase.from('sources').select('kind, name, url, pages, created_at').eq('owner_id', user.id).order('created_at'),
  ]);
  const ids = (conversations.data ?? []).map((c) => c.id as string);
  const messages = ids.length
    ? await supabase.from('conversation_messages').select('conversation_id, role, body, created_at').in('conversation_id', ids).neq('role', 'tool').order('id')
    : { data: [] };

  const body = {
    exported_at: new Date().toISOString(),
    account: { email: user.email ?? null, created_at: user.created_at },
    profile: profile.data,
    portrait: portrait.data,
    portrait_history: versions.data ?? [],
    conversations: (conversations.data ?? []).map((c) => ({
      purpose: c.purpose,
      created_at: c.created_at,
      messages: (messages.data ?? []).filter((m) => m.conversation_id === c.id).map(({ conversation_id: _, ...m }) => m),
    })),
    sources: sources.data ?? [],
  };
  const day = body.exported_at.slice(0, 10);
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="portrait-export-${day}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
