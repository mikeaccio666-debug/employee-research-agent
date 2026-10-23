import type { AuthorizationServerMetadata } from '@modelcontextprotocol/sdk/shared/auth.js';
import type { Image } from '@/lib/agent/providers/types';
import type { Action } from '../catalog';

// An app reached through its own web API rather than MCP (catalog.ts, reader kind 'api'). It signs
// people in with plain OAuth against fixed endpoints and makes the same two reads as an MCP app,
// so the agent's tools, the stored tokens and the quote checks don't know the difference.

export type Reached =
  /** `url`: where the thing read lives, when the app says. `images`: pictures in it, to read into text. */
  | { ok: true; text: string; url?: string; images?: Image[] }
  /** `reconnect`: the app no longer accepts the sign-in; the person has to connect it again. */
  | { ok: false; error: string; reconnect?: boolean };

export type Registered = { client_id: string; client_secret: string };

export type Adapter = {
  /** The app's sign-in endpoints, and the scopes asked for: as few as the two reads need. */
  oauth(): { metadata: AuthorizationServerMetadata; scope?: string };
  read(action: Action, input: string, token: string, signal?: AbortSignal): Promise<Reached>;
  /** Tells the app to forget the token, when they disconnect. Best effort. */
  revoke?(token: string, client: Registered): Promise<void>;
};
