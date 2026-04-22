/**
 * Tiny localStorage-backed cache used to prime React Query so the
 * dashboard can paint the previously-fetched resume list immediately
 * after a hard refresh while the live Supabase query revalidates in
 * the background.
 *
 * Bounded by an explicit TTL and a max payload size. Cleared on
 * sign-out and on auth user-id change (see AuthContext).
 */

const NAMESPACE = 'wr-pcache';
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const MAX_PAYLOAD_BYTES = 256 * 1024; // 256kB per entry

interface Envelope<T> {
  v: 1;
  t: number;
  data: T;
}

function key(name: string) {
  return `${NAMESPACE}:${name}`;
}

export function readPersistedCache<T>(name: string, ttlMs = DEFAULT_TTL_MS): T | null {
  try {
    const raw = localStorage.getItem(key(name));
    if (!raw) return null;
    const env = JSON.parse(raw) as Envelope<T>;
    if (!env || env.v !== 1) return null;
    if (Date.now() - env.t > ttlMs) {
      localStorage.removeItem(key(name));
      return null;
    }
    return env.data;
  } catch {
    return null;
  }
}

export function writePersistedCache<T>(name: string, data: T) {
  try {
    const env: Envelope<T> = { v: 1, t: Date.now(), data };
    const serialized = JSON.stringify(env);
    if (serialized.length > MAX_PAYLOAD_BYTES) return;
    localStorage.setItem(key(name), serialized);
  } catch {
    /* localStorage full or disabled — skip silently */
  }
}

export function clearPersistedCache(name: string) {
  try {
    localStorage.removeItem(key(name));
  } catch {
    /* ignore */
  }
}

/** Drop every namespaced entry — called on sign-out / user change. */
export function clearAllPersistedCaches() {
  try {
    const prefix = `${NAMESPACE}:`;
    const toDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) toDelete.push(k);
    }
    for (const k of toDelete) localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}
