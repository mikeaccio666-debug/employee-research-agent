'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  AgentMessage,
  Button,
  Chip,
  Composer,
  DateNote,
  Grow,
  MustHaves,
  Receipt,
  Ruler,
  SectionMark,
  UserMessage,
  cx,
  prefersReducedMotion,
  withViewTransition,
} from '@portrait/ui';
import { useLocalThread } from '@/components/agent/AgentPanel';
import { Workspace } from '@/components/workspace/Workspace';
import {
  GROW_COMPANIES,
  PLAN_STATE_LABEL,
  TESTS_NEED,
  growNeeds,
  initialPlanState,
  planItems,
  type PlanState,
} from '@/lib/data/growth';
import { routes } from '@/lib/routes';
import s from './grow.module.css';

const NAV = [
  { key: 'studio', label: 'Studio', href: routes.studio },
  { key: 'grow', label: 'Grow', href: routes.grow },
  { key: 'feed', label: 'Feed', href: routes.feed },
  { key: 'events', label: 'Events', href: routes.events },
  { key: 'inbox', label: 'Inbox', href: routes.inbox },
];

/** S17 · the growth plan: a Chinese conversation beside the plan it drafted. */
export function GrowPlan() {
  const [st, setSt] = useState<Record<number, PlanState>>(initialPlanState);
  const [open, setOpen] = useState(1);
  const { nodes: sent, send } = useLocalThread();
  const landed = useRef<HTMLSpanElement>(null);

  const testsDone = st[1] === 2;
  const needs = growNeeds(testsDone);

  // When item 1 is done, Lin's CI link and the agent's answer land in the thread; keep them in view.
  useEffect(() => {
    if (testsDone) landed.current?.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [testsDone]);

  const setItem = (n: number, v: PlanState) => withViewTransition(() => setSt((prev) => ({ ...prev, [n]: v })));
  const cycle = (n: number) =>
    withViewTransition(() => setSt((prev) => ({ ...prev, [n]: (((prev[n] ?? 0) + 1) % 3) as PlanState })));

  const links = NAV.map((l) => (
    <Link
      key={l.key}
      href={l.href}
      className={l.key === 'grow' ? s.on : undefined}
      aria-current={l.key === 'grow' ? 'page' : undefined}
    >
      {l.label}
    </Link>
  ));

  const top = (
    <>
      <nav className={s.topnav} aria-label="Main">
        {links}
      </nav>
      <span className="flex-1" />
      <span className="t-xs c2">Lin Zhou · @lin</span>
    </>
  );

  const talk = (
    <>
      <div lang="zh-CN" className="contents">
        <UserMessage>
          <p className="t-s zh">离后端实习我还差什么？</p>
        </UserMessage>
        <AgentMessage>
          <p className="t-s zh">
            我对比了最近 90 天里 37 家公司对后端实习生的要求。你最大的空缺不是能力，而是证据：你说写过测试，但画像里看不到。
          </p>
          <p className="t-s zh mt-2">右边是一份四项计划，最快的一项大约 6 小时。</p>
          <Receipt>
            <span lang="en">Drafted a growth plan · 4 items</span>
          </Receipt>
        </AgentMessage>
        <UserMessage>
          <p className="t-s zh">测试那项我这周就做。</p>
        </UserMessage>
        <AgentMessage>
          <p className="t-s zh">好。做完把 CI 链接发给我，我会把它作为“已展示”的证据加到 Campus Marketplace 下面。</p>
          <Receipt
            action={
              <Chip lang="en" size="sm" className={s.undo} onClick={() => setItem(1, 0)} disabled={st[1] !== 1}>
                Undo
              </Chip>
            }
          >
            <span lang="en">Plan item 1 → in progress</span>
          </Receipt>
        </AgentMessage>
        {testsDone ? (
          <>
            <UserMessage lang="en" className="land">
              <p className="t-s">github.com/[handle]/campus-marketplace/actions/runs/412</p>
            </UserMessage>
            <AgentMessage className="land">
              <p className="t-s zh">绿了，覆盖了下单和上传两条路径。我已经把它加到画像上，“测试和 CI”这一行也改成了“达到”。</p>
              <Receipt
                action={
                  <Chip lang="en" size="sm" onClick={() => setItem(1, 1)}>
                    Undo
                  </Chip>
                }
              >
                <span lang="en">Added proof · Campus Marketplace</span>
              </Receipt>
              <span ref={landed} />
            </AgentMessage>
          </>
        ) : null}
      </div>
      {sent}
    </>
  );

  return (
    <Workspace
      top={top}
      talk={talk}
      composer={<Composer id="gm" placeholder="说说进展，或者问下一步" onSend={send} />}
      canvasLabel="Growth plan"
      talkWidth="36%"
      minHeight={760}
      mobile={{
        status: 'Growth plan · v2',
        canvasNote: 'Growth plan · updated just now',
        previewLabel: 'Growth plan · v2 · updated just now',
        previewTitle: 'Backend intern at an early-stage startup',
        previewAria: 'Open your growth plan',
        nav: links,
      }}
    >
      <div className={s.sheet}>
        <Ruler />
        <p className="lab">
          Growth plan · v2 <DateNote>updated just now</DateNote>
        </p>
        <h1 className="t-h1 mt-2.5">Backend intern at an early-stage startup</h1>
        <p className="t-s c2 mt-1.5">Target: summer 2027 · applications open in about six weeks</p>

        <section className="relative mt-[30px] max-w-[760px]">
          <SectionMark d="M2 5 C40 7 90 3 148 6" />
          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
            <h2 className="lab">Where you stand</h2>
            <p className="t-xs c2">{GROW_COMPANIES} companies · last 90 days</p>
          </div>
          <div className="mt-1.5">
            {needs.map((r, i) => (
              <div key={r.t} className={cx(s.need, i === TESTS_NEED && testsDone && s.lit)}>
                <div>
                  <p className="t-s b">{r.t}</p>
                  <p className="t-xs c2">{r.src}</p>
                </div>
                <div className={s.nb}>
                  <div className={s.bar} aria-hidden="true">
                    <i style={{ width: `${Math.round((r.n / GROW_COMPANIES) * 100)}%` }} />
                  </div>
                  <p className="t-xs c2 mt-1">
                    asked for by {r.n} of {GROW_COMPANIES}
                  </p>
                </div>
                <span className={s.st}>
                  <MustHaves marks={[r.mark]} />
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="relative mt-[34px] max-w-[760px]">
          <SectionMark d="M2 6 C50 4 100 7 148 4" isNew />
          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
            <h2 className="lab">The plan · 4 items · about three weekends</h2>
            <p className="t-xs c2">Tap an item’s status to move it along</p>
          </div>
          <div className="mx-[-16px] mt-2 flex flex-col gap-1.5">
            {planItems.map((it) => {
              const v = st[it.n] ?? 0;
              const isOpen = open === it.n;
              const label = PLAN_STATE_LABEL[v];
              const body = `plan-item-${it.n}`;
              return (
                <div key={it.n} className={cx(s.item, isOpen && s.open, v === 2 && s.isdone)}>
                  <div className={s.ih}>
                    <span className={s.n} aria-hidden="true">
                      {it.n}
                    </span>
                    <button
                      type="button"
                      className={s.toggle}
                      onClick={() => setOpen(isOpen ? 0 : it.n)}
                      aria-expanded={isOpen}
                      aria-controls={body}
                    >
                      <span className={cx('t-h3 block', s.ttl)}>{it.t}</span>
                      <span className="t-xs c2">{it.kind}</span>
                    </button>
                    <button
                      type="button"
                      className={cx(s.state, v === 1 && s.prog, v === 2 && s.done)}
                      onClick={() => cycle(it.n)}
                      aria-label={`${label} · item ${it.n}, move it along`}
                    >
                      {label}
                    </button>
                  </div>
                  <Grow open={isOpen} id={body}>
                    <div className={s.ib}>
                      <div className="gl">
                        <p className="ln t-s">
                          <b>Done when:</b> {it.done}
                        </p>
                        <p className="ln t-xs c2 mt-1.5">{it.why}</p>
                      </div>
                    </div>
                  </Grow>
                </div>
              );
            })}
          </div>
        </section>

        <section className="relative mt-[34px] max-w-[760px]">
          <SectionMark d="M2 4 C50 6 100 4 148 6" />
          <h2 className="lab">Résumé</h2>
          <div className="panel mt-2.5 flex flex-wrap items-center justify-between gap-4 px-[18px] py-4">
            <div>
              <p className="t-s b">One page, built from your portrait</p>
              <p className="t-xs c2">Every line keeps its source · version: backend intern</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm">
                Preview
              </Button>
              <Button variant="quiet" size="sm">
                Download PDF
              </Button>
            </div>
          </div>
        </section>
      </div>
    </Workspace>
  );
}
