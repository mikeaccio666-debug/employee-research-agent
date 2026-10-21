// The apps a person can connect so the studio agent can read from them (PRD ECO-01), each a
// remote MCP server that signs people in with OAuth. Only the read-only tools listed here are ever
// called, whatever else the server offers: the agent can look things up, never write, send or
// delete. What comes back is the person's own material but untrusted text, like a page they link.

export const CONNECTOR_IDS = ['notion'] as const;
export type ConnectorId = (typeof CONNECTOR_IDS)[number];

/** search: find things by words, a short list. fetch: read one thing whole, which lines may quote. */
export type Action = 'search' | 'fetch';

export type Connector = {
  id: ConnectorId;
  name: string;
  /** The MCP server's address. CONNECTOR_URL_<ID> overrides it (a local stand-in for tests). */
  url: string;
  /** What the agent is told it holds. */
  holds: string;
  /** The server's tool for each action, and its arguments for the agent's words or id. */
  tools: Record<Action, { tool: string; args: (input: string) => Record<string, unknown> }>;
};

export const CONNECTORS: Record<ConnectorId, Connector> = {
  notion: {
    id: 'notion',
    name: 'Notion',
    url: 'https://mcp.notion.com/mcp',
    holds: 'their Notion pages and databases: project write-ups, notes, portfolios',
    tools: {
      search: { tool: 'notion-search', args: (query) => ({ query }) },
      fetch: { tool: 'notion-fetch', args: (id) => ({ id }) },
    },
  },
};

export const connectorUrl = (c: Connector) => process.env[`CONNECTOR_URL_${c.id.toUpperCase()}`] || c.url;

export const isConnectorId = (v: string): v is ConnectorId => (CONNECTOR_IDS as readonly string[]).includes(v);
