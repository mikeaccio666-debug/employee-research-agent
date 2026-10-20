'use client';

import { useState } from 'react';
import {
  AgentMessage,
  Brackets,
  Button,
  Chip,
  Composer,
  ContextTag,
  MarginNote,
  PencilMark,
  Receipt,
  Ruler,
  Segmented,
  UserMessage,
  cx,
} from '@portrait/ui';
import { useLocalThread } from '@/components/agent/AgentPanel';
import { Workspace, useWorkspace } from '@/components/workspace/Workspace';
import s from './event-create.module.css';

/** The event page's fields: name, value, and a quieter note after it. */
const FIELDS: [string, string, string][] = [
  ['Title', 'Founding engineer at Northwind: ask us anything.', ''],
  ['When', 'Thu Nov 12 · 6:00–6:45 PM PT', '· shown in each viewer’s time'],
  ['Capacity', '100', '· then a waitlist'],
  ['Hosts', 'Sam Okafor, Dana Wu', ''],
  ['Agenda', '5 min intro · 10 min a week on the job · 30 min questions', ''],
  ['Meeting link', 'Added the day before', '· only registered people see it'],
  ['Questions', 'Open now · aliases allowed', ''],
];

const REPEATS = ['Once', 'Weekly', 'Every 2 weeks', 'Monthly'];

/** People who match the founding-engineer brief, per audience tag. */
const AUDIENCE = [
  { key: 'b', label: 'Backend', n: 74 },
  { key: 'i', label: 'Infra', n: 38 },
  { key: 'n', label: 'New grad', n: 205 },
] as const;

const TITLE = 'Founding engineer at Northwind: ask us anything.';

