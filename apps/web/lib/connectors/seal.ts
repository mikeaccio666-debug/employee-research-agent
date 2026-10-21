import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

// A connection's secrets (its OAuth client registration, tokens and the sign-in's PKCE verifier)
// are stored sealed with AES-256-GCM under CONNECTOR_KEY, a 32-byte key in base64 that only the
// server holds. The database never sees them in the clear, so a leaked row or backup is useless
// without the key; changing the key signs everyone out of their connections.

const keyBytes = () => (process.env.CONNECTOR_KEY ? Buffer.from(process.env.CONNECTOR_KEY, 'base64') : null);

/** Whether connectors can be used here: the key is set and the right length. */
export const canSeal = () => keyBytes()?.length === 32;

const key = () => {
  const k = keyBytes();
  if (!k || k.length !== 32) throw new Error('CONNECTOR_KEY must be 32 bytes in base64');
  return k;
};

/** `v1.<iv>.<tag>.<ciphertext>`, all base64url. */
export function seal(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return ['v1', iv, cipher.getAuthTag(), data].map((p) => (typeof p === 'string' ? p : p.toString('base64url'))).join('.');
}

/** What seal() sealed, or null for an empty, tampered-with or foreign value. */
export function unseal<T>(sealed: string | null | undefined): T | null {
  const [v, iv, tag, data] = (sealed ?? '').split('.');
  if (v !== 'v1' || !iv || !tag || !data) return null;
  try {
    const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    const text = Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
