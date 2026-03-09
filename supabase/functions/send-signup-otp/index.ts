/**
 * send-signup-otp
 * ─────────────────────────────────────────────
 * Creates a new user via admin.generateLink, generates a 6-digit OTP,
 * stores it in signup_otps table, then sends a branded email via Resend.
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

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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

    const supabaseAdmin = createClient(
      Deno.env.get('EXT_SUPABASE_URL') || Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('EXT_SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Generate signup link — creates user and returns action_link
    let linkData: any;
    let linkError: any;

    const result = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    linkData = result.data;
    linkError = result.error;

    // If user already exists (unconfirmed), try magiclink to regenerate a token
    if (linkError && (linkError.message?.includes('already been registered') || linkError.message?.includes('already exists'))) {
      console.log('[send-signup-otp] User exists, trying magiclink fallback');
      const fallback = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email,
      });
      linkData = fallback.data;
      linkError = fallback.error;

      if (linkError) {
        console.error('[send-signup-otp] magiclink fallback error:', linkError);
        return new Response(JSON.stringify({ error: linkError.message || 'Failed to generate verification code' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else if (linkError) {
      console.error('[send-signup-otp] generateLink error:', linkError);
      return new Response(JSON.stringify({ error: linkError.message || 'Failed to create account' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const actionLink = linkData?.properties?.action_link || `${SITE_URL}/auth/confirm-email`;

    // Generate a 6-digit OTP
    const otpCode = generateOtp();

    // Delete any previous unused OTPs for this email, then insert new one
    await supabaseAdmin.from('signup_otps').delete().eq('email', email).eq('used', false);
    const { error: insertError } = await supabaseAdmin.from('signup_otps').insert({
      email,
      otp_code: otpCode,
      action_link: actionLink,
    });

    if (insertError) {
      console.error('[send-signup-otp] Failed to store OTP:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to generate verification code' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Render the branded signup email with the 6-digit OTP
    const html = await renderAsync(
      SignupEmail({
        siteName: SITE_NAME,
        siteUrl: SITE_URL,
        recipient: email,
        confirmationUrl: actionLink,
        token: otpCode,
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
        subject: `${otpCode} is your WiseResume verification code`,
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

    console.log('[send-signup-otp] 6-digit OTP email sent to', email);

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
