import { getCorsHeaders } from '../_shared/cors.ts';

/**
 * One-time setup function that patches the Clerk "supabase" JWT template
 * to include `supabaseUuid` from the user's public_metadata.
 *
 * This is required so that PostgREST can read the UUID from request.jwt.claims
 * and RLS policies (safe_uid / get_clerk_user_id) work correctly.
 */

const CLERK_TEMPLATE_NAME = 'supabase';

// The required claims the supabase template must include
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

  try {
    // 1. List all JWT templates
    const listResp = await fetch('https://api.clerk.com/v1/jwt_templates', {
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!listResp.ok) {
      const err = await listResp.text();
      return new Response(
        JSON.stringify({ error: `Clerk API error listing templates: ${err}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const templates = await listResp.json();
    const supabaseTemplate = templates.find(
      (t: { name: string }) => t.name === CLERK_TEMPLATE_NAME
    );

    if (!supabaseTemplate) {
      // Template doesn't exist — create it
      const createResp = await fetch('https://api.clerk.com/v1/jwt_templates', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: CLERK_TEMPLATE_NAME,
          claims: REQUIRED_CLAIMS,
          lifetime: 60,
          allowed_clock_skew: 5,
        }),
      });

      if (!createResp.ok) {
        const err = await createResp.text();
        return new Response(
          JSON.stringify({ error: `Failed to create template: ${err}` }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const created = await createResp.json();
      return new Response(
        JSON.stringify({ action: 'created', template: created }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Template exists — merge existing claims with required ones
    const existingClaims = supabaseTemplate.claims || {};
    const mergedClaims = { ...existingClaims, ...REQUIRED_CLAIMS };

    // Check if already patched
    const alreadyPatched =
      existingClaims.supabaseUuid === REQUIRED_CLAIMS.supabaseUuid;

    if (alreadyPatched) {
      return new Response(
        JSON.stringify({ action: 'already_patched', template: supabaseTemplate }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. PATCH the template
    const patchResp = await fetch(
      `https://api.clerk.com/v1/jwt_templates/${supabaseTemplate.id}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          claims: mergedClaims,
        }),
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
