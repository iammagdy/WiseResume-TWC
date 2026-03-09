/**
 * Authenticated Supabase client pointing to project jnsfmkzgxsviuthaqlyy.
 *
 * Uses standard Supabase Auth with persistent sessions.
 * All runtime code should import from this file.
 */
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabaseConstants';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    flowType: 'implicit',
    detectSessionInUrl: false,
  },
});

// Backward-compatible exports
export const supabaseConfig = { url: SUPABASE_URL };
export { SUPABASE_URL, SUPABASE_ANON_KEY as SUPABASE_PUBLISHABLE_KEY };
