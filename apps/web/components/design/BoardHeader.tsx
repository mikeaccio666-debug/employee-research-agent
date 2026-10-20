import Link from 'next/link';
import type { ReactNode } from 'react';
import { Band, DateNote, SectionMark, buttonClass } from '@portrait/ui';
import { routes } from '@/lib/routes';

export type BoardHeaderProps = {
  /** Gold band at the start of the handwritten line: "v0.2 · Oct 19". */
  band: ReactNode;
  /** Handwritten note after the band. */
  date: ReactNode;
  title: ReactNode;
  /** The intro paragraph under the title. */
  children?: ReactNode;
};

/**
 * The header every design-system board shares: a way back to the index, the new pencil
 * mark on the ruler, the handwritten date line, the display title and the intro.
 */
export function BoardHeader({ band, date, title, children }: BoardHeaderProps) {
  return (
    <header className="wrap pt-16">
      <Link
        href={routes.design}
        className={buttonClass({ variant: 'quiet', size: 'sm', className: 'absolute top-3 -ml-2' })}
      >
        ← <span lang="zh-CN">目录</span>
      </Link>
      <SectionMark vw={220} d="M2 6 C60 3 140 7 218 4" isNew style={{ top: 70, width: 220 }} />
      <p className="hand pt-[22px] text-[18px]">
        <Band>{band}</Band> <DateNote>{date}</DateNote>
      </p>
      <h1 className="t-d mt-[18px]">{title}</h1>
      {children}
    </header>
  );
}
