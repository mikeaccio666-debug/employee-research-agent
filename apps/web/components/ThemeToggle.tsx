'use client';

import { useEffect, useState } from 'react';
import { Segmented } from '@portrait/ui';
import { THEME_KEY } from './theme';

type Choice = 'light' | 'dark' | 'system';

function read(): Choice {
  const c = document.body.classList;
  return c.contains('dark') ? 'dark' : c.contains('light') ? 'light' : 'system';
}

export function applyTheme(choice: Choice) {
  const c = document.body.classList;
  c.remove('light', 'dark');
  try {
    if (choice === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, choice);
  } catch {
    // Storage can be unavailable (private mode); the class still applies for this visit.
  }
  if (choice !== 'system') c.add(choice);
}

/** 晨 / 夜 / System switch, used on the design index. */
export function ThemeToggle({ className }: { className?: string }) {
  const [choice, setChoice] = useState<Choice>('system');
  useEffect(() => setChoice(read()), []);
  return (
    <Segmented<Choice>
      label="Theme"
      className={className}
      value={choice}
      onChange={(next) => {
        applyTheme(next);
        setChoice(next);
      }}
      options={[
        { value: 'light', label: '晨 Light' },
        { value: 'dark', label: '夜 Dark' },
        { value: 'system', label: 'System' },
      ]}
    />
  );
}
