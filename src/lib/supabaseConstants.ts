/**
 * ┌──────────────────────────────────────────────────────────┐
 * │  SINGLE-PROJECT ARCHITECTURE                             │
 * │                                                          │
 * │  Purpose: Database, RLS, Edge Functions — everything     │
 * │  Configure via VITE_SUPABASE_URL env var                 │
 * └──────────────────────────────────────────────────────────┘
 */
const envUrl = import.meta.env.VITE_SUPABASE_URL;
if (!envUrl) {
  console.error('[Supabase] VITE_SUPABASE_URL is not set. Database features will not work.');
}
export const SUPABASE_URL = envUrl || '';

const envKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!envKey) {
  console.error('[Supabase] VITE_SUPABASE_PUBLISHABLE_KEY is not set. Database features will not work.');
}
export const SUPABASE_ANON_KEY = envKey || '';

/**
 * Edge functions now run on the SAME project (unified architecture).
 * These aliases are kept for backward compatibility with existing imports.
 */
export const EDGE_FUNCTIONS_URL = SUPABASE_URL;
export const EDGE_FUNCTIONS_ANON_KEY = SUPABASE_ANON_KEY;
