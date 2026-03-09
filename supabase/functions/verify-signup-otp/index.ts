/**
 * verify-signup-otp
 * ─────────────────────────────────────────────
 * Verifies a 6-digit OTP code from signup_otps table,
 * confirms the user's email, and returns a session.
 *
 * Body: { email: string, otp: string }
 * Returns: { success: true, session: { access_token, refresh_token } } or { error: string }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

    const supabaseAdmin = createClient(
      Deno.env.get('EXT_SUPABASE_URL') || Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('EXT_SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Look up valid OTP
    const { data: otpRows, error: lookupError } = await supabaseAdmin
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
    await supabaseAdmin.from('signup_otps').update({ used: true }).eq('id', otpRecord.id);

    // Find the user by email
    const { data: userList, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });

    // Search for user by email across all users
    // listUsers doesn't support email filter directly, use a different approach
    const { data: userData, error: getUserError } = await supabaseAdmin
      .rpc('', {}) // Can't use RPC, use admin API instead
      .then(() => null)
      .catch(() => null) as any;

    // Use generateLink with magiclink to get a valid session for the user
    // First, confirm the user's email
    // We need to find the user ID first
    let userId: string | null = null;

    // Try to get user by generating a magiclink (which also gives us user info)
    const { data: magicData, error: magicError } = await supabaseAdmin.auth.admin.generateLink({
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

    userId = magicData?.user?.id;

    if (!userId) {
      console.error('[verify-signup-otp] No user ID found');
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Confirm the user's email
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });

    if (updateError) {
      console.error('[verify-signup-otp] Confirm error:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to confirm email' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate a new magiclink to create a valid session token
    const { data: sessionLink, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (sessionError) {
      console.error('[verify-signup-otp] Session link error:', sessionError);
      // User is confirmed but we can't auto-sign-in — they can sign in manually
      return new Response(JSON.stringify({ success: true, requiresSignIn: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract the token_hash from the action_link to verify OTP on the client
    const actionLink = sessionLink?.properties?.action_link;
    const hashedToken = sessionLink?.properties?.hashed_token;

    console.log('[verify-signup-otp] Email confirmed for', email);

    return new Response(JSON.stringify({
      success: true,
      // Return the hashed token so the client can use verifyOtp to get a session
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