/** S10c · Northwind creates an event by talking; the poster and the event page draw themselves. */
export function EventCreate() {
  const [sel, setSel] = useState('Capacity');
  const [rep, setRep] = useState(0);
  const [aud, setAud] = useState<Record<string, boolean>>({ b: true, i: true, n: false });
  const [published, setPublished] = useState(false);
  const [hov, setHov] = useState(false);
  const { nodes: sent, send } = useLocalThread();

  const matches = AUDIENCE.reduce((sum, a) => sum + (aud[a.key] ? a.n : 0), 0);
  const audLine = matches ? `${matches} people match · they hear first, everyone else a day later` : 'Everyone at once';
  const repeatLine = rep === 0 ? 'Online · 45 minutes' : `${REPEATS[rep]} · online · 45 minutes`;
  const publish = () => setPublished(true);

  const actions = (
    <>
      <Button variant="quiet" size="sm">
        Save draft
      </Button>
      <Button size="sm" onClick={publish}>
        {published ? 'Published' : 'Publish event'}
      </Button>
    </>
  );

  const top = (
    <>
      <span className="t-s c2">Northwind › Events ›</span>
      <span className="t-s b">New event</span>
      <span className="flex-1" />
      {actions}
    </>
  );

  const talk = (
    <>
      <UserMessage>
        <p className="t-s">AMA next Thursday 6pm PT about our founding engineer role.</p>
      </UserMessage>
      <AgentMessage>
        <p className="t-s">
          Next Thursday already has your intern AMA, and Nov 5 is Showcase night, so I drafted it for{' '}
          <b>Thursday Nov 12</b>. Two things to decide:
        </p>
        <p className="t-s mt-2">
          1 · Cap it at 100, or leave it open?
          <br />2 · Who sees it first — people who match your founding-engineer brief, or everyone?
        </p>
        <Receipt action={<Chip size="sm">Undo</Chip>}>Drafted title, agenda, poster</Receipt>
      </AgentMessage>
      <UserMessage>
        <p className="t-s">Cap at 100. Matches first, then everyone after a day.</p>
      </UserMessage>
      <AgentMessage>
        <p className="t-s">Done. The 112 people who match get an early note on Nov 5; it opens to everyone on Nov 6.</p>
        <Receipt on={hov} onHoverChange={setHov} action={<Chip size="sm">Undo</Chip>}>
          Set capacity 100 · audience
        </Receipt>
      </AgentMessage>
      {published ? (
        <AgentMessage className="land">
          <p className="t-s">Published. I’ll send the early note on Nov 5 and tell you how many registered by Monday.</p>
        </AgentMessage>
      ) : null}
      {sent}
    </>
  );

  const composer = (
    <Composer
      id="em"
      placeholder="Say what to change"
      onSend={send}
      context={sel ? <ContextTag onRemove={() => setSel('')}>Editing: {sel}</ContextTag> : null}
    />
  );

  return (
    <Workspace
      top={top}
      talk={talk}
      composer={composer}
      canvasLabel="Live preview"
      mobile={{
        status: published ? 'Published' : 'New event',
        canvasNote: 'Live preview · poster',
        previewLabel: 'Live preview · poster',
        previewTitle: TITLE,
      }}
    >
      <div className={s.cq}>
        <div className={s.sheet}>
          <Ruler />
          {/* Phones hide the top bar, so its actions sit at the top of the preview. */}
          <div className="col-[1/-1] mb-1 flex flex-wrap items-center justify-end gap-2 sm:hidden">{actions}</div>
          <div>
            <p className="lab">Live preview · poster</p>
            <div className={cx(s.poster, 'mt-2.5')}>
              <p className="lab">AMA · Northwind</p>
              <p className={cx(s.d, 'mt-4')}>12</p>
              <p className="t-s b">Thu Nov 12 · 6:00 PM PT</p>
              <p className="t-xs c2">{repeatLine}</p>
              <p className="t-h2 mt-auto">{TITLE}</p>
              <p className="t-xs c2 mt-2.5">Sam Okafor · Dana Wu · 100 seats</p>
              {published ? (
                <div className="absolute right-[22px] -bottom-[34px] left-[22px]">
                  <PencilMark vw={200} d="M2 6 C50 3 120 7 198 4" isNew draw style={{ width: '60%' }} />
                </div>
              ) : null}
            </div>
            {published ? (
              <MarginNote land className="mt-11">
                Published Oct 19 · early note Nov 5
              </MarginNote>
            ) : null}
          </div>
          <div>
            <p className="lab" id="ev-fields">
              Event page
            </p>
            <div className="mt-2 flex flex-col gap-0.5" role="group" aria-labelledby="ev-fields">
              {FIELDS.map(([k, v, help]) => (
                <button
                  key={k}
                  type="button"
                  className={cx(s.fld, (sel === k || (hov && k === 'Capacity')) && s.sel)}
                  aria-pressed={sel === k}
                  onClick={() => setSel((cur) => (cur === k ? '' : k))}
                >
                  <Brackets />
                  <span className={s.k}>{k}</span>{' '}
                  <span className="t-s">
                    {v} <span className="t-xs c2">{help}</span>
                  </span>
                </button>
              ))}
            </div>
            {sel ? <ChangeInChat /> : null}
            <div className="mt-3.5">
              <p className="lab">Repeat</p>
              <Segmented
                className="mt-1.5 max-w-full flex-wrap"
                label="Repeat"
                options={REPEATS.map((r, i) => ({ value: String(i), label: r }))}
                value={String(rep)}
                onChange={(v) => setRep(Number(v))}
              />
            </div>
            <div className="mt-4">
              <p className="lab">Audience · matches first on Nov 5</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {AUDIENCE.map((a) => (
                  <Chip
                    key={a.key}
                    size="sm"
                    on={!!aud[a.key]}
                    aria-pressed={!!aud[a.key]}
                    onClick={() => setAud((cur) => ({ ...cur, [a.key]: !cur[a.key] }))}
                  >
                    {a.label}
                  </Chip>
                ))}
              </div>
              <p className="t-xs c2 mt-1.5" aria-live="polite">
                {audLine}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Workspace>
  );
}

/** Phones: the conversation is one tap away once a field is picked. */
function ChangeInChat() {
  const { setView } = useWorkspace();
  return (
    <Chip size="sm" className="mt-2.5 bg-chalk text-on-chalk sm:hidden" onClick={() => setView('talk')}>
      Change this in chat
    </Chip>
  );
}
