'use client';

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { BasisMark, buttonClass, cx, useFlash } from '@portrait/ui';
import type { Skill } from '@/lib/data/portraits';
import { Rich } from './Rich';
import s from './portrait.module.css';

const PHONE = '(max-width: 760px)';

/** True on the canvas's phone width. Only read it in event handlers and effects. */
export function isPhone() {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(PHONE).matches;
}

/** True while `ref` sits right under the phone bar, so the bar can name the section. */
export function useUnderBar(ref: RefObject<HTMLElement | null>) {
  const [under, setUnder] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setUnder(!!entry?.isIntersecting), {
      rootMargin: '-48px 0px -80% 0px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return under;
}

/** Phone top bar: the page's address on the left, an action or the current section on the right. */
export function PhoneBar({ children }: { children: ReactNode }) {
  return <header className={s.bar}>{children}</header>;
}

/** Shares the page with the system sheet, or copies its link where there is none. */
export function ShareButton() {
  const [copied, flash] = useFlash(2000);
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      flash();
    } catch {
      // The person closed the share sheet, or the clipboard is blocked: nothing to undo.
    }
  };
  return (
    <button type="button" className={buttonClass({ variant: 'quiet', size: 'sm' })} onClick={share} aria-live="polite">
      {copied ? 'Link copied' : 'Share'}
    </button>
  );
}

/** Phone: the bottom dock with the proof sheet that rises from behind it. */
export function Dock({ children, column, sheet }: { children: ReactNode; column?: boolean; sheet?: ReactNode }) {
  return (
    <div className={s.dockArea}>
      {sheet}
      <div className={cx(s.dock, column && s.col)}>{children}</div>
    </div>
  );
}

/**
 * Phone: tapping a "Good at" chip raises a card from the bottom that lists each proof.
 * Escape, Close or the handle puts it away and focus goes back to the chip.
 */
export function ProofSheet({
  id,
  skill,
  open,
  onClose,
  closeRef,
}: {
  id: string;
  skill?: Skill;
  open: boolean;
  onClose: () => void;
  closeRef: RefObject<HTMLButtonElement | null>;
}) {
  // Keep the last skill on the card while it slides away.
  const last = useRef(skill);
  if (skill) last.current = skill;
  const shown = skill ?? last.current;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <div
      id={id}
      role="dialog"
      aria-label={shown ? `Proof for ${shown.label}` : 'Proof'}
      className={cx(s.sheet, open && s.open)}
      inert={!open}
    >
      <button type="button" className={s.hdl} aria-hidden="true" tabIndex={-1} onClick={onClose} />
      {shown ? (
        <>
          <div className="flex items-baseline justify-between gap-3">
            <p className="t-h3">{shown.label}</p>
            <button ref={closeRef} type="button" className={buttonClass({ variant: 'quiet', size: 'sm' })} onClick={onClose}>
              Close
            </button>
          </div>
          {shown.proof.map((p) => (
            <div key={p.text} className={s.prow}>
              <p className="t-s">
                <Rich text={p.text} />
              </p>
              <p className="t-xs c2">
                <BasisMark kind={p.basis} />
                {p.meta}
              </p>
            </div>
          ))}
        </>
      ) : null}
    </div>
  );
}
