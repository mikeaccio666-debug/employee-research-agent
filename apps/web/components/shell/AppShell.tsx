'use client';

import Link from 'next/link';
import { createContext, useContext, useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from 'react';
import { Ruler, cx } from '@portrait/ui';
import { NavFooter } from '@/components/account/Account';
import { AgentPanel, type AgentConfig } from '@/components/agent/AgentPanel';
import type { NavItem } from '@/lib/nav';
import { routes } from '@/lib/routes';
import s from './AppShell.module.css';

type ShellState = {
  agentOpen: boolean;
  setAgentOpen: (open: boolean) => void;
  /** Open the panel from page content; `focus` also puts the cursor in its message box. */
  openAgent: (opts?: { focus?: boolean }) => void;
};
const ShellContext = createContext<ShellState>({ agentOpen: false, setAgentOpen: () => {}, openAgent: () => {} });

/** Open or close the agent panel from page content ("Ask Portrait about this"). */
export function useShell() {
  return useContext(ShellContext);
}

export type AppShellProps = {
  nav: NavItem[];
  /** key of the current nav item */
  active?: string;
  /** small text after a nav label, e.g. { inbox: '2' } */
  badges?: Record<string, ReactNode>;
  /** line at the bottom of the nav: "Sam Okafor · Northwind"; the signed-in person replaces it */
  footer?: ReactNode;
  /** The always-on agent. Pass `false` only on screens that carry their own conversation. */
  agent?: AgentConfig | false;
  className?: string;
  children: ReactNode;
};

/** Signed-in shell: left nav (with its own ruler), the page, and the agent panel. */
export function AppShell({ nav, active, badges, footer, agent = {}, className, children }: AppShellProps) {
  const [agentOpen, setAgentOpen] = useState(agent ? !!agent.defaultOpen : false);
  // While true, a default-open panel stays tucked away on narrow screens (see AgentPanel.module.css).
  const [auto, setAuto] = useState(agent ? !!agent.defaultOpen : false);
  const [focusToken, setFocusToken] = useState(0);
  const mnav = useRef<HTMLElement>(null);
  const openAgent = ({ focus }: { focus?: boolean } = {}) => {
    setAgentOpen(true);
    if (focus) setFocusToken((n) => n + 1);
  };

  useEffect(() => {
    // `?talk=open` opens the panel on arrival (the S01b boards are drawn open).
    if (new URLSearchParams(window.location.search).get('talk') === 'open') setAgentOpen(true);
    else if (auto && !window.matchMedia('(min-width: 901px)').matches) setAgentOpen(false);
    setAuto(false);
    // Runs once, on arrival: `auto` is the value from the first render.
  }, []);

  // Phones: the nav row scrolls sideways; bring the current page's link into view.
  useEffect(() => {
    const row = mnav.current;
    const on = row?.querySelector<HTMLElement>('[aria-current="page"]');
    if (row && on) row.scrollLeft = Math.max(0, on.offsetLeft - (row.clientWidth - on.offsetWidth) / 2);
  }, [active]);

  const links = (extra?: string) =>
    nav.map((item) => (
      <Link
        key={item.key}
        href={item.href}
        className={cx(s.link, item.key === active && s.on, extra)}
        aria-current={item.key === active ? 'page' : undefined}
      >
        {item.label}
        {badges?.[item.key] !== undefined ? <span className="t-xs">{badges[item.key]}</span> : null}
      </Link>
    ));

  return (
    <ShellContext.Provider value={{ agentOpen: !!agent && agentOpen, setAgentOpen, openAgent }}>
      <div className={cx(s.shell, className)}>
        <nav className={s.nav} aria-label="Main">
          <Ruler />
          <Link href={routes.landing} className={s.brand}>
            Portrait
          </Link>
          {links()}
          <NavFooter fallback={footer} className={s.foot} />
        </nav>
        <nav className={s.mnav} aria-label="Main" ref={mnav}>
          <Link href={routes.landing} className={s.brand}>
            Portrait
          </Link>
          {links()}
        </nav>
        {children}
        {agent ? (
          <AgentPanel {...agent} open={agentOpen} auto={auto} focusToken={focusToken} onOpenChange={setAgentOpen} />
        ) : null}
      </div>
    </ShellContext.Provider>
  );
}

/** The page column next to the nav. Makes room for the agent panel when it is open. */
export function ShellMain({
  className,
  children,
  plain,
  ...rest
}: { className?: string; children: ReactNode; plain?: boolean } & HTMLAttributes<HTMLElement>) {
  const { agentOpen } = useShell();
  return (
    <main className={cx(!plain && s.page, agentOpen && s.withp, className)} {...rest}>
      {children}
    </main>
  );
}
