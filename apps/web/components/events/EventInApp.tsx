'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AgentMessage,
  Band,
  Button,
  Chip,
  PencilMark,
  Receipt,
  Switch,
  Tally,
  UserMessage,
  buttonClass,
  cx,
  prefersReducedMotion,
  useFlash,
  withViewTransition,
} from '@portrait/ui';
import { AppShell, ShellMain, useShell } from '@/components/shell/AppShell';
import { DRAFTED_QUESTION, amaQuestions } from '@/lib/data/events';
import { talentExploreNav } from '@/lib/nav';
import s from './event-in-app.module.css';

/**
 * S01b · Lin looking at Northwind's AMA with the agent open. The conversation and the page
 * share one state: the receipt lights the agenda row, and the question the agent drafts
 * from Lin's move-in week story lands in the page's Questions once Lin says yes.
 */
export function EventInApp() {
  const [hov, setHov] = useState(false);
  const [flash, showFlash] = useFlash(2000);
  const [added, setAdded] = useState(false);
  const [share, setShare] = useState(false);
  const [votes, setVotes] = useState<Record<string, boolean>>({ mine: true });
  const lit = hov || flash;

  const agendaRow = useRef<HTMLDivElement>(null);
  const addBtn = useRef<HTMLButtonElement>(null);
  const undoBtn = useRef<HTMLButtonElement>(null);
  const focusNext = useRef<'add' | 'undo' | null>(null);
  useEffect(() => {
    const target = focusNext.current === 'add' ? addBtn.current : focusNext.current === 'undo' ? undoBtn.current : null;
    target?.focus({ preventScroll: true });
    focusNext.current = null;
  }, [added]);

  const showOnPage = () => {
    showFlash();
    agendaRow.current?.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };
  const add = () => {
    focusNext.current = 'undo';
    withViewTransition(() => {
      setAdded(true);
      setVotes((v) => ({ ...v, mine: true }));
    });
  };
  const undo = () => {
    focusNext.current = 'add';
    withViewTransition(() => setAdded(false));
  };
  const vote = (id: string) => setVotes((v) => ({ ...v, [id]: !v[id] }));

  const thread = (
    <>
      <UserMessage>
        <p className="t-s">Should I go? I don’t know what I’d even ask.</p>
      </UserMessage>
      <AgentMessage>
        <p className="t-s">
          I’d go. Dana’s part is about running Postgres with a tiny team — the same problem you solved during move-in
          week.
        </p>
        <Receipt on={lit} onHoverChange={setHov} action={<ShowOnPage onShow={showOnPage} />}>
          Agenda · 6:05 · Dana on Postgres
        </Receipt>
      </AgentMessage>
      <AgentMessage>
        <p className="t-s">Here’s a question built from your own story. It isn’t on the list yet.</p>
        {added ? (
          <div className="land mt-2.5">
            <PencilMark vw={200} d="M2 6 C50 3 120 7 198 4" isNew draw style={{ width: '60%' }} />
            <p className="note mt-1">
              Added · Oct 19 · {share ? 'hosts can see your portrait' : 'posted as quiet-otter'} ·{' '}
              <button ref={undoBtn} type="button" className="linklike" onClick={undo}>
                undo
              </button>
            </p>
          </div>
        ) : (
          <div className={s.confirm} role="group" aria-labelledby="ask-add">
            <p id="ask-add" className="lab">
              Add to Questions
            </p>
            <p className="t-s">“{DRAFTED_QUESTION}”</p>
            <div className={s.swrow}>
              <span className="t-s">
                <b>Show my portrait to the hosts</b>
                <span className="t-xs c2 block">
                  {share ? 'Sam and Dana can open your full portrait.' : 'Off · the list shows quiet-otter.'}
                </span>
              </span>
              <Switch label="Show my portrait to the hosts" checked={share} onChange={setShare} className="flex-none" />
            </div>
            <div className="flex flex-wrap gap-2">
              <button ref={addBtn} type="button" className={buttonClass({ size: 'sm' })} onClick={add}>
                Add question
              </button>
              <Button variant="quiet" size="sm">
                Edit first
              </Button>
            </div>
          </div>
        )}
      </AgentMessage>
    </>
  );

  return (
    <AppShell
      nav={talentExploreNav}
      active="events"
      footer="Lin Zhou · companies see quiet-otter"
      agent={{
        defaultOpen: true,
        context: 'Northwind AMA · Thu Oct 29',
        caption: 'Same conversation as your portrait studio · today',
        thread,
      }}
    >
      <ShellMain className={s.page}>
        <p className="lab">Events › Northwind</p>
        <p className="hand mt-3.5 text-[17px]">
          <Band>Thu Oct 29 · 6 PM PT · online · 45 min</Band>
        </p>
        <h1 className={cx('t-d mt-3 max-w-[20ch]', s.title)}>
          What does an intern actually do at a six-person startup?
        </h1>
        <p className="t-body c2 mt-2.5 max-w-[52ch]">
          Sam and Dana answer the questions students actually ask: what an intern ships, how a six-person team decides,
          and why restaurants.
        </p>
        <div className="mt-[18px] flex flex-wrap items-center gap-2">
          <Button>Save my seat</Button>
          <Button variant="secondary">Add to calendar</Button>
          <span className="t-xs c2 ml-2">Join opens 5:50 · 64 going</span>
        </div>

        <div className={s.panels}>
          <section className="panel" aria-labelledby="ev-agenda">
            <div className="px-[22px] py-[18px] max-sm:px-4">
              <h2 id="ev-agenda" className="lab">
                Agenda
              </h2>
              <div className={s.ag}>
                <span className="hand b">6:00</span>
                <span className="t-s">
                  <b>Sam Okafor</b> · why every neighborhood restaurant should know what’s in its kitchen
                </span>
              </div>
              <div ref={agendaRow} className={cx(s.ag, lit && s.hilite)}>
                <span className="hand b">6:05</span>
                <span className="t-s">
                  <b>Dana Wu</b> · a real intern project, start to finish — and how we run Postgres for 40 kitchens
                </span>
              </div>
              <div className={s.ag}>
                <span className="hand b">6:15</span>
                <span className="t-s">Your questions, most-voted first</span>
              </div>
            </div>
          </section>
          <section className="panel" aria-labelledby="ev-questions">
            <div className="px-[22px] py-[18px] max-sm:px-4">
              <h2 id="ev-questions" className="lab">
                Questions · {added ? amaQuestions.length + 1 : amaQuestions.length}
              </h2>
              <ul>
                {added ? (
                  <QuestionRow
                    className="land"
                    count={votes.mine ? 1 : 0}
                    voted={!!votes.mine}
                    onVote={() => vote('mine')}
                    text={<Band>{DRAFTED_QUESTION}</Band>}
                    by={
                      <>
                        quiet-otter · just now · <span className="hand text-ink">yours</span>
                      </>
                    }
                  />
                ) : null}
                {amaQuestions.map((q) => (
                  <QuestionRow
                    key={q.id}
                    count={q.n + (votes[q.id] ? 1 : 0)}
                    voted={!!votes[q.id]}
                    onVote={() => vote(q.id)}
                    text={q.text}
                    by={q.by}
                  />
                ))}
              </ul>
            </div>
          </section>
        </div>
      </ShellMain>
    </AppShell>
  );
}

