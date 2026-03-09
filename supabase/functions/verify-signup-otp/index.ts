/**
 * verify-signup-otp
 * ─────────────────────────────────────────────
 * Verifies a 6-digit OTP code from signup_otps table (Lovable Cloud DB),
 * confirms the user's email on the external Supabase project,
 * and returns a hashed_token for client-side session creation.
 *
 * Body: { email: string, otp: string }
 * Returns: { success: true, token_hash, action_link } or { error: string }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/** Auth client — points to the EXTERNAL Supabase project */
function getAuthClient() {
  return createClient(
    Deno.env.get('EXT_SUPABASE_URL') || Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('EXT_SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

/** DB client — points to Lovable Cloud (where signup_otps table lives) */
function getDbClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return new Response(JSON.stringify({ error: 'Email and OTP are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAuth = getAuthClient();
    const supabaseDb = getDbClient();

    // Look up valid OTP in Lovable Cloud DB
    const { data: otpRows, error: lookupError } = await supabaseDb
      .from('signup_otps')
      .select('*')
      .eq('email', email)
      .eq('otp_code', otp)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (lookupError) {
      console.error('[verify-signup-otp] Lookup error:', lookupError);
      return new Response(JSON.stringify({ error: 'Verification failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!otpRows || otpRows.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid or expired code. Please try again.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const otpRecord = otpRows[0];

    // Mark OTP as used
    await supabaseDb.from('signup_otps').update({ used: true }).eq('id', otpRecord.id);

    // Get user info via magiclink generation on the external auth project
    const { data: magicData, error: magicError } = await supabaseAuth.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (magicError) {
      console.error('[verify-signup-otp] magiclink error:', magicError);
      return new Response(JSON.stringify({ error: 'Failed to verify account' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = magicData?.user?.id;

    if (!userId) {
      console.error('[verify-signup-otp] No user ID found');
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Confirm the user's email
    const { error: updateError } = await supabaseAuth.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });

    if (updateError) {
      console.error('[verify-signup-otp] Confirm error:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to confirm email' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate a new magiclink to create a session token for the client
    const { data: sessionLink, error: sessionError } = await supabaseAuth.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (sessionError) {
      console.error('[verify-signup-otp] Session link error:', sessionError);
      return new Response(JSON.stringify({ success: true, requiresSignIn: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const actionLink = sessionLink?.properties?.action_link;
    const hashedToken = sessionLink?.properties?.hashed_token;

    console.log('[verify-signup-otp] Email confirmed for', email);

    return new Response(JSON.stringify({
      success: true,
      token_hash: hashedToken,
      action_link: actionLink,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[verify-signup-otp] Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
