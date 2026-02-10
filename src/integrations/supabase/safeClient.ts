import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * Safe Supabase client wrapper.
 *
 * Reads configuration from environment variables injected by the platform.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

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
