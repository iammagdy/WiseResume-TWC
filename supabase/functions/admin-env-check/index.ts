const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const REQUIRED_ENV_VARS: { key: string; label: string }[] = [
  { key: 'SUPABASE_URL', label: 'Supabase URL' },
  { key: 'SUPABASE_ANON_KEY', label: 'Supabase Anon Key' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', label: 'Supabase Service Role Key' },
  { key: 'DEV_KIT_PASSWORD', label: 'DevKit Password' },
  { key: 'KINDE_ISSUER_URL', label: 'Kinde Issuer URL' },
  { key: 'KINDE_CLIENT_ID', label: 'Kinde Client ID' },
  { key: 'KINDE_CLIENT_SECRET', label: 'Kinde Client Secret' },
  { key: 'OPENROUTER_API_KEY', label: 'OpenRouter API Key' },
  { key: 'GROQ_API_KEY', label: 'Groq API Key' },
  { key: 'GITHUB_TOKEN', label: 'GitHub Token' },
  { key: 'GITHUB_OWNER', label: 'GitHub Owner' },
  { key: 'GITHUB_REPO', label: 'GitHub Repo' },
  { key: 'RESEND_API_KEY', label: 'Resend API Key' },
  { key: 'GEMINI_API_KEY', label: 'Gemini API Key (optional)' },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { password } = body as { password: string };

    const devKitPassword = Deno.env.get('DEV_KIT_PASSWORD');
    if (!devKitPassword || password !== devKitPassword) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const checks = REQUIRED_ENV_VARS.map(({ key, label }) => ({
      key,
      label,
      present: !!Deno.env.get(key),
    }));

    const supabaseProjectRef = Deno.env.get('SUPABASE_URL')?.match(/https:\/\/([^.]+)/)?.[1];
    const supabaseUrl = supabaseProjectRef
      ? `https://supabase.com/dashboard/project/${supabaseProjectRef}`
      : null;

    return new Response(
      JSON.stringify({ success: true, checks, supabaseUrl }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
