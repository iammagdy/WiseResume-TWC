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
export const SUPABASE_URL = 'https://hjnnamwgztlhzkeuufln.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhqbm5hbXdnenRsaHprZXV1ZmxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNTE4MTcsImV4cCI6MjA4NTkyNzgxN30.cupd_dz6KHSJaBnUPQzJmQcYc38RTDVIMU5RP25xCso';

/**
 * Clerk publishable key — environment-aware.
 * Production (thewise.cloud) uses the live key; all other origins use the dev key.
 */
const CLERK_KEY_PRODUCTION = 'pk_live_Y2xlcmsudGhld2lzZS5jbG91ZCQ';
const CLERK_KEY_DEV = 'pk_test_YnJpZ2h0LWdob3N0LTM0LmNsZXJrLmFjY291bnRzLmRldiQ';

const isProductionDomain =
  typeof window !== 'undefined' && window.location.hostname.endsWith('thewise.cloud');

export const CLERK_PUBLISHABLE_KEY = isProductionDomain
  ? CLERK_KEY_PRODUCTION
  : CLERK_KEY_DEV;

/**
 * Edge functions now run on the SAME project as the database.
 * No separate Lovable Cloud project needed.
 */
export const EDGE_FUNCTIONS_URL = SUPABASE_URL;
export const EDGE_FUNCTIONS_ANON_KEY = SUPABASE_ANON_KEY;
