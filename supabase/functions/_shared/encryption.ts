/**
 * Symmetric AES-GCM encryption for BYOK API keys stored in user_api_keys.
 *
 * Reads the 64-char hex key from API_KEY_ENCRYPTION_SECRET. If the secret is
 * missing OR contains non-hex characters, encrypt/decrypt both throw an Error
 * with `code === 'encryption_not_configured'` so callers can surface a clear
 * user-facing message without revealing internal details.
 *
 * Strict hex validation is intentional: parseInt silently coerces invalid chars
 * to NaN→0, which would produce an unintended AES key and make all ciphertext
 * permanently unrecoverable once the secret is corrected. We reject loudly.
 *
 * Wire format: base64(iv[12] ++ ciphertext)
 */

const ALG = { name: 'AES-GCM', length: 256 };
const IV_BYTES = 12;
const HEX_SECRET_RE = /^[0-9a-fA-F]{64}$/;

/**
 * Typed error thrown when the encryption secret is missing or invalid.
 * Using a plain class (no `as any`) so the `code` field is fully typed.
 */
class EncryptionConfigError extends Error {
  readonly code = 'encryption_not_configured';
  constructor(reason: string) {
    super(
      `API_KEY_ENCRYPTION_SECRET ${reason}. ` +
      'BYOK key storage is unavailable until this secret is correctly configured.',
    );
    this.name = 'EncryptionConfigError';
  }
}

function getSecretKey(): Uint8Array {
  const raw = Deno.env.get('API_KEY_ENCRYPTION_SECRET') ?? '';

  if (!raw) {
    throw new EncryptionConfigError('is not set');
  }

  // Strict hex validation: length must be exactly 64 and every character must
  // be a valid hex digit. parseInt('xy', 16) silently returns NaN which
  // Uint8Array coerces to 0, silently corrupting the key.
  if (!HEX_SECRET_RE.test(raw)) {
    throw new EncryptionConfigError(
      raw.length !== 64
        ? `must be a 64-character hex string (got ${raw.length} chars)`
        : 'contains non-hexadecimal characters',
    );
  }

  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(raw.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function importKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw, ALG, false, ['encrypt', 'decrypt']);
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str);
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function encrypt(plaintext: string): Promise<string> {
  const keyBytes = getSecretKey();
  const key = await importKey(keyBytes);
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const combined = new Uint8Array(IV_BYTES + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), IV_BYTES);
  return toBase64(combined.buffer);
}

export async function decrypt(cipherBase64: string): Promise<string> {
  const keyBytes = getSecretKey();
  const key = await importKey(keyBytes);
  const combined = fromBase64(cipherBase64);
  const iv = combined.slice(0, IV_BYTES);
  const ciphertext = combined.slice(IV_BYTES);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

/** Mask a plaintext API key so only 4 chars are visible. e.g. "sk-…abc1" */
export function maskKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.length <= 8) return '…' + trimmed.slice(-4);
  const prefix = trimmed.slice(0, trimmed.indexOf('-') + 1 || 3);
  return prefix + '…' + trimmed.slice(-4);
}
