import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Band, ChipTag, DateNote, MarginNote, PencilMark, Ruler, SectionMark, buttonClass, cx } from '@portrait/ui';
import s from './unlock.module.css';

export const metadata: Metadata = { title: '解锁在职者 · 分镜' };

/** A button as it appears in a frame: drawn, not pressable. */
function Drawn({ quiet, children }: { quiet?: boolean; children: ReactNode }) {
  return (
    <span className={buttonClass({ variant: quiet ? 'quiet' : 'primary', size: 'sm', className: cx(s.pic, 'min-h-7 text-[12px]') })}>
      {children}
    </span>
  );
}

function Frame({ n, title, caption, children }: { n: string; title: string; caption: string; children: ReactNode }) {
  return (
    <li className={s.fr}>
      <div className={s.st}>
        <div className={s.scr} lang="en">
          {children}
        </div>
      </div>
      <p className={s.tag}>
        <span className={s.t}>{n}</span>
        {title}
      </p>
      <p className={cx(s.cap, 'zh c2')}>{caption}</p>
    </li>
  );
}

/** S18b · unlocking insider mode after Jordan accepts the Fernway offer: four frames. */
export default function UnlockStoryboard() {
  return (
    <div lang="zh-CN" className="relative min-h-screen overflow-hidden pb-24">
      <Ruler />
      <header className="wrap relative pt-16">
        <SectionMark vw={220} d="M2 6 C60 3 140 7 218 4" isNew className="top-[70px] w-[220px]" />
        <p className="hand pt-[22px] text-[18px]">
          <Band>S18 · Oct 19</Band> <DateNote>Jordan 接下 Fernway 的 offer 之后 · 4 步</DateNote>
        </p>
        <h1 className="t-d mt-[18px]">解锁在职者身份</h1>
        <p className="t-body zh c2 mt-3.5 max-w-[48em]">
          找到工作的人变成能帮别人的人。全程在对话里完成，没有横幅也没有彩带。完成后，画像门框上会多一道铅笔线：“在 Fernway 工作”。
        </p>
      </header>

      <section className="wrap pt-12" aria-label="分镜">
        <ol className={s.frames}>
          <Frame n="01" title="agent 在对话里注意到" caption="只说一句话、给一个按钮。用户说“Later”之后，一个月内不再提。">
            <p className={cx(s.mini, 'b')}>Studio · chat</p>
            <div className={cx(s.bub, s.u)}>I accepted the offer at Fernway.</div>
            <div className={s.bub}>
              Landed a job? Congrats. Verify with your work email to unlock Insider.
              <span className="c2 mt-1.5 block">Insiders offer coffee chats and, if they want, referrals.</span>
            </div>
            <div className="flex gap-1.5">
              <Drawn>Verify work email</Drawn>
              <Drawn quiet>Later</Drawn>
            </div>
          </Frame>

          <Frame n="02" title="核验工作邮箱" caption="域名匹配加一次验证码。个人邮箱会被拒绝，并说明原因。">
            <p className={cx(s.mini, 'b')}>Verify · 1 of 3</p>
            <p className={s.mini}>Your work email</p>
            <div className="inp min-h-[34px] px-2.5 py-1.5 text-[13px]">jordan@fernway.com</div>
            <p className={cx(s.mini, 'c2')}>We only check the domain. Fernway never sees this.</p>
            <p className={cx(s.mini, 'mt-1.5')}>Enter the 6-digit code we sent</p>
            <div className={s.code} aria-hidden="true">
              <span>4</span>
              <span>1</span>
              <span>8</span>
              <span>0</span>
              <span />
              <span />
            </div>
          </Frame>

          <Frame n="03" title="在职者资料" caption="从 Jordan 的画像里预填好，不用再写新内容。改话题标签就是点一下。">
            <p className={cx(s.mini, 'b')}>Profile · 2 of 3</p>
            <p className={s.mini}>What people can ask you about</p>
            <div className="flex flex-wrap gap-1.5">
              <ChipTag size="sm" on>
                New-grad SWE
              </ChipTag>
              <ChipTag size="sm" on>
                Payments
              </ChipTag>
              <ChipTag size="sm" on>
                Fernway interviews
              </ChipTag>
              <ChipTag size="sm">CS to industry</ChipTag>
            </div>
            <p className={cx(s.mini, 'mt-1.5')}>Coffee chats a week</p>
            <div className={cx('seg', s.seg)}>
              <span>1</span>
              <span className={s.on}>2</span>
              <span>3</span>
            </div>
            <p className={cx(s.mini, 'c2 mt-auto')}>Prefilled from Jordan’s portrait</p>
          </Frame>

          <Frame n="04" title="开不开内推，自己选" caption="不开内推也能接 coffee chat；跳过就默认关闭。确认后，门框上画下新的一道线。">
            <p className={cx(s.mini, 'b')}>Referrals · 3 of 3</p>
            <p className={cx(s.mini, 'text-[14px] font-[700]')}>Turn on insider referrals?</p>
            <p className={cx(s.mini, 'c2')}>
              You’ll see job seekers who were verified and packaged for Fernway. You decide every time. Nobody pays you,
              and you never owe a referral.
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Drawn>Show me referral requests</Drawn>
              <Drawn quiet>Just coffee chats</Drawn>
            </div>
            <div className="absolute right-4 bottom-4 left-4">
              <PencilMark vw={200} d="M2 6 C50 3 120 7 198 4" isNew className="w-[60%]" />
              <MarginNote className="mt-1 text-[13px]">Jun 2025 · works at Fernway</MarginNote>
            </div>
          </Frame>
        </ol>
      </section>

      <section className="wrap pt-10">
        <div className={cx('panel', s.rm)}>
          <p className="lab">减少动态效果</p>
          <p className="t-s zh">四步之间直接切换；第 4 步的铅笔线直接画好显示，不再逐笔绘制。</p>
        </div>
      </section>
    </div>
  );
}
