import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Band, ChipTag, MarginNote, PencilMark, Ruler, buttonClass, cx } from '@portrait/ui';
import { BoardHeader } from '@/components/design/BoardHeader';
import { routes } from '@/lib/routes';
import s from './storyboards.module.css';

export const metadata: Metadata = { title: '交互分镜 · 三页' };

const RING =
  'M30 5 C80 -2 150 -2 188 6 C202 10 204 32 203 60 C202 92 200 112 186 116 C130 124 70 124 16 116 C2 112 -2 90 -2 60 C-2 30 0 12 14 6 C20 4 26 4 34 7';

/** Looks like a button or a chip in a drawn frame, but is only a picture of one. */
const still = 'cursor-[inherit]';

function Part({ n, title, href, children }: { n: string; title: string; href: string; children: ReactNode }) {
  return (
    <section className={cx('wrap', s.part)}>
      <div className={s.ph}>
        <span className={s.n}>{n}</span>
        <h2 className="t-h1">{title}</h2>
        <Link href={href} className={buttonClass({ variant: 'quiet', size: 'sm' })}>
          打开页面
        </Link>
      </div>
      {children}
    </section>
  );
}

/** One storyboard: three frames (collapsed → growing → done) and its reduced-motion version. */
function Storyboard({
  title,
  note,
  reduced,
  children,
}: {
  title: string;
  note: string;
  reduced: string;
  children: ReactNode;
}) {
  return (
    <div className={s.sb}>
      <div className={s.sbh}>
        <h3 className="t-h3">{title}</h3>
        <span className="t-s c2">{note}</span>
      </div>
      <div className={s.frames}>{children}</div>
      <div className={s.rmn}>
        <span className="b">减少动态效果</span>
        <span className="zh">{reduced}</span>
      </div>
    </div>
  );
}

function Shot({
  n,
  tag,
  caption,
  stageClassName,
  children,
}: {
  n: string;
  tag: string;
  caption: string;
  stageClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className={s.fr}>
      <div className={cx(s.st, stageClassName)}>{children}</div>
      <p className={s.tag}>
        <span className={s.t}>{n}</span>
        {tag}
      </p>
      <p className={cx(s.cap, 'zh c2')}>{caption}</p>
    </div>
  );
}

function Mini({ className, children }: { className?: string; children: ReactNode }) {
  return <p className={cx(s.mini, className)}>{children}</p>;
}

/** The small must-have boxes of a contact-sheet frame; `marks` like "yyyn". */
function Must({ marks }: { marks: string }) {
  return (
    <span className={s.must2}>
      {[...marks].map((m, i) => (
        <i key={i} className={m === 'y' ? s.y : undefined} />
      ))}
    </span>
  );
}

function Arrow({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className={cx(s.arrow, className)} aria-hidden="true">
      {children}
    </span>
  );
}

/** The Experience row of A1, the same in all three frames. */
function CampusRow({ children }: { children?: ReactNode }) {
  return (
    <div className={cx(s.card, 'mt-[30px]')}>
      <Mini>
        <span className="hand">2025 — now</span> <b className="ml-2">Campus Marketplace</b>
      </Mini>
      <Mini className="c2 ml-[86px]">Kept a 2,000-student app up.</Mini>
      {children}
    </div>
  );
}

/** quiet-otter's frame on the contact sheet, as B1 draws it. */
function OtterFrame({
  code = '08A',
  className,
  children,
}: {
  code?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cx(s.card, 'mx-auto mt-10 w-[210px]', className)}>
      {children}
      <Mini className="hand">{code}</Mini>
      <Mini className="b">quiet-otter</Mini>
      <Mini className="c2">Kept a 2,000-student app up.</Mini>
      <Mini className="mt-1.5">
        <Must marks="yyyn" /> 3½ of 4
      </Mini>
    </div>
  );
}

function ExperienceBlock({ className }: { className?: string }) {
  return (
    <div className={cx(s.card, s.lifted, 'mt-2.5', className)}>
      <Mini className="b">Experience</Mini>
      <Mini className="c2">Survived move-in week · Campus Marketplace</Mini>
    </div>
  );
}

const SHEET = ['07A', '08A', '09A', '10A', '11A', '12A'];

