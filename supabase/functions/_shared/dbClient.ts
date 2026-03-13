/**
 * Shared database client for Edge Functions.
 * Creates a service-role Supabase client for database operations.
 *
 * In unified architecture, SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are
 * auto-injected by Supabase and point to the correct project (jnsfmkzgxsviuthaqlyy).
 *
 * EXT_SUPABASE_URL and EXT_SUPABASE_SERVICE_ROLE_KEY are kept as optional
 * overrides for backward compatibility or split-project setups.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export function getServiceClient() {
  return createClient(
    Deno.env.get('EXT_SUPABASE_URL') || Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('EXT_SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}
