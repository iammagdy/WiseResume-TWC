import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Use env vars with hardcoded fallbacks from project config
// (anon key is a publishable key, not a secret)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
  || 'https://hjnnamwgztlhzkeuufln.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhqbm5hbXdnenRsaHprZXV1ZmxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNTE4MTcsImV4cCI6MjA4NTkyNzgxN30.cupd_dz6KHSJaBnUPQzJmQcYc38RTDVIMU5RP25xCso';

let supabaseInstance: SupabaseClient<Database>;

try {
  supabaseInstance = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { storage: localStorage, persistSession: true, autoRefreshToken: true },
  });
} catch (e) {
  console.error('Supabase init failed:', e);
  supabaseInstance = createClient<Database>(
    'https://hjnnamwgztlhzkeuufln.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhqbm5hbXdnenRsaHprZXV1ZmxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNTE4MTcsImV4cCI6MjA4NTkyNzgxN30.cupd_dz6KHSJaBnUPQzJmQcYc38RTDVIMU5RP25xCso',
    { auth: { storage: localStorage, persistSession: true, autoRefreshToken: true } }
  );
}

export const supabase = supabaseInstance;
export const supabaseConfig = { url: SUPABASE_URL };
export { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY };
