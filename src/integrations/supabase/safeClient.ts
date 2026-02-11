import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error('Missing Supabase configuration - backend features will not work');
}

let supabaseInstance: SupabaseClient<Database>;

try {
  supabaseInstance = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
} catch (e) {
  console.error('Failed to create Supabase client:', e);
  supabaseInstance = new Proxy({} as SupabaseClient<Database>, {
    get(_, prop) {
      if (prop === 'auth') {
        return {
          getSession: () => Promise.resolve({ data: { session: null }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          signOut: () => Promise.resolve({ error: null }),
          signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: { message: 'Backend not configured' } }),
          signUp: () => Promise.resolve({ data: { user: null, session: null }, error: { message: 'Backend not configured' } }),
        };
      }
      if (prop === 'from') {
        return () => ({
          select: () => ({ data: null, error: { message: 'Backend not configured' } }),
          insert: () => ({ data: null, error: { message: 'Backend not configured' } }),
          update: () => ({ data: null, error: { message: 'Backend not configured' } }),
          delete: () => ({ data: null, error: { message: 'Backend not configured' } }),
          upsert: () => ({ data: null, error: { message: 'Backend not configured' } }),
        });
      }
      if (prop === 'functions') {
        return { invoke: () => Promise.resolve({ data: null, error: { message: 'Backend not configured' } }) };
      }
      return undefined;
    },
  });
}

export const supabase = supabaseInstance;

export const supabaseConfig = { url: SUPABASE_URL };
export { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY };
