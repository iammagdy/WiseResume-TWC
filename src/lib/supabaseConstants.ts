/**
 * ┌──────────────────────────────────────────────────────────┐
 * │  SINGLE-PROJECT ARCHITECTURE                             │
 * │                                                          │
 * │  Project:  jnsfmkzgxsviuthaqlyy                         │
 * │  URL: https://jnsfmkzgxsviuthaqlyy.supabase.co          │
 * │  Purpose: Database, RLS, Edge Functions — everything     │
 * └──────────────────────────────────────────────────────────┘
 */
const envUrl = import.meta.env.VITE_SUPABASE_URL ?? "https://jnsfmkzgxsviuthaqlyy.supabase.co";
if (!envUrl) throw new Error("VITE_SUPABASE_URL env var is required");
export const SUPABASE_URL = envUrl;

const envKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impuc2Zta3pneHN2aXV0aGFxbHl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4ODM4MzQsImV4cCI6MjA4NzQ1OTgzNH0.gzgKuVPKUU3I6TFk9A5C2EPdd8Opz1SYafymiT62lV0";
if (!envKey) throw new Error("VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY env var is required");
export const SUPABASE_ANON_KEY = envKey;

/**
 * Edge functions now run on the SAME project (unified architecture).
 * These aliases are kept for backward compatibility with existing imports.
 */
export const EDGE_FUNCTIONS_URL = SUPABASE_URL;
export const EDGE_FUNCTIONS_ANON_KEY = SUPABASE_ANON_KEY;
