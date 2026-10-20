import Link from 'next/link';
import { PencilMark, Ruler, SectionMark, buttonClass } from '@portrait/ui';
import { PublicHeader } from '@/components/chrome';
import { routes } from '@/lib/routes';
import type { PublicPortrait } from '@/lib/supabase/public';

const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

/**
 * A real person's public portrait, read from the database. The page spec is filled by the agent
 * from step 2 on; until then the page carries the name, the date of the first mark and a plain
 * line saying the portrait is still being drawn.
 */
export function DrawnPortrait({ portrait }: { portrait: PublicPortrait }) {
  const name = portrait.display_name || `@${portrait.handle}`;
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
        {first ? <p className="lab mt-3">First mark · {first}</p> : null}
        <p className="t-body c2 mt-6 max-w-[54ch]">
          This portrait is still being drawn. New marks go up here as {name} adds what they have done.
        </p>
        <PencilMark vw={200} d="M2 6 C50 3 120 7 198 4" dash="6 8" className="mt-8 w-[120px] opacity-50" />
      </main>
    </div>
  );
}
