// verify-dev-kit: Issues a revocable admin DevKit session token.
// Auth: email ∈ ADMIN_EMAILS + DevKit password (DEV_KIT_PASSWORD).
// No TOTP / authenticator app required.
import { getServiceClient } from '../_shared/dbClient.ts';

import { wrapHandler } from '../_shared/fnLogger.ts';
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOCKOUT_WINDOW_SECONDS = 10 * 60;
const MAX_FAILURES = 5;
const LOCKOUT_DURATION_SECONDS = 10 * 60;
const SESSION_TTL_HOURS = 8;
const SESSION_TTL_REMEMBER_DAYS = 30;

// ---------- Session token ----------

async function signSessionToken(
  email: string,
  sessionId: string,
  expiresAt: number,
  secretKey: string,
): Promise<string> {
  const payload = `${email}:${sessionId}:${expiresAt}`;
  const keyData = new TextEncoder().encode(secretKey);
  const msgData = new TextEncoder().encode(payload);
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${btoa(payload)}.${sigHex}`;
}

async function hmacPasswordEqual(a: string, b: string): Promise<boolean> {
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

// ---------- Rate limiting ----------

async function getLockoutStatus(lockKey: string): Promise<{ locked: boolean; retry_after_seconds?: number; locked_until?: string }> {
  const supabase = getServiceClient();
  const windowStart = new Date(Date.now() - LOCKOUT_WINDOW_SECONDS * 1000).toISOString();
  const { data: failRows, error } = await supabase
    .from('rpc_rate_limits')
    .select('created_at')
    .eq('ip_address', lockKey)
    .eq('endpoint', 'devkit-login-fail')
    .gte('created_at', windowStart)
    .order('created_at', { ascending: false });

  if (error || !failRows) return { locked: false };

  if (failRows.length >= MAX_FAILURES) {
    const oldestFailInWindow = failRows[failRows.length - 1].created_at as string;
    const lockedUntil = new Date(new Date(oldestFailInWindow).getTime() + LOCKOUT_DURATION_SECONDS * 1000);
    const retryAfter = Math.max(0, Math.ceil((lockedUntil.getTime() - Date.now()) / 1000));
    if (retryAfter > 0) {
      return { locked: true, retry_after_seconds: retryAfter, locked_until: lockedUntil.toISOString() };
    }
  }
  return { locked: false };
}

async function recordFailedAttempt(lockKey: string): Promise<void> {
  const supabase = getServiceClient();
  const { error } = await supabase
    .from('rpc_rate_limits')
    .insert({ user_id: null, endpoint: 'devkit-login-fail', ip_address: lockKey });
  if (error) {
    console.error('[verify-dev-kit] recordFailedAttempt insert error:', error.message);
  }
}

function clientIp(req: Request): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.headers.get('cf-connecting-ip')
    ?? req.headers.get('x-real-ip')
    ?? null;
}

// ---------- Handler ----------

Deno.serve(wrapHandler("verify-dev-kit", async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, rememberMe } = await req.json();
    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SECRET_PASSWORD = Deno.env.get("DEV_KIT_PASSWORD")?.trim();
    if (!SECRET_PASSWORD) {
      return new Response(
        JSON.stringify({ error: "DEV_KIT_PASSWORD secret is not configured." }),
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
        JSON.stringify({ error: "ADMIN_EMAILS secret is not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerEmail = email.trim().toLowerCase();
    const lockKey = callerEmail.replace(/[^a-z0-9]/g, '_');

    const lockoutStatus = await getLockoutStatus(lockKey);
    if (lockoutStatus.locked) {
      return new Response(
        JSON.stringify({
          success: false,
          locked: true,
          retry_after_seconds: lockoutStatus.retry_after_seconds,
          locked_until: lockoutStatus.locked_until,
          error: "Too many failed attempts. Please wait before trying again.",
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!allowed.includes(callerEmail)) {
      return new Response(
        JSON.stringify({ success: false, authorized: false, reason: "email_not_allowed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isPasswordValid = await hmacPasswordEqual(password.trim(), SECRET_PASSWORD);
    if (!isPasswordValid) {
      await recordFailedAttempt(lockKey);
      const newLockoutStatus = await getLockoutStatus(lockKey);
      if (newLockoutStatus.locked) {
        return new Response(
          JSON.stringify({
            success: false,
            locked: true,
            retry_after_seconds: newLockoutStatus.retry_after_seconds,
            locked_until: newLockoutStatus.locked_until,
            error: "Too many failed attempts. Please wait before trying again.",
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ success: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mint session token. rememberMe = 30 days, otherwise 8 hours.
    const ttlMs = rememberMe
      ? SESSION_TTL_REMEMBER_DAYS * 24 * 60 * 60 * 1000
      : SESSION_TTL_HOURS * 60 * 60 * 1000;
    const expiresAtMs = Date.now() + ttlMs;

    const supabase = getServiceClient();
    const { data: inserted, error: insertErr } = await supabase
      .from('admin_sessions')
      .insert({
        email: callerEmail,
        expires_at: new Date(expiresAtMs).toISOString(),
        ip: clientIp(req),
        user_agent: req.headers.get('user-agent') ?? null,
      })
      .select('id')
      .single();

    if (insertErr || !inserted?.id) {
      console.error('[verify-dev-kit] failed to create admin_session:', insertErr);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to issue session' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sessionToken = await signSessionToken(
      callerEmail,
      inserted.id as string,
      expiresAtMs,
      SECRET_PASSWORD,
    );

    return new Response(
      JSON.stringify({ success: true, token: sessionToken, session_id: inserted.id, expires_at: expiresAtMs }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error('[verify-dev-kit] error:', err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}));
