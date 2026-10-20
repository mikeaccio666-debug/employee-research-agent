'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  AgentMessage,
  Alias,
  Band,
  BasisMark,
  Button,
  Chip,
  Composer,
  ContextTag,
  DateNote,
  EditableBlock,
  ExpandRow,
  Field,
  FootnoteButton,
  Frame,
  Grow,
  MarginNote,
  MustHaves,
  OptionGroup,
  PencilMark,
  Pending,
  Receipt,
  Segmented,
  Slot,
  SourceCard,
  StatusLine,
  Switch,
  Tally,
  Thread,
  UserMessage,
  cx,
  mustCount,
  type MustMark,
} from '@portrait/ui';
import { useLocalThread } from '@/components/agent/AgentPanel';
import s from './components.module.css';

type View = 'pub' | 'anon' | 'su';
type Visibility = 'pub' | 'anon' | 'link' | 'hid';
type Lang = 'en' | 'zh';
type SlotKey = 'wed' | 'fri';

const SLOTS: Record<SlotKey, string> = { wed: 'Wed 5:30 PM', fri: 'Fri 4:00 PM' };
const CONTEXT = 'Editing: Experience › Move-in week';

const MARKS_07A: MustMark[] = ['y', 'y', 'h', 'n'];
const MARKS_08A: MustMark[] = ['y', 'y', 'y', 'h'];

function SecHead({ n, title, note }: { n: string; title: string; note?: ReactNode }) {
  return (
    <div className={s.sech}>
      <span className={s.n}>{n}</span>
      <h2 className="t-h1">{title}</h2>
      {note ? <p className="t-s c2">{note}</p> : null}
    </div>
  );
}

/** Two cards side by side from 900 up, stacked below. */
const half = 'max-md:col-span-full';

/**
 * V2-Components below the header: every @portrait/ui primitive in the 身高线 language,
 * wired the way the board's DCLogic wires them.
 */
