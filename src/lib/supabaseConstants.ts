/**
 * ┌──────────────────────────────────────────────────────────┐
 * │  SINGLE-PROJECT ARCHITECTURE                             │
 * │                                                          │
 * │  Purpose: Database, RLS, Edge Functions — everything     │
 * │  Configure via VITE_SUPABASE_URL env var                 │
 * └──────────────────────────────────────────────────────────┘
 */
const envUrl = import.meta.env.VITE_SUPABASE_URL;
if (!envUrl) throw new Error("VITE_SUPABASE_URL env var is required");
export const SUPABASE_URL = envUrl;

const envKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!envKey) throw new Error("VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY env var is required");
export const SUPABASE_ANON_KEY = envKey;

/**
 * Edge functions now run on the SAME project (unified architecture).
 * These aliases are kept for backward compatibility with existing imports.
 */
export const EDGE_FUNCTIONS_URL = SUPABASE_URL;
export const EDGE_FUNCTIONS_ANON_KEY = SUPABASE_ANON_KEY;
