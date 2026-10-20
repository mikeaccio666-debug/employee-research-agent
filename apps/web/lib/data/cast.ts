// The canvas's cast. All fictional — never present them as real people or companies.

export type Person = {
  name: string;
  handle?: string;
  alias?: string;
  role: string;
  summary: string;
  /** Persona hue for the photo placeholder wash, where the canvas gives one. */
  hue?: number;
};

export const lin: Person = {
  name: 'Lin Zhou',
  handle: 'lin',
  alias: 'quiet-otter',
  role: 'UC San Diego · CS junior',
  summary: 'Chinese international student. Campus Marketplace is used by more than 2,000 students.',
};

export const maya: Person = {
  name: 'Maya Ortiz',
  handle: 'maya',
  alias: 'paper-kite',
  role: 'Interaction design · new grad',
  summary: 'Lots of work, few written case studies.',
  hue: 305,
};

export const alex: Person = {
  name: 'Alex Rivera',
  handle: 'alex',
  alias: 'night-heron',
  role: 'Self-taught frontend · New York',
  summary: 'Left a biology lab to build the tools it never had. form-kit is used by three nonprofits.',
};

export const jordan: Person = {
  name: 'Jordan Lee',
  role: 'Insider · Fernway',
  summary: 'Software engineer one year out of school, on the payments team; offers coffee chats and referrals.',
};

export const northwind = {
  name: 'Northwind',
  slug: 'northwind',
  stage: 'Seed · 6 people · San Francisco',
  summary: 'Inventory and ordering software for independent restaurants.',
  ceo: 'Sam Okafor',
  cto: 'Dana Wu (Toronto)',
} as const;

/** The date the canvas is drawn on; screens say "Oct 19 · just now". */
export const TODAY = 'Oct 19';
