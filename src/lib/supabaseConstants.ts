/**
 * ┌──────────────────────────────────────────────────────────┐
 * │  PROJECT REFERENCE                                       │
 * │                                                          │
 * │  Main Database:  jnsfmkzgxsviuthaqlyy                   │
 * │  URL: https://jnsfmkzgxsviuthaqlyy.supabase.co          │
 * │  Purpose: All tables, RLS policies, user data            │
 * │                                                          │
 * │  Edge Functions: hjnnamwgztlhzkeuufln (Lovable Cloud)    │
 * │  URL: https://hjnnamwgztlhzkeuufln.supabase.co           │
 * │  Purpose: Edge function hosting only                     │
 * └──────────────────────────────────────────────────────────┘
 *
 * These are intentionally NOT read from environment variables because
 * Lovable Cloud auto-manages VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY
 * and points them at the Edge Functions project (hjnnamwgztlhzkeuufln).
 *
 * Our runtime database is jnsfmkzgxsviuthaqlyy — always.
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
 * Edge functions are deployed to the Lovable Cloud project, not the
 * external database project.  All fetch() calls to /functions/v1/*
 * must use these constants.
 */
export const EDGE_FUNCTIONS_URL = 'https://hjnnamwgztlhzkeuufln.supabase.co';
export const EDGE_FUNCTIONS_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhqbm5hbXdnenRsaHprZXV1ZmxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNTE4MTcsImV4cCI6MjA4NTkyNzgxN30.cupd_dz6KHSJaBnUPQzJmQcYc38RTDVIMU5RP25xCso';
