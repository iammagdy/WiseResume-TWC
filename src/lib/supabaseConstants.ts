/**
 * ┌──────────────────────────────────────────────────────────┐
 * │  SINGLE-PROJECT ARCHITECTURE                             │
 * │                                                          │
 * │  Purpose: Database, RLS, Edge Functions — everything     │
 * │  Configure via VITE_SUPABASE_URL env var                 │
 * └──────────────────────────────────────────────────────────┘
 */
const FALLBACK_URL = 'https://jnsfmkzgxsviuthaqlyy.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impuc2Zta3pneHN2aXV0aGFxbHl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4ODM4MzQsImV4cCI6MjA4NzQ1OTgzNH0.gzgKuVPKUU3I6TFk9A5C2EPdd8Opz1SYafymiT62lV0';

const envUrl = import.meta.env.VITE_SUPABASE_URL;
if (!envUrl && import.meta.env.DEV) {
  console.warn('[Supabase] VITE_SUPABASE_URL not set — using fallback. Set env var for production builds.');
}
export const SUPABASE_URL = envUrl || FALLBACK_URL;

const envKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!envKey && import.meta.env.DEV) {
  console.warn('[Supabase] VITE_SUPABASE_PUBLISHABLE_KEY not set — using fallback. Set env var for production builds.');
}
export const SUPABASE_ANON_KEY = envKey || FALLBACK_KEY;

/**
 * Edge functions now run on the SAME project (unified architecture).
 * These aliases are kept for backward compatibility with existing imports.
 */
export const EDGE_FUNCTIONS_URL = SUPABASE_URL;
export const EDGE_FUNCTIONS_ANON_KEY = SUPABASE_ANON_KEY;
