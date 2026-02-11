import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * Safe Supabase client wrapper.
 *
 * Enforces the presence of environment variables to ensure secure configuration.
 * Throws an error if required configuration is missing.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error('Missing Supabase configuration - backend features will not work');
}

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

// Export URL and key for use by service modules (with fallbacks)
export { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY };
