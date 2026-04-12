import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ADMIN_EMAILS = Deno.env.get('ADMIN_EMAILS');
    const allowed = (ADMIN_EMAILS ?? '')
      .split(',')
      .map((e: string) => e.trim().toLowerCase())
      .filter(Boolean);

    if (allowed.length === 0) {
      return new Response(
        JSON.stringify({ allowed: false, reason: 'not_configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ allowed: false, reason: 'unauthenticated' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    const callerEmail = user?.email ?? null;

    if (!callerEmail || !allowed.includes(callerEmail.toLowerCase())) {
      return new Response(
        JSON.stringify({ allowed: false, reason: 'email_not_allowed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ allowed: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch {
    return new Response(
      JSON.stringify({ allowed: false, reason: 'error' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