export function ComponentsBoard() {
  const [seg, setSeg] = useState<View>('pub');
  const [sw, setSw] = useState(false);
  const [opt, setOpt] = useState<Visibility>('anon');
  const [fn, setFn] = useState(false);
  const [lang, setLang] = useState<Lang>('en');
  const [pend, setPend] = useState<'open' | 'done'>('open');
  const [fold, setFold] = useState(false);
  const [slot, setSlot] = useState<SlotKey | null>(null);
  const [booked, setBooked] = useState(false);
  // One context for the composer and the Editing block: × clears it, picking the block sets it again.
  const [editing, setEditing] = useState(true);
  const thread = useLocalThread();
  const fnId = useId();
  const bookId = useId();
  const undoId = useId();

  // Booking swaps the slot picker for the pencil line, so keep focus on the control that replaced it.
  const focusAfter = useRef<string | null>(null);
  useEffect(() => {
    if (focusAfter.current) document.getElementById(focusAfter.current)?.focus();
    focusAfter.current = null;
  }, [booked]);
  const book = () => {
    if (!slot) return;
    focusAfter.current = undoId;
    setBooked(true);
  };
  const unbook = () => {
    focusAfter.current = bookId;
    setBooked(false);
  };

  return (
    <>
      <section className={cx('wrap', s.sec)}>
        <SecHead n="1" title="Actions" />
        <div className="g12 gap-y-6">
          <div className={cx(s.card, 'col-[1/span_7]', half)}>
            <p className="lab">Buttons · square corners, press to 0.98</p>
            <div className={s.row}>
              <Button>Book a coffee chat</Button>
              <Button variant="wall">Message</Button>
              <Button variant="quiet">Save</Button>
              <Button size="sm">Publish</Button>
              <Button icon aria-label="Send">
                ↑
              </Button>
              <Button disabled>Pick a time</Button>
            </div>
            <p className="lab mt-1.5">Tags · each tally line is one proof</p>
            <div className={s.row}>
              <Chip tone="wall">
                Ships under real load <Tally n={3} />
              </Chip>
              <Chip on>
                Debugs from the logs up <Tally n={2} />
              </Chip>
              <Chip tone="wall">
                Leads a section of 30 <Tally n={5} />
              </Chip>
            </div>
          </div>
          <div className={cx(s.card, 'col-[8/span_5]', half)}>
            <p className="lab">Segmented · switch</p>
            <Segmented<View>
              label="View as"
              value={seg}
              onChange={setSeg}
              options={[
                { value: 'pub', label: 'Public' },
                { value: 'anon', label: 'Anonymous' },
                { value: 'su', label: 'As a startup' },
              ]}
            />
            <div className={cx(s.row, 'mt-1')}>
              <Switch label="Share my portrait with the host" checked={sw} onChange={setSw} />
              <span className="t-s min-w-0 flex-1">
                Share my portrait with the host <span className="c2">· off by default</span>
              </span>
            </div>
            <p className="lab mt-1.5">Alias · name + context tags</p>
            <Alias name="quiet-otter" context="CS · Junior · Bay Area" />
            <p className="t-xs c3">No grey default avatar, no number. Same weight and size as a real name.</p>
          </div>
        </div>
      </section>

      <section className={cx('wrap', s.sec)}>
        <SecHead n="2" title="Inputs" />
        <div className="g12 gap-y-6">
          <div className={cx(s.card, 'col-[1/span_4]', half)}>
            <Field label="Handle" defaultValue="lin" help="{domain}/@lin · you can change this later" />
            <Field
              label="Work email"
              defaultValue="jordan@fernway"
              error="That address is missing a domain. Try jordan@fernway.com."
            />
          </div>
          <div className={cx(s.card, 'col-[5/span_8]', half)}>
            <p className="lab">Composer · suggestions, context tag, attach</p>
            {/* What you send here stays in this little thread, with an honest "not connected" reply. */}
            <div aria-live="polite" className={thread.nodes.length ? 'sunk p-4' : 'sr'}>
              {thread.nodes.length ? <Thread>{thread.nodes}</Thread> : null}
            </div>
            <Composer
              surface="wall"
              placeholder="Tell me what to change — in any language"
              suggestions={['Add the Grafana link', 'Make my headline less generic', 'Record a 15-second intro']}
              context={editing ? <ContextTag onRemove={() => setEditing(false)}>{CONTEXT}</ContextTag> : null}
              onSend={thread.send}
            />
            <p className="t-xs c2">
              Drop a résumé anywhere in the conversation. If sending fails, the text stays in the box: “That didn’t go
              through. Your message is safe — try again.”
            </p>
          </div>
          <div className="col-span-full">
            <p className="lab mb-2.5">Large options · who can see what</p>
            <OptionGroup<Visibility>
              label="Visibility"
              value={opt}
              onChange={setOpt}
              className="grid grid-cols-4 gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1"
              options={[
                { value: 'pub', title: 'Public', description: 'Anyone with the link, and search.' },
                {
                  value: 'anon',
                  title: 'Anonymous · discoverable',
                  description: 'Startups see quiet-otter, not your name or photo.',
                },
                { value: 'link', title: 'Link only', description: 'Only people you send the link to.' },
                { value: 'hid', title: 'Hidden', description: 'Just you, while you work on it.' },
              ]}
            />
          </div>
        </div>
      </section>

      <section className={cx('wrap', s.sec)}>
        <SecHead
          n="3"
          title="Conversation"
          note="Agent on the left, no bubble · you on the right, on the trim colour · no avatars."
        />
        <div className="g12 max-md:gap-y-6">
          <div className={cx(s.card, s.w, 'col-[1/span_7]', half)}>
            <Thread>
              <AgentMessage>
                <p>Morning, Lin. Last time we stopped at Campus Marketplace. What happened during move-in week?</p>
              </AgentMessage>
              <UserMessage lang="zh-CN">
                <p className="zh">开学那周数据库一直超时。我加了一层读缓存，又把图片上传拆了出去。</p>
              </UserMessage>
              <AgentMessage>
                <p>That’s the strongest story on your page, so it gets its own mark under Experience.</p>
                <Receipt action={<Chip size="sm">Show where it came from</Chip>}>
                  Added to Experience — Move-in week
                </Receipt>
              </AgentMessage>
              <StatusLine>Reading résumé · page 2 of 2</StatusLine>
            </Thread>
          </div>
          <div className={cx(s.card, 'col-[8/span_5]', half)}>
            <p className="lab">Receipt · status · confirmation</p>
            <p className="t-s zh" lang="zh-CN">
              回执跟在 agent 消息下面，悬停时画布对应的块变成 warm 色。处理中的状态行是一笔正在写的铅笔线，而不是转圈。
            </p>
            <div className="panel flex flex-col gap-2.5 bg-wall-2 px-[18px] py-4">
              <p className="lab">Send this to Sam at Northwind?</p>
              <p className="t-s">
                “Hi Sam — I saw your AMA on how a 6-person team ships. I’d love 20 minutes on Wed or Fri.”
              </p>
              <div className={s.row}>
                <Button size="sm">Send</Button>
                <Button variant="quiet" size="sm">
                  Edit first
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={cx('wrap', s.sec)}>
        <SecHead n="4" title="Evidence" />
        <div className="g12 gap-y-6">
          <div className={cx(s.card, 'col-[1/span_7]', half)}>
            <div className="relative">
              <p className="lab">
                Her story <DateNote>updated Oct 17</DateNote>
              </p>
            </div>
            <p className="t-body max-w-[60ch]">
              Campus Marketplace, the trading app she built, is used by more than 2,000 students.
              <FootnoteButton n={2} open={fn} onToggle={() => setFn((v) => !v)} controls={fnId} />
            </p>
            <Grow open={fn} id={fnId} live>
              <SourceCard basis="shown" meta="Résumé, p.1 · Oct 12">
                “Campus Marketplace — 2,000+ weekly users; owned backend and dispatch.”
              </SourceCard>
            </Grow>
            <p className="t-xs c3">The source grows in place under the line. No popover.</p>
          </div>
          <div className={cx(s.card, 'col-[8/span_5]', half)}>
            <p className="lab">Basis markers</p>
            <p className="t-s">
              <BasisMark kind="shown" />
              Shown — a link, file or screenshot
            </p>
            <p className="t-s">
              <BasisMark kind="said" />
              Said — in chat, in their words
            </p>
            <p className="t-s">
              <BasisMark kind="inf" />
              Inferred — waiting for them to confirm
            </p>
            <p className="t-s">
              <BasisMark kind="ver" />
              Verified — checked against a source
            </p>
          </div>
          <div className={cx(s.card, 'col-[1/span_7]', half)}>
            <p className="lab">Their words · translation and original</p>
            <div aria-live="polite">
              {lang === 'en' ? (
                <blockquote className="hand text-[26px] leading-[1.4]">
                  “I’m not great at introducing myself. I’d rather show you what I made.”
                </blockquote>
              ) : (
                <blockquote className="hcn text-[28px] leading-[1.55]" lang="zh-CN">
                  “我不太会介绍自己，但我可以给你看我做的东西。”
                </blockquote>
              )}
            </div>
            <div className={s.row}>
              <span className="t-xs c2">Lin’s words, from chat · shared with her OK</span>
              <Segmented<Lang>
                label="Language"
                value={lang}
                onChange={setLang}
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'zh', label: <span lang="zh-CN">原话</span> },
                ]}
              />
            </div>
          </div>
          <div className={cx(s.card, 'col-[8/span_5]', half)}>
            <p className="lab">A mark someone else drew</p>
            <p className="hand text-[19px] leading-[1.45]">
              “She stays after the demo to fix the bug she found during it.”
            </p>
            <p className="t-xs c2">
              <BasisMark kind="ver" />
              Jamie Park · hackathon teammate · verified
            </p>
          </div>
        </div>
      </section>

      <section className={cx('wrap', s.sec)}>
        <SecHead n="5" title="Editing" />
        <div className="g12 gap-y-6">
          <div className={cx(s.card, 'col-[1/span_7] pl-11', half)}>
            <EditableBlock
              as="div"
              className="m-0"
              selected={editing}
              gripLabel="Drag to reorder"
              onSelect={() => setEditing(true)}
              onGripKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setEditing(true);
              }}
            >
              <p className="t-h3">Survived move-in week</p>
              <p className="t-s mt-1.5">
                Lin <Band sweep>cached listings and moved photo uploads to a queue</Band> instead of buying a bigger
                database.
              </p>
              <p className="t-s mt-1.5">
                Result: <Pending pending={pend === 'open'}>p95 1.8 s → 240 ms</Pending>.
              </p>
              <div aria-live="polite">
                {pend === 'open' ? (
                  <div className={cx(s.row, 'mt-2.5')}>
                    <Chip size="sm" tone="wall" onClick={() => setPend('done')}>
                      Right
                    </Chip>
                    <Chip size="sm" tone="wall">
                      Change
                    </Chip>
                  </div>
                ) : (
                  <MarginNote land className="mt-2">
                    Confirmed by Lin · just now
                  </MarginNote>
                )}
              </div>
            </EditableBlock>
            {editing ? <ContextTag onRemove={() => setEditing(false)}>{CONTEXT}</ContextTag> : null}
          </div>
          <div className={cx(s.card, 'col-[8/span_5]', half)}>
            <p className="lab">What each mark means</p>
            <p className="t-s zh" lang="zh-CN">
              <b>铅笔方括号</b>：被选中、正在通过对话修改的块。
            </p>
            <p className="t-s zh" lang="zh-CN">
              <b>金色粉笔</b>：刚改过的字，从左往右涂上，2 秒后留成浅底。
            </p>
            <p className="t-s zh" lang="zh-CN">
              <b>虚线下划线</b>：agent 推断、等本人确认的内容，旁边是“对 / 改”。
            </p>
            <MarginNote>
              Oct 19 · added from your message · <u>undo</u>
            </MarginNote>
            <p className="t-xs c2">Margin note in handwriting replaces toasts.</p>
          </div>
        </div>
      </section>

      <section className={cx('wrap', s.sec)}>
        <SecHead n="6" title="One line first, then grow" />
        <div className="g12 gap-y-6">
          <div className={cx('col-[1/span_7]', half)}>
            <ExpandRow
              years="2025 — now"
              title="Campus Marketplace · founder & backend"
              summary="Kept a 2,000-student app up through move-in week."
              proofs={3}
              open={fold}
              onOpenChange={setFold}
              bodyClassName="grid-cols-1"
            >
              <div className="gl flex flex-col gap-2">
                <p className="ln t-s">
                  <b>Context</b> · A trading app for UCSD students, run by Lin and one friend.
                </p>
                <p className="ln t-s">
                  <b>Decision</b> · Cached listings for 30 s and queued uploads instead of a bigger database.
                </p>
                <p className="ln t-s">
                  <b>Result</b> · p95 1.8 s → 240 ms. No outage since.
                </p>
              </div>
            </ExpandRow>
          </div>
          <div className={cx(s.card, 'col-[8/span_5]', half)}>
            <p className="lab">Coffee chat · pick a time (your time, PT)</p>
            <div aria-live="polite">
              {!booked ? (
                <div>
                  <div className={cx(s.row, 'mt-3')}>
                    {(Object.keys(SLOTS) as SlotKey[]).map((k) => (
                      <Slot key={k} on={slot === k} onClick={() => setSlot(slot === k ? null : k)}>
                        {SLOTS[k]}
                      </Slot>
                    ))}
                  </div>
                  <Button id={bookId} className="mt-3 w-full" aria-disabled={!slot} onClick={book}>
                    {slot ? `Book ${SLOTS[slot]}` : 'Pick a time'}
                  </Button>
                </div>
              ) : (
                <div className="mt-3">
                  <PencilMark vw={200} d="M2 6 C50 3 120 7 198 4" isNew draw style={{ width: '80%' }} />
                  <p className="land hand mt-1.5 text-[18px]">
                    <Band>{slot ? SLOTS[slot] : ''} · coffee with Lin</Band>
                  </p>
                  <Button id={undoId} variant="quiet" size="sm" className="mt-2 -ml-2" onClick={unbook}>
                    Undo
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className={cx('wrap', s.sec)}>
        <SecHead
          n="7"
          title="Contact-sheet frames"
          note="No photos by default · one line + must-haves · tap to grow reasons in place."
        />
        <div className="grid grid-cols-4 gap-6 max-lg:grid-cols-2 max-sm:grid-cols-1">
          <Frame className="px-[18px] py-4">
            <p className="hand text-[15px]">07A</p>
            <p className="t-h3 mt-1">night-heron</p>
            <p className="t-s c2">Frontend, accessibility-first forms.</p>
            <p className="t-xs mt-2.5 flex items-center gap-2">
              <MustHaves marks={MARKS_07A} />
              {mustCount(MARKS_07A)}
            </p>
          </Frame>
          <Frame circled className="px-[18px] py-4">
            <p className="hand text-[15px]">08A · circled</p>
            <p className="t-h3 mt-1">quiet-otter</p>
            <p className="t-s c2">Kept a 2,000-student app up.</p>
            <p className="t-xs mt-2.5 flex items-center gap-2">
              <MustHaves marks={MARKS_08A} />
              {mustCount(MARKS_08A)}
            </p>
          </Frame>
          <Frame struck className="px-[18px] py-4">
            <p className="hand text-[15px]">09A</p>
            <p className="t-h3 mt-1">amber-finch</p>
            <p className="t-s c2">Not this time · no Go yet</p>
            <p className="t-xs mt-2.5">
              <u>Undo</u>
            </p>
          </Frame>
          <Frame open className="px-[18px] py-4">
            <p className="hand text-[15px]">10A · open</p>
            <p className="t-h3 mt-1">paper-kite</p>
            <p className="t-s c2">Designs the bus app students use.</p>
            <div className="gl on mt-2.5 flex flex-col gap-1.5">
              <p className="t-xs">
                Prototyped 3 flows in Figma
                <FootnoteButton n={1} />
              </p>
              <p className="t-xs">
                Ran 6 hallway tests
                <FootnoteButton n={2} />
              </p>
            </div>
          </Frame>
        </div>
      </section>
    </>
  );
}
