import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

let supabaseInstance: SupabaseClient<Database>;

try {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Missing env vars');
  }
  supabaseInstance = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { storage: localStorage, persistSession: true, autoRefreshToken: true },
  });
} catch (e) {
  console.error('Supabase init failed, using fallback:', e);
  supabaseInstance = createClient<Database>(
    'https://placeholder.supabase.co',
    'placeholder',
    { auth: { storage: localStorage, persistSession: true, autoRefreshToken: true } }
  );
}

export const supabase = supabaseInstance;
export const supabaseConfig = { url: SUPABASE_URL };
export { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY };
