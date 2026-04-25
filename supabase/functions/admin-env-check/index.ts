import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

const REQUIRED_ENV_VARS: { key: string; label: string }[] = [
  { key: 'SUPABASE_URL', label: 'Supabase URL' },
  { key: 'SUPABASE_ANON_KEY', label: 'Supabase Anon Key' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', label: 'Supabase Service Role Key' },
  { key: 'DEV_KIT_PASSWORD', label: 'DevKit Password' },
  { key: 'KINDE_DOMAIN', label: 'Kinde Domain (token-exchange)' },
  { key: 'OPENROUTER_KEY_1', label: 'OpenRouter Key 1' },
  { key: 'OPENROUTER_KEY_2', label: 'OpenRouter Key 2' },
  { key: 'OPENROUTER_KEY_3', label: 'OpenRouter Key 3' },
  { key: 'GROQ_KEY_1', label: 'Groq Key 1' },
  { key: 'GROQ_KEY_2', label: 'Groq Key 2' },
  { key: 'GROQ_KEY_3', label: 'Groq Key 3' },
  { key: 'GITHUB_TOKEN', label: 'GitHub Token' },
  { key: 'GITHUB_OWNER', label: 'GitHub Owner' },
  { key: 'GITHUB_REPO', label: 'GitHub Repo' },
  { key: 'RESEND_API_KEY', label: 'Resend API Key' },
  { key: 'KINDE_WEBHOOK_SECRET', label: 'Kinde Webhook Secret (kinde-webhook instant provisioning)' },
  { key: 'KINDE_M2M_CLIENT_ID', label: 'Kinde M2M Client ID (admin-kinde-reconcile + wisehire-reset-user)' },
  { key: 'KINDE_M2M_CLIENT_SECRET', label: 'Kinde M2M Client Secret (admin-kinde-reconcile + wisehire-reset-user)' },
];

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    try {
      await requireAdminAuth(req);
    } catch (authErr) {
      if (authErr instanceof Response) return authErr;
      throw authErr;
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