/** §12.6: key interactions of the portrait, the contact sheet and the studio, frame by frame. */
export default function StoryboardsPage() {
  return (
    <div lang="zh-CN" className="relative min-h-screen overflow-hidden pb-24">
      <Ruler />
      <BoardHeader band="§12.6 · Oct 19" date="收起 → 展开中 → 完成" title="交互分镜 · 三页">
        <p className="t-body zh c2 mt-3.5 max-w-[48em]">
          画像页、印样、画像工作室各两到三个关键交互。时间都用同一条临界阻尼弹簧（--spring，不回弹）；每行下面是开启“减少动态效果”时的版本。可点的真页面就在这张画板旁边。
        </p>
      </BoardHeader>

      <Part n="A" title="个人画像页" href={routes.portrait('lin')}>
        <Storyboard
          title="A1 · 一段经历被点开"
          note="点击行 · 420ms · 不跳页、不弹窗"
          reduced="直接展开；竖线直接出现；内容 150ms 淡入，不位移。"
        >
          <Shot n="1" tag="收起 · 0ms" caption="一行“做了什么 + 结果”，右边是证据计数线。悬停时整行浅浅亮起（240ms）。">
            <CampusRow />
            <div className={cx(s.card, 'mt-2.5 bg-transparent')}>
              <Mini>
                <span className="hand">2026 — now</span> <b className="ml-2">Data Structures tutor</b>
              </Mini>
            </div>
          </Shot>
          <Shot
            n="2"
            tag="展开中 · 约 200ms"
            caption="行原地长高；左边一道铅笔竖线往下画；故事逐行上升 8px 淡入，每行间隔 60ms。下面的行被推下去，也跟着弹簧走。"
          >
            <CampusRow>
              <div className="relative mt-2.5 ml-[86px] pl-3">
                <span className="absolute top-0 left-0 h-[34px] w-[3px] rounded-[2px] bg-ink" />
                <Mini className="translate-y-[3px] opacity-70">
                  <b>Context</b> · A trading app…
                </Mini>
                <Mini className="translate-y-[7px] opacity-30">
                  <b>Decision</b> · Cache + queue…
                </Mini>
              </div>
            </CampusRow>
          </Shot>
          <Shot
            n="3"
            tag="完成 · 420ms"
            caption="落定，不回弹。同一时间只开一行；再点一次收起。脚注点开后，出处在句子下面原地长出来。"
          >
            <CampusRow>
              <div className={cx(s.vline, 'mt-2.5 ml-[86px] pl-3')}>
                <Mini>
                  <b>Context</b> · A trading app for students.
                </Mini>
                <Mini>
                  <b>Decision</b> · Cache + queue, no bigger DB.<span className="fn size-5">4</span>
                </Mini>
                <Mini>
                  <b>Result</b> · p95 1.8 s → 240 ms.
                </Mini>
              </div>
            </CampusRow>
          </Shot>
        </Storyboard>

        <Storyboard
          title="A2 · “可以问我”约成一次 coffee chat"
          note="本页唯一的小惊喜"
          reduced="线和确认文字直接出现；按钮不缩放。"
        >
          <Shot n="1" tag="收起 · 0ms" caption="只露出话题。话题来自本人在对话里说过“愿意聊”的事。">
            <Mini className="b">Ask Lin about</Mini>
            <div className="mt-2 flex flex-col items-start gap-1.5">
              <ChipTag size="sm">Postgres under load</ChipTag>
              <ChipTag size="sm">Running an app with a friend</ChipTag>
              <ChipTag size="sm">CS as an international student</ChipTag>
            </div>
            <Arrow className="top-[50px] left-[190px]">← tap</Arrow>
          </Shot>
          <Shot
            n="2"
            tag="展开中 · 选时段、按下"
            caption="时段从话题下面原地长出来（420ms），用访客的时区。按下“Book”缩到 0.98（120ms）。"
          >
            <Mini className="b">Ask Lin about</Mini>
            <ChipTag size="sm" on className="mt-2">
              Postgres under load
            </ChipTag>
            <Mini className="b mt-3">Coffee chat · 20 min</Mini>
            <div className="mt-1.5 flex gap-1.5">
              <span className={cx('slot on inline-flex min-h-[34px] items-center', still)}>Wed 5:30 PM</span>
              <span className={cx('slot inline-flex min-h-[34px] translate-y-1 items-center opacity-60', still)}>
                Thu 12:00
              </span>
            </div>
            <span className={buttonClass({ size: 'sm', className: cx('mt-3 scale-[0.98]', still) })}>
              Book Wed 5:30 PM
            </span>
          </Shot>
          <Shot
            n="3"
            tag="完成 · 380 + 520ms"
            caption="一道新的铅笔线从左往右画出来，日期写在线上，确认文字从上方 5px 落下、停住。见面之后，这道线留在双方的画像上。"
          >
            <PencilMark vw={200} d="M2 6 C50 3 120 7 198 4" isNew className="mt-10 w-[70%]" />
            <p className="hand mt-1.5 text-[17px]">
              <Band>Wed 5:30 PM · coffee with Lin</Band>
            </p>
            <Mini className="c2 mt-2">Invites are on their way to you both.</Mini>
            <Mini className="mt-1.5">
              <u>Undo</u>
            </Mini>
          </Shot>
        </Storyboard>
      </Part>

      <Part n="B" title="印样（企业端）" href={routes.contactSheet}>
        <Storyboard
          title="B1 · 右滑圈选"
          note="拖动 · 或按 C"
          reduced="拖动只平移不倾斜；圈直接出现。键盘 C / X 与拖动完全等价。"
        >
          <Shot n="1" tag="收起 · 0ms" caption="一句话 + 四个必须项的满足情况。默认不显示照片。">
            <OtterFrame />
          </Shot>
          <Shot
            n="2"
            tag="拖动中 · 跟手"
            caption="帧跟着手指走，轻微倾斜（每 80px 1°）；“Circle”提示随距离变清楚。超过 90px 松手才算数，不到就弹簧回原位。"
          >
            <OtterFrame className="relative translate-x-[60px] rotate-1">
              <Band className="absolute top-2 right-2 text-[12px] font-bold">Circle</Band>
            </OtterFrame>
            <Arrow className="top-[90px] left-10">→</Arrow>
          </Shot>
          <Shot
            n="3"
            tag="完成 · 380ms"
            caption="帧落回原位，一笔铅笔圈把它圈住（暗色里是金色粉笔）。第一次圈选时，右栏落下一条页边批注：“First one circled.”"
          >
            <OtterFrame code="08A · circled" className="relative">
              <svg
                className={cx(s.ring2, 'top-[-12px] left-[-12px] h-[calc(100%+24px)] w-[calc(100%+24px)]')}
                viewBox="0 0 200 120"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path d={RING} />
              </svg>
            </OtterFrame>
          </Shot>
        </Storyboard>

        <Storyboard
          title="B2 · 左滑划掉"
          note="拖动 · 或按 X · 可撤销"
          reduced="划线直接出现；帧不收起、只变淡，后面的帧不移动。"
        >
          <Shot n="1" tag="拖动中 · 跟手" caption="往左拖，“Not now”提示出现。和右滑同样的 90px 阈值。">
            <div className={cx(s.card, 'relative mx-auto mt-10 w-[210px] -translate-x-[60px] -rotate-1')}>
              <span className="absolute top-2 left-2 rounded-[3px] bg-ink px-1.5 py-0.5 text-[12px] font-bold text-wall">
                Not now
              </span>
              <Mini className="hand mt-[18px]">09A</Mini>
              <Mini className="b">amber-finch</Mini>
              <Mini className="c2">Moved a lab pipeline to a queue.</Mini>
            </div>
            <Arrow className="top-[90px] right-10">←</Arrow>
          </Shot>
          <Shot n="2" tag="划线 · 380ms" caption="一道铅笔线从左往右划过名字，帧变淡。">
            <div className={cx(s.card, 'relative mx-auto mt-10 w-[210px] opacity-70')}>
              <svg
                className="absolute top-[26px] left-2.5 h-4 w-[70%]"
                viewBox="0 0 100 20"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  d="M2 12 C30 8 60 13 98 7"
                  stroke="var(--ink)"
                  strokeWidth={3}
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
              <Mini className="hand">09A</Mini>
              <Mini className="b">amber-finch</Mini>
              <Mini className="c2 opacity-50">Moved a lab pipeline to a queue.</Mini>
            </div>
          </Shot>
          <Shot
            n="3"
            tag="收起 · 420ms"
            caption="帧收成一条，后面的帧补上来（共享元素过渡）。“Undo”一直在，放进“Not now”标签页。"
          >
            <div className={cx(s.card, 'mx-auto mt-10 w-[210px] opacity-70')}>
              <Mini>
                <span className="hand">09A</span> <b>amber-finch</b>
              </Mini>
              <Mini className="c2">Not now · Moved a lab pipeline…</Mini>
              <Mini className="mt-1">
                <u>Undo</u>
              </Mini>
            </div>
            <div className={cx(s.card, 'mx-auto mt-3 w-[210px]')}>
              <Mini className="hand">10A</Mini>
              <Mini className="b">slate-wren</Mini>
            </div>
          </Shot>
        </Storyboard>

        <Storyboard
          title="B3 · 轻点一帧，理由原地展开"
          note="点击或 Enter · 一张卡片长成它的详情"
          reduced="帧直接变成展开态；其他帧直接到新位置；理由 150ms 淡入。"
        >
          <Shot
            n="1"
            tag="收起 · 0ms"
            caption="三栏印样，焦点在 08A。"
            stageClassName="grid grid-cols-3 content-start gap-2"
          >
            {SHEET.map((code) => (
              <div key={code} className={cx(s.card, 'p-2', code === '08A' && s.lifted)}>
                <Mini className="hand">{code}</Mini>
              </div>
            ))}
          </Shot>
          <Shot
            n="2"
            tag="展开中 · 约 300ms"
            caption="这一帧长成两栏两行；其他帧绕开它重新排列，每一帧都沿弹簧滑到新位置（View Transitions）。"
            stageClassName="grid grid-cols-3 content-start gap-2"
          >
            <div className={cx(s.card, 'p-2')}>
              <Mini className="hand">07A</Mini>
            </div>
            <div className={cx(s.card, s.lifted, 'col-span-2 h-[90px] p-2')}>
              <Mini className="hand">08A · open</Mini>
              <div className={cx(s.ln2, 'w-[70%]')} />
              <div className={cx(s.ln2, 'w-1/2 opacity-20')} />
            </div>
            <div className={cx(s.card, '-translate-x-5 translate-y-2.5 p-2')}>
              <Mini className="hand">09A</Mini>
            </div>
            <div className={cx(s.card, '-translate-x-5 translate-y-2.5 p-2')}>
              <Mini className="hand">10A</Mini>
            </div>
          </Shot>
          <Shot
            n="3"
            tag="完成 · 640ms"
            caption="三条带脚注的理由 + 建议在 coffee chat 里问的问题 + 操作。再点一次或按 Esc 收回原位。"
          >
            <div className={cx(s.card, s.lifted)}>
              <Mini className="hand">08A · open</Mini>
              <Mini className="b">quiet-otter</Mini>
              <div className={cx(s.vline, 'mt-1.5 pl-2.5')}>
                <Mini>1 Go + Postgres + Redis, 2,000+ users</Mini>
                <Mini>2 p95 1.8 s → 240 ms</Mini>
                <Mini>3 Remote is fine</Mini>
              </div>
              <div className="mt-2 flex gap-1.5">
                <span className={buttonClass({ size: 'sm', className: still })}>Circle</span>
                <span className={buttonClass({ variant: 'wall', size: 'sm', className: still })}>Not now</span>
              </div>
            </div>
          </Shot>
        </Storyboard>
      </Part>

      <Part n="C" title="画像工作室" href={routes.studio}>
        <Storyboard
          title="C1 · 对话里的一句话长成画像里的一块"
          note="全站动效签名 · 本页唯一的小惊喜"
          reduced="新块直接出现，来源那句话的金色保留 2 秒；线直接出现。"
        >
          <Shot n="1" tag="来源 · 0ms" caption="agent 写好了新块。来源那句话先涂上金色粉笔——“它从这里来”。">
            <div className="absolute top-5 left-4 flex w-[44%] flex-col gap-2">
              <Mini className="c2">Morning, Lin…</Mini>
              <div className={cx(s.ghost, 'relative px-2.5 py-2')}>
                <Mini className="text-on-chalk">开学那周数据库一直超时…</Mini>
              </div>
            </div>
            <div className="absolute top-5 right-4 flex w-[44%] flex-col gap-2">
              <Mini className="b">Experience</Mini>
              <div className={cx(s.card, 'px-2.5 py-2')}>
                <Mini>Campus Marketplace</Mini>
              </div>
              <div className={cx(s.card, 'px-2.5 py-2')}>
                <Mini>Data Structures tutor</Mini>
              </div>
            </div>
          </Shot>
          <Shot
            n="2"
            tag="生长中 · 约 300ms"
            caption="那句话的“影子”从对话飞到画像里，边走边变成块的大小；原来的块往下让位（共享元素过渡，640ms）。"
          >
            <div className="absolute top-5 left-4 w-[44%]">
              <Mini className="c2">Morning, Lin…</Mini>
              <div className="mt-2 rounded-md bg-trim px-2.5 py-2">
                <Mini>开学那周数据库一直超时…</Mini>
              </div>
            </div>
            <div className={cx(s.ghost, 'top-[66px] left-[38%] h-[52px] w-[46%] -rotate-1')} />
            <div className="absolute top-5 right-4 flex w-[44%] flex-col gap-2">
              <Mini className="b">Experience</Mini>
              <div className="h-[30px]" />
              <div className={cx(s.card, 'translate-y-3.5 px-2.5 py-2')}>
                <Mini>Campus Marketplace</Mini>
              </div>
            </div>
            <Arrow className="top-[30px] left-[46%]">→</Arrow>
          </Shot>
          <Shot
            n="3"
            tag="落定 · 640 + 380ms"
            caption="新块停住；刻度上画出一道带日期的线；改动的字被粉笔涂过；页边留一条手写批注“added from your message · undo”。读屏播报“Experience updated”。"
          >
            <div className="absolute top-5 left-4 w-[44%]">
              <Mini className="c2">Morning, Lin…</Mini>
              <div className="mt-2 rounded-md bg-trim px-2.5 py-2">
                <Mini>开学那周数据库一直超时…</Mini>
              </div>
              <Mini className="mt-2">— Added to Experience</Mini>
            </div>
            <div className="absolute top-5 right-4 flex w-[44%] flex-col gap-2">
              <Mini className="b">Experience</Mini>
              <div className={cx(s.card, 'relative px-2.5 py-2')}>
                <PencilMark
                  vw={120}
                  d="M2 5 C30 7 70 3 118 6"
                  isNew
                  className="absolute top-[-6px] left-[-26px] w-[70px]"
                />
                <Mini className="b">Survived move-in week</Mini>
                <Mini>
                  <Band className="px-[3px] py-0">cached + queued</Band>
                </Mini>
              </div>
              <div className={cx(s.card, 'px-2.5 py-2')}>
                <Mini>Campus Marketplace</Mini>
              </div>
            </div>
          </Shot>
        </Storyboard>

        <Storyboard
          title="C2 · 拖动画像区块排序"
          note="按住把手 · 或聚焦把手按 ↑ / ↓"
          reduced="拖动只平移不倾斜，其他块直接到位；键盘 ↑ / ↓ 每次移动一格并播报新位置。"
        >
          <Shot
            n="1"
            tag="按住 · 120ms"
            caption="把手只在悬停或选中时出现。按住后块轻轻抬起（1.01、微微倾斜），其余不动。"
          >
            <div className={cx(s.card, 'mt-2.5 flex items-center gap-2.5')}>
              <span className={cx(s.must2, 'flex-col gap-0.5')} aria-hidden="true">
                <i className={s.dot} />
                <i className={s.dot} />
                <i className={s.dot} />
              </span>
              <Mini className="b">Her story</Mini>
            </div>
            <ExperienceBlock className="-translate-y-[3px] scale-[1.02] -rotate-[0.6deg]" />
            <div className={cx(s.card, 'mt-2.5')}>
              <Mini className="b">Good at</Mini>
            </div>
          </Shot>
          <Shot n="2" tag="拖动中 · 让位 420ms" caption="块跟着指针走；经过谁的中线，谁就沿弹簧让到另一边。">
            <div className={cx(s.card, 'mt-2.5 translate-y-[52px]')}>
              <Mini className="b">Her story</Mini>
            </div>
            <ExperienceBlock className="relative z-2 -translate-y-[46px] -rotate-[0.6deg]" />
            <div className={cx(s.card, 'mt-2.5')}>
              <Mini className="b">Good at</Mini>
            </div>
            <Arrow className="top-5 right-5">↑</Arrow>
          </Shot>
          <Shot
            n="3"
            tag="放下 · 落定 420ms"
            caption="松手后块从指针处滑进空位、停住；页边批注记下这次改动，agent 在对话里回一句确认。也可以直接说“把经历放到最前面”。"
          >
            <ExperienceBlock />
            <div className={cx(s.card, 'mt-2.5')}>
              <Mini className="b">Her story</Mini>
            </div>
            <div className={cx(s.card, 'mt-2.5')}>
              <Mini className="b">Good at</Mini>
            </div>
            <MarginNote className="mt-2.5">Oct 19 · Experience moved to the top · undo</MarginNote>
          </Shot>
        </Storyboard>
      </Part>
    </div>
  );
}
