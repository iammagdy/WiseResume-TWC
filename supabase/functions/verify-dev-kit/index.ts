import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { password } = await req.json();

    if (!password) {
      return new Response(
        JSON.stringify({ error: "Password is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SECRET_PASSWORD = Deno.env.get("DEV_KIT_PASSWORD");
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

    const authHeader = req.headers.get("Authorization");
    let callerEmail: string | null = null;
    let callerId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      );
      const { data: { user } } = await supabase.auth.getUser();
      callerEmail = user?.email ?? null;
      callerId = user?.id ?? null;
    }

    if (!callerEmail || !allowed.includes(callerEmail.toLowerCase())) {
      return new Response(
        JSON.stringify({ success: false, authorized: false, reason: "email_not_allowed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (callerId) {
      const bruteForceCheck = await checkUserRateLimit(callerId, 'verify-dev-kit-password', 10, 3600);
      if (!bruteForceCheck.allowed) {
        return new Response(
          JSON.stringify({ error: "Too many password attempts. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const encoder = new TextEncoder();
    const a = encoder.encode(password.padEnd(64));
    const b = encoder.encode(SECRET_PASSWORD.padEnd(64));
    let isValid = a.length === b.length;
    try {
      isValid = isValid && await crypto.subtle.timingSafeEqual(a, b);
    } catch {
      isValid = false;
    }

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
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