function QuestionRow({
  count,
  voted,
  onVote,
  text,
  by,
  className,
}: {
  count: number;
  voted: boolean;
  onVote: () => void;
  text: ReactNode;
  by: ReactNode;
  className?: string;
}) {
  return (
    <li className={cx(s.q, className)}>
      <button
        type="button"
        className={cx(s.vote, voted && s.on)}
        onClick={onVote}
        aria-pressed={voted}
        aria-label={`${voted ? 'Remove your vote, ' : 'Vote, '}${count} ${count === 1 ? 'vote' : 'votes'}`}
      >
        {count}
        {count > 0 ? <Tally n={Math.min(count, 5)} label={null} /> : null}
      </button>
      <div>
        <p className="t-s">{text}</p>
        <p className="t-xs c2 mt-1">{by}</p>
      </div>
    </li>
  );
}

/**
 * "Show on page" lights the agenda row for two seconds. Where the panel covers the page
 * (900px and narrower) it closes first, so the lit row can be seen.
 */
function ShowOnPage({ onShow }: { onShow: () => void }) {
  const { setAgentOpen } = useShell();
  return (
    <Chip
      size="sm"
      onClick={() => {
        if (window.matchMedia('(max-width: 900px)').matches) setAgentOpen(false);
        onShow();
      }}
    >
      Show on page
    </Chip>
  );
}
