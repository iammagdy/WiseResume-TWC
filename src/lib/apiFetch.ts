/**
 * LEGACY STUB — pending Appwrite migration.
 *
 * `apiFetch()` previously translated `/api/data/*` calls into
 * authenticated Supabase PostgREST queries via the Kinde -> Supabase
 * bridge. With Supabase removed, every call throws `ApiFetchError(503)`
 * so the data layer can be rebuilt on Appwrite without silently
 * returning empty data.
 */

export interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
}

export class ApiFetchError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = 'ApiFetchError';
    this.status = status;
    this.body = body;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  _opts: ApiFetchOptions = {},
): Promise<T> {
  throw new ApiFetchError(
    503,
    `Pending Appwrite migration: ${path}`,
    { code: 'pending_appwrite_migration', path },
  );
}
