import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { shareCards } from '@/lib/data/portraits';
import { HANDLE_PATTERN } from '@/lib/account';
import { shareLine } from '@/lib/portrait/share';
import { getPublicPortrait, type PublicPortrait } from '@/lib/supabase/public';

// The named share card (V2-S02-Share-Cards, card 1) as the portrait's Open Graph image.
// The renderer knows neither oklch nor CSS variables, so the 晨 light tokens are written in hex,
// and boxes sit where the card's CSS puts them at 1200 × 630.

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const C = {
  wall: '#deecf0', // oklch(0.935 0.016 215)
  wall2: '#d2e3e8', // oklch(0.905 0.020 215)
  trim: '#fef9ec', // oklch(0.982 0.018 88)
  chalk: '#face89', // oklch(0.875 0.100 78)
  ink: '#162936', // oklch(0.270 0.035 240), also --on-chalk and --new
  ink2: '#3e505c', // oklch(0.420 0.030 240)
  ink3: '#55646f', // oklch(0.495 0.025 240)
  photo: '#98c1c4', // color-mix(in oklch, --me 30%, --wall-2)
};

async function lookup(raw: string) {
  const handle = decodeURIComponent(raw).toLowerCase();
  return HANDLE_PATTERN.test(handle) ? getPublicPortrait(handle) : null;
}

export async function generateImageMetadata({ params }: { params: { handle: string } | Promise<{ handle: string }> }) {
  const { handle } = await params;
  if (handle === 'lin') {
    const { name, line } = shareCards.named;
    return [{ id: 'card', alt: `${name} — ${line}`, size, contentType }];
  }
  // A real portrait gets a card once it is published and public; anything else gets none.
  const portrait = await lookup(handle);
  if (!portrait) return [];
  const { name, line } = shareLine(portrait);
  return [{ id: 'card', alt: line ? `${name} — ${line}` : name, size, contentType }];
}

const fontFile = (pkg: string, file: string) => readFile(join(process.cwd(), 'node_modules', '@fontsource', pkg, 'files', file));

/** The doorframe ruler: a tick every 8px, a long one every 40px, the frame's edge on the right. */
function Ruler() {
  const minor = Array.from({ length: 79 }, (_, i) => i * 8);
  const major = Array.from({ length: 16 }, (_, i) => i * 40);
  return (
    <svg width="34" height="630" viewBox="0 0 34 630" style={{ position: 'absolute', left: 22, top: 0 }}>
      <rect x="32" y="0" width="2" height="630" fill={C.ink3} />
      {minor.map((y) => (
        <rect key={`m${y}`} x="20" y={y} width="14" height="2" fill={C.ink3} />
      ))}
      {major.map((y) => (
        <rect key={`M${y}`} x="0" y={y} width="34" height="2" fill={C.ink3} />
      ))}
    </svg>
  );
}

function Mark({ top, date, d }: { top: number; date: string; d: string }) {
  return (
    <>
      <svg
        width="120"
        height="10"
        viewBox="0 0 120 10"
        style={{ position: 'absolute', left: 30, top, overflow: 'visible' }}
      >
        <path d={d} stroke={C.ink} strokeWidth="3.2" strokeLinecap="round" fill="none" />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: 30,
          top: top + 14,
          fontFamily: 'Shantell Sans',
          fontWeight: 500,
          fontSize: 15,
          lineHeight: 1.6,
          color: C.ink2,
          whiteSpace: 'nowrap',
        }}
      >
        {date}
      </div>
    </>
  );
}

