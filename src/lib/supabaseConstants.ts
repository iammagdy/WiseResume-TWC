/**
 * ┌──────────────────────────────────────────────────────────┐
 * │  SINGLE-PROJECT ARCHITECTURE                             │
 * │                                                          │
 * │  Purpose: Database, RLS, Edge Functions — everything     │
 * │  Configure via VITE_SUPABASE_URL env var                 │
 * │                                                          │
 * │  PRIMARY PATH: VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY
 * │  set as Replit secrets (injected at build time).         │
 * └──────────────────────────────────────────────────────────┘
 */

const _envUrl = import.meta.env.VITE_SUPABASE_URL;
if (!_envUrl) {
  throw new Error('[WiseResume] VITE_SUPABASE_URL is not set. Check your .env file or Replit secrets.');
}
export const SUPABASE_URL: string = _envUrl;

const _envKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!_envKey) {
  throw new Error('[WiseResume] VITE_SUPABASE_PUBLISHABLE_KEY is not set. Check your .env file or Replit secrets.');
}
export const SUPABASE_ANON_KEY: string = _envKey;

/**
 * Edge functions now run on the SAME project (unified architecture).
 * These aliases are kept for backward compatibility with existing imports.
 */
export const EDGE_FUNCTIONS_URL = SUPABASE_URL;
export const EDGE_FUNCTIONS_ANON_KEY = SUPABASE_ANON_KEY;
