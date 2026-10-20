import type { Metadata } from 'next';
import { Ruler } from '@portrait/ui';
import { BoardHeader } from '@/components/design/BoardHeader';
import { ComponentsBoard } from './ComponentsBoard';

export const metadata: Metadata = { title: 'v0.2 组件' };

/**
 * V2-Components: the living test of @portrait/ui. The board's theme prop is the site theme
 * (the switch in the header); its wine tweaks equal the defaults in system.css.
 */
export default function ComponentsPage() {
  return (
    <div lang="en" className="relative min-h-screen overflow-hidden pb-24">
      <Ruler />
      <BoardHeader
        band="v0.2 · Oct 19"
        date={<span lang="zh-CN">能点的都能点</span>}
        title={<span lang="zh-CN">组件</span>}
      >
        <p className="t-body c2 mt-3.5 max-w-[46em]">
          Buttons, inputs, conversation, evidence and editing — all in the <span lang="zh-CN">身高线</span> language.
          Use the theme and wine controls in the props panel to see the night version.
        </p>
      </BoardHeader>
      <ComponentsBoard />
    </div>
  );
}
