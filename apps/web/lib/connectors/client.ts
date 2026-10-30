import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Image } from '@/lib/agent/providers/types';
import type { Reached } from './adapters/types';
import { connectorUrl, type Action, type Connector, type McpReader } from './catalog';
import type { ConnectionAuth } from './store';

// One read from a connected app. Over MCP: connect with the person's tokens (refreshed by the SDK
// when they have expired), call the one allow-listed tool for the action, and hand back its text.
// A connection lasts one call; a turn reads from an app a few times at most. Through an API
// adapter: the adapter makes the read with the token. Those apps' tokens don't expire (GitHub's
// don't); one the app stops accepting means connecting again.

export type { Reached };

const TIMEOUT_MS = 20_000;
const IMAGE_MIMES: Image['mime'][] = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export async function callConnector(c: Connector, auth: ConnectionAuth, action: Action, input: string, signal?: AbortSignal): Promise<Reached> {
  if (!c.reader) return { ok: false, error: `${c.name} can’t be read yet` };
  if (c.reader.kind === 'api') {
    const token = auth.secret.tokens?.access_token;
    if (!token) return { ok: false, reconnect: true, error: `${c.name} no longer accepts the sign-in; they need to connect it again in the studio` };
    return c.reader.adapter.read(action, input, token, signal);
  }
  return callMcp({ ...c, reader: c.reader }, auth, action, input, signal);
}

async function callMcp(c: Connector & { reader: McpReader }, auth: ConnectionAuth, action: Action, input: string, signal?: AbortSignal): Promise<Reached> {
  const client = new Client({ name: 'portrait', version: '1.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(connectorUrl(c)), { authProvider: auth });
  try {
    await client.connect(transport, { signal, timeout: TIMEOUT_MS });
    const { tool, args } = c.reader.tools[action];
    const res = await client.callTool({ name: tool, arguments: args(input) }, undefined, { signal, timeout: TIMEOUT_MS });
    const blocks = (Array.isArray(res.content) ? res.content : []) as { type?: string; text?: unknown; data?: unknown; mimeType?: unknown }[];
    const text = blocks
      .map((b) => (b.type === 'text' && typeof b.text === 'string' ? b.text : ''))
      .filter(Boolean)
      .join('\n\n')
      .trim();
    if (res.isError) return { ok: false, error: `${c.name} said: ${text.slice(0, 300) || 'that didn’t work'}` };
    const images = blocks
      .filter((b) => b.type === 'image' && typeof b.data === 'string' && IMAGE_MIMES.includes(b.mimeType as Image['mime']))
      .map((b) => ({ mime: b.mimeType as Image['mime'], data: b.data as string }));
    return { ok: true, text, ...(images.length ? { images } : {}) };
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
