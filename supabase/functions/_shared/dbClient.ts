/**
 * Shared database client for Edge Functions.
 * Creates a service-role Supabase client pointing at the EXTERNAL database project.
 *
 * On Lovable Cloud the built-in SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars
 * point to the *hosting* project, not the external DB where all tables live.
 * EXT_SUPABASE_URL and EXT_SUPABASE_SERVICE_ROLE_KEY override them to hit the
 * correct project (jnsfmkzgxsviuthaqlyy).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export function getServiceClient() {
  return createClient(
    Deno.env.get('EXT_SUPABASE_URL') || Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('EXT_SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}
