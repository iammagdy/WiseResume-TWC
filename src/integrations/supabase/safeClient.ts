import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = 'https://jnsfmkzgxsviuthaqlyy.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impuc2Zta3pneHN2aXV0aGFxbHl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4ODM4MzQsImV4cCI6MjA4NzQ1OTgzNH0.gzgKuVPKUU3I6TFk9A5C2EPdd8Opz1SYafymiT62lV0';

export const supabase: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: { storage: localStorage, persistSession: true, autoRefreshToken: true },
  }
);

export const supabaseConfig = { url: SUPABASE_URL };
export { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY };

