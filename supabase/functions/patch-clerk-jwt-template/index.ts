import { getCorsHeaders } from '../_shared/cors.ts';

/**
 * One-time setup function that:
 * 1. Reads the Supabase JWT secret (auto-injected by Supabase runtime)
 * 2. Patches the Clerk "supabase" JWT template to use that secret as the signing key
 * 3. Ensures the template includes supabaseUuid from public_metadata
 *
 * This ensures PostgREST can verify Clerk tokens, populating request.jwt.claims
 * so that safe_uid() and get_clerk_user_id() work correctly in RLS policies.
 */

const CLERK_TEMPLATE_NAME = 'supabase';

const REQUIRED_CLAIMS = {
  supabaseUuid: '{{user.public_metadata.supabaseUuid}}',
  role: 'authenticated',
};

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const clerkSecretKey = Deno.env.get('CLERK_SECRET_KEY');
  if (!clerkSecretKey) {
    return new Response(
      JSON.stringify({ error: 'CLERK_SECRET_KEY not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // The Supabase JWT secret stored as APP_JWT_SECRET
  const supabaseJwtSecret = Deno.env.get('APP_JWT_SECRET');
  if (!supabaseJwtSecret) {
    return new Response(
      JSON.stringify({ error: 'APP_JWT_SECRET not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // 1. List JWT templates
    const listResp = await fetch('https://api.clerk.com/v1/jwt_templates', {
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!listResp.ok) {
      const err = await listResp.text();
      return new Response(
        JSON.stringify({ error: `Clerk API list error: ${err}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const templates = await listResp.json();
    const supabaseTemplate = templates.find(
      (t: { name: string }) => t.name === CLERK_TEMPLATE_NAME
    );

    const existingClaims = supabaseTemplate?.claims || {};
    const mergedClaims = { ...existingClaims, ...REQUIRED_CLAIMS };

    const patchBody: Record<string, unknown> = {
      claims: mergedClaims,
      // Set the Supabase JWT secret as the signing key so PostgREST can verify the token
      signing_key: supabaseJwtSecret,
      signing_algorithm: 'HS256',
    };

    if (!supabaseTemplate) {
      // Create the template
      patchBody.name = CLERK_TEMPLATE_NAME;
      patchBody.lifetime = 60;
      patchBody.allowed_clock_skew = 5;

      const createResp = await fetch('https://api.clerk.com/v1/jwt_templates', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patchBody),
      });

      const created = await createResp.json();
      return new Response(
        JSON.stringify({ action: 'created', template: created }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update existing template — Clerk PATCH requires `name` to be included
    const patchResp = await fetch(
      `https://api.clerk.com/v1/jwt_templates/${supabaseTemplate.id}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...patchBody, name: CLERK_TEMPLATE_NAME }),
      }
    );

    if (!patchResp.ok) {
      const err = await patchResp.text();
      return new Response(
        JSON.stringify({ error: `Failed to patch template: ${err}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const patched = await patchResp.json();
    return new Response(
      JSON.stringify({ action: 'patched', template: patched }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('patch-clerk-jwt-template error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
