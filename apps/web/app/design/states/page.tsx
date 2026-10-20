import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  AgentMessage,
  Band,
  Button,
  DateNote,
  PencilMark,
  Ruler,
  SectionMark,
  StatusLine,
  UserMessage,
  buttonClass,
  cx,
} from '@portrait/ui';
import { routes } from '@/lib/routes';
import s from './states.module.css';

export const metadata: Metadata = { title: '状态合集' };

/** One state: its label, the state as drawn, and the rule behind it. */
function State({ lab, cap, boxClassName, children }: { lab: string; cap: string; boxClassName?: string; children: ReactNode }) {
  return (
    <div className={s.st} lang="en">
      <p className="lab">{lab}</p>
      <div className={cx(s.box, boxClassName)}>{children}</div>
      <p className={cx(s.cap, 'zh c2')} lang="zh-CN">
        {cap}
      </p>
    </div>
  );
}

const actions = 'flex flex-wrap gap-2';

/** S14 · the state collection: what a screen says when things are empty, slow or broken. */
export default function StatesPage() {
  return (
    <main lang="zh-CN" className="relative min-h-screen overflow-hidden pb-24">
      <Ruler />
      <header className="wrap relative pt-16">
        <SectionMark vw={220} d="M2 6 C60 3 140 7 218 4" isNew className="top-[70px] w-[220px]" />
        <p className="hand pt-[22px] text-[18px]">
          <Band>S14 · Oct 19</Band> <DateNote>空 · 加载 · 流式 · 出错 · 离线 · 找不到</DateNote>
        </p>
        <h1 className="t-d mt-[18px]">东西空了、慢了、坏了的时候</h1>
        <p className="t-body zh c2 mt-3.5 max-w-[46em]">
          三条规矩：先说一句人话，再给一个能做的动作；用户写过的字永远不丢；加载时用铅笔一行行写出来，不用闪烁的骨架屏。
        </p>
      </header>

      <div className="wrap pt-14">
        <div className={s.grid}>
          <State lab="01 · Empty · inbox" cap="空状态说明“为什么空”和“怎样不空”，不放插画。">
            <p className="t-h2">No requests yet.</p>
            <p className="t-s c2 max-w-[46ch]">
              When a startup finds your portrait and wants to talk, it shows up here. Sharing your link is the fastest way
              to start.
            </p>
            <div className={cx(actions, 'mt-1')}>
              <Button size="sm">Copy portrait.so/lin</Button>
              <Button variant="quiet" size="sm">
                Post something
              </Button>
            </div>
          </State>

          <State lab="02 · Empty · no strong matches" cap="企业端的空状态直接指出是哪一条卡住了，并给出放宽后的人数。">
            <p className="t-h2">No one meets all five must-haves yet.</p>
            <p className="t-s c2 max-w-[46ch]">
              M3, free June–August, is the strictest. Making it flexible widens the pool to 31. Or keep it, and we’ll tell
              you when someone new matches.
            </p>
            <div className={cx(actions, 'mt-1')}>
              <Button size="sm">Make M3 flexible</Button>
              <Button variant="quiet" size="sm">
                Keep it, notify me
              </Button>
            </div>
          </State>

          <State
            lab="03 · Loading · writing, not shimmering"
            cap="内容从左往右一行行画出来，节奏和新内容出现时一样。减少动态效果时变成静止的浅色线。"
          >
            <p className="t-xs c2">Writing · Good at</p>
            <p className="t-name text-[56px]">Lin Zhou</p>
            <div className={s.set} aria-hidden="true">
              <i className="w-[82%]" />
              <i className="w-[64%]" />
              <i className="w-[40%]" />
            </div>
            <p className="sr" role="status">
              Loading the Good at section
            </p>
          </State>

          <State
            lab="04 · Streaming"
            cap="读屏软件只读完整的句子，不会一个字母一个字母地读（aria-live polite）。"
            boxClassName="justify-start"
          >
            <UserMessage className="self-end">
              <p className="t-s">Can you make my headline less generic?</p>
            </UserMessage>
            <AgentMessage>
              <StatusLine className="mb-1.5">Drafting headlines · 2 of 3</StatusLine>
              <p className="t-s">
                Here are three directions. The first leans on what you’ve shipped, the second on how you work
                <span className={s.caret} aria-hidden="true" />
              </p>
            </AgentMessage>
          </State>

          <State lab="05 · Error · your words are kept" cap="出错时消息原样留在原处，不清空输入框，也不把错误怪到用户头上。">
            <UserMessage className="self-end opacity-70">
              <p className="t-s">Add the demo link: campus-marketplace.app</p>
            </UserMessage>
            <p className="t-s">
              <b>That didn’t go through.</b> Your message is safe — try again.
            </p>
            <div className={actions}>
              <Button size="sm">Try again</Button>
              <Button variant="quiet" size="sm">
                Copy message
              </Button>
            </div>
          </State>

          <State lab="06 · Offline" cap="离线不是错误。顶上一个小标签，其他照常可用。">
            <span className={cx(s.offline, 'self-start')}>
              <i aria-hidden="true" />
              Offline
            </span>
            <p className="t-s">
              <b>Edits are saved on this device</b> and sync when you’re back.
            </p>
            <p className="t-xs c2">Last synced 2:14 PM · 2 edits waiting · they send when you’re online</p>
          </State>

          <State lab="07 · Upload refused" cap="拒绝时说清楚原因和数字，并给出另一条路可走。">
            <p className="t-s b">Lin_Zhou_resume_scan.pdf · 14 MB</p>
            <p className="t-s c2 max-w-[46ch]">
              That file is over 10 MB. A PDF exported from your editor is usually under 1 MB.
            </p>
            <div className={actions}>
              <Button size="sm">Choose another file</Button>
              <Button variant="quiet" size="sm">
                Paste the text instead
              </Button>
            </div>
          </State>

          <State lab="08 · 404 · portrait not found" cap="找不到的页面，门框上只有一道虚线：这里还没有人量过身高。">
            <p className="hand text-[18px]">portrait.so/linzhou</p>
            <p className="t-h2">This portrait hasn’t been drawn yet.</p>
            <div className="flex flex-wrap items-center gap-2">
              <Link className={buttonClass({ size: 'sm' })} href={routes.birth}>
                Draw yours
              </Link>
              <span className="t-xs c2">or check the spelling of the link</span>
            </div>
            <PencilMark
              vw={200}
              d="M2 6 C50 3 120 7 198 4"
              dash="6 8"
              className="absolute bottom-[22px] left-[26px] w-[120px] opacity-50"
            />
          </State>
        </div>
      </div>
    </main>
  );
}
