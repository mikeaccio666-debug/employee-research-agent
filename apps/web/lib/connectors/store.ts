import { randomBytes } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { OAuthClientProvider } from '@modelcontextprotocol/sdk/client/auth.js';
import type { OAuthClientInformationMixed, OAuthClientMetadata, OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js';
import type { ConnectorId } from './catalog';
import { seal, unseal } from './seal';

// The person's connections (supabase/migrations/…_connections.sql), one row per app, read and
// written as the signed-in person so row-level security keeps everyone to their own. A row is
// 'pending' from the moment they start signing in until the app hands back a code, then 'active'.

export type Status = 'pending' | 'active';

/** What a connection keeps sealed: how we registered with the app, its tokens, the sign-in's PKCE verifier. */
export type Secret = { client?: OAuthClientInformationMixed; tokens?: OAuthTokens; verifier?: string };

export type Connection = { provider: ConnectorId; status: Status; state: string | null; secret: Secret };

/** Which apps the person has connected, and which are halfway through signing in. No secrets. */
export async function connectionsOf(supabase: SupabaseClient, ownerId: string): Promise<{ provider: ConnectorId; status: Status }[]> {
  const { data } = await supabase
    .from('connections')
    .select('provider, status')
    .eq('owner_id', ownerId)
    .returns<{ provider: ConnectorId; status: Status }[]>();
  return data ?? [];
}

export async function loadConnection(supabase: SupabaseClient, ownerId: string, provider: ConnectorId): Promise<Connection | null> {
  const { data } = await supabase
    .from('connections')
    .select('provider, status, state, secret')
    .eq('owner_id', ownerId)
    .eq('provider', provider)
    .maybeSingle<{ provider: ConnectorId; status: Status; state: string | null; secret: string }>();
  if (!data) return null;
  return { ...data, secret: unseal<Secret>(data.secret) ?? {} };
}

export async function saveConnection(
  supabase: SupabaseClient,
  ownerId: string,
  c: Pick<Connection, 'provider' | 'status' | 'state' | 'secret'>,
): Promise<void> {
  const { error } = await supabase
    .from('connections')
    .upsert(
      { owner_id: ownerId, provider: c.provider, status: c.status, state: c.state, secret: seal(c.secret), updated_at: new Date().toISOString() },
      { onConflict: 'owner_id,provider' },
    );
  if (error) throw new Error(error.message);
}

export async function removeConnection(supabase: SupabaseClient, ownerId: string, provider: ConnectorId): Promise<void> {
  const { error } = await supabase.from('connections').delete().eq('owner_id', ownerId).eq('provider', provider);
  if (error) throw new Error(error.message);
}

/**
 * The MCP SDK's view of one connection: it registers us with the app (dynamic client
 * registration), runs the PKCE sign-in and refreshes tokens, keeping what it learns in `secret`.
 * `persist` is called whenever that changes, so a refreshed token outlives the request.
 */
export class ConnectionAuth implements OAuthClientProvider {
  /** Where the person must go to sign in, once the SDK asks for it. */
  authorizationUrl: URL | null = null;

  constructor(
    readonly secret: Secret,
    private readonly redirect: string,
    private readonly nonce: string | null,
    private readonly persist: (secret: Secret) => Promise<void> = async () => {},
  ) {}

  get redirectUrl() {
    return this.redirect;
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      client_name: 'Portrait',
      redirect_uris: [this.redirect],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    };
  }

  // Outside a sign-in (a read whose refresh failed), the SDK still asks for one before it
  // reports that the person must sign in again; that sign-in is never followed.
  state() {
    return this.nonce ?? randomBytes(16).toString('base64url');
  }

  clientInformation() {
    return this.secret.client;
  }

  async saveClientInformation(client: OAuthClientInformationMixed) {
    this.secret.client = client;
    await this.persist(this.secret);
  }

  tokens() {
    return this.secret.tokens;
  }

  async saveTokens(tokens: OAuthTokens) {
    this.secret.tokens = tokens;
    await this.persist(this.secret);
  }

  redirectToAuthorization(url: URL) {
    this.authorizationUrl = url;
  }

  async saveCodeVerifier(verifier: string) {
    this.secret.verifier = verifier;
    await this.persist(this.secret);
  }

  codeVerifier() {
    if (!this.secret.verifier) throw new Error('No sign-in in progress');
    return this.secret.verifier;
  }

  async invalidateCredentials(scope: 'all' | 'client' | 'tokens' | 'verifier' | 'discovery') {
    if (scope === 'all' || scope === 'client') delete this.secret.client;
    if (scope === 'all' || scope === 'tokens') delete this.secret.tokens;
    if (scope === 'all' || scope === 'verifier') delete this.secret.verifier;
    await this.persist(this.secret);
  }
}
