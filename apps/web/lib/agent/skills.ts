import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

// Skills: playbooks the studio agent loads only when a conversation calls for one (docs/
// agent-design.md §11.6). The instructions list each skill by name and one line; the agent calls
// load_skill to read the whole thing, which arrives as a tool result. So adding skills costs a
// line each in the cached instructions, and the full text only in conversations that use it.
//
// Each skill is a folder under lib/agent/skills holding a SKILL.md in the Agent Skills format:
// YAML front matter with name and description (and optionally tools, the registry tools it relies
// on), then the playbook. Adding a skill is adding a folder. next.config.ts traces the folder
// into the chat route's deployment.

export type Skill = {
  name: string;
  /** When to load it, in one line. The agent sees this in every turn. */
  description: string;
  /** The playbook, read when loaded. */
  body: string;
  /** Registry tools the playbook relies on (all tools stay available either way). */
  tools?: string[];
};

export const SKILLS_DIR = path.join(process.cwd(), 'lib/agent/skills');

/** A SKILL.md as a skill. Reads the plain `key: value` front matter skills use, nothing more. */
export function parseSkill(text: string, file = 'SKILL.md'): Skill {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(text);
  if (!m) throw new Error(`${file}: no front matter`);
  const meta: Record<string, string> = {};
  for (const line of m[1]!.split(/\r?\n/)) {
    const kv = /^([a-z-]+):\s*(.*)$/.exec(line.trim());
    if (kv) meta[kv[1]!] = kv[2]!.replace(/^"(.*)"$/, '$1').replace(/\\"/g, '"');
  }
  if (!meta.name || !/^[a-z0-9-]+$/.test(meta.name)) throw new Error(`${file}: name must be lowercase words with hyphens`);
  if (!meta.description) throw new Error(`${file}: no description`);
  const tools = meta.tools?.replace(/^\[|\]$/g, '').split(',').map((t) => t.trim()).filter(Boolean);
  return { name: meta.name, description: meta.description, body: m[2]!.trim(), ...(tools?.length ? { tools } : {}) };
}

function load(): Skill[] {
  try {
    return readdirSync(SKILLS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()
      .map((dir) => {
        const file = path.join(SKILLS_DIR, dir, 'SKILL.md');
        const skill = parseSkill(readFileSync(file, 'utf8'), file);
        if (skill.name !== dir) throw new Error(`${file}: name ${skill.name} doesn't match its folder`);
        return skill;
      });
  } catch (e) {
    // A broken or missing skill folder shouldn't take the studio down; the agent works without.
    console.error('agent skills failed to load', { dir: SKILLS_DIR, error: e instanceof Error ? e.message : e });
    return [];
  }
}

/** Sorted by name, so the instructions (and their cache) stay the same between deploys. */
export const SKILLS: Skill[] = load();

/** The skills as the instructions list them: one line each. */
export const skillIndex = () => SKILLS.map((s) => `- ${s.name}: ${s.description}`).join('\n');

export const skillNamed = (name: string) => SKILLS.find((s) => s.name === name);
