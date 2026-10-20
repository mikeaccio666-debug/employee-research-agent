'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';

const REDUCE = '(prefers-reduced-motion: reduce)';

/** True when the person asked the system for less motion. Safe to call outside React. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(REDUCE).matches;
}

function subscribeReduce(onChange: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia(REDUCE);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

/** Live `prefers-reduced-motion` value; false during server render. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReduce, prefersReducedMotion, () => false);
}

type DocumentWithVT = Document & {
  startViewTransition?: (update: () => Promise<void> | void) => { finished: Promise<void> };
};

/**
 * Runs a React state update inside a view transition, the way the canvas boards do
 * ("grow from source", reordering). Falls back to a plain update when the browser has
 * no View Transitions or the person prefers reduced motion.
 */
export function withViewTransition(update: () => void, settleMs = 40): void {
  const doc = typeof document !== 'undefined' ? (document as DocumentWithVT) : undefined;
  if (!doc?.startViewTransition || prefersReducedMotion()) {
    update();
    return;
  }
  doc.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        flushSync(update);
        setTimeout(resolve, settleMs);
      }),
  );
}

/** A boolean that switches itself off after `ms` — for "Show on page" flashes. */
export function useFlash(ms = 2000): [boolean, () => void] {
  const [on, setOn] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const flash = useCallback(() => {
    clearTimeout(timer.current);
    setOn(true);
    timer.current = setTimeout(() => setOn(false), ms);
  }, [ms]);
  return [on, flash];
}

/** useState for a boolean with a stable toggle. */
export function useToggle(initial = false): [boolean, () => void, (next: boolean) => void] {
  const [on, setOn] = useState(initial);
  const toggle = useCallback(() => setOn((v) => !v), []);
  return [on, toggle, setOn];
}
