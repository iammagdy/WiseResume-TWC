/**
 * ┌──────────────────────────────────────────────────────────┐
 * │  SINGLE-PROJECT ARCHITECTURE                             │
 * │                                                          │
 * │  Project:  jnsfmkzgxsviuthaqlyy                         │
 * │  URL: https://jnsfmkzgxsviuthaqlyy.supabase.co          │
 * │  Purpose: Database, RLS, Edge Functions — everything     │
 * │                                                          │
 * │  Lovable Cloud (hjnnamwgztlhzkeuufln) is NOT used.      │
 * └──────────────────────────────────────────────────────────┘
 *
 * These are intentionally NOT read from environment variables because
 * Lovable Cloud auto-manages VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY
 * and points them at the Lovable Cloud project (hjnnamwgztlhzkeuufln).
 *
 * Our runtime project is jnsfmkzgxsviuthaqlyy — always.
 */
export const SUPABASE_URL = 'https://jnsfmkzgxsviuthaqlyy.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impuc2Zta3pneHN2aXV0aGFxbHl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4ODM4MzQsImV4cCI6MjA4NzQ1OTgzNH0.gzgKuVPKUU3I6TFk9A5C2EPdd8Opz1SYafymiT62lV0';

/**
 * Clerk publishable key — hardcoded so it's always available at runtime
 * regardless of Vite env-var injection.
 */
export const CLERK_PUBLISHABLE_KEY =
  'pk_test_YnJpZ2h0LWdob3N0LTM0LmNsZXJrLmFjY291bnRzLmRldiQ';

/**
 * Edge functions now run on the SAME project as the database.
 * No separate Lovable Cloud project needed.
 */
export const EDGE_FUNCTIONS_URL = SUPABASE_URL;
export const EDGE_FUNCTIONS_ANON_KEY = SUPABASE_ANON_KEY;
