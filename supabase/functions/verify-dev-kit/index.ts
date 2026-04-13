import { checkUserRateLimit } from '../_shared/userRateLimiter.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function signSessionToken(email: string, secretKey: string): Promise<string> {
  const expiresAt = Date.now() + 8 * 60 * 60 * 1000;
  const payload = `${email}:${expiresAt}`;
  const keyData = new TextEncoder().encode(secretKey);
  const msgData = new TextEncoder().encode(payload);
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${btoa(payload)}.${sigHex}`;
}

/**
 * Timing-safe password comparison using HMAC.
 * Avoids relying on crypto.subtle.timingSafeEqual which is not available
 * in all Supabase Deno runtimes. Both passwords are used as HMAC keys over
 * the same fixed message; the resulting MACs are compared as hex strings.
 * An attacker cannot recover either password from the MAC output.
 */
async function timingSafePasswordEqual(a: string, b: string): Promise<boolean> {
  const fixedMessage = new TextEncoder().encode('wiseresume-devkit-auth');
  const [macA, macB] = await Promise.all([a, b].map(async (pw) => {
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(pw), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, fixedMessage);
    return Array.from(new Uint8Array(sig)).map(x => x.toString(16).padStart(2, '0')).join('');
  }));
  return macA === macB;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SECRET_PASSWORD = Deno.env.get("DEV_KIT_PASSWORD")?.trim();
    if (!SECRET_PASSWORD) {
      return new Response(
        JSON.stringify({ error: "DEV_KIT_PASSWORD secret is not configured. Set it in Supabase Dashboard → Settings → Edge Functions → Secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ADMIN_EMAILS = Deno.env.get("ADMIN_EMAILS");
    const allowed = (ADMIN_EMAILS ?? "")
      .split(",")
      .map((e: string) => e.trim().toLowerCase())
      .filter(Boolean);

    if (allowed.length === 0) {
      return new Response(
        JSON.stringify({
          error: "ADMIN_EMAILS secret is not configured. Set it in Supabase Dashboard → Settings → Edge Functions → Secrets.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerEmail = email.trim().toLowerCase();

    if (!allowed.includes(callerEmail)) {
      return new Response(
        JSON.stringify({ success: false, authorized: false, reason: "email_not_allowed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rateLimitKey = callerEmail.replace(/[^a-z0-9]/g, '_');
    const bruteForceCheck = await checkUserRateLimit(rateLimitKey, 'verify-dev-kit-password', 10, 3600);
    if (!bruteForceCheck.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many password attempts. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isValid = await timingSafePasswordEqual(password.trim(), SECRET_PASSWORD);

    if (!isValid) {
      return new Response(
        JSON.stringify({ success: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sessionToken = await signSessionToken(callerEmail, SECRET_PASSWORD);

    return new Response(
      JSON.stringify({ success: true, token: sessionToken }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error('[verify-dev-kit] error:', err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
