/**
 * One-time fix: patches get_clerk_user_id() on jnsfmkzgxsviuthaqlyy
 * using SUPABASE_DB_URL (direct postgres connection).
 * Delete this function after running once.
 */
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const dbUrl = Deno.env.get('SUPABASE_DB_URL');
  if (!dbUrl) {
    return new Response(JSON.stringify({ error: 'SUPABASE_DB_URL not set' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const client = new Client(dbUrl);
  await client.connect();

  try {
    await client.queryObject(`
      CREATE OR REPLACE FUNCTION public.get_clerk_user_id()
      RETURNS uuid
      LANGUAGE plpgsql
      STABLE
      SECURITY DEFINER
      SET search_path = public
      AS $$
      DECLARE
        v_val text;
      BEGIN
        -- Try top-level supabaseUuid claim first
        v_val := auth.jwt() ->> 'supabaseUuid';
        IF v_val IS NOT NULL AND v_val ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
          RETURN v_val::uuid;
        END IF;

        -- Try app_metadata.supabaseUuid
        v_val := auth.jwt() -> 'app_metadata' ->> 'supabaseUuid';
        IF v_val IS NOT NULL AND v_val ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
          RETURN v_val::uuid;
        END IF;

        -- Last resort: sub (only if it looks like a UUID)
        v_val := auth.jwt() ->> 'sub';
        IF v_val IS NOT NULL AND v_val ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
          RETURN v_val::uuid;
        END IF;

        RETURN NULL;
      END;
      $$;
    `);

    return new Response(JSON.stringify({ success: true, message: 'get_clerk_user_id() patched on jnsfmkzgxsviuthaqlyy' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } finally {
    await client.end();
  }
});
