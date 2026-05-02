import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { getConfig } from './config';
import { secureStorage } from './secureStore';

const cfg = getConfig();

/**
 * Shared Supabase client. Auth tokens persist to expo-secure-store on
 * native (Keychain / Keystore-backed) and to localStorage on web.
 *
 * NOTE: WiseResume uses Kinde as the identity provider. This client
 * never holds a Supabase-issued user session; instead, `lib/auth.ts`
 * stores the bridge JWT minted by the `token-exchange` edge function
 * and attaches it as the bearer token on every PostgREST / Edge
 * Function call (see lib/api.ts).
 */
export const supabase = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'wiseresume-mobile',
    },
  },
});
