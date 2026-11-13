'use client';

import { useEffect, useState } from 'react';
import { Segmented } from '@portrait/ui';
import { THEME_KEY } from '@/lib/theme';

type Theme = 'plain' | 'morning';

/** Switches the whole site between the neutral default and 晨光, and remembers it on this device. */
export function ThemeSwitch({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>('plain');
  useEffect(() => {
    setTheme(document.body.classList.contains('morning') ? 'morning' : 'plain');
  }, []);
  const pick = (t: Theme) => {
    setTheme(t);
    document.body.classList.toggle('morning', t === 'morning');
    try {
      if (t === 'morning') localStorage.setItem(THEME_KEY, t);
      else localStorage.removeItem(THEME_KEY);
    } catch {
      // Private mode: the choice lasts until the page is closed.
    }
  };
  return (
    <Segmented
      className={className}
      label="配色"
      options={[
        { value: 'plain', label: '中性' },
        { value: 'morning', label: '晨光（蓝）' },
      ]}
      value={theme}
      onChange={pick}
    />
  );
}
