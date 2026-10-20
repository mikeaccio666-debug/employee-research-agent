import type { Metadata } from 'next';
import Link from 'next/link';
import { PencilMark, Ruler, SectionMark, buttonClass } from '@portrait/ui';
import { PublicHeader } from '@/components/chrome';
import { RequestedPath } from '@/components/entry/RequestedPath';
import { routes } from '@/lib/routes';

export const metadata: Metadata = { title: '404 · portrait not found' };

/**
 * Not found, as S14 draws it (state 08): the link that was tried, one plain sentence,
 * one thing to do — and on the doorframe only a dashed line, because nobody has been
 * measured here yet.
 */
export default function NotFound() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <Ruler />
      <PublicHeader className="flex-wrap gap-x-3">
        <nav aria-label="Main" className="flex gap-1">
          <Link className={buttonClass({ variant: 'quiet', size: 'sm' })} href={routes.design} lang="zh-CN">
            目录 · 页面 v2
          </Link>
        </nav>
      </PublicHeader>
      <main className="wrap relative pt-24 pb-24 max-sm:pt-16">
        <SectionMark vw={200} d="M2 6 C50 3 120 7 198 4" dash="6 8" className="top-[78px] w-[160px] opacity-50" />
        <p className="hand text-[18px] break-all">
          <RequestedPath />
        </p>
        <h1 className="t-h1 mt-2.5">This portrait hasn’t been drawn yet.</h1>
        <div className="mt-[18px] flex flex-wrap items-center gap-2">
          <Link className={buttonClass({ size: 'sm' })} href={routes.birth}>
            Draw yours
          </Link>
          <span className="t-xs c2">or check the spelling of the link</span>
        </div>
        {/* Phones hide the doorframe, so the dashed line sits under the link, as in the S14 card. */}
        <PencilMark vw={200} d="M2 6 C50 3 120 7 198 4" dash="6 8" className="mt-8 w-[120px] opacity-50 sm:hidden" />
      </main>
    </div>
  );
}
