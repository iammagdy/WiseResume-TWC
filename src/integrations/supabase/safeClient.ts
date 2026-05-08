/**
 * LEGACY STUB — pending Appwrite migration.
 *
 * The Supabase JS client has been removed from `package.json`. This file
 * exports a Proxy that throws on any property access or call so legacy
 * importers compile, but every runtime use surfaces a clear migration
 * error instead of silently returning empty data.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
function pendingError(): never {
  throw new Error(
    '[supabase stub] Supabase client removed — pending Appwrite migration. ' +
      'Migrate this call site to the Appwrite SDK.',
  );
}

const handler: ProxyHandler<any> = {
  get(_target, prop) {
    if (prop === 'then') return undefined;
    return new Proxy(function () { pendingError(); }, handler);
  },
  apply() {
    pendingError();
  },
};

export const supabase: any = new Proxy(function () { pendingError(); }, handler);

export const supabaseConfig = { url: '', anonKey: '' };
export const SUPABASE_URL = '';
export const SUPABASE_PUBLISHABLE_KEY = '';
