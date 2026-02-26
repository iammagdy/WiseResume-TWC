import { createClient } from '@supabase/supabase-js';

const CLOUD_URL = import.meta.env.VITE_SUPABASE_URL;
const CLOUD_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const edgeFunctions = createClient(CLOUD_URL, CLOUD_KEY, {
  auth: { persistSession: false },
});
