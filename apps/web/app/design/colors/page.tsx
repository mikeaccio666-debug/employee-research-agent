import type { Metadata } from 'next';
import { Ruler } from '@portrait/ui';
import { BoardHeader } from '@/components/design/BoardHeader';
import { ColorsBoard } from './ColorsBoard';

export const metadata: Metadata = { title: 'v0.2 颜色' };

/** V2-Colors: the 晨 and 夜 palettes, the wine trim (live), contrast and the rules for colour. */
export default function ColorsPage() {
  return (
    <div lang="zh-CN" className="relative min-h-screen overflow-hidden pb-24">
      <Ruler />
      <BoardHeader band="v0.2 · Oct 19" date="身高线的结构 × 晨光的颜色" title="颜色">
        <p className="t-body zh c2 mt-3.5 max-w-[46em]">
          亮色「晨」：刷了浅蓝灰漆的墙、奶油色的门框、一支金色粉笔、一支蓝黑铅笔。暗色「夜」：深蓝的墙、酒红色的门框，粉笔还是那支金色的，正文换成白粉笔。平台只有一个强调色——金色粉笔；酒红只做暗色里的“面”，不做强调。
        </p>
      </BoardHeader>
      <ColorsBoard />
    </div>
  );
}
