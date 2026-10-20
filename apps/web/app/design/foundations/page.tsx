import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Ruler, cx } from '@portrait/ui';
import { BoardHeader } from '@/components/design/BoardHeader';
import { MotionDemos } from './MotionDemos';
import s from './foundations.module.css';

export const metadata: Metadata = { title: 'v0.2 空间与动效' };

/** The 4px spacing steps, each drawn as a bar of its own height. */
const SPACE = [
  { n: 4, h: 'h-1' },
  { n: 8, h: 'h-2' },
  { n: 12, h: 'h-3' },
  { n: 16, h: 'h-4' },
  { n: 24, h: 'h-6' },
  { n: 32, h: 'h-8' },
  { n: 48, h: 'h-12' },
  { n: 64, h: 'h-16' },
  { n: 96, h: 'h-24' },
  { n: 128, h: 'h-32' },
];

const MOTION_TOKENS: { k: string; v: string; d: ReactNode }[] = [
  {
    k: '--spring',
    v: 'ζ = 1 临界阻尼',
    d: (
      <>
        linear() 采样 x(t) = 1 − (1 + ωt)e<sup>−ωt</sup>，ωT = 8；不回弹
      </>
    ),
  },
  { k: '--t-press', v: '120ms', d: '按下缩到 0.98' },
  { k: '--t-s', v: '240ms', d: '悬停、开关、颜色变化' },
  { k: '--t-draw', v: '380ms', d: '画一道线、圈住、划掉' },
  { k: '--t-m', v: '420ms', d: '原地展开（逐行间隔 60ms）' },
  { k: '--t-settle', v: '520ms', d: '落定：完成态从上方 5px 落下、停住' },
  { k: '--t-l', v: '640ms', d: '从来源处生长（View Transitions 共享元素）' },
];

const REDUCED = [
  ['画一道', '描边 380ms，文字上升 8px', '线直接出现，文字 150ms 淡入'],
  ['原地展开', '高度 420ms + 竖线 + 逐行上升', '直接展开，内容 150ms 淡入，不位移'],
  ['从来源处生长', '共享元素飞行 640ms', '新块直接出现，来源处高亮保留 2 秒'],
  ['按下与落定', '0.98 缩放；落下 5px', '不缩放；完成态直接出现'],
  ['圈住 / 划掉', '描边 380ms；帧收起', '圈和线直接出现；帧不收起，只变淡'],
  ['拖动排序', '抬起、让位、落定', '拖动跟手但不倾斜；松手后直接到位'],
];

/** Two panels per row from 1180 up; one per row below. */
const wide = 'max-lg:col-span-full';

/** V2-Foundations: space, grid, shape and motion — one motion signature, grow from the source. */
export default function FoundationsPage() {
  return (
    <div lang="zh-CN" className="relative min-h-screen overflow-hidden pb-24">
      <Ruler />
      <BoardHeader band="v0.2 · Oct 19" date="空间、网格、形状、动效" title="空间与动效">
        <p className="t-body zh c2 mt-3.5 max-w-[46em]">
          全站共用一个动效签名：从来源处生长。东西从哪里来，就从哪里长出来——对话里的一句话长成画像里的一块，一张卡片长成它的详情。动效有手感，但不弹跳：临界阻尼弹簧，按下轻微缩放，完成有落定。每页最多一处小惊喜。
        </p>
      </BoardHeader>

      <section className={cx('wrap', s.sec)}>
        <div className="g12 gap-y-6">
          <div className={cx('panel col-[1/span_5] px-7 py-6 max-sm:px-5', wide)}>
            <p className="lab">间距 · 4px 基准</p>
            <div className={cx(s.sp, 'mt-[18px]')}>
              {SPACE.map((step) => (
                <div key={step.n}>
                  <i className={step.h} />
                  <span className="t-xs">{step.n}</span>
                </div>
              ))}
            </div>
            <p className="t-s c2 zh mt-4">区块之间 56–96；同一块内 8–16；收起的行高 ≥ 64，触控目标 ≥ 44。</p>
          </div>
          <div className={cx('panel col-[6/span_7] px-7 py-6 max-sm:px-5', wide)}>
            <p className="lab">网格 · 12 栏 + 左侧刻度槽</p>
            <div className={cx(s.gridv, 'mt-4')}>
              <Ruler />
              <div className={s.cols}>
                {Array.from({ length: 12 }, (_, i) => (
                  <span key={i} />
                ))}
              </div>
            </div>
            <p className="t-s c2 zh mt-3">
              内容最宽 1440，栏间距 24；左边 96px 是刻度槽（门框），每个区块从这里画出一道线。画像开场：名字 1–9
              栏，状态 10–12 栏、在名字右下方。390 宽时刻度槽收起。
            </p>
          </div>
          <div className={cx('panel col-[1/span_6] px-7 py-6 max-sm:px-5', wide)}>
            <p className="lab">形状与层级</p>
            <div className="mt-4 flex items-end gap-3">
              <div className="t-xs b h-[120px] flex-1 rounded-md bg-wall p-2.5">wall · 墙</div>
              <div className="t-xs b h-[120px] flex-1 rounded-md bg-wall-2 p-2.5">wall-2 · 凹面</div>
              <div className={cx('t-xs b h-[120px] flex-1 rounded-md bg-trim p-2.5', s.edge)}>trim · 门框</div>
            </div>
            <p className="t-s c2 zh mt-3">
              圆角统一 4px（内层 3px）；没有投影、没有描边框、不套卡片。线只有两种：刻度（2px）和铅笔笔触（3px）。
            </p>
          </div>
          <div className={cx('panel col-[7/span_6] px-7 py-6 max-sm:px-5', wide)}>
            <p className="lab">动效令牌</p>
            {MOTION_TOKENS.map((t) => (
              <div key={t.k} className={s.tokrow}>
                <span className="b">{t.k}</span>
                <span className="c2">{t.v}</span>
                <span className="t-s">{t.d}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MotionDemos />

      <section className={cx('wrap', s.sec)}>
        <div className={s.sech}>
          <span className={s.n}>2</span>
          <h2 className="t-h1">减少动态效果时</h2>
          <p className="t-s c2">prefers-reduced-motion: reduce</p>
        </div>
        <div className="panel px-7 py-2 max-sm:px-5">
          <div className={s.rmrow}>
            <span className="b">动作</span>
            <span className="b">默认</span>
            <span className="b">减少动态效果</span>
          </div>
          {REDUCED.map(([what, normal, reduced]) => (
            <div key={what} className={s.rmrow}>
              <span>{what}</span>
              <span className="c2">{normal}</span>
              <span>{reduced}</span>
            </div>
          ))}
        </div>
        <div className="g12 mt-6">
          <div className="panel col-[1/span_12] px-7 py-[22px] max-sm:px-5">
            <p className="lab">每页一处小惊喜</p>
            <p className="t-s zh mt-2">
              画像页：约成 coffee chat 时，刻度上画出一道新线，写上日期。· 印样：圈住第一个人时那一笔圈。·
              工作室：对话里的一句话第一次长成画像里的一块。· 诞生时刻：画像逐段排上去。其余地方保持安静。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