function TallyMark({ n }: { n: 2 | 3 }) {
  const d = n === 3 ? 'M3 2 L3 14 M9 2 L9 14 M15 2 L15 14' : 'M3 2 L3 14 M9 2 L9 14';
  return (
    <svg width={n === 3 ? 24 : 17} height="20" viewBox={`0 0 ${n === 3 ? 20 : 14} 16`}>
      <path d={d} stroke={C.ink} strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export default async function Image({ params }: { params: Promise<{ handle: string }>; id: Promise<string> }) {
  const { handle } = await params;
  if (handle !== 'lin') {
    const portrait = await lookup(handle);
    return portrait ? namedCard(portrait) : new Response('Not found', { status: 404 });
  }
  const card = shareCards.named;
  const [regular, medium, bold, heavy, hand] = await Promise.all([
    fontFile('atkinson-hyperlegible-next', 'atkinson-hyperlegible-next-latin-400-normal.woff'),
    fontFile('atkinson-hyperlegible-next', 'atkinson-hyperlegible-next-latin-500-normal.woff'),
    fontFile('atkinson-hyperlegible-next', 'atkinson-hyperlegible-next-latin-700-normal.woff'),
    fontFile('atkinson-hyperlegible-next', 'atkinson-hyperlegible-next-latin-800-normal.woff'),
    fontFile('shantell-sans', 'shantell-sans-latin-500-normal.woff'),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          position: 'relative',
          background: C.wall,
          color: C.ink,
          fontFamily: 'Atkinson Hyperlegible Next',
        }}
      >
        <Ruler />
        <Mark top={card.marks[0].top} date={card.marks[0].date} d="M2 6 C40 3 80 7 118 4" />
        <Mark top={card.marks[1].top} date={card.marks[1].date} d="M2 5 C40 7 80 3 118 6" />

        <div
          style={{
            position: 'absolute',
            left: 112,
            top: 48,
            fontSize: 24,
            lineHeight: 1.6,
            fontWeight: 800,
            letterSpacing: -0.48,
          }}
        >
          Portrait
        </div>
        <div
          style={{
            position: 'absolute',
            right: 64,
            top: 55,
            fontSize: 18,
            lineHeight: 1.6,
            fontWeight: 700,
            color: C.ink2,
          }}
        >
          {card.url}
        </div>

        <div
          style={{
            position: 'absolute',
            left: 112,
            top: 146,
            padding: '1px 6px',
            borderRadius: 3,
            background: C.chalk,
            color: C.ink,
            fontFamily: 'Shantell Sans',
            fontWeight: 500,
            fontSize: 26,
            lineHeight: 35 / 26,
            // The renderer skips the hand font's contextual alternates, which set it a little wider.
            letterSpacing: -0.22,
            whiteSpace: 'nowrap',
          }}
        >
          {card.now}
        </div>

        <div
          style={{
            position: 'absolute',
            left: 112,
            top: 212,
            fontSize: 168,
            lineHeight: 0.86,
            fontWeight: 800,
            letterSpacing: -8.4,
            whiteSpace: 'nowrap',
          }}
        >
          {card.name}
        </div>

        <div
          style={{
            position: 'absolute',
            left: 900,
            top: 120,
            width: 236,
            height: 236,
            borderRadius: 3,
            background: `linear-gradient(170deg, ${C.photo}, ${C.wall2})`,
            display: 'flex',
            alignItems: 'flex-end',
            padding: 14,
          }}
        >
          <span style={{ fontSize: 13, lineHeight: 1.45, fontWeight: 500, color: C.ink2 }}>{card.photo}</span>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 112,
            top: 386,
            width: 617,
            fontSize: 36,
            lineHeight: 1.18,
            fontWeight: 700,
          }}
        >
          {card.line}
        </div>

        <div style={{ position: 'absolute', left: 112, top: 536, display: 'flex', gap: 10 }}>
          {card.pills.map((p) => (
            <div
              key={p.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                height: 46,
                padding: '0 16px',
                borderRadius: 4,
                background: C.trim,
                fontSize: 19,
                fontWeight: 700,
              }}
            >
              {p.label}
              {'proofs' in p && (p.proofs === 2 || p.proofs === 3) ? <TallyMark n={p.proofs} /> : null}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Atkinson Hyperlegible Next', data: regular, weight: 400, style: 'normal' },
        { name: 'Atkinson Hyperlegible Next', data: medium, weight: 500, style: 'normal' },
        { name: 'Atkinson Hyperlegible Next', data: bold, weight: 700, style: 'normal' },
        { name: 'Atkinson Hyperlegible Next', data: heavy, weight: 800, style: 'normal' },
        { name: 'Shantell Sans', data: hand, weight: 500, style: 'normal' },
      ],
    },
  );
}

/**
 * A real person's card (PRD 7.3: name and one line, set in type, nothing else). Chinese and other
 * scripts Atkinson lacks fall back to Noto Sans SC, the same file résumé PDFs embed.
 */
async function namedCard(portrait: PublicPortrait) {
  const { name, line } = shareLine(portrait);
  const [bold, heavy, cjk] = await Promise.all([
    fontFile('atkinson-hyperlegible-next', 'atkinson-hyperlegible-next-latin-700-normal.woff'),
    fontFile('atkinson-hyperlegible-next', 'atkinson-hyperlegible-next-latin-800-normal.woff'),
    readFile(join(process.cwd(), 'lib', 'resume', 'fonts', 'noto-sans-sc-400.woff')),
  ]);
  // Long names step down so they stay on one or two lines.
  const nameSize = name.length > 22 ? 84 : name.length > 14 ? 112 : 150;
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          position: 'relative',
          background: C.wall,
          color: C.ink,
          fontFamily: 'Atkinson Hyperlegible Next, Noto Sans SC',
        }}
      >
        <Ruler />
        <div style={{ position: 'absolute', left: 112, top: 48, fontSize: 24, lineHeight: 1.6, fontWeight: 800, letterSpacing: -0.48 }}>
          Portrait
        </div>
        <div style={{ position: 'absolute', right: 64, top: 55, fontSize: 18, lineHeight: 1.6, fontWeight: 700, color: C.ink2 }}>
          {`@${portrait.handle}`}
        </div>
        <div
          style={{
            position: 'absolute',
            left: 112,
            top: 150,
            width: 1020,
            display: 'flex',
            flexDirection: 'column',
            gap: 40,
          }}
        >
          <div style={{ fontSize: nameSize, lineHeight: 0.95, fontWeight: 800, letterSpacing: -nameSize * 0.045 }}>{name}</div>
          {line ? <div style={{ width: 900, fontSize: 40, lineHeight: 1.2, fontWeight: 700, color: C.ink }}>{line}</div> : null}
        </div>
        <div style={{ position: 'absolute', left: 112, bottom: 48, fontSize: 19, fontWeight: 700, color: C.ink3 }}>
          Drawn with Portrait
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Atkinson Hyperlegible Next', data: bold, weight: 700, style: 'normal' },
        { name: 'Atkinson Hyperlegible Next', data: heavy, weight: 800, style: 'normal' },
        { name: 'Noto Sans SC', data: cjk, weight: 400, style: 'normal' },
      ],
    },
  );
}
