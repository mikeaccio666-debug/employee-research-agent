'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Wave, cx } from '@portrait/ui';
import type { Voice } from '@/lib/data/portraits';
import s from './portrait.module.css';

const LENGTH = 15;

export type VoiceState = { playing: boolean; elapsed: number; toggle: () => void };

/**
 * The 15-second voice intro. There is no audio in this preview, so "playing" runs a
 * 15-second clock: the phone label counts it, and the clip stops itself at the end.
 * Pressing again pauses; pressing once more carries on from there.
 */
export function useVoice(): VoiceState {
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const at = useRef(0);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      at.current += 1;
      if (at.current >= LENGTH) {
        at.current = 0;
        setPlaying(false);
      }
      setElapsed(at.current);
    }, 1000);
    return () => window.clearInterval(id);
  }, [playing]);

  const toggle = useCallback(() => setPlaying((p) => !p), []);
  return { playing, elapsed, toggle };
}

/** "0:06 / 0:15" */
export function clock(elapsed: number) {
  return `0:${String(elapsed).padStart(2, '0')} / 0:${LENGTH}`;
}

/** Desktop: under the photo, inside the figure. */
export function VoiceButton({ voice, state }: { voice: Voice; state: VoiceState }) {
  const { playing, elapsed, toggle } = state;
  return (
    <button type="button" className={cx(s.voice, playing && 'playing')} aria-pressed={playing} onClick={toggle}>
      <span className={s.vicon} aria-hidden="true">
        {playing ? voice.pause : '▶'}
      </span>
      <Wave />
      <span className="t-xs">{playing ? (voice.playing ?? clock(elapsed)) : voice.idle}</span>
    </button>
  );
}

/** Phone: beside the photo, under "Open to …". */
export function PhoneVoiceButton({ voice, state }: { voice: Voice; state: VoiceState }) {
  const { playing, elapsed, toggle } = state;
  return (
    <button type="button" className={cx(s.mvoice, playing && 'playing')} aria-pressed={playing} onClick={toggle}>
      <span className={s.pl} aria-hidden="true">
        {playing ? '❚❚' : '▶'}
      </span>
      <Wave />
      <span className="t-xs">{playing ? clock(elapsed) : voice.phoneIdle}</span>
    </button>
  );
}
