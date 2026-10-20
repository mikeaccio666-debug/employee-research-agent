import { routes } from './routes';

export type NavItem = { key: string; label: string; href: string };

// Left-nav sets as drawn on the canvas. Pages pick one and mark the active key.
export const talentNav: NavItem[] = [
  { key: 'portrait', label: 'My portrait', href: routes.studio },
  { key: 'grow', label: 'Grow', href: routes.grow },
  { key: 'feed', label: 'Feed', href: routes.feed },
  { key: 'events', label: 'Events', href: routes.events },
  { key: 'inbox', label: 'Inbox', href: routes.inbox },
  { key: 'settings', label: 'Settings', href: routes.privacy },
];

/** S01b-Agent-Event draws "Explore" in place of Grow and Feed. */
export const talentExploreNav: NavItem[] = [
  { key: 'portrait', label: 'My portrait', href: routes.studio },
  { key: 'explore', label: 'Explore', href: routes.feed },
  { key: 'events', label: 'Events', href: routes.events },
  { key: 'inbox', label: 'Inbox', href: routes.inbox },
  { key: 'settings', label: 'Settings', href: routes.privacy },
];

export const companyNav: NavItem[] = [
  { key: 'hire', label: 'Hire', href: routes.contactSheet },
  { key: 'company', label: 'Company', href: routes.company },
  { key: 'events', label: 'Events', href: routes.eventCreate },
  { key: 'inbox', label: 'Inbox', href: routes.inbox },
  { key: 'settings', label: 'Settings', href: routes.pricing },
];

/** S18: an insider keeps their own portrait and gets the Insider page. */
export const insiderNav: NavItem[] = [
  { key: 'portrait', label: 'My portrait', href: routes.studio },
  { key: 'insider', label: 'Insider', href: routes.insider },
  { key: 'feed', label: 'Feed', href: routes.feed },
  { key: 'events', label: 'Events', href: routes.events },
  { key: 'inbox', label: 'Inbox', href: routes.inbox },
  { key: 'settings', label: 'Settings', href: routes.privacy },
];

/** S01b-Agent-Insider: the insider's working set. */
export const insiderWorkNav: NavItem[] = [
  { key: 'portrait', label: 'My portrait', href: routes.studio },
  { key: 'requests', label: 'Requests', href: routes.insiderRequests },
  { key: 'hours', label: 'Office hours', href: routes.insider },
  { key: 'referrals', label: 'Referrals', href: routes.referrals },
  { key: 'inbox', label: 'Inbox', href: routes.inbox },
];
