'use client';

import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { Band, ChipTag, Frame, LinkButton, UserMessage, buttonClass, cx } from '@portrait/ui';
import s from './colors.module.css';

/* ---------- the board's maths (DCLogic of V2-Colors), unchanged ---------- */

type Oklch = readonly [l: number, c: number, h: number];
type Wine = { c: number; h: number; l: number };
type Pair = { pair: string; r: string; p: string };

/** Final values, chosen Oct 19: C 0.025 · H 1 · L 0.30 (the defaults in system.css). */
const FINAL: Wine = { c: 0.025, h: 1, l: 0.3 };

const fmt = (t: Oklch) => `oklch(${t[0].toFixed(3)} ${t[1].toFixed(3)} ${t[2]})`;

/** Relative luminance of an OKLCH colour through linear sRGB, clipped to the gamut. */
function lum(t: Oklch) {
  const h = (t[2] * Math.PI) / 180;
  const a = t[1] * Math.cos(h);
  const b = t[1] * Math.sin(h);
  const l = Math.pow(t[0] + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(t[0] - 0.1055613458 * a - 0.0638541728 * b, 3);
  const q = Math.pow(t[0] - 0.0894841775 * a - 1.291485548 * b, 3);
  const c = (x: number) => Math.min(1, Math.max(0, x));
  return (
    0.2126 * c(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * q) +
    0.7152 * c(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * q) +
    0.0722 * c(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * q)
  );
}

function cr(x: Oklch, y: Oklch) {
  const A = lum(x);
  const B = lum(y);
  return (Math.max(A, B) + 0.05) / (Math.min(A, B) + 0.05);
}

const P = (pair: string, r: number): Pair => ({ pair, r: r.toFixed(2), p: r >= 4.5 ? 'AA' : r >= 3 ? '控件 ≥3' : '—' });

const INK: Oklch = [0.95, 0.018, 85];
const INK2: Oklch = [0.83, 0.02, 85];
const INK3: Oklch = [0.73, 0.02, 85];
const CHALK: Oklch = [0.82, 0.11, 80];
const ME: Oklch = [0.76, 0.1, 168];

/** Trim is the wine itself; warm (hover) is one step lighter and a little stronger: L + 0.05, C × 1.3. */
function wineColors(w: Wine) {
  const hh = ((Math.round(w.h) % 360) + 360) % 360;
  const trim: Oklch = [w.l, w.c, hh];
  const warm: Oklch = [w.l + 0.05, w.c * 1.3, hh];
  return { trim, warm, trimV: fmt(trim), warmV: fmt(warm) };
}

/* ---------- fixture data from the board ---------- */

type Token = { n: string; v: string; r: string };

const LIGHT_TOKENS: Token[] = [
  { n: 'wall', v: 'oklch(0.935 0.016 215)', r: '墙：页面底色' },
  { n: 'wall-2', v: 'oklch(0.905 0.020 215)', r: '凹面：输入、对话栏' },
  { n: 'trim', v: 'oklch(0.982 0.018 88)', r: '门框：展开后的内容、面板' },
  { n: 'warm', v: 'oklch(0.935 0.055 82)', r: '悬停、回执联动' },
  { n: 'chalk', v: 'oklch(0.875 0.100 78)', r: '金色粉笔：唯一的强调' },
  { n: 'ink', v: 'oklch(0.270 0.035 240)', r: '铅笔：正文与所有线' },
  { n: 'ink-2', v: 'oklch(0.420 0.030 240)', r: '次要文字' },
  { n: 'ink-3', v: 'oklch(0.495 0.025 240)', r: '元信息、刻度' },
  { n: 'edge', v: 'oklch(0.580 0.030 240)', r: '输入框边界' },
  { n: 'me', v: 'oklch(0.500 0.100 168)', r: '个人强调色（Lin）' },
];

const darkTokens = (trimV: string, warmV: string): Token[] => [
  { n: 'wall', v: 'oklch(0.245 0.030 250)', r: '深蓝的墙' },
  { n: 'wall-2', v: 'oklch(0.210 0.028 250)', r: '凹面' },
  { n: 'trim', v: trimV, r: '酒红门框：面板' },
  { n: 'warm', v: warmV, r: '悬停、回执联动' },
  { n: 'chalk', v: 'oklch(0.820 0.110 80)', r: '金色粉笔（可写字）' },
  { n: 'ink', v: 'oklch(0.950 0.018 85)', r: '白粉笔：正文' },
  { n: 'ink-2', v: 'oklch(0.830 0.020 85)', r: '次要文字' },
  { n: 'ink-3', v: 'oklch(0.730 0.020 85)', r: '元信息、刻度' },
  { n: 'edge', v: 'oklch(0.570 0.025 250)', r: '输入框边界' },
  { n: 'me', v: 'oklch(0.760 0.100 168)', r: '个人强调色（Lin）' },
];

const LIGHT_CONTRAST: Pair[] = [
  P('ink / wall', 12.45),
  P('ink-2 / wall', 6.98),
  P('ink-3 / wall', 5.06),
  P('ink / wall-2', 11.37),
  P('ink-3 / wall-2', 4.62),
  P('ink / trim', 14.25),
  P('ink-3 / trim', 5.79),
  P('ink-3 / warm', 5.03),
  P('ink / chalk', 10.2),
  P('me / wall', 4.72),
  P('wall / ink（主按钮）', 12.45),
  P('edge / wall', 3.53),
];

const PRESETS = [
  { n: '定稿', v: 'C 0.025 · H 1 · L 0.30（Oct 19 调定）' },
  { n: '上一版', v: 'C 0.045 · H 12 · L 0.30' },
  { n: '最初', v: 'C 0.065 · H 12 · L 0.30' },
  { n: '梅子酒', v: 'C 0.045 · H −8 · L 0.30' },
  { n: '石榴', v: 'C 0.045 · H 22 · L 0.30' },
];

const SWATCHES = [
  ['wall', 's-wall'],
  ['wall-2', 's-wall2'],
  ['trim', 's-trim'],
  ['warm', 's-warm'],
  ['chalk', 's-chalk'],
  ['ink', 's-ink'],
  ['ink-2', 's-ink2'],
  ['ink-3', 's-ink3'],
  ['edge', 's-edge'],
  ['me · Lin', 's-me'],
] as const;

const RULES = [
  '金色粉笔是唯一的强调色：选中、修改高亮、“Now”、待确认的底色、最新一道线。亮色里只做底（上面压墨色），暗色里可以直接写字。',
  '酒红只出现在暗色的 trim / warm 两层面上，从不做文字、按钮或强调。整站没有红色文字。',
  '层级靠墙 → 凹面 → 门框三层面区分；没有投影、没有描边框。唯一的“线”是刻度和 2–3px 的铅笔笔触。',
  '铅笔（ink）画所有的线：刻度、方括号、圈选、划掉、展开时的竖线。暗色里最新的一道换成金色粉笔。',
  '不用灰字压在彩色底上：金色和酒红上面只放 ink 或 on-chalk。',
  '照片、作品截图来自用户本人；颜色系统不给它们加滤镜。',
];

/** 24 hues every 15°; the struck ones are reserved (red to gold, pencil blue). */
const HUES = Array.from({ length: 24 }, (_, i) => i * 15);
const STRUCK = new Set([0, 15, 30, 45, 60, 75, 90, 240, 255, 270]);

const ACCENTS = [
  {
    who: 'Lin · 168°',
    tone: 'jade',
    light: 'Now · moving to TypeScript · 4.72',
    dark: 'Now · moving to TypeScript · 6.83',
  },
  { who: 'Maya · 320°', tone: 'orch', light: 'Now · redesigning a bus app', dark: 'Now · redesigning a bus app' },
  {
    who: 'Alex · 135°',
    tone: 'moss',
    light: 'Now · shipping an a11y form kit',
    dark: 'Now · shipping an a11y form kit',
  },
  { who: 'Jordan · 200°', tone: 'teal', light: 'Now · on call this week', dark: 'Now · on call this week' },
  {
    who: 'Northwind · 295°',
    tone: 'viol',
    light: 'Now · hiring a founding engineer',
    dark: 'Now · hiring a founding engineer',
  },
];

/* ---------- pieces ---------- */

function Swatches({ night }: { night?: boolean }) {
  return (
    <div className={cx(s.swg, 'mt-3.5')}>
      {SWATCHES.map(([label, cls]) => (
        <span
          key={label}
          className={cx(s.swc, s[cls], !night && cls === 's-trim' && s.edged, night && cls === 's-me' && s.onWall2)}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function Tokens({ list }: { list: Token[] }) {
  return (
    <div className="mt-3.5">
      {list.map((t) => (
        <div key={t.n} className={s.tok}>
          <span className="t-xs b">{t.n}</span>
          <span>
            <code>{t.v}</code>
            <span className="c2"> · {t.r}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function Contrast({ rows }: { rows: Pair[] }) {
  return rows.map((c) => (
    <div key={c.pair} className={s.cr}>
      <span>{c.pair}</span>
      <span>{c.r}</span>
      <span className="b">{c.p}</span>
    </div>
  ));
}

/** Signed number with a real minus, the way the board writes "H −8". */
const signed = (n: number, digits: number) => (n < 0 ? `−${Math.abs(n).toFixed(digits)}` : n.toFixed(digits));

const SLIDERS: {
  key: keyof Wine;
  letter: string;
  name: string;
  min: number;
  max: number;
  step: number;
  digits: number;
}[] = [
  { key: 'c', letter: 'C', name: '色度', min: 0, max: 0.09, step: 0.005, digits: 3 },
  { key: 'h', letter: 'H', name: '色相', min: -20, max: 40, step: 1, digits: 0 },
  { key: 'l', letter: 'L', name: '亮度', min: 0.26, max: 0.32, step: 0.005, digits: 3 },
];

/** Three range inputs for the night trim: chroma, hue and lightness of the wine. */
function WineControl({ wine, onChange }: { wine: Wine; onChange: (next: Wine) => void }) {
  const id = useId();
  const changed = wine.c !== FINAL.c || wine.h !== FINAL.h || wine.l !== FINAL.l;
  return (
    <div role="group" aria-labelledby={`${id}-t`} className={cx('sunk', s.wine)}>
      <div className="flex min-h-6 flex-wrap items-baseline justify-between gap-x-3">
        <p id={`${id}-t`} className="lab">
          Tweaks · 暗色 · 酒红
        </p>
        {changed ? (
          <LinkButton
            className="t-xs"
            onClick={() => {
              onChange(FINAL);
              // The link goes away once the values are back, so hand focus to the first slider.
              document.getElementById(`${id}-c`)?.focus();
            }}
          >
            回到定稿
          </LinkButton>
        ) : null}
      </div>
      {SLIDERS.map((k) => (
        <div key={k.key} className={s.slider}>
          <label htmlFor={`${id}-${k.key}`} className="t-xs b">
            {k.letter} {k.name}
          </label>
          <input
            id={`${id}-${k.key}`}
            className={s.range}
            type="range"
            min={k.min}
            max={k.max}
            step={k.step}
            value={wine[k.key]}
            aria-valuetext={signed(wine[k.key], k.digits)}
            onChange={(e) => onChange({ ...wine, [k.key]: Number(e.target.value) })}
          />
          <output htmlFor={`${id}-${k.key}`} className="t-xs b">
            {signed(wine[k.key], k.digits)}
          </output>
        </div>
      ))}
    </div>
  );
}

function SecHead({ n, title, note }: { n: string; title: string; note?: ReactNode }) {
  return (
    <div className={s.sech}>
      <span className={s.n}>{n}</span>
      <h2 className="t-h1">{title}</h2>
      {note ? <p className="t-s c2">{note}</p> : null}
    </div>
  );
}

/* ---------- the board ---------- */

/** V2-Colors below the header. The wine sliders repaint every night (夜) area on the page. */
export function ColorsBoard() {
  const [wine, setWine] = useState<Wine>(FINAL);
  const { trim, warm, trimV, warmV } = wineColors(wine);
  // Set on each `.pv.dark` area, as the board does with {{wineVars}}.
  const wineVars = { '--trim': trimV, '--warm': warmV } as CSSProperties;

  const live = [
    P('ink / trim', cr(INK, trim)),
    P('ink-2 / trim', cr(INK2, trim)),
    P('ink-3 / trim', cr(INK3, trim)),
    P('ink-3 / warm', cr(INK3, warm)),
    P('chalk / trim', cr(CHALK, trim)),
    P('me / trim', cr(ME, trim)),
  ];
  const darkContrast = [
    P('ink / wall', 14.0),
    P('ink-2 / wall', 9.59),
    P('ink-3 / wall', 6.77),
    P('ink / wall-2', 15.3),
    P('ink / trim', cr(INK, trim)),
    P('ink-3 / trim', cr(INK3, trim)),
    P('ink-3 / warm', cr(INK3, warm)),
    P('on-chalk / chalk', 10.05),
    P('chalk / trim', cr(CHALK, trim)),
    P('me / trim', cr(ME, trim)),
    P('wall / ink（主按钮）', 14.0),
    P('edge / wall', 3.64),
  ];

  return (
    <>
      {/* 晨 and 夜 side by side. Each half keeps its own theme whatever the site theme is. */}
      <section className={cx('wrap', s.sec)}>
        <div className="g12 gap-y-6">
          <div className="pv light panel col-[1/span_6] px-7 py-[26px] max-md:col-span-full max-sm:px-5">
            <p className="t-h3">晨 · 亮色</p>
            <Swatches />
            <Tokens list={LIGHT_TOKENS} />
          </div>
          <div
            className="pv dark panel col-[7/span_6] bg-wall px-7 py-[26px] max-md:col-span-full max-sm:px-5"
            style={wineVars}
          >
            <p className="t-h3">夜 · 暗色（酒红可调）</p>
            <Swatches night />
            <Tokens list={darkTokens(trimV, warmV)} />
          </div>
        </div>
      </section>

      <section className={cx('wrap', s.sec)}>
        <SecHead
          n="1"
          title="暗色的门框：低饱和的酒红"
          note="定稿 C 0.025 · H 1 · L 0.30。Tweaks 里的滑块保留着，想再试别的值时可以拖；右边的对比度实时计算。"
        />
        <div className="g12 items-start gap-y-6">
          <div
            className="pv dark col-[1/span_8] rounded-md p-7 max-md:col-span-full max-sm:px-4 max-sm:py-5"
            style={wineVars}
          >
            <p className="hand text-[18px]">
              <Band>Now · moving Campus Marketplace to TypeScript</Band>
            </p>
            <div className={cx(s.preview, 'mt-[18px]')}>
              <div className="flex flex-col gap-3.5">
                <div className="panel px-5 py-[18px]">
                  <p className="lab">Experience · newest on top</p>
                  <p className="t-h3 mt-1">Survived move-in week</p>
                  <p className="t-s mt-1.5">
                    Lin <Band>cached listings and queued uploads</Band> instead of buying a bigger database.
                  </p>
                  <p className="t-xs c3 mt-2">3 proofs · Sep 2026</p>
                </div>
                <UserMessage lang="zh-CN" className="max-w-full">
                  <p className="zh">开学那周数据库一直超时。我加了一层读缓存，又把图片上传拆了出去。</p>
                </UserMessage>
                <div className="flex flex-wrap gap-2">
                  <span className={buttonClass({ size: 'sm', className: 'cursor-[inherit]' })}>Book a coffee chat</span>
                  <span className={buttonClass({ variant: 'secondary', size: 'sm', className: 'cursor-[inherit]' })}>
                    Message
                  </span>
                  <ChipTag size="sm">Ships under real load</ChipTag>
                </div>
              </div>
              <div className="flex flex-col gap-3.5">
                <div className="rb px-[18px] py-4">
                  <p className="lab">You &amp; Lin</p>
                  <p className="t-s mt-1.5">Both follow Northwind</p>
                </div>
                <Frame circled className="px-4 py-3.5">
                  <p className="hand text-[15px]">08A · circled</p>
                  <p className="t-h3 mt-1">quiet-otter</p>
                </Frame>
                <div className="rounded-md bg-warm px-3.5 py-3">
                  <p className="t-xs c3">warm · hover</p>
                  <p className="t-s">A row under the pointer</p>
                </div>
              </div>
            </div>
          </div>

          <div className="panel col-[9/span_4] px-6 py-[22px] max-md:col-span-full">
            <WineControl wine={wine} onChange={setWine} />
            <p className="lab mt-4">当前数值</p>
            <p className="t-s mt-2">
              <b>trim</b> <code>{trimV}</code>
            </p>
            <p className="t-s">
              <b>warm</b> <code>{warmV}</code>
            </p>
            <p className="lab mt-4">对比度 · 实时</p>
            <div className="mt-1">
              <Contrast rows={live} />
            </div>
            <p className="lab mt-4">参考值</p>
            <div className="mt-1">
              {PRESETS.map((p) => (
                <div key={p.n} className={s.tok}>
                  <span className="t-xs b">{p.n}</span>
                  <span className="t-s">{p.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={cx('wrap', s.sec)}>
        <SecHead n="2" title="对比度" note="按 WCAG 2.2 实测；正文 ≥ 4.5:1，控件边界 ≥ 3:1。" />
        <div className="g12 gap-y-6">
          <div className="pv light panel col-[1/span_6] px-7 py-[22px] max-md:col-span-full max-sm:px-5">
            <p className="lab">晨 · 亮色</p>
            <div className="mt-2">
              <Contrast rows={LIGHT_CONTRAST} />
            </div>
          </div>
          <div
            className="pv dark col-[7/span_6] rounded-md bg-trim px-7 py-[22px] max-md:col-span-full max-sm:px-5"
            style={wineVars}
          >
            <p className="lab">夜 · 暗色（随酒红滑块实时计算）</p>
            <div className="mt-2">
              <Contrast rows={darkContrast} />
            </div>
          </div>
        </div>
      </section>

      <section className={cx('wrap', s.sec)}>
        <SecHead n="3" title="用色规则" />
        <div className="g12 max-md:gap-y-6">
          <div className="panel col-[1/span_7] px-7 py-2.5 max-md:col-span-full max-sm:px-5">
            {RULES.map((rule, i) => (
              <div key={i} className={s.rule}>
                <span className={s.k}>{i + 1}</span>
                <p className="t-s zh">{rule}</p>
              </div>
            ))}
          </div>
          <div className="col-[9/span_4] max-md:col-span-full">
            <p className="lab">个人强调色 · 只选色相</p>
            <p className="t-s zh c2 mt-2">
              agent 只给每份画像挑一个色相，亮色 L 0.50、暗色 L 0.76
              由系统计算并校验对比度。只用在画像内容里：本人的那道“Now”线、原话的引号、作品角标。
            </p>
            <p className="t-xs c2 mt-2">
              避开：0°–60°（红、赤陶、酒红）· 60°–100°（太像金色粉笔）· 235°–275°（铅笔蓝、LinkedIn 蓝）。
            </p>
          </div>
        </div>
        <div className="panel mt-6 px-7 py-[22px] max-sm:px-4">
          <div className={s.hue} role="img" aria-label="Hue wheel, struck hues are reserved">
            {HUES.map((h) => (
              <span key={h} className={cx(s[`h${h}`], STRUCK.has(h) && s.x)} />
            ))}
          </div>
          <div className="t-xs c2 mt-2 flex justify-between">
            <span>0°</span>
            <span>90°</span>
            <span>180°</span>
            <span>270°</span>
            <span>345°</span>
          </div>
          <div className="mt-4">
            <div className={s.acc}>
              <span className="t-xs b">例</span>
              <span className="t-xs b">亮色（墙上）</span>
              <span className="t-xs b">暗色（门框上）</span>
            </div>
            {ACCENTS.map((a) => (
              <div key={a.who} className={s.acc}>
                <span className="t-s">{a.who}</span>
                <span className={cx('pv light bg-wall', s.l, s[`${a.tone}L`])}>{a.light}</span>
                <span className={cx('pv dark bg-trim', s.l, s[`${a.tone}D`])} style={wineVars}>
                  {a.dark}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
