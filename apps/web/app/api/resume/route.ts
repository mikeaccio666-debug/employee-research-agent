import { loadPortrait } from '@/lib/agent/store';
import { jobSource } from '@/lib/jobs/source';
import { LIMITS } from '@/lib/portrait/spec';
import { planForPosting, resumeFrom } from '@/lib/resume/model';
import { docPdf, fitScale, letterPdf } from '@/lib/resume/doc-pdf';
import { docDocx } from '@/lib/resume/docx';
import { resumePdf } from '@/lib/resume/pdf';
import { versionOf } from '@/lib/resume/store';
import { routes } from '@/lib/routes';
import { getViewer, supabaseServer } from '@/lib/supabase/server';

// GET /api/resume — the signed-in person's résumé as a PDF (PRD COACH-01), made from the confirmed
// lines of their portrait. ?for=tailored gives the one the agent put together for a role
// (make_resume). ?job=<posting id>&first=<line ids> gives the one for a posting on the Jobs page:
// the same confirmed lines, the ones the posting asks for first. Only ever the person's own
// portrait: who it belongs to comes from the session. ?version=<id> gives a version from the
// résumé editor (app/resume), set in the template, font and size chosen there; with &doc=letter
// its cover letter instead, and with &format=docx as a Word file.

export const dynamic = 'force-dynamic';

const json = (status: number, message: string) => Response.json({ error: { message } }, { status });

export async function GET(request: Request) {
  const viewer = await getViewer();
  const supabase = await supabaseServer();
  if (!viewer || !supabase) return json(401, 'Sign in to download your résumé.');
  const params = new URL(request.url).searchParams;
  const versionId = params.get('version');
  if (versionId) return versionFile(supabase, viewer.user.id, versionId, params.get('doc') === 'letter', params.get('format') === 'docx');
  const { spec } = await loadPortrait(supabase, viewer.user.id);
  const tailored = params.get('for') === 'tailored';
  if (tailored && !spec.resume) return json(404, 'There is no tailored résumé yet. Ask the studio agent for one.');
  const jobId = params.get('job');
  const job = jobId ? await jobSource().get(jobId).catch(() => null) : null;
  if (jobId && !job) return json(404, 'That posting isn’t there any more.');
  const first = (params.get('first') ?? '').split(',').filter(Boolean).slice(0, LIMITS.claims);
  const plan = job ? planForPosting(spec, `${job.title} at ${job.company.name}`, first) : tailored;

  const profile = viewer.profile;
  const name = profile?.display_name || profile?.alias || 'Résumé';
  // The page link only when the page is public under their name; an anonymous page stays unlinked.
  const page = profile?.handle && profile.visibility === 'public' ? `${new URL(request.url).host}${routes.portrait(profile.handle)}` : null;
  const resume = resumeFrom(spec, { name, contact: [viewer.user.email ?? '', page ?? ''] }, plan);
  if (!resume.sections.length) return json(409, 'Confirm a few lines on your portrait first; a résumé only holds confirmed lines.');

  const bytes = await resumePdf(resume);
  return pdf(bytes, `${slug(name) || 'resume'}-resume${resume.target ? `-${slug(resume.target).slice(0, 40)}` : ''}.pdf`);
}

const slug = (s: string) => s.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');

/** A version from the résumé editor, or its cover letter, laid out as the editor shows it. */
async function versionFile(supabase: NonNullable<Awaited<ReturnType<typeof supabaseServer>>>, ownerId: string, id: string, letter: boolean, word: boolean) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json(404, 'That version isn’t there.');
  const version = await versionOf(supabase, ownerId, id).catch(() => null);
  if (!version) return json(404, 'That version isn’t there.');
  const base = `${slug(version.doc.name) || 'resume'}-${slug(version.name).slice(0, 40) || 'resume'}${letter ? '-cover-letter' : ''}`;
  const theLetter = letter ? version.letter : null;
  if (word) {
    const { scale } = await fitScale(version.doc, version.style, theLetter);
    return file(await docDocx(version.doc, version.style, scale, theLetter), `${base}.docx`, DOCX);
  }
  const title = `${version.doc.name || 'Résumé'}: ${letter ? 'cover letter' : version.name}`;
  const bytes = theLetter ? await letterPdf(version.doc, theLetter, version.style, { title }) : await docPdf(version.doc, version.style, { title });
  return pdf(bytes, `${base}.pdf`);
}

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function file(bytes: Uint8Array, name: string, type: string) {
  return new Response(bytes as BodyInit, {
    headers: {
      'Content-Type': type,
      'Content-Disposition': `attachment; filename="${name.endsWith('.docx') ? 'resume.docx' : 'resume.pdf'}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      'Cache-Control': 'private, no-store',
    },
  });
}

function pdf(bytes: Uint8Array, file: string) {
  return new Response(bytes as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="resume.pdf"; filename*=UTF-8''${encodeURIComponent(file)}`,
      'Cache-Control': 'private, no-store',
    },
  });
}
