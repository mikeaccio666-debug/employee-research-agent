import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Band, FootnoteButton, Ruler, cx } from '@portrait/ui';
import { BoardHeader } from '@/components/design/BoardHeader';
import s from './type.module.css';

export const metadata: Metadata = { title: 'v0.2 字体' };

type Step = { k: string; spec: string; en: ReactNode; zh: ReactNode };

/** The type scale: name, spec, an English specimen and a Chinese one. */
const SCALE: Step[] = [
  {
    k: 'name',
    spec: 'clamp(64→160) · 800 · 0.88 · −0.05em',
    en: (
      <span lang="en" className="t-name text-[120px] max-sm:text-[64px]">
        Lin Zhou
      </span>
    ),
    zh: <span className="c2 t-s">只用于画像页开场的名字；名字占 1–9 栏。</span>,
  },
  {
    k: 'display',
    spec: 'clamp(40→88) · 800 · 1.0',
    en: (
      <span lang="en" className="t-d text-[64px] max-sm:text-[44px]">
        Draw yours.
      </span>
    ),
    zh: <span className="text-[52px] leading-[1.15] font-bold max-sm:text-[40px]">画出你自己</span>,
  },
  {
    k: 'h1',
    spec: '32→40 · 700 · 1.1',
    en: (
      <span lang="en" className="t-h1">
        Builds the thing first, then finds out who needed it.
      </span>
    ),
    zh: <span className="t-h1 zh leading-[1.4]">先把东西做出来，再去找需要它的人。</span>,
  },
  {
    k: 'h2',
    spec: '28 · 700 · 1.2',
    en: (
      <span lang="en" className="t-h2">
        Learned backend by keeping a real app alive.
      </span>
    ),
    zh: <span className="t-h2 leading-[1.5]">靠维护一个真实的产品学会了后端。</span>,
  },
  {
    k: 'h3',
    spec: '20 · 700 · 1.28',
    en: (
      <span lang="en" className="t-h3">
        Campus Marketplace · founder &amp; backend
      </span>
    ),
    zh: <span className="t-h3 leading-[1.6]">校园二手交易 · 创始人兼后端</span>,
  },
  {
    k: 'body',
    spec: '17 · 400 · 1.6 / 中文 1.8',
    en: (
      <span lang="en" className="t-body max-w-[62ch]">
        When 2,000 students posted at once, Postgres ran out of connections. Lin cached listings and moved photo uploads
        to a queue.
      </span>
    ),
    zh: (
      <span className="t-body zh">
        开学那周 2,000 名学生同时发布，数据库连接被占满。Lin 加了读缓存，把图片上传放进队列。
      </span>
    ),
  },
  {
    k: 'small',
    spec: '15 · 400 · 1.5',
    en: (
      <span lang="en" className="t-s">
        Work authorization shared after you connect.
      </span>
    ),
    zh: <span className="t-s zh">建立连接后再分享工作许可信息。</span>,
  },
  {
    k: 'meta / label',
    spec: '13 · 500 / 700',
    en: (
      <span lang="en">
        <span className="lab">Experience · newest on top</span>{' '}
        <span className="t-xs c2 ml-3">3 proofs · Sep 2026</span>
      </span>
    ),
    zh: (
      <span>
        <span className="lab">经历 · 最新的在上面</span> <span className="t-xs c2 ml-3">3 条证据 · 2026 年 9 月</span>
      </span>
    ),
  },
  {
    k: 'hand',
    spec: 'Shantell 500 · 15–26',
    en: (
      <span lang="en" className="hand text-[24px] leading-[1.4]">
        “I’d rather show you what I made.” <span className="c2 text-[16px]">Oct 17</span>
      </span>
    ),
    zh: <span className="hcn text-[26px] leading-[1.5]">“我可以给你看我做的东西。”</span>,
  },
];

const RULES = [
  '中文不加字距、不用斜体；强调用字重或金色粉笔。',
  '中英文之间留空（text-autospace），行首行尾标点挤压（text-spacing-trim）。',
  '阅读宽度：英文 60–72 字符，中文 32–38 字。',
  '手写体只给“人说的话”、日期和批注；事实、数字、按钮一律黑体。',
  '中文字体按 unicode-range 分片加载，首屏只加载用到的字；霞鹜文楷只在出现原话时加载。',
  '不用等宽字体。时间、数字用 Atkinson 的等宽数字（tabular-nums）对齐。',
];

/** Four families across the 12 columns; two per row below 1180, one on a phone. */
const famCol = 'max-lg:col-span-6 max-sm:col-span-full';

