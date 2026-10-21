// Its own module so the studio page can show it without loading the agent's instructions (and
// the skill files they list).

/** The studio's first line, shown before the person has said anything and quoted in the
 * instructions so the model knows what it asked. */
export const OPENER =
  'Let’s draw your portrait from what you’ve actually done. To start: what are you studying or doing now, and what kind of role are you hoping for next? Any language is fine.';
