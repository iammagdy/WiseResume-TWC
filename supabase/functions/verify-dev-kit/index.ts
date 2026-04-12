import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkUserRateLimit } from '../_shared/userRateLimiter.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Check email allowlist using caller identity from auth token (server-side only).
    // ADMIN_EMAILS must be configured — if absent or empty, fail closed to prevent
    // silent bypass when the secret is not set up in production.
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

    // Derive caller identity from auth token — never trust client-supplied identity
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

    // Per-user brute-force protection: 10 password attempts per hour per authenticated user
    if (callerId) {
      const bruteForceCheck = await checkUserRateLimit(callerId, 'verify-dev-kit-password', 10, 3600);
      if (!bruteForceCheck.allowed) {
        return new Response(
          JSON.stringify({ error: "Too many password attempts. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Constant-time comparison to eliminate timing side-channel on the password check.
    // Both strings are padded to equal length before comparison.
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

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
