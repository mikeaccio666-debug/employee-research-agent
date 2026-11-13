import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Band, MarginNote, PencilMark, Pending, Ruler, StatusLine } from '@portrait/ui';
import { BoardHeader } from '@/components/design/BoardHeader';
import { Doorframe } from './Doorframe';

export const metadata: Metadata = { title: '门框原型 · S22' };

/** The agent's states, all told in pencil (design brief §5B.3). */
const STATES: { k: string; when: string; show: ReactNode }[] = [
  { k: '正在想 / 在用工具', when: '一笔铅笔反复写，旁边说在做什么。不用转圈。', show: <StatusLine>在读你的简历第 2 页</StatusLine> },
  {
    k: '写好了，等你确认',
    when: '铅笔虚线 + 虚线下划线，旁边是"对 / 改 / 不要"。',
    show: (
      <span className="flex items-center gap-3">
        <PencilMark vw={80} dash="7 6" style={{ width: 80, color: 'var(--ink-3)' }} />
        <Pending>请导师点评你的 SQL 作业</Pending>
      </span>
    ),
  },
  {
    k: '确认了',
    when: '线变成墨水，从左到右描一遍。',
    show: <PencilMark vw={80} draw style={{ width: 80 }} />,
  },
  {
    k: '你不在时做完了',
    when: '门框旁一小叠便签，像印样一样滑完。',
    show: <span className="t-s b">你不在时 · 3 条</span>,
  },
  { k: '失败了', when: '页边一句手写批注，说清楚哪里不行，带"重试"。', show: <MarginNote>✕ Jordan 的日历连不上 · 重试</MarginNote> },
];

export default function DoorframeBoard() {
  return (
    <div lang="zh-CN" className="relative min-h-screen overflow-hidden pb-24">
      <Ruler />
      <BoardHeader band="S22 · Nov 9" date="原型，用来做用户测试" title="门框">
        <p className="t-body zh c2 mt-3.5 max-w-[50em]">
          登录后的首页是一道门框：实线是做过、有出处的事，<Band>粉笔</Band>是现在，铅笔虚线是 agent 画的下一步。agent
          做出的任何东西都只用三个手势处理：<b>对</b>、<b>改</b>、<b>不要</b>。手机上右滑是对、左滑是不要；桌面上点按钮，或者选中一行按
          Y / E / N。人物和数据都是虚构的，什么都不会真的发出去。
        </p>
      </BoardHeader>

      <section className="wrap mt-12">
        <Doorframe />
      </section>

      <section className="wrap mt-24" aria-labelledby="states">
        <h2 id="states" className="t-h2">
          agent 的五种状态
        </h2>
        <p className="t-s c2 zh mt-2 max-w-[46em]">全部用铅笔讲，不用转圈加载，也不用闪光符号。</p>
        <ul className="mt-6 flex flex-col gap-5">
          {STATES.map((st) => (
            <li key={st.k} className="grid gap-x-6 gap-y-1 md:grid-cols-[200px_minmax(0,1fr)_minmax(0,1fr)] md:items-center">
              <span className="t-s b">{st.k}</span>
              <span>{st.show}</span>
              <span className="t-xs c2 zh">{st.when}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
