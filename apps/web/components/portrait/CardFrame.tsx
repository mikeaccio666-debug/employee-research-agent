'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import c from './cards.module.css';

/**
 * Shows a 1200 × 630 card at its real size, scaled down to the width available.
 * Browsers with typed CSS arithmetic scale it in CSS; elsewhere this sets --k.
 */
export function CardFrame({ children }: { children: ReactNode }) {
  const frame = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const fit = () => el.style.setProperty('--k', String(Math.min(1, el.clientWidth / 1200)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={frame} className={c.frame}>
      <div className={c.scaler}>{children}</div>
    </div>
  );
}
