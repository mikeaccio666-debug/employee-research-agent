// Doorframe prototype (design brief §5B, screen S22): two fictional people, a new grad and
// an auditor moving into product, drawn as one doorframe each. Fixture data only.

/** Rungs of the evidence ladder (PRD v0.4): said → simulation done → mentor reviewed → employer confirmed → real job. */
export type Rung = 'said' | 'shown' | 'sim' | 'mentor' | 'employer';

export const RUNG_LABEL: Record<Rung, string> = {
  said: '自述',
  shown: '已展示',
  sim: '完成模拟',
  mentor: '导师看过',
  employer: '雇主确认',
};

/** A line on the doorframe. `done` = solid with a source; `draft` = pencil the agent drew. */
export type Step = {
  id: string;
  title: string;
  /** Second line: the source for done steps, why or how for drafts. */
  sub: string;
  when?: string;
  rung?: Rung;
  /** Someone who stood on this step before and can be booked. */
  mentor?: { name: string; note: string };
  /** Drafts only: a gap the agent found when translating to the new direction. */
  gap?: boolean;
  /** What "start" does on the next step, in one line. */
  start?: string;
  /** Drafts only: the line after the person says how to change it (the prototype does not call a model). */
  revised?: string;
};

/** An overnight note: something the agent did while the person was away. */
export type Note = {
  id: string;
  text: string;
  /** What "对" adds to the doorframe, if anything. */
  adds?: Step;
  /** A failed job: shows as a margin note with a retry instead of 对 / 不要. */
  failed?: boolean;
};

export type Lens = { id: string; label: string; done: Step[]; drafts: Step[]; note?: string };

export type Person = {
  id: string;
  name: string;
  meta: string;
  now: string;
  lenses: Lens[];
  notes: Note[];
};

const mei: Person = {
  id: 'mei',
  name: 'Mei Chen',
  meta: '应届生 · 统计学 · 想做数据分析（虚构）',
  now: '现在：找第一份数据分析工作',
  lenses: [
    {
      id: 'data',
      label: '数据分析',
      // Bottom (oldest) first.
      done: [
        { id: 'm1', title: '课程项目：零售销量分析', sub: '出处：GitHub 链接', when: '5 月', rung: 'shown' },
        { id: 'm2', title: '暑期实习：把周报做成自动化', sub: '出处：简历第 1 页', when: '8 月', rung: 'said' },
        { id: 'm3', title: '完成模拟：数据分析师的第一周', sub: '经理（AI 扮演）给了 3 条反馈', when: '10 月', rung: 'sim' },
      ],
      // Lowest (next) first.
      drafts: [
        {
          id: 'd1',
          title: '请导师点评你的 SQL 作业',
          sub: '30 分钟。做完，"完成模拟"会升到"导师看过"',
          mentor: { name: 'Jordan', note: '去年走过这一级' },
          start: '已经把作业和 3 条反馈发给 Jordan 看，等他选时间（原型里不会真的发）',
        },
        {
          id: 'd2',
          title: '投 5 家和你画像最匹配的公司',
          sub: '名单 agent 挑好了，你点"对"之前什么都不会发出去',
          revised: '先投 3 家，远程的优先',
        },
        { id: 'd3', title: '拿到第一批面试', sub: '每场面试后按住说话复盘 30 秒' },
        { id: 'd4', title: '入职 90 天', sub: '门框不在拿到 offer 时结束' },
      ],
    },
  ],
  notes: [
    {
      id: 'n1',
      text: 'Northwind 在招初级数据分析师，4 条要求你满足 3 条。要加一步"和他们聊一次"吗？',
      adds: { id: 'x1', title: '和 Northwind 聊一次', sub: '缺的那一条：A/B 测试，可以在聊的时候问' },
    },
    {
      id: 'n2',
      text: '你昨天说实习时"每周省下半天"。要把这句原话加到"周报自动化"下面当证据吗？',
    },
    { id: 'n3', text: 'Jordan 的日历连不上，没能拿到他的空闲时间。', failed: true },
  ],
};

const daniel: Person = {
  id: 'daniel',
  name: 'Daniel Wu',
  meta: '审计 6 年 · 想转产品经理（虚构）',
  now: '现在：转向产品经理',
  lenses: [
    {
      id: 'audit',
      label: '以前的方向：审计',
      note: '这是你原来的说法。切到"产品经理"，看同样的经历换一种说法。',
      done: [
        { id: 'a1', title: '加入会计师事务所，做审计', sub: '出处：简历第 1 页', when: '2019', rung: 'said' },
        { id: 'a2', title: '带 4 人小组做年度审计', sub: '出处：简历第 1 页', when: '2022', rung: 'said' },
        { id: 'a3', title: '推动审计底稿工具上线', sub: '出处：对话第 6 轮', when: '2024', rung: 'said' },
      ],
      drafts: [],
    },
    {
      id: 'pm',
      label: '新方向：产品经理',
      note: '每一句仍然连回原来的出处。翻译不了的，变成上面的虚线缺口。',
      done: [
        { id: 'a1', title: '在强监管行业做了 6 年流程梳理', sub: '原话：加入会计师事务所，做审计 · 简历第 1 页', when: '2019', rung: 'said' },
        { id: 'a2', title: '带 4 人小组按期交付，对接客户的 3 个部门', sub: '原话：带 4 人小组做年度审计 · 简历第 1 页', when: '2022', rung: 'said' },
        { id: 'a3', title: '把一个内部工具从需求推到上线', sub: '原话：推动审计底稿工具上线 · 对话第 6 轮', when: '2024', rung: 'said' },
      ],
      drafts: [
        {
          id: 'g1',
          title: '缺口：一份写给用户的产品需求文档',
          sub: '用"第一周"模拟写一份，2 小时左右',
          gap: true,
          start: '打开"产品经理的第一周"模拟，第一项任务就是这份文档（原型里只演示到这里）',
        },
        {
          id: 'g2',
          title: '缺口：和工程师一起做过取舍',
          sub: '请导师看你的文档，问他当年怎么补的',
          gap: true,
          mentor: { name: 'Priya', note: '审计转产品，第 3 年' },
        },
        { id: 'g3', title: '拿到第一批产品经理面试', sub: '先投接受转行的公司，名单等你点"对"' },
      ],
    },
  ],
  notes: [
    {
      id: 'n1',
      text: 'Priya 回复了：周四晚上可以聊 30 分钟。要定下来吗？',
    },
    {
      id: 'n2',
      text: '你说过"底稿工具现在全组 40 人在用"。要请当时的经理确认一下，升到"雇主确认"吗？',
      adds: { id: 'x2', title: '请原来的经理确认"底稿工具"', sub: '只发给你选的人，你点"对"才会发' },
    },
  ],
};

export const DOORFRAME_PEOPLE: Person[] = [mei, daniel];
