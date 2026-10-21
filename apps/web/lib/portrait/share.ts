import type { PublicPortrait } from '@/lib/supabase/public';
import { readSpec, visibleClaims } from './spec';

const MAX_LINE = 120;

/**
 * What a share card and link preview say (PRD 7.3): the name and one line. The confirmed headline
 * when there is one, else the story or the first piece of experience, all from the published page.
 */
export function shareLine(portrait: PublicPortrait): { name: string; line: string | null } {
  const spec = readSpec(portrait.spec);
  const claims = visibleClaims(spec);
  const pick =
    spec.headline?.text ??
    claims.find((c) => c.layer === 'narrative')?.statement ??
    claims.find((c) => c.layer === 'experience')?.statement ??
    null;
  const line = pick && pick.length > MAX_LINE ? `${pick.slice(0, MAX_LINE - 1).trimEnd()}…` : pick;
  return { name: portrait.display_name || `@${portrait.handle}`, line };
}
