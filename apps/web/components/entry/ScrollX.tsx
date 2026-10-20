'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * A box that scrolls sideways when its content is wider (a plan table on a phone).
 * Only while it actually overflows does it become a named region in the tab order,
 * so keyboard users can scroll it; on wide screens it stays a plain box.
 */
export function ScrollX({
  labelledBy,
  className,
  children,
}: {
  labelledBy: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrolls, setScrolls] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setScrolls(el.scrollWidth > el.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      role={scrolls ? 'region' : undefined}
      aria-labelledby={scrolls ? labelledBy : undefined}
      tabIndex={scrolls ? 0 : undefined}
    >
      {children}
    </div>
  );
}
