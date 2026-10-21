import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { connectorUrl, type Action, type Connector } from './catalog';
import type { ConnectionAuth } from './store';

// One read from a connected app over MCP: connect with the person's tokens (refreshed by the SDK
// when they have expired), call the one allow-listed tool for the action, and hand back its text.
// A connection lasts one call; a turn reads from an app a few times at most.

export type Reached =
  | { ok: true; text: string }
  /** `reconnect`: the app no longer accepts the sign-in; the person has to connect it again. */
  | { ok: false; error: string; reconnect?: boolean };

const TIMEOUT_MS = 20_000;

export async function callConnector(c: Connector, auth: ConnectionAuth, action: Action, input: string, signal?: AbortSignal): Promise<Reached> {
  const client = new Client({ name: 'portrait', version: '1.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(connectorUrl(c)), { authProvider: auth });
  try {
    await client.connect(transport, { signal, timeout: TIMEOUT_MS });
    const { tool, args } = c.tools[action];
    const res = await client.callTool({ name: tool, arguments: args(input) }, undefined, { signal, timeout: TIMEOUT_MS });
    const text = (Array.isArray(res.content) ? res.content : [])
      .map((b: { type?: string; text?: unknown }) => (b.type === 'text' && typeof b.text === 'string' ? b.text : ''))
      .filter(Boolean)
      .join('\n\n')
      .trim();
    if (res.isError) return { ok: false, error: `${c.name} said: ${text.slice(0, 300) || 'that didn’t work'}` };
    return { ok: true, text };
  } catch (e) {
    if (e instanceof UnauthorizedError || auth.authorizationUrl) {
      return { ok: false, reconnect: true, error: `${c.name} no longer accepts the sign-in; they need to connect it again in the studio` };
    }
    console.error('connector call failed', { connector: c.id, action, error: e instanceof Error ? e.message : e });
    return { ok: false, error: `${c.name} didn’t answer` };
  } finally {
    await client.close().catch(() => {});
  }
}
