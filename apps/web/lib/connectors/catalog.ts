import { github } from './adapters/github';
import type { Adapter } from './adapters/types';
import { CONNECTOR_IDS, type ConnectorId } from './ids';

// The apps a person can connect so the studio agent can read from them (PRD ECO-01), as the app
// store in the studio lists them. Only the read-only calls listed here are ever made, whatever
// else an app offers: the agent can look things up, never write, send or delete. What comes back
// is the person's own material but untrusted text, like a page they link.
//
// An app reaches us one of two ways:
// - mcp: a remote MCP server; we call only the allow-listed tools below.
// - api: the app's own web API, through an adapter in ./adapters that makes the same two reads.
// And signs people in one of two ways:
// - dynamic: we register ourselves with the app on the spot (OAuth dynamic client registration).
// - registered: we registered an app with them once; its id and secret are the environment's
//   CONNECTOR_CLIENT_ID_<ID> and CONNECTOR_CLIENT_SECRET_<ID>. Until both are set the app is
//   listed as coming soon.
// An app with no reader is listed as coming soon, and asking for it is counted (requests.ts).

export { CONNECTOR_IDS, type ConnectorId };

/** search: find things by words, a short list. fetch: read one thing whole, which lines may quote. */
export type Action = 'search' | 'fetch';

export type Category = 'notes' | 'code' | 'files' | 'design';

export type McpReader = {
  kind: 'mcp';
  /** The MCP server's address. CONNECTOR_URL_<ID> overrides it (a local stand-in for tests). */
  url: string;
  /** The server's tool for each action, and its arguments for the agent's words or id. */
  tools: Record<Action, { tool: string; args: (input: string) => Record<string, unknown> }>;
};

export type ApiReader = { kind: 'api'; adapter: Adapter };

export type Connector = {
  id: ConnectorId;
  name: string;
  category: Category;
  /** One line for the app store. */
  blurb: string;
  /** What the agent is told it holds. */
  holds: string;
  signIn: 'dynamic' | 'registered';
  /** Unset: not built yet, listed as coming soon. */
  reader?: McpReader | ApiReader;
};

export const CONNECTORS: Record<ConnectorId, Connector> = {
  notion: {
    id: 'notion',
    name: 'Notion',
    category: 'notes',
    blurb: 'Project write-ups, notes and portfolios you keep in Notion.',
    holds: 'their Notion pages and databases: project write-ups, notes, portfolios',
    signIn: 'dynamic',
    reader: {
      kind: 'mcp',
      url: 'https://mcp.notion.com/mcp',
      tools: {
        search: { tool: 'notion-search', args: (query) => ({ query }) },
        fetch: { tool: 'notion-fetch', args: (id) => ({ id }) },
      },
    },
  },
  github: {
    id: 'github',
    name: 'GitHub',
    category: 'code',
    blurb: 'Your public repositories: what you built, in which languages, and their READMEs.',
    holds: 'their public GitHub repositories: names, descriptions, languages and READMEs',
    signIn: 'registered',
    reader: { kind: 'api', adapter: github },
  },
  'google-drive': {
    id: 'google-drive',
    name: 'Google Drive',
    category: 'files',
    blurb: 'Résumés, write-ups and slides you pick from your Drive.',
    holds: 'the Google Docs and files they picked from their Drive',
    signIn: 'registered',
  },
  figma: {
    id: 'figma',
    name: 'Figma',
    category: 'design',
    blurb: 'Design files and case studies, read as frames and text.',
    holds: 'their Figma design files',
    signIn: 'registered',
  },
  canva: {
    id: 'canva',
    name: 'Canva',
    category: 'design',
    blurb: 'Portfolios and presentations you made in Canva.',
    holds: 'their Canva designs',
    signIn: 'dynamic',
  },
  dropbox: {
    id: 'dropbox',
    name: 'Dropbox',
    category: 'files',
    blurb: 'Documents you keep in Dropbox.',
    holds: 'the documents in their Dropbox',
    signIn: 'registered',
  },
};

export const CATEGORY_LABEL: Record<Category, string> = { notes: 'Notes', code: 'Code', files: 'Files', design: 'Design' };

/** The apps that have a reader: the ones the agent's tools can name. */
export const READER_IDS = CONNECTOR_IDS.filter((id) => CONNECTORS[id].reader) as [ConnectorId, ...ConnectorId[]];

const envKey = (id: ConnectorId) => id.toUpperCase().replace(/-/g, '_');

export const connectorUrl = (c: Connector & { reader: McpReader }) => process.env[`CONNECTOR_URL_${envKey(c.id)}`] || c.reader.url;

/** Our registration with an app that needs one made in advance, from the environment. */
export function registeredClient(id: ConnectorId): { client_id: string; client_secret: string } | null {
  const client_id = process.env[`CONNECTOR_CLIENT_ID_${envKey(id)}`];
  const client_secret = process.env[`CONNECTOR_CLIENT_SECRET_${envKey(id)}`];
  return client_id && client_secret ? { client_id, client_secret } : null;
}

/** Whether people can connect the app here now: it has a reader, and its registration if it needs one. */
export const canConnect = (id: ConnectorId) => {
  const c = CONNECTORS[id];
  return Boolean(c.reader) && (c.signIn === 'dynamic' || registeredClient(id) !== null);
};

export const isConnectorId = (v: string): v is ConnectorId => (CONNECTOR_IDS as readonly string[]).includes(v);

/** The catalog app a name the person used refers to ("google docs" is Google Drive), if any. */
export function connectorNamed(name: string): ConnectorId | null {
  const n = name.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const aliases: Partial<Record<ConnectorId, string[]>> = { 'google-drive': ['googledocs', 'gdrive', 'drive', 'googleslides', 'googlesheets'] };
  return CONNECTOR_IDS.find((id) => id.replace(/-/g, '') === n || CONNECTORS[id].name.toLowerCase().replace(/[^a-z0-9]+/g, '') === n || aliases[id]?.includes(n)) ?? null;
}
