/**
 * Resolve the URL for an Express-proxied edge-function call.
 *
 * All environments (dev and production on Replit): returns a relative
 * `/api/fn/<name>` path. In dev, Vite proxies this to the Express server on
 * port 5001. In production, Express serves both the SPA and the /api routes
 * on port 5000, so the relative path resolves correctly in both cases.
 *
 * The previous behaviour (routing directly to Supabase Edge Functions in
 * production) was designed for a static Hostinger deployment with no Express
 * server. On Replit, Express is always present, so all requests go through
 * the server proxy — keeping API keys server-side at all times.
 */
export function apiFnUrl(fnName: string): string {
  return `/api/fn/${fnName}`;
}
