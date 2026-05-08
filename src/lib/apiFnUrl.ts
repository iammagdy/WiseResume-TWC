/**
 * LEGACY STUB — pending Appwrite migration.
 *
 * Previously translated a Supabase Edge Function name into either a
 * direct `<ref>.functions.supabase.co/<fn>` URL or an Express dev-proxy
 * URL. With Supabase removed, this returns a sentinel path that fails
 * fast on fetch. AI-Hub functions are intercepted earlier by
 * `appwrite-bridge.ts` and never reach this stub.
 */
export function apiFnUrl(fnName: string): string {
  return `/__pending_appwrite_migration__/${fnName}`;
}
