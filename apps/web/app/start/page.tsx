import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Band, DateNote, Ruler, SectionMark, buttonClass, cx } from '@portrait/ui';
import { routes } from '@/lib/routes';
import s from './birth.module.css';

export const metadata: Metadata = { title: '诞生时刻 · 分镜' };

const TIMELINE = ['F1 · 0 s', 'F2 · 0.4 s', 'F3 · 0.8–2.4 s', 'F4 · 2.8 s', 'F5 · 用户点击', 'F6 · 用户点击'];

/** One storyboard frame: a small screen, then its number, title and caption. */
function Frame({ n, title, screen, children }: { n: string; title: string; screen: ReactNode; children: ReactNode }) {
  return (
    <figure className={s.fr}>
      <div className={s.st}>{screen}</div>
      <figcaption>
        <p className={s.tag}>
          <span>{n}</span>
          {title}
        </p>
        <p className={cx(s.cap, 'zh c2')}>{children}</p>
      </figcaption>
    </figure>
  );
}

/** The left column the conversation shrinks into (F2, F3). */
function ChatColumn({ children }: { children: ReactNode }) {
  return (
    <div className="absolute top-0 bottom-0 left-0 w-[42%] bg-wall-2 px-3.5 py-[18px]">
      <p className={cx(s.mini, 'b')}>Portrait</p>
      <div className={cx(s.bub, s.agent, 'mt-[60px] max-w-full bg-wall')}>{children}</div>
    </div>
  );
}

const fakeBtn = (variant: 'primary' | 'secondary' | 'quiet', className: string) =>
  buttonClass({ variant, size: 'sm', className });

