/**
 * Resolve the URL for an Express-proxied edge-function call.
 *
 * All environments (dev and production on Replit): uses relative `/api/fn/<name>`
 * so requests go through the Express server, which keeps all secrets server-side.
 *
 * The Express server handles token-exchange natively and proxies all other
 * edge function calls to Supabase using the server-side service key.
 */
export function apiFnUrl(fnName: string): string {
  return `/api/fn/${fnName}`;
}
