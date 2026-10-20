'use client';

import { useState } from 'react';
import { Switch } from '@portrait/ui';
import { chatHours } from '@/lib/data/insider';
import s from './insider.module.css';

/** S18 · coffee-chat hours with "Pause for a week". */
export function ChatHours() {
  const [pause, setPause] = useState(false);
  return (
    <div className="rb">
      <h2 className="lab">Your coffee-chat hours</h2>
      <p className="t-xs c2 mt-1" aria-live="polite">
        {pause ? 'Paused until Oct 26 · booked chats still happen' : '3 chats a week · 2 booked'}
      </p>
      <div className="mt-2">
        {chatHours.map((h) => (
          <div key={h.when} className={s.hr}>
            <span className="t-s">{h.when}</span>
            {h.booked ? (
              <span className="t-xs b">{h.booked}</span>
            ) : (
              <span className="t-xs c2">{pause ? 'Paused' : 'Open'}</span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <Switch id="pause-hours" label="Pause for a week" checked={pause} onChange={setPause} />
        <label htmlFor="pause-hours" className="t-s cursor-pointer">
          Pause for a week
        </label>
      </div>
    </div>
  );
}
