/**
 * send-signup-otp
 * ─────────────────────────────────────────────
 * Creates a new user via admin.generateLink (which returns the OTP token
 * without sending an email), then sends a branded OTP email via Resend.
 *
 * Body: { email: string, password: string, fullName: string }
 * Returns: { success: true } or { error: string }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { renderAsync } from 'npm:@react-email/render@0.0.12';
import { SignupEmail } from '../_shared/email-templates/signup.tsx';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SITE_NAME = 'WiseResume';
const SITE_URL = 'https://thewise.cloud';
const SENDER_EMAIL = 'WiseResume <notify@thewise.cloud>';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, fullName } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create service-role client pointing to the external DB project
    const supabaseAdmin = createClient(
      Deno.env.get('EXT_SUPABASE_URL') || Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('EXT_SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Generate signup link — this creates the user and returns an OTP token
    // but does NOT send an email (we handle that ourselves)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (linkError) {
      // Check for duplicate user
      if (linkError.message?.includes('already been registered') || linkError.message?.includes('already exists')) {
        return new Response(JSON.stringify({ error: 'An account with this email already exists. Please sign in.' }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.error('[send-signup-otp] generateLink error:', linkError);
      return new Response(JSON.stringify({ error: linkError.message || 'Failed to create account' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract the OTP token from the hashed_token property
    const token = linkData?.properties?.hashed_token;
    const confirmationUrl = linkData?.properties?.action_link || `${SITE_URL}/auth/confirm-email`;

    if (!token) {
      console.error('[send-signup-otp] No token in generateLink response:', JSON.stringify(linkData?.properties));
      return new Response(JSON.stringify({ error: 'Failed to generate verification code' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Render the branded signup email with the OTP token
    const html = await renderAsync(
      SignupEmail({
        siteName: SITE_NAME,
        siteUrl: SITE_URL,
        recipient: email,
        confirmationUrl,
        token,
      })
    );

    // Send via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: SENDER_EMAIL,
        to: [email],
        subject: `${token} is your WiseResume verification code`,
        html,
      }),
    });

    const resendBody = await resendResponse.text();

    if (!resendResponse.ok) {
      console.error('[send-signup-otp] Resend error:', resendResponse.status, resendBody);
      return new Response(JSON.stringify({ error: 'Failed to send verification email' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[send-signup-otp] OTP email sent to', email);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[send-signup-otp] Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
