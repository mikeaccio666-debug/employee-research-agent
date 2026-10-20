'use client';

import { useId, useState } from 'react';
import { Band, Ruler, Switch, buttonClass, cx, useReducedMotion } from '@portrait/ui';
import s from './foundations.module.css';

const RING =
  'M30 5 C80 -2 150 -2 188 6 C202 10 204 32 203 60 C202 92 200 112 186 116 C130 124 70 124 16 116 C2 112 -2 90 -2 60 C-2 30 0 12 14 6 C20 4 26 4 34 7';

/** Three across; two per row below 1180; one per row below 900. */
const span = 'col-span-4 max-lg:col-span-6 max-md:col-span-full';

/**
 * Section 1 of V2-Foundations: six loops, one signature. They loop with the spring; with
 * "reduce motion" on (the system setting, or the switch here) each one rests finished.
 */
export function MotionDemos() {
  const systemReduces = useReducedMotion();
  const [still, setStill] = useState(false);
  const switchId = useId();

  return (
    <section className={cx('wrap', s.sec)}>
      <div className={s.sech}>
        <span className={s.n}>1</span>
        <h2 className="t-h1">六个动作，一个签名</h2>
        <p className="t-s c2">都在循环播放；开启“减少动态效果”后停在完成态。</p>
        {/* The system setting always wins; the switch only previews it when motion is on. */}
        {systemReduces ? null : (
          <span className={cx(s.ctl, 'flex items-center gap-2.5 lg:ml-auto')}>
            <Switch id={switchId} label="减少动态效果" checked={still} onChange={setStill} />
            <label htmlFor={switchId} className="t-s cursor-pointer">
              减少动态效果
            </label>
          </span>
        )}
      </div>

      <div className={cx('g12 gap-y-6', still && s.still)}>
        <div className={cx(s.demo, span)}>
          <p className="lab">画一道 · Draw a mark</p>
          <div className={cx(s.stage, s.l1)}>
            <Ruler style={{ left: 10 }} />
            <div className="absolute top-12 left-[30px] w-[70%]">
              <svg className="mark new" viewBox="0 0 200 10" preserveAspectRatio="none" aria-hidden="true">
                <path pathLength={1} d="M2 6 C50 3 120 7 198 4" />
              </svg>
              <p className={cx(s.t, 'hand mt-2 ml-4 text-[16px]')}>Oct 19 · coffee with Jordan</p>
            </div>
          </div>
          <p className={cx(s.cap, 'zh')}>
            新内容先在来源旁画出一道铅笔线（从左往右，380ms），文字再从线上升起。用在：新区块、约成的 coffee
            chat、更新画像。
          </p>
        </div>

        <div className={cx(s.demo, span)}>
          <p className="lab">刻度延长 · Grow in place</p>
          <div className={cx(s.stage, s.l2, 'px-4 py-3.5')}>
            <p className="t-s b">Campus Marketplace</p>
            <p className="t-xs c2">Kept a 2,000-student app up through move-in week.</p>
            <div className="relative mt-2.5 pl-3.5">
              <span className={cx(s.line, 'absolute top-0.5 bottom-0.5 left-0 w-[3px] rounded-[2px] bg-ink')} />
              <div className={s.body}>
                <p className="t-xs">
                  <b>Context</b> · A trading app for UCSD students.
                </p>
                <p className="t-xs mt-1">
                  <b>Decision</b> · Cache + queue, no bigger DB.
                </p>
              </div>
            </div>
          </div>
          <p className={cx(s.cap, 'zh')}>
            点开一行，左边一道竖线往下画，故事原地长出来（420ms，逐行 60ms），不跳页、不弹窗。
          </p>
        </div>

        <div className={cx(s.demo, span)}>
          <p className="lab">从来源处生长 · Grow from source</p>
          <div className={cx(s.stage, s.l3)}>
            <span className={s.ghost} aria-hidden="true" />
            <div className={s.target}>
              <p className="t-xs b">Survived move-in week</p>
              <p className="t-xs c2">Experience · Sep 2026</p>
            </div>
            <p className="t-xs c2 absolute bottom-2.5 left-3.5">chat</p>
            <p className="t-xs c2 absolute right-3.5 bottom-2.5">portrait</p>
          </div>
          <p className={cx(s.cap, 'zh')}>
            对话里的那句话（金色）飞到画像里，变成它长出来的那一块（640ms）。卡片 → 详情页同理。实现用 View
            Transitions；不支持时直接出现。
          </p>
        </div>

        <div className={cx(s.demo, span)}>
          <p className="lab">按下与落定 · Press, then settle</p>
          <div className={cx(s.stage, s.l4, 'flex flex-col items-center justify-center gap-3')}>
            <span className={buttonClass({ className: cx(s.press, 'cursor-[inherit]') })}>Book Wed 5:30 PM</span>
            <p className={cx(s.ok, 'hand text-[17px]')}>
              <Band>Booked · Wed 5:30 PM</Band>
            </p>
          </div>
          <p className={cx(s.cap, 'zh')}>
            按下缩到 0.98（120ms）；完成态从上方 5px 落下、停住（520ms）。没有弹跳，没有彩带。
          </p>
        </div>

        <div className={cx(s.demo, span)}>
          <p className="lab">圈住与划掉 · Circle, strike</p>
          <div className={cx(s.stage, s.l5, 'flex gap-3.5 px-[18px] py-[22px]')}>
            <div className="relative flex-1 rounded-md bg-trim px-3 py-2.5">
              <svg
                className="absolute top-[-10px] left-[-10px] h-[calc(100%+20px)] w-[calc(100%+20px)] overflow-visible"
                viewBox="0 0 200 120"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path pathLength={1} d={RING} stroke="var(--ink)" strokeWidth={3} fill="none" strokeLinecap="round" />
              </svg>
              <p className="hand text-[14px]">08A</p>
              <p className="t-s b">quiet-otter</p>
            </div>
            <div className="relative flex-1 rounded-md bg-trim px-3 py-2.5 opacity-60">
              <svg
                className={cx(s.s2, 'absolute top-[34px] left-2 h-[18px] w-[calc(100%-16px)]')}
                viewBox="0 0 100 20"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  pathLength={1}
                  d="M2 12 C30 8 60 13 98 7"
                  stroke="var(--ink)"
                  strokeWidth={3}
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
              <p className="hand text-[14px]">07A</p>
              <p className="t-s b">amber-finch</p>
            </div>
          </div>
          <p className={cx(s.cap, 'zh')}>
            印样右滑：一笔铅笔圈（380ms）。左滑：一道线划掉，帧变淡并收起，5 秒内可撤销。
          </p>
        </div>

        <div className={cx(s.demo, span)}>
          <p className="lab">拖动排序 · Drag to reorder</p>
          <div className={cx(s.stage, s.l6, 'pt-1.5')}>
            <div className={cx(s.bar, s.lift)}>Experience</div>
            <div className={cx(s.bar, s.make)}>What she’s good at</div>
            <div className={s.bar}>Work</div>
          </div>
          <p className={cx(s.cap, 'zh')}>
            按住把手，块轻轻抬起（1.02、微微倾斜）；其他块让位（420ms）；放下时落定。键盘：选中后 Alt + ↑ / ↓。
          </p>
        </div>
      </div>
    </section>
  );
}
