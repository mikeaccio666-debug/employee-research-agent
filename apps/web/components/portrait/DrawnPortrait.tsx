import Link from 'next/link';
import { PencilMark, Ruler, SectionMark, buttonClass } from '@portrait/ui';
import { PublicHeader } from '@/components/chrome';
import { routes } from '@/lib/routes';
import type { PublicPortrait } from '@/lib/supabase/public';
import { readSpec, visibleClaims } from '@/lib/portrait/spec';
import { IdentityLines, SpecSections } from './SpecSections';

const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

/**
 * A real person's public portrait, read from the database: the lines they confirmed in the studio
 * as of their last publish. Until there are any, the page carries the name, the date of the first
 * mark and a plain line saying the portrait is still being drawn.
 */
export function DrawnPortrait({ portrait }: { portrait: PublicPortrait }) {
  const name = portrait.display_name || `@${portrait.handle}`;
  const spec = readSpec(portrait.spec);
  // The published copy holds confirmed lines only; filtering again keeps a hand-edited row honest.
  const claims = visibleClaims(spec);
  const first = portrait.published_at ? dateFormat.format(new Date(portrait.published_at)) : null;
  return (
    <div className="relative min-h-screen overflow-hidden">
      <Ruler />
      <PublicHeader>
        <Link href={routes.birth} className={buttonClass({ variant: 'quiet' })}>
          Draw yours
        </Link>
      </PublicHeader>
      <main className="wrap relative pt-24 pb-24 max-sm:pt-16">
        <SectionMark vw={210} d="M2 6 C50 3 120 7 208 4" isNew className="top-[66px] w-[210px]" />
        <p className="hand text-[18px]">@{portrait.handle}</p>
        <h1 className="t-name mt-3.5">{name}</h1>
        {spec.headline ? <p className="t-h2 mt-3.5 max-w-[30ch]">{spec.headline.text}</p> : null}
        <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
          {first ? <p className="lab">Updated · {first}</p> : null}
          <IdentityLines claims={claims} />
        </div>
        {claims.some((c) => c.layer !== 'identity') ? (
          <SpecSections claims={claims} order={spec.order} className="mt-12 max-w-[640px]" />
        ) : (
          <>
            <p className="t-body c2 mt-6 max-w-[54ch]">
              This portrait is still being drawn. New marks go up here as {name} adds what they have done.
            </p>
            <PencilMark vw={200} d="M2 6 C50 3 120 7 198 4" dash="6 8" className="mt-8 w-[120px] opacity-50" />
          </>
        )}
      </main>
    </div>
  );
}