/** V2-Type: four open-source families, each with one job, and the type scale. */
export default function TypePage() {
  return (
    <div lang="zh-CN" className="relative min-h-screen overflow-hidden pb-24">
      <Ruler />
      <BoardHeader band="v0.2 · Oct 19" date="四款开源字体，各管一件事" title="字体">
        <p className="t-body zh c2 mt-3.5 max-w-[46em]">
          事实和界面用黑体，人说的话和日期用手写。看到手写，就知道这是一个人留下的痕迹；看到黑体，就知道这是可以查证的事实。
        </p>
      </BoardHeader>

      <section className={cx('wrap', s.sec)}>
        <div className="g12 gap-y-6">
          <div className={cx('panel col-[1/span_3]', s.fam, famCol)}>
            <p className="lab">拉丁 · 事实与界面</p>
            <p lang="en" className="text-[44px] leading-none font-extrabold tracking-[-0.04em]">
              Atkinson Hyperlegible Next
            </p>
            <p className="t-s c2">
              为低视力读者设计，每个字母都不会认错。200–800，含斜体。标题 800 / 700，正文 400，界面 700。数字 0
              带斜杠，是它的易读设计。
            </p>
          </div>
          <div className={cx('panel col-[4/span_3]', s.fam, famCol)}>
            <p className="lab">拉丁 · 人的笔迹</p>
            <p lang="en" className="hand text-[40px] leading-[1.05]">
              Shantell Sans
            </p>
            <p className="t-s c2">手写，但读得清。只给：本人原话、别人写的担保、日期、页边批注、帧号。400–600。</p>
          </div>
          <div className={cx('panel col-[7/span_3]', s.fam, famCol)}>
            <p className="lab">中文 · 人的笔迹</p>
            <p className="hcn text-[42px] leading-[1.2]">霞鹜文楷</p>
            <p className="t-s c2">楷书的笔意，和 Shantell 一样“像人写的”。只给：中文原话、担保、批注。按需分片加载。</p>
          </div>
          <div className={cx('panel col-[10/span_3]', s.fam, famCol)}>
            <p className="lab">中文 · 事实与界面</p>
            <p className="text-[42px] leading-[1.2] font-bold">思源黑体</p>
            <p className="t-s c2">正文 400，小标题 700。和 Atkinson 的字重、灰度接近，中英混排不跳。</p>
          </div>
        </div>
      </section>

      <section className={cx('wrap', s.sec)}>
        <div className={s.sech}>
          <span className={s.n}>1</span>
          <h2 className="t-h1">字号阶梯</h2>
          <p className="t-s c2">流式字号；中文正文行高 1.8，英文 1.6。</p>
        </div>
        <div className="panel px-7 py-1.5 max-sm:px-5">
          {SCALE.map((step) => (
            <div key={step.k} className={s.row}>
              <span className="t-xs b">{step.k}</span>
              <span className={s.spec}>{step.spec}</span>
              {step.en}
              {step.zh}
            </div>
          ))}
        </div>
      </section>

      <section className={cx('wrap', s.sec)}>
        <div className={s.sech}>
          <span className={s.n}>2</span>
          <h2 className="t-h1">中英混排</h2>
        </div>
        <div className="g12 gap-y-6">
          <div className="panel col-[1/span_7] px-8 py-7 max-md:col-span-full max-sm:px-5">
            <p className="lab">样例 · 画像页的一段</p>
            <p className="t-h2 mt-3 leading-[1.45]">
              靠维护一个 2,000 多名学生在用的 Campus Marketplace，她学会了后端开发。
            </p>
            <p className="t-body zh mt-3 max-w-[36em]">
              开学那周数据库一直超时。她没有换更大的数据库，而是给列表页加了 30
              秒的读缓存，又把图片上传从主请求里拆进队列，p95 从 1.8 s 降到 240 ms。
              <FootnoteButton n={4} label="出处 4" />
            </p>
            <p className="hcn mt-4 text-[24px] leading-[1.6]">
              “开学那周数据库一直超时。我加了一层读缓存，之后就稳了。”
            </p>
            <p className="t-xs c2 mt-1.5">Lin 的原话 · 对话第 4 轮 · 经本人同意展示</p>
          </div>
          <div className="panel col-[8/span_5] px-7 py-3.5 max-md:col-span-full max-sm:px-5">
            {RULES.map((rule, i) => (
              <div key={i} className={s.rule}>
                <span className={s.k}>{i + 1}</span>
                <p className="t-s zh">{rule}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={cx('wrap', s.sec)}>
        <div className={s.sech}>
          <span className={s.n}>3</span>
          <h2 className="t-h1">在暗色里</h2>
        </div>
        {/* Drawn in 夜 whatever the site theme is. */}
        <div className="pv dark relative rounded-md px-9 py-8 max-sm:px-5 max-sm:py-6">
          <div className="g12 items-end gap-y-4">
            <p lang="en" className="t-name col-[1/span_8] text-[112px] max-sm:text-[64px]">
              Lin Zhou
            </p>
            <div lang="en" className="col-[9/span_4]">
              <p className="hand text-[18px]">
                <Band>Now · moving to TypeScript</Band>
              </p>
              <p className="t-s c2 mt-2.5">Open to summer 2027 internships</p>
            </div>
            <div lang="en" className="panel col-[1/span_7] px-6 py-5">
              <p className="t-h3">Survived move-in week</p>
              <p className="t-body mt-1.5">
                Lin cached listings and moved photo uploads to a queue instead of buying a bigger database.
                <FootnoteButton n={4} />
              </p>
              <p className="hand mt-2.5 text-[16px] text-chalk">Oct 19 · added from your message · undo</p>
            </div>
            <div className="col-[9/span_4]">
              <p className="hcn text-[24px] leading-[1.55]">“我不太会介绍自己，但我可以给你看我做的东西。”</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
