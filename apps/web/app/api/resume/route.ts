import { loadPortrait } from '@/lib/agent/store';
import { resumeFrom } from '@/lib/resume/model';
import { resumePdf } from '@/lib/resume/pdf';
import { routes } from '@/lib/routes';
import { getViewer, supabaseServer } from '@/lib/supabase/server';

// GET /api/resume — the signed-in person's résumé as a PDF (PRD COACH-01), made from the confirmed
// lines of their portrait. ?for=tailored gives the one the agent put together for a role
// (make_resume). Only ever the person's own portrait: who it belongs to comes from the session.

export const dynamic = 'force-dynamic';

const json = (status: number, message: string) => Response.json({ error: { message } }, { status });

export async function GET(request: Request) {
  const viewer = await getViewer();
  const supabase = await supabaseServer();
  if (!viewer || !supabase) return json(401, 'Sign in to download your résumé.');
  const { spec } = await loadPortrait(supabase, viewer.user.id);
  const tailored = new URL(request.url).searchParams.get('for') === 'tailored';
  if (tailored && !spec.resume) return json(404, 'There is no tailored résumé yet. Ask the studio agent for one.');

  const profile = viewer.profile;
  const name = profile?.display_name || profile?.alias || 'Résumé';
  // The page link only when the page is public under their name; an anonymous page stays unlinked.
  const page = profile?.handle && profile.visibility === 'public' ? `${new URL(request.url).host}${routes.portrait(profile.handle)}` : null;
  const resume = resumeFrom(spec, { name, contact: [viewer.user.email ?? '', page ?? ''] }, tailored);
  if (!resume.sections.length) return json(409, 'Confirm a few lines on your portrait first; a résumé only holds confirmed lines.');

  const bytes = await resumePdf(resume);
  const file = `${name.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'resume'}-resume${resume.target ? `-${resume.target.replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 40)}` : ''}.pdf`;
  return new Response(bytes as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="resume.pdf"; filename*=UTF-8''${encodeURIComponent(file)}`,
      'Cache-Control': 'private, no-store',
    },
  });
}