/** S04 · the birth moment, drawn as a storyboard: the portrait grows out of “Show me”. */
export default function BirthPage() {
  return (
    <main lang="zh-CN" className="relative min-h-screen overflow-hidden pb-24">
      <Ruler />

      <header className="wrap relative pt-16">
        <SectionMark vw={220} d="M2 6 C60 3 140 7 218 4" isNew className="top-[70px] w-[220px]" />
        <p className="hand pt-[22px] text-[18px]">
          <Band>S4 · Oct 19</Band> <DateNote>桌面 · 6 帧 · 全程约 8 秒</DateNote>
        </p>
        <h1 className="t-d mt-[18px]">诞生时刻 · 画像从对话里长出来</h1>
        <p className="t-body zh c2 mt-3.5 max-w-[48em]">
          对话变成一页纸的那一刻。全站的动效签名“从来源处生长”在这里第一次出现：画像不是弹出来的，而是从 agent
          的那句话里画出一根铅笔线，再沿着这根线一行行长出来。用的是同一条临界阻尼弹簧，不回弹。
        </p>
        <div className={s.tl} aria-hidden="true">
          {TIMELINE.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </header>

      <section className="wrap pt-14">
        <div className={s.frames}>
          <Frame
            n="F1"
            title="对话全屏，一栏"
            screen={
              <div className={cx(s.scr, 'px-[70px] py-[18px]')} lang="en">
                <p className={cx(s.mini, 'b')}>Portrait</p>
                <div className="mt-3.5 flex flex-col gap-2">
                  <div className={cx(s.bub, s.agent)}>What did your roommate build?</div>
                  <div className={cx(s.bub, s.user)}>Mostly the UI. I did the backend.</div>
                  <div className={cx(s.bub, s.agent)}>
                    Your first draft is ready. Want to see it?
                    <span className="mt-2 block">
                      <span className={fakeBtn('primary', 'min-h-[30px] text-[12px]')}>Show me</span>
                    </span>
                  </div>
                </div>
              </div>
            }
          >
            聊了 5–8 轮，或上传简历 60 秒后，agent 只说一句话、给一个按钮。不弹窗，不打断。
          </Frame>

          <Frame
            n="F2"
            title="对话退到左边，线从来源出发"
            screen={
              <div className={s.scr} lang="en">
                <ChatColumn>
                  Your first draft is ready.
                  <span className="mt-1.5 block">
                    <span className={fakeBtn('primary', 'min-h-[26px] text-[11px]')}>Show me</span>
                  </span>
                </ChatColumn>
                <svg
                  className={cx(s.pen, 'absolute top-0 left-[40%] h-full w-[60%]')}
                  viewBox="0 0 200 200"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path d="M4 104 C30 100 40 70 46 30" />
                </svg>
                <span className="hand absolute right-[18px] bottom-3.5 text-[13px]" lang="zh-CN">
                  ← 从这句话画出去
                </span>
              </div>
            }
          >
            对话栏用 420ms 缩到左侧 40%。“Show me”那句话就是来源：一根铅笔线从它出发，往右上画出去，380ms。右边还是空白的墙。
          </Frame>

          <Frame
            n="F3"
            title="画像沿着线一行行长出来"
            screen={
              <div className={s.scr} lang="en">
                <ChatColumn>Your first draft is ready.</ChatColumn>
                <span className={cx(s.rl, 'left-[46%]')} />
                <div className="absolute top-[22px] right-3.5 left-[52%] flex flex-col gap-2">
                  <p className="hand text-[11px]">
                    <Band>Now · moving to TypeScript</Band>
                  </p>
                  <p className="text-[34px] leading-[0.9] font-extrabold tracking-[-0.05em]">Lin Zhou</p>
                  <p className={cx(s.mini, 'b')}>Builds the thing first, then finds out who needed it.</p>
                  <div className={cx(s.bar2, 'mt-1.5 w-[90%]')} />
                  <div className={cx(s.bar2, 'w-[70%]')} />
                  <div className={cx(s.bar2, 'w-[40%] opacity-15')} />
                </div>
              </div>
            }
          >
            那根线落定成左边的门框刻度。开场先长：Now 行 → 名字 → 一句话，然后是各个小节，每行 240ms，间隔
            70ms。最后一行还在淡入时，已经可以开始滚动。
          </Frame>

          <Frame
            n="F4"
            title="链接是手写上去的"
            screen={
              <div className={s.scr} lang="en">
                <div className="flex items-center justify-between bg-trim px-4 py-3">
                  <span className="hand text-[16px]">
                    portrait.so/lin
                    <span className="ml-0.5 inline-block h-4 w-0.5 bg-ink align-[-3px]" />
                  </span>
                  <span className={fakeBtn('primary', 'min-h-7 text-[12px]')}>Claim this link</span>
                </div>
                <div className="relative pt-[18px] pr-[18px] pl-[46px]">
                  <span className={cx(s.rl, 'left-4')} />
                  <p className={cx(s.mini, 'c2')}>Here’s your first draft. It’s yours to shape.</p>
                  <p className="mt-2.5 text-[30px] leading-[0.9] font-extrabold tracking-[-0.05em]">Lin Zhou</p>
                  <p className={cx(s.mini, 'b mt-2')}>Builds the thing first, then finds out who needed it.</p>
                  <p className={cx(s.mini, 'c2 mt-3.5')}>Nothing is public yet.</p>
                </div>
              </div>
            }
          >
            顶栏里，链接用手写体一个字一个字写出来，“Claim this link”随后淡入。这时页面还没公开，下面写着“还没有人能看到”。
          </Frame>

          <Frame
            n="F5"
            title="到这时才登录"
            screen={
              <div className={cx(s.scr, 'flex items-center justify-center bg-wall-2')} lang="en">
                <div className="flex w-[70%] flex-col gap-2 rounded-md bg-trim px-[18px] py-4">
                  <p className={cx(s.mini, 'b text-[14px]')}>Claim portrait.so/lin</p>
                  <p className={cx(s.mini, 'c2')}>Your chat and draft come with you.</p>
                  <span className={fakeBtn('secondary', 'min-h-[30px] justify-center text-[12px]')}>Continue with Google</span>
                  <span className={fakeBtn('secondary', 'min-h-[30px] justify-center text-[12px]')}>
                    Continue with LinkedIn
                  </span>
                  <span className={fakeBtn('secondary', 'min-h-[30px] justify-center text-[12px]')}>Continue with GitHub</span>
                  <span className={fakeBtn('quiet', 'min-h-[26px] justify-center text-[12px]')}>Email me a code</span>
                </div>
              </div>
            }
          >
            按钮只有文字，不放品牌图标。匿名会话里的对话和草稿原样搬进账号，一行都不会丢。
          </Frame>

          <Frame
            n="F6"
            title="选谁能看到"
            screen={
              <div className={cx(s.scr, 'flex flex-col gap-[7px] px-5 py-4')} lang="en">
                <p className={cx(s.mini, 'b text-[14px]')}>Who can see your portrait?</p>
                <div className={s.opt2}>
                  <span className={s.r} />
                  <span>
                    <b>Public</b> · anyone with the link
                  </span>
                </div>
                <div className={cx(s.opt2, s.on)}>
                  <span className={s.r} />
                  <span>
                    <b>Anonymous · discoverable</b> · startups see quiet-otter{' '}
                    <span className="hand ml-1 text-[11px]">
                      <Band>recommended</Band>
                    </span>
                  </span>
                </div>
                <div className={s.opt2}>
                  <span className={s.r} />
                  <span>
                    <b>Link only</b>
                  </span>
                </div>
                <div className={s.opt2}>
                  <span className={s.r} />
                  <span>
                    <b>Hidden</b> · only you
                  </span>
                </div>
                <span className={fakeBtn('primary', 'mt-1 min-h-[30px] self-start text-[12px]')}>Confirm</span>
              </div>
            }
          >
            默认选中“匿名 · 可被发现”。确认后，门框上画下第一道铅笔线，写上今天的日期，这就是这一页的起点。全屏版见{' '}
            <Link href={routes.firstPublish}>S15</Link>。
          </Frame>
        </div>
      </section>

      <section className="wrap pt-14">
        <div className={s.notes}>
          <div className={s.n}>
            <p className="lab">减少动态效果</p>
            <p className="t-s zh mt-1.5">
              F2–F3 合成一次切换：对话停在左边，画像整页一次出现，链接直接显示，带一条静态的粉笔底色。没有画线，也没有逐行淡入。
            </p>
          </div>
          <div className={s.n}>
            <p className="lab">读屏软件</p>
            <p className="t-s zh mt-1.5">
              读一次：“你的画像草稿好了。链接是 portrait.so/lin，认领后才会保存。”焦点移到页面的名字上，不会抢到其他地方。
            </p>
          </div>
          <div className={s.n}>
            <p className="lab">移动端</p>
            <p className="t-s zh mt-1.5">
              F2–F3 改成：从“Show me”那条消息往上长出一整屏画像（和 S2 移动版一样）；F4–F6 是同样内容的底部面板。
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
