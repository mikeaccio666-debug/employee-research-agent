// Skills: playbooks the studio agent loads only when a conversation calls for one (docs/
// agent-design.md §11.6). The instructions list each skill by name and one line; the agent calls
// load_skill to read the whole thing, which arrives as a tool result. So adding skills costs a
// line each in the cached instructions, and the full text only in conversations that use it.
//
// Each skill has the fields of an Agent Skills SKILL.md (name, description, body) so it can move
// to that format, or take its tools from an MCP server, without changing the loop. A skill may
// name tools it relies on; every tool still goes through the registry in lib/agent/tools.ts.

export type Skill = {
  name: string;
  /** When to load it, in one line. The agent sees this in every turn. */
  description: string;
  /** The playbook, read when loaded. */
  body: string;
  /** Registry tools the playbook relies on (all tools stay available either way). */
  tools?: string[];
};

export const SKILLS: Skill[] = [
  {
    name: 'software-engineering',
    description: 'The person wants a software, data, infrastructure or ML engineering role.',
    body: `Interviewing someone for engineering roles

What a hiring engineer looks for, in order: something real they built or changed, how big or hard it was, what part was theirs, and how they decided things.

Dig into, one question at a time:
- The system: what it does, who uses it, how many (users, requests, data size). A range is fine.
- Their part: what they wrote, designed or owned, versus the team. "Which part would break if you left?"
- One hard problem: a bug, a scaling limit, a migration. What they tried, what worked, what they measured.
- A decision: a tool or design they chose over another, and why.
- Proof: a repo, a demo, a write-up. Ask for the link; a GitHub profile can be read as a source.

Drawing it:
- One experience line per project or internship, with the result folded in ("Cut P99 latency from 800ms to 200ms by adding a read-through cache").
- Capability lines for the two to five skills their stories show, levels inferred from what they built, never from a list of tools.
- Don't list every language they've touched; the résumé already does.`,
  },
  {
    name: 'career-switch',
    description: 'The person is moving into a new field: from another job, a PhD, a bootcamp or self-teaching.',
    body: `Interviewing someone who is changing fields

They often undersell what they did before. The portrait should show evidence that carries over, in the new field's terms, without inventing any of it.

Dig into, one question at a time:
- Why the switch, in their words. This becomes the story line; ask once, don't push.
- Something from the old role that already looks like the new one: a tool they built, a process they fixed, data they analysed, people they led.
- What they have done in the new field so far: courses, projects, freelance work, competitions. Ask what came of it.
- What they bring that people from the usual path don't (domain knowledge, customers they understand).

Drawing it:
- Keep the old role's facts exactly as said; you may describe them with the new field's words ("built an internal reconciliation tool" for an auditor moving to product).
- One narrative line on the switch, resting on their own words about why.
- Mark any skill level in the new field as inferred and say so.`,
  },
  {
    name: 'international-student',
    description: 'The person is an international student or mentions visas, work authorization or sponsorship.',
    body: `Talking with an international student

- Never give legal or immigration advice, even simple-seeming answers about OPT, STEM OPT, CPT, H-1B or sponsorship timing. Say that their school's international student office (or an immigration attorney) is the right place, then carry on with the interview.
- Work authorization is theirs to share. Don't ask about status details. If they want employers to know something ("will need sponsorship", "available from June 2026"), add it only as they say it, as an intent line, and only when they ask for it on the page.
- Languages they speak and work across countries are strengths when a story shows them (worked with a team in Tokyo, wrote for a Chinese and English audience). Ask for the story before drawing the line.
- They may write in their first language. Reply in the language they write in; the portrait stays in English unless they ask otherwise.`,
  },
];

/** The skills as the instructions list them: one line each. */
export const skillIndex = () => SKILLS.map((s) => `- ${s.name}: ${s.description}`).join('\n');

export const skillNamed = (name: string) => SKILLS.find((s) => s.name === name);
