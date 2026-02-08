import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * Safe Supabase client wrapper.
 *
 * Why this exists:
 * In some preview/build edge cases, Vite env injection can be temporarily missing,
 * which makes `import.meta.env.VITE_SUPABASE_URL` undefined and crashes the app
 * at import-time (blank screen).
 *
 * This module provides a resilient fallback using public project values.
 * (URL + publishable anon key are not secrets.)
 */

const ENV_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ENV_SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

// Fallbacks (public): keep in sync with Lovable Cloud project configuration.
const FALLBACK_SUPABASE_URL = 'https://hjnnamwgztlhzkeuufln.supabase.co';
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhqbm5hbXdnenRsaHprZXV1ZmxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNTE4MTcsImV4cCI6MjA4NTkyNzgxN30.cupd_dz6KHSJaBnUPQzJmQcYc38RTDVIMU5RP25xCso';

const SUPABASE_URL = ENV_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = ENV_SUPABASE_PUBLISHABLE_KEY || FALLBACK_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const supabaseConfig = {
  url: SUPABASE_URL,
};
