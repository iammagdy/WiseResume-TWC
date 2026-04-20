/**
 * WiseResume Express Server
 *
 * Provides server-side API routes that proxy Supabase Edge Functions,
 * keeping sensitive API keys (WISE_AI_API_KEY, RESEND_API_KEY, etc.)
 * off the client. The frontend calls /api/* which this server forwards
 * to Supabase Edge Functions using the service-role key.
 *
 * Auth: Kinde JWTs are verified server-side via Kinde JWKS. The
 * token-exchange endpoint issues a short-lived signed JWT that the
 * client attaches to all subsequent API requests.
 */

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { neon } from '@neondatabase/serverless';
import { promises as dns } from 'node:dns';
import net from 'node:net';
import * as jose from 'jose';

const app = express();
const PORT = parseInt(process.env.API_PORT || '5001', 10);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(cors({
  origin: (origin, callback) => {
    // Allow Replit dev domains, localhost, and the production domain
    const allowed =
      !origin ||
      origin.startsWith('http://localhost') ||
      origin.startsWith('https://localhost') ||
      /\.replit\.dev$/.test(origin) ||
      /\.replit\.app$/.test(origin) ||
      origin === 'https://resume.thewise.cloud' ||
      origin === 'https://thewise.cloud';
    callback(null, allowed);
  },
  credentials: true,
}));

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
// These three are populated from explicit env vars at module load and then
// (if still empty) auto-fetched from the Supabase Management API at startup
// using SUPABASE_ACCESS_TOKEN. They are `let` so the bootstrap can fill them in.
let SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
let SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
let SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.EXT_SUPABASE_JWT_SECRET || '';
const DATABASE_URL = process.env.DATABASE_URL || '';
const KINDE_DOMAIN = process.env.VITE_KINDE_DOMAIN || process.env.KINDE_DOMAIN || '';
// Fallback secret used ONLY if SUPABASE_JWT_SECRET cannot be obtained. Tokens
// signed with this will not be accepted by Supabase PostgREST / Auth, so they
// are effectively dev-only.
const SESSION_SECRET = process.env.SESSION_SECRET || '';

if (!SUPABASE_URL) {
  console.warn('[server] SUPABASE_URL not set — edge function proxy will not work');
}
if (!KINDE_DOMAIN) {
  console.warn('[server] KINDE_DOMAIN not set — token-exchange will not work');
}

/**
 * Bootstrap missing Supabase secrets from the Supabase Management API using
 * SUPABASE_ACCESS_TOKEN. Without these the bridge JWT cannot be verified by
 * Supabase PostgREST or GoTrue, and every signed-in user sees 401s on
 * `from('resumes')`, the `me` edge function, etc. Idempotent: a secret that
 * is already set via env vars is left untouched.
 */
async function bootstrapSupabaseSecrets(): Promise<void> {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (!accessToken) {
    if (!SUPABASE_JWT_SECRET || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      console.warn(
        '[server] SUPABASE_ACCESS_TOKEN not set and one or more of ' +
        'SUPABASE_JWT_SECRET / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY ' +
        'is missing — Supabase-direct calls will fail for signed-in users.',
      );
    }
    return;
  }
  const refMatch = SUPABASE_URL.match(/^https?:\/\/([^.]+)\.supabase\.co/);
  const ref = refMatch?.[1];
  if (!ref) {
    console.warn('[server] Could not derive Supabase project ref from VITE_SUPABASE_URL — skipping secret bootstrap');
    return;
  }

  try {
    if (!SUPABASE_JWT_SECRET) {
      const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/postgrest`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (r.ok) {
        const j = (await r.json()) as { jwt_secret?: string };
        if (j.jwt_secret) {
          SUPABASE_JWT_SECRET = j.jwt_secret;
          console.log('[server] Loaded SUPABASE_JWT_SECRET from Management API');
        }
      } else {
        console.warn(`[server] Failed to fetch postgrest config for ${ref}: ${r.status}`);
      }
    }
    if (!SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/api-keys`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (r.ok) {
        const arr = (await r.json()) as Array<{ name?: string; api_key?: string; type?: string }>;
        for (const k of arr) {
          if (!k.api_key) continue;
          if (!SUPABASE_ANON_KEY && k.name === 'anon' && k.type === 'legacy') {
            SUPABASE_ANON_KEY = k.api_key;
            console.log('[server] Loaded SUPABASE_ANON_KEY from Management API');
          }
          if (!SUPABASE_SERVICE_ROLE_KEY && k.name === 'service_role' && k.type === 'legacy') {
            SUPABASE_SERVICE_ROLE_KEY = k.api_key;
            console.log('[server] Loaded SUPABASE_SERVICE_ROLE_KEY from Management API');
          }
        }
      } else {
        console.warn(`[server] Failed to fetch api-keys for ${ref}: ${r.status}`);
      }
    }
  } catch (err) {
    console.warn('[server] Supabase secret bootstrap failed (non-fatal):', err);
  }

  // Push managed AI provider keys (set in Replit env) into Supabase Edge
  // Function secrets so `Deno.env.get(...)` inside `_shared/aiClient.ts` sees
  // them. Idempotent — Supabase upserts by name, so re-running is a no-op
  // when the value hasn't changed. The keys checked here are exactly the
  // env names referenced by callWiseresumeAI().
  const managedAiKeys = ['OPENROUTER_API_KEY', 'OPENROUTER2_API_KEY', 'GROQ_API_KEY'] as const;
  const secretsToPush = managedAiKeys
    .map((name) => ({ name, value: process.env[name] }))
    .filter((s): s is { name: string; value: string } => typeof s.value === 'string' && s.value.length > 0);
  if (secretsToPush.length > 0) {
    try {
      const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/secrets`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(secretsToPush),
      });
      if (r.ok) {
        console.log(`[server] Pushed managed AI secrets to Supabase Edge Functions: ${secretsToPush.map(s => s.name).join(', ')}`);
      } else {
        console.warn(`[server] Failed to push managed AI secrets to Supabase (${r.status}): ${await r.text().catch(() => '')}`);
      }
    } catch (err) {
      console.warn('[server] Managed AI secret push failed (non-fatal):', err);
    }
  } else {
    // Loud warning: zero managed AI keys means every "Test AI" / managed-mode
    // request to the WiseResume edge function will throw "WiseResume AI is not
    // configured" with no other context. Surface this at boot so the operator
    // notices before users do.
    const missing = managedAiKeys.filter((k) => !process.env[k]);
    console.warn(
      `[server] No managed AI keys present in Replit env (${missing.join(', ')}). ` +
      `Test AI in WiseResume managed mode will fail with "AI is not configured" ` +
      `until at least one of these is set as a Replit Secret AND pushed to ` +
      `Supabase Edge Function secrets (this bootstrap only pushes keys that ` +
      `exist in the Replit env).`
    );
  }
}

/**
 * Idempotently create a shadow user in Supabase `auth.users` so that GoTrue's
 * `auth.getUser(token)` (used by edge function `requireAuth`) can find the
 * Kinde-derived UUID. Safe to call on every token-exchange — the underlying
 * admin endpoint returns a 422 / "already registered" error which we ignore.
 */
async function ensureSupabaseShadowUser(userId: string, email: string | null): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return false;
  /**
   * Returns true iff an `auth.users` row with id === userId is known to exist
   * after this call. Returns false on any unrecoverable failure so the caller
   * can decide whether to issue a degraded JWT or fail the exchange entirely.
   */
  const headers = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };
  const verifyExists = async (): Promise<boolean> => {
    try {
      const v = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, { headers });
      if (!v.ok) {
        const verifyBody = await v.text().catch(() => '(unreadable)');
        console.warn(`[server] shadow-user verify-exists returned ${v.status} for userId=${userId}: ${verifyBody}`);
      }
      return v.ok;
    } catch (err) {
      console.warn(`[server] shadow-user verify-exists exception for userId=${userId}:`, err);
      return false;
    }
  };
  // Classify GoTrue admin errors precisely. We treat any of these as
  // "row already exists with this id or email" and verify-by-id afterwards:
  //   - 422 / 409 with "already" / "duplicate" / "email_exists" body
  //   - 500 with Postgres 23505 (unique constraint), which GoTrue emits when
  //     the underlying users.id PK collides with a pre-existing row
  // Generic 400s (bad input) and other errors are NOT swallowed.
  const isAlreadyExistsResponse = (status: number, body: string): boolean => {
    const lower = body.toLowerCase();
    if (status === 422 || status === 409) {
      return lower.includes('already') || lower.includes('duplicate') ||
        lower.includes('user_already') || lower.includes('email_exists');
    }
    if (status === 500) {
      // Postgres unique-violation surfaced by GoTrue
      return lower.includes('23505') || lower.includes('users_pkey') ||
        lower.includes('duplicate key value') || lower.includes('users_email_partial_key');
    }
    return false;
  };

  const targetEmail = email && email.length > 0 ? email : `${userId}@kinde.placeholder`;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ id: userId, email: targetEmail, email_confirm: true }),
    });
    if (r.ok) return true;
    const body = await r.text();
    if (isAlreadyExistsResponse(r.status, body)) {
      // User-id row may already exist from a prior exchange — verify.
      if (await verifyExists()) return true;
      // Otherwise email belongs to a different uid; retry with a placeholder
      // email scoped to this uid so we never collide.
      const retryEmail = `${userId}@collision.kinde.placeholder`;
      const retry = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ id: userId, email: retryEmail, email_confirm: true }),
      });
      if (retry.ok) return true;
      const retryBody = await retry.text();
      if (isAlreadyExistsResponse(retry.status, retryBody)) {
        return await verifyExists();
      }
      console.warn(`[server] shadow-user retry failed for userId=${userId}: HTTP ${retry.status} — ${retryBody}`);
      return false;
    }
    console.warn(`[server] shadow-user create failed for userId=${userId}: HTTP ${r.status} — ${body}`);
    return false;
  } catch (err) {
    console.warn(`[server] shadow-user create exception for userId=${userId}:`, err);
    return false;
  }
}

// Neon DB connection (for direct server-side queries)
const sql = DATABASE_URL ? neon(DATABASE_URL) : null;

// ── Kinde JWKS cache ──────────────────────────────────────────────────────────
let _kindeJWKS: jose.JSONWebKeySet | null = null;
let _kindejwksCachedAt = 0;
const JWKS_CACHE_MS = 60 * 60 * 1000; // 1 hour

async function getKindeJWKS(): Promise<jose.JSONWebKeySet> {
  if (_kindeJWKS && Date.now() - _kindejwksCachedAt < JWKS_CACHE_MS) return _kindeJWKS;
  if (!KINDE_DOMAIN) throw new Error('KINDE_DOMAIN is not configured');
  const r = await fetch(`${KINDE_DOMAIN}/.well-known/jwks`);
  if (!r.ok) throw new Error(`Failed to fetch Kinde JWKS: ${r.status}`);
  _kindeJWKS = (await r.json()) as jose.JSONWebKeySet;
  _kindejwksCachedAt = Date.now();
  return _kindeJWKS;
}

/**
 * Deterministic UUID v5 (SHA-1 hash of namespace+name).
 * Used to map a Kinde `sub` claim to a stable UUID for the database.
 */
async function uuidV5(name: string, namespace: string): Promise<string> {
  const nsBytes = new Uint8Array(16);
  const hex = namespace.replace(/-/g, '');
  for (let i = 0; i < 16; i++) {
    nsBytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  const nameBytes = new TextEncoder().encode(name);
  const data = new Uint8Array(nsBytes.length + nameBytes.length);
  data.set(nsBytes);
  data.set(nameBytes, nsBytes.length);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashBytes = new Uint8Array(hashBuffer);
  hashBytes[6] = (hashBytes[6] & 0x0f) | 0x50;
  hashBytes[8] = (hashBytes[8] & 0x3f) | 0x80;
  const h = Array.from(hashBytes.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

// Fixed DNS namespace for UUID v5 (same as Supabase edge function)
const UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Database health ───────────────────────────────────────────────────────────
app.get('/api/db-health', async (_req, res) => {
  if (!sql) {
    return res.status(503).json({ error: 'DATABASE_URL not configured' });
  }
  try {
    const result = await sql`SELECT 1 as ok`;
    res.json({ status: 'ok', result });
  } catch (err) {
    res.status(503).json({ error: 'Database connection failed', detail: String(err) });
  }
});

/**
 * POST /api/fn/token-exchange
 *
 * Server-side replacement for the Supabase `token-exchange` edge function.
 * Accepts a Kinde access token, verifies it via Kinde's JWKS endpoint,
 * upserts the user's profile row in the Neon database, and returns a
 * signed session JWT that the client attaches to all subsequent API calls.
 *
 * This route is matched BEFORE the generic /api/fn/:fnName proxy so that
 * it short-circuits and never hits Supabase.
 */
app.post('/api/fn/token-exchange', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer\s+(\S+)$/);
  if (!match) {
    return res.status(401).json({ code: 'MISSING_AUTH_HEADER', message: 'Missing authorization header' });
  }
  const kindeToken = match[1];

  let kindeSub = 'unknown';
  let userId = '00000000-0000-0000-0000-000000000000';

  try {
    // 1. Verify Kinde token via JWKS
    const jwks = await getKindeJWKS();
    const keySet = jose.createLocalJWKSet(jwks);
    let payload: jose.JWTPayload;
    try {
      const result = await jose.jwtVerify(kindeToken, keySet, { issuer: KINDE_DOMAIN });
      payload = result.payload;
    } catch {
      return res.status(401).json({ code: 'INVALID_KINDE_TOKEN', message: 'Kinde token invalid or expired' });
    }

    // 2. Extract Kinde user info
    kindeSub = (payload.sub as string) || '';
    if (!kindeSub) {
      return res.status(401).json({ code: 'MISSING_SUB_CLAIM', message: 'Token missing sub claim' });
    }
    const email = ((payload as Record<string, unknown>).email as string) ||
      ((payload as Record<string, unknown>).preferred_username as string) || '';

    // 3. Derive deterministic UUID from Kinde sub (same algorithm as edge function)
    userId = await uuidV5(kindeSub, UUID_NAMESPACE);

    // 4. Upsert profile + preferences in Neon DB
    if (sql) {
      try {
        await sql`
          INSERT INTO profiles (user_id, email)
          VALUES (${userId}, ${email || null})
          ON CONFLICT (user_id) DO NOTHING
        `;
        await sql`
          INSERT INTO user_preferences (user_id)
          VALUES (${userId})
          ON CONFLICT (user_id) DO NOTHING
        `;
        // Audit log
        try {
          await sql`
            INSERT INTO token_exchanges (kinde_sub, user_id, status)
            VALUES (${kindeSub}, ${userId}, 'success')
          `;
        } catch { /* non-fatal */ }
      } catch (dbErr) {
        console.error('[token-exchange] DB upsert failed:', dbErr);
        return res.status(500).json({ code: 'PROFILE_UPSERT_FAILED', message: 'Could not create user profile' });
      }
    }

    // 5. Select signing secret: prefer SUPABASE_JWT_SECRET (accepted by both
    //    Supabase PostgREST and this server's validateSupabaseToken). Fall back
    //    to SESSION_SECRET so the app works fully when only Neon + Kinde are
    //    configured (no Supabase project required). Both secrets are verified
    //    by validateSupabaseToken in this same file.
    const signingSecret = SUPABASE_JWT_SECRET || SESSION_SECRET;
    if (!signingSecret) {
      console.error('[token-exchange] No signing secret available — set SUPABASE_JWT_SECRET or SESSION_SECRET');
      return res.status(503).json({
        code: 'SIGNING_SECRET_MISSING',
        message: 'Server is not configured with a signing secret. Set SESSION_SECRET or SUPABASE_JWT_SECRET.',
      });
    }

    // 6. When using SUPABASE_JWT_SECRET, also provision a shadow user in
    //    Supabase auth.users so PostgREST RLS and edge functions recognise the
    //    UUID. When using SESSION_SECRET only (no Supabase), skip this step —
    //    all data queries go through the Neon /api/data/* routes which use
    //    validateSupabaseToken (SESSION_SECRET path), not PostgREST.
    //
    //    If SUPABASE_SERVICE_ROLE_KEY is present the admin endpoint is reachable
    //    and we attempted shadow-user creation. A transient failure (network
    //    blip, rate-limit, etc.) is non-blocking: we issue the JWT anyway with
    //    shadow_user_ok=false so the client can degrade gracefully. Server-side
    //    Neon queries still work; only direct PostgREST/RLS calls may reject.
    //
    //    If SUPABASE_SERVICE_ROLE_KEY is absent we cannot attempt the call at
    //    all, so we return 503 — the JWT would be useless for Supabase queries
    //    and issuing it would give a false sense of success.
    let shadowUserOk = true;
    if (SUPABASE_JWT_SECRET) {
      if (!SUPABASE_SERVICE_ROLE_KEY) {
        return res.status(503).json({
          code: 'SHADOW_USER_UNAVAILABLE',
          message: 'SUPABASE_SERVICE_ROLE_KEY is not configured — cannot provision Supabase auth user.',
        });
      }
      shadowUserOk = await ensureSupabaseShadowUser(userId, email || null);
      if (!shadowUserOk) {
        console.warn(`[token-exchange] Shadow-user creation failed for userId=${userId}; issuing degraded JWT (shadow_user_ok=false). PostgREST/RLS queries may be rejected until the shadow user is provisioned.`);
      }
    }

    // 7. Sign the bridge JWT. Issuer is 'supabase' when using the Supabase
    //    secret (PostgREST requires it); 'wiseresume' otherwise so
    //    validateSupabaseToken picks the right candidate secret.
    const secret = new TextEncoder().encode(signingSecret);
    const issuer = SUPABASE_JWT_SECRET ? 'supabase' : 'wiseresume';
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 3600; // 1 hour
    const supabaseToken = await new jose.SignJWT({
      sub: userId,
      email,
      role: 'authenticated',
      aud: 'authenticated',
      iss: issuer,
      iat: now,
      exp: expiresAt,
      kinde_sub: kindeSub,
      shadow_user_ok: shadowUserOk,
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .sign(secret);

    return res.json({ supabaseToken, userId, expiresAt, kindeSub, shadowUserOk });
  } catch (err) {
    console.error('[token-exchange] Unexpected error:', err);
    if (sql) {
      try {
        await sql`
          INSERT INTO token_exchanges (kinde_sub, user_id, status, error_code)
          VALUES (${kindeSub}, ${userId}, 'error', 'INTERNAL_ERROR')
        `;
      } catch { /* ignore audit failure */ }
    }
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
  }
});

/**
 * Edge function proxy — forwards all /api/fn/* calls to Supabase Edge Functions.
 * The client's Authorization (Kinde JWT) is forwarded as-is.
 * Sensitive Supabase keys never leave the server.
 */
app.all('/api/fn/:fnName', async (req, res) => {
  const { fnName } = req.params;

  if (!SUPABASE_URL) {
    return res.status(503).json({ error: 'Supabase not configured' });
  }

  const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/${fnName}`;

  try {
    const forwardHeaders: Record<string, string> = {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': req.headers['content-type'] || 'application/json',
    };

    // Forward the user's auth token if present
    const authHeader = req.headers.authorization;
    if (authHeader) {
      forwardHeaders['Authorization'] = authHeader;
    }

    const isFormData = (req.headers['content-type'] || '').includes('multipart/form-data');

    let bodyToSend: string | Buffer | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (isFormData) {
        // Can't re-serialize FormData easily in Node — this path is handled client-side for now
        bodyToSend = undefined;
      } else {
        bodyToSend = JSON.stringify(req.body);
      }
    }

    const response = await fetch(edgeFunctionUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: bodyToSend,
    });

    // Forward response headers (content-type etc.)
    const contentType = response.headers.get('content-type') || 'application/json';
    res.status(response.status).set('Content-Type', contentType);

    const text = await response.text();
    res.send(text);
  } catch (err) {
    console.error(`[server] proxy error for ${fnName}:`, err);
    res.status(502).json({ error: 'Failed to reach edge function', detail: String(err) });
  }
});

/**
 * Return true if the given numeric IP address (v4 or v6) falls in a
 * private/loopback/link-local/ULA/reserved range. Used to harden the
 * URL-fetch proxy against SSRF after DNS resolution.
 */
function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(n => parseInt(n, 10));
    if (parts.length !== 4 || parts.some(n => Number.isNaN(n))) return true;
    const [a, b] = parts;
    if (a === 10) return true;                        // 10.0.0.0/8
    if (a === 127) return true;                       // loopback
    if (a === 0) return true;                         // 0.0.0.0/8
    if (a === 169 && b === 254) return true;          // link-local
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
    if (a === 192 && b === 168) return true;          // 192.168/16
    if (a === 100 && b >= 64 && b <= 127) return true;// CGNAT
    if (a >= 224) return true;                        // multicast + reserved
    return false;
  }
  if (net.isIPv6(ip)) {
    const v6 = ip.toLowerCase();
    if (v6 === '::' || v6 === '::1') return true;
    if (v6.startsWith('fe80:') || v6.startsWith('fe90:') ||
        v6.startsWith('fea0:') || v6.startsWith('feb0:')) return true; // link-local
    if (v6.startsWith('fc') || v6.startsWith('fd')) return true;        // ULA
    if (v6.startsWith('ff')) return true;                                // multicast
    // IPv4-mapped: ::ffff:a.b.c.d → validate embedded v4
    const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]);
    return false;
  }
  // Unparseable → treat as unsafe
  return true;
}

/**
 * Resolve a hostname via DNS and confirm ALL resolved addresses are public.
 * Blocks attacker-controlled domains that resolve to private/link-local IPs.
 * Returns the list of resolved IPs on success, or throws an Error on block.
 */
async function assertPublicHost(hostname: string): Promise<string[]> {
  // If the hostname is already a literal IP, check it directly.
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) throw new Error('blocked-private-ip');
    return [hostname];
  }
  // Reject obvious suspicious names up front.
  const lower = hostname.toLowerCase();
  if (lower === 'localhost' || lower.endsWith('.local') || lower.endsWith('.internal')) {
    throw new Error('blocked-name');
  }
  // Resolve all A/AAAA records. dns.lookup returns whatever the OS resolver
  // gives us, including DNS-rebinding first-answers — we validate every one.
  let records: { address: string; family: number }[];
  try {
    records = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error('dns-failed');
  }
  if (!records || records.length === 0) throw new Error('dns-empty');
  for (const r of records) {
    if (isPrivateIp(r.address)) throw new Error('blocked-resolved-private');
  }
  return records.map(r => r.address);
}

/**
 * Validate a session JWT issued by this server's /api/fn/token-exchange.
 * Verifies the signature locally using SESSION_SECRET — no network calls.
 * Falls back to verifying against Supabase's /auth/v1/user for tokens that
 * were issued before the migration (i.e. real Supabase JWTs still in flight).
 */
interface AuthCacheEntry { userId: string; email: string | null; expiresAt: number }
const authCache = new Map<string, AuthCacheEntry>();
const AUTH_CACHE_TTL_MS = 60_000; // 1 minute

async function validateSupabaseToken(
  token: string,
): Promise<{ userId: string; email: string | null } | null> {
  if (!token) return null;
  const now = Date.now();
  const cached = authCache.get(token);
  if (cached && cached.expiresAt > now) {
    return { userId: cached.userId, email: cached.email };
  }

  // Primary path: verify as a session JWT signed by /api/fn/token-exchange.
  // We try both signing secrets so that tokens from BEFORE the
  // SUPABASE_JWT_SECRET cutover (still in browser sessionStorage with TTL up
  // to 1h) keep working until they expire, and new tokens (signed with the
  // Supabase project secret) are accepted by both PostgREST and this server.
  const candidateSecrets: { secret: string; issuer?: string }[] = [];
  if (SUPABASE_JWT_SECRET) candidateSecrets.push({ secret: SUPABASE_JWT_SECRET });
  if (SESSION_SECRET) {
    candidateSecrets.push({ secret: SESSION_SECRET, issuer: 'wiseresume' });
    candidateSecrets.push({ secret: SESSION_SECRET });
  }
  // No hardcoded fallback: if no signing secret is configured, validation
  // skips the local-JWT path entirely and falls through to the Supabase
  // validator below. This prevents accepting tokens forged with a known
  // public string under misconfiguration.
  for (const { secret: rawSecret, issuer } of candidateSecrets) {
    const secret = new TextEncoder().encode(rawSecret);
    try {
      const { payload } = await jose.jwtVerify(token, secret, issuer ? { issuer } : undefined);
      const userId = typeof payload.sub === 'string' && payload.sub.length > 0 ? payload.sub : null;
      const email = typeof (payload as Record<string, unknown>).email === 'string'
        ? ((payload as Record<string, unknown>).email as string).toLowerCase()
        : null;
      if (userId) {
        authCache.set(token, { userId, email, expiresAt: now + AUTH_CACHE_TTL_MS });
        if (authCache.size > 2000) {
          for (const [k, v] of authCache) if (v.expiresAt <= now) authCache.delete(k);
        }
        return { userId, email };
      }
    } catch {
      // Try next candidate
    }
  }

  // Fallback: validate against Supabase for any legacy tokens still in circulation
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 5000);
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });
    if (!r.ok) return null;
    const body = (await r.json()) as { id?: unknown; email?: unknown };
    const userId = typeof body.id === 'string' && body.id.length > 0 ? body.id : null;
    const email = typeof body.email === 'string' && body.email.length > 0
      ? body.email.toLowerCase()
      : null;
    if (userId) {
      authCache.set(token, { userId, email, expiresAt: now + AUTH_CACHE_TTL_MS });
      if (authCache.size > 2000) {
        for (const [k, v] of authCache) if (v.expiresAt <= now) authCache.delete(k);
      }
      return { userId, email };
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Require a valid Supabase session token. We actually introspect the token
 * against Supabase (/auth/v1/user) rather than just checking for presence —
 * this prevents attackers sending `Bearer anything` from using the proxy.
 * On success we stash the verified user id on the request for downstream
 * rate-limit keying.
 */
interface AuthedRequest extends Request {
  verifiedUserId?: string;
  verifiedEmail?: string | null;
}
async function requireAuthHeader(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = req.headers.authorization || '';
  const match = auth.match(/^Bearer\s+(\S+)$/);
  if (!match) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const verified = await validateSupabaseToken(match[1]);
  if (!verified) {
    res.status(401).json({ error: 'Invalid or expired session' });
    return;
  }
  req.verifiedUserId = verified.userId;
  req.verifiedEmail = verified.email;
  next();
}

/**
 * In-memory token bucket keyed by VERIFIED user id + client IP. Keying on
 * the user id (not raw token) prevents token-rotation bypass — an attacker
 * cannot sidestep limits by replaying different tokens for the same user,
 * and cannot forge a different identity without a valid session.
 */
const URL_FETCH_RATE_LIMIT = { windowMs: 60_000, max: 10 };
const urlFetchHits = new Map<string, { count: number; resetAt: number }>();
function urlFetchRateLimiter(req: AuthedRequest, res: Response, next: NextFunction): void {
  const userId = req.verifiedUserId || 'anon';
  const ip = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown')
    .split(',')[0].trim();
  const key = `${userId}|${ip}`;
  const now = Date.now();
  const entry = urlFetchHits.get(key);
  if (!entry || entry.resetAt < now) {
    urlFetchHits.set(key, { count: 1, resetAt: now + URL_FETCH_RATE_LIMIT.windowMs });
    next();
    return;
  }
  if (entry.count >= URL_FETCH_RATE_LIMIT.max) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    res.setHeader('Retry-After', String(retryAfter));
    res.status(429).json({ error: 'Rate limit exceeded. Try again later.' });
    return;
  }
  entry.count += 1;
  next();
}
// Opportunistically sweep expired buckets so the map can't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of urlFetchHits) if (v.resetAt < now) urlFetchHits.delete(k);
}, 5 * 60_000).unref?.();

/**
 * POST /api/fetch-url — Fetch a public web page on the client's behalf so
 * browser CORS restrictions don't block the URL-based resume import path.
 *
 * Safety measures:
 *   - Authenticated callers only (Bearer token required)
 *   - Per-user/IP rate limit (10 req / min)
 *   - HTTP/HTTPS only
 *   - DNS resolution + IP-based block list on every hop (including redirects)
 *   - Block private / loopback / link-local / ULA / CGNAT / multicast targets
 *   - 10-second timeout
 *   - 2 MB response size cap
 *   - Only text/html, text/plain, application/xhtml+xml accepted
 */
app.post('/api/fetch-url', requireAuthHeader, urlFetchRateLimiter, async (req, res) => {
  const { url } = (req.body ?? {}) as { url?: string };
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing `url` in request body' });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return res.status(400).json({ error: 'Only http and https URLs are allowed' });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  try {
    // Manually follow redirects so we can re-validate each hop's DNS against
    // the private-IP block list. Fixes redirect-based SSRF bypass AND
    // DNS-based bypass (attacker domain → private IP).
    const MAX_REDIRECTS = 5;
    let currentUrl = parsed.toString();
    let upstream: Response | null = null;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const hopUrl = new URL(currentUrl);
      if (hopUrl.protocol !== 'http:' && hopUrl.protocol !== 'https:') {
        return res.status(400).json({ error: 'Redirect to unsupported scheme blocked' });
      }
      try {
        await assertPublicHost(hopUrl.hostname);
      } catch {
        return res.status(400).json({ error: 'Target host is not publicly reachable' });
      }
      const r = await fetch(hopUrl.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': 'WiseResume-Importer/1.0 (+https://resume.thewise.cloud)',
          Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5',
        },
      });
      if (r.status >= 300 && r.status < 400) {
        const location = r.headers.get('location');
        if (!location) {
          upstream = r;
          break;
        }
        if (hop === MAX_REDIRECTS) {
          return res.status(502).json({ error: 'Too many redirects' });
        }
        currentUrl = new URL(location, hopUrl).toString();
        continue;
      }
      upstream = r;
      break;
    }
    if (!upstream) {
      return res.status(502).json({ error: 'Failed to fetch URL' });
    }

    const contentType = upstream.headers.get('content-type') || '';
    if (!upstream.ok) {
      return res.status(502).json({ error: `Upstream responded with ${upstream.status}` });
    }
    if (!/text\/html|text\/plain|application\/xhtml/i.test(contentType)) {
      return res.status(415).json({ error: `Unsupported content-type: ${contentType || 'unknown'}` });
    }

    const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
    const reader = upstream.body?.getReader();
    if (!reader) {
      const text = await upstream.text();
      return res.json({ url: parsed.toString(), contentType, html: text.slice(0, MAX_BYTES) });
    }

    const chunks: Uint8Array[] = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        received += value.byteLength;
        if (received > MAX_BYTES) {
          try { await reader.cancel(); } catch { /* ignore */ }
          return res.status(413).json({ error: 'Response exceeds 2 MB limit' });
        }
        chunks.push(value);
      }
    }
    const buffer = Buffer.concat(chunks.map(c => Buffer.from(c)));
    const html = buffer.toString('utf-8');
    return res.json({ url: parsed.toString(), contentType, html });
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    return res.status(isAbort ? 504 : 502).json({
      error: isAbort ? 'Upstream request timed out' : 'Failed to fetch URL',
      detail: String(err),
    });
  } finally {
    clearTimeout(timeoutId);
  }
});

// ── LinkedIn profile importer ─────────────────────────────────────────────────

/**
 * Server-side LinkedIn importer config.
 *
 * Canonical provider: Proxycurl (https://nubela.co/proxycurl). Set
 * `PROXYCURL_API_KEY` to enable. Each call costs 1 credit (~$0.01) on
 * Proxycurl's pay-as-you-go tier; we surface remaining quota in the
 * response so the UI can warn before exhaustion.
 *
 * Per-user monthly cap defaults to 50 imports — adjust via
 * `LINKEDIN_IMPORT_MONTHLY_CAP`. Per-user/IP per-minute throttle is
 * enforced separately via `linkedinImportRateLimiter` below.
 */
const PROXYCURL_API_KEY = process.env.PROXYCURL_API_KEY || '';
const LINKEDIN_IMPORT_MONTHLY_CAP = parseInt(
  process.env.LINKEDIN_IMPORT_MONTHLY_CAP || '50', 10,
);

const LINKEDIN_IMPORT_RATE_LIMIT = { windowMs: 60_000, max: 5 };
const linkedinImportHits = new Map<string, { count: number; resetAt: number }>();
function linkedinImportRateLimiter(
  req: AuthedRequest, res: Response, next: NextFunction,
): void {
  const userId = req.verifiedUserId || 'anon';
  const ip = (req.headers['x-forwarded-for'] as string ||
    req.socket.remoteAddress || 'unknown').split(',')[0].trim();
  const key = `${userId}|${ip}`;
  const now = Date.now();
  const entry = linkedinImportHits.get(key);
  if (!entry || entry.resetAt < now) {
    linkedinImportHits.set(key, {
      count: 1, resetAt: now + LINKEDIN_IMPORT_RATE_LIMIT.windowMs,
    });
    next();
    return;
  }
  if (entry.count >= LINKEDIN_IMPORT_RATE_LIMIT.max) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    res.setHeader('Retry-After', String(retryAfter));
    res.status(429).json({
      error: 'rate_limited',
      message: 'Too many LinkedIn import attempts. Try again shortly.',
    });
    return;
  }
  entry.count += 1;
  next();
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of linkedinImportHits) if (v.resetAt < now) linkedinImportHits.delete(k);
}, 5 * 60_000).unref?.();

// DB-backed per-user monthly counter. Survives server restarts.
// Schema is managed via supabase/migrations/20260429000000_linkedin_import_quota.sql.
function currentMonthKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function getMonthlyUsage(userId: string): Promise<number> {
  const month = currentMonthKey();
  const rows = await sql!`
    SELECT count FROM linkedin_import_quota
    WHERE user_id = ${userId} AND month = ${month}
  `;
  return rows.length > 0 ? (rows[0].count as number) : 0;
}

async function bumpMonthlyUsage(userId: string): Promise<number> {
  const month = currentMonthKey();
  const rows = await sql!`
    INSERT INTO linkedin_import_quota (user_id, month, count)
    VALUES (${userId}, ${month}, 1)
    ON CONFLICT (user_id, month)
    DO UPDATE SET count = linkedin_import_quota.count + 1
    RETURNING count
  `;
  return rows.length > 0 ? (rows[0].count as number) : 1;
}

/**
 * Normalize a Proxycurl person profile into the shape the onboarding
 * importer expects (matches `Partial<ProfileData>` on the client). Only
 * extracts what we explicitly need; ignores fields not surfaced in the UI.
 */
interface ProxycurlExperience {
  title?: string; company?: string; location?: string;
  description?: string;
  starts_at?: { day?: number; month?: number; year?: number } | null;
  ends_at?: { day?: number; month?: number; year?: number } | null;
}
interface ProxycurlEducation {
  school?: string; degree_name?: string; field_of_study?: string;
  description?: string;
  starts_at?: { year?: number } | null;
  ends_at?: { year?: number } | null;
}
interface ProxycurlCertification {
  name?: string; authority?: string;
  starts_at?: { month?: number; year?: number } | null;
}
interface ProxycurlLanguage { name?: string; proficiency?: string }
interface ProxycurlVolunteer {
  title?: string; company?: string; description?: string;
  starts_at?: { month?: number; year?: number } | null;
  ends_at?: { month?: number; year?: number } | null;
}
interface ProxycurlProject { title?: string; description?: string; url?: string }
interface ProxycurlPersonProfile {
  full_name?: string; first_name?: string; last_name?: string;
  headline?: string; summary?: string;
  city?: string; state?: string; country_full_name?: string;
  experiences?: ProxycurlExperience[];
  education?: ProxycurlEducation[];
  skills?: string[];
  certifications?: ProxycurlCertification[];
  languages_and_proficiencies?: ProxycurlLanguage[];
  volunteer_work?: ProxycurlVolunteer[];
  accomplishment_projects?: ProxycurlProject[];
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(d?: { month?: number; year?: number } | null): string {
  if (!d || !d.year) return '';
  const m = d.month && d.month >= 1 && d.month <= 12 ? `${MONTHS[d.month - 1]} ` : '';
  return `${m}${d.year}`;
}

function normalizeProxycurl(p: ProxycurlPersonProfile) {
  const fullName = p.full_name ||
    [p.first_name, p.last_name].filter(Boolean).join(' ') || undefined;
  const location = [p.city, p.state, p.country_full_name].filter(Boolean).join(', ') || undefined;
  const today = new Date();
  const isCurrent = (e: { year?: number; month?: number } | null | undefined): boolean => {
    if (!e || !e.year) return true;
    if (e.year > today.getUTCFullYear()) return true;
    if (e.year === today.getUTCFullYear() && (e.month ?? 12) >= today.getUTCMonth() + 1) return true;
    return false;
  };

  return {
    fullName,
    headline: p.headline || undefined,
    location,
    summary: p.summary || undefined,
    experience: (p.experiences || []).map(e => ({
      title: e.title || '',
      company: e.company || '',
      location: e.location || '',
      startDate: fmtDate(e.starts_at),
      endDate: e.ends_at ? fmtDate(e.ends_at) : '',
      current: !e.ends_at && isCurrent(e.starts_at),
      description: e.description || '',
    })),
    education: (p.education || []).map(e => ({
      institution: e.school || '',
      degree: e.degree_name || '',
      field: e.field_of_study || '',
      startYear: e.starts_at?.year ? String(e.starts_at.year) : '',
      endYear: e.ends_at?.year ? String(e.ends_at.year) : '',
      description: e.description || '',
    })),
    skills: p.skills || [],
    certifications: (p.certifications || []).map(c => ({
      name: c.name || '', organization: c.authority || '', date: fmtDate(c.starts_at),
    })),
    languages: (p.languages_and_proficiencies || []).map(l => ({
      language: l.name || '', proficiency: l.proficiency || '',
    })),
    projects: (p.accomplishment_projects || []).map(pr => ({
      name: pr.title || '', description: pr.description || '', url: pr.url,
    })),
    volunteering: (p.volunteer_work || []).map(v => ({
      role: v.title || '', organization: v.company || '',
      startDate: fmtDate(v.starts_at), endDate: fmtDate(v.ends_at),
      description: v.description || '',
    })),
  };
}

/**
 * POST /api/linkedin-profile — Server-side LinkedIn profile importer.
 *
 * Body: `{ url: "https://www.linkedin.com/in/<slug>" }`
 *
 * Responses:
 *   200 { provider, profile, quota: { used, cap, remaining } }
 *   400 invalid URL
 *   401 auth required
 *   402 monthly quota exhausted (per-user cap)
 *   429 per-minute rate limit hit (Retry-After header set)
 *   503 importer not configured (PROXYCURL_API_KEY missing) — frontend
 *       should fall back to its OG-meta best-effort path.
 *   502 upstream provider failed
 *   504 upstream provider timed out
 */
app.post('/api/linkedin-profile', requireAuthHeader, linkedinImportRateLimiter,
  async (req: AuthedRequest, res) => {
    if (!PROXYCURL_API_KEY) {
      return res.status(503).json({
        error: 'not_configured',
        message: 'LinkedIn importer is not configured on this deployment.',
      });
    }
    if (!sql) {
      return res.status(503).json({
        error: 'not_configured',
        message: 'LinkedIn importer quota service is unavailable (database not configured).',
      });
    }

    const { url } = (req.body ?? {}) as { url?: string };
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'bad_request', message: 'Missing `url` in body.' });
    }
    let parsed: URL;
    try {
      parsed = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    } catch {
      return res.status(400).json({ error: 'bad_request', message: 'Invalid URL.' });
    }
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (host !== 'linkedin.com' && !host.endsWith('.linkedin.com')) {
      return res.status(400).json({
        error: 'bad_request', message: 'Only linkedin.com profile URLs are supported.',
      });
    }
    if (!/^\/in\/[^/]+\/?$/i.test(parsed.pathname)) {
      return res.status(400).json({
        error: 'bad_request',
        message: 'Use a public LinkedIn profile URL like linkedin.com/in/yourname.',
      });
    }

    const userId = req.verifiedUserId!;
    const used = await getMonthlyUsage(userId);
    if (used >= LINKEDIN_IMPORT_MONTHLY_CAP) {
      return res.status(402).json({
        error: 'quota_exhausted',
        message: `Monthly LinkedIn import limit reached (${LINKEDIN_IMPORT_MONTHLY_CAP}). Try again next month or paste your profile manually.`,
        quota: { used, cap: LINKEDIN_IMPORT_MONTHLY_CAP, remaining: 0 },
      });
    }

    const apiUrl = new URL('https://nubela.co/proxycurl/api/v2/linkedin');
    apiUrl.searchParams.set('linkedin_profile_url', `https://${host}${parsed.pathname.replace(/\/$/, '')}`);
    apiUrl.searchParams.set('use_cache', 'if-present');
    apiUrl.searchParams.set('fallback_to_cache', 'on-error');

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 25_000);
    try {
      const upstream = await fetch(apiUrl.toString(), {
        headers: { Authorization: `Bearer ${PROXYCURL_API_KEY}` },
        signal: controller.signal,
      });

      if (upstream.status === 401 || upstream.status === 403) {
        console.error('[linkedin-profile] proxycurl auth failed:', upstream.status);
        return res.status(503).json({
          error: 'provider_auth_failed',
          message: 'LinkedIn importer credentials are invalid. Falling back to manual paste.',
        });
      }
      if (upstream.status === 404) {
        return res.status(404).json({
          error: 'not_found',
          message: 'That LinkedIn profile could not be found or is private.',
        });
      }
      if (upstream.status === 429) {
        const retryAfter = upstream.headers.get('retry-after') || '60';
        res.setHeader('Retry-After', retryAfter);
        return res.status(429).json({
          error: 'provider_rate_limited',
          message: 'LinkedIn importer is throttled upstream. Try again in a moment.',
        });
      }
      if (!upstream.ok) {
        const detail = await upstream.text().catch(() => '');
        console.error('[linkedin-profile] proxycurl error', upstream.status, detail.slice(0, 500));
        return res.status(502).json({
          error: 'upstream_error',
          message: `LinkedIn importer failed (status ${upstream.status}).`,
        });
      }

      const body = (await upstream.json()) as ProxycurlPersonProfile;
      const profile = normalizeProxycurl(body);

      // Bump quota only on a successful, billable response.
      const newUsed = await bumpMonthlyUsage(userId);
      const remaining = Math.max(0, LINKEDIN_IMPORT_MONTHLY_CAP - newUsed);
      // Surface upstream credit balance when Proxycurl returns it.
      const creditBalance = upstream.headers.get('x-credit-balance');

      return res.json({
        provider: 'proxycurl',
        profile,
        quota: { used: newUsed, cap: LINKEDIN_IMPORT_MONTHLY_CAP, remaining },
        providerCreditBalance: creditBalance ? Number(creditBalance) : null,
      });
    } catch (err: unknown) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      console.error('[linkedin-profile] fetch failed:', err);
      return res.status(isAbort ? 504 : 502).json({
        error: isAbort ? 'upstream_timeout' : 'upstream_error',
        message: isAbort
          ? 'LinkedIn importer timed out. Try again or paste your profile manually.'
          : 'Could not reach LinkedIn importer. Try again or paste your profile manually.',
      });
    } finally {
      clearTimeout(t);
    }
  },
);

// ── Direct DB routes (server-side, no Supabase needed) ────────────────────────

/**
 * GET /api/plan/:userId — Get the effective plan for a user directly from Neon DB.
 * Only callable from server-side contexts with DATABASE_URL.
 */
app.get('/api/plan/:userId', async (req, res) => {
  if (!sql) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { userId } = req.params;
    const rows = await sql`
      SELECT plan_name, status, trial_plan, trial_expires_at
      FROM subscriptions
      WHERE user_id = ${userId}
      LIMIT 1
    `;
    if (rows.length === 0) return res.json({ plan: 'free' });
    const sub = rows[0];
    let effectivePlan = sub.plan_name || 'free';
    if (sub.trial_plan && sub.trial_expires_at) {
      if (new Date(sub.trial_expires_at as string) > new Date()) {
        effectivePlan = sub.trial_plan as string;
      }
    }
    res.json({ plan: effectivePlan, status: sub.status });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── Data API (replaces direct supabase.from() calls in src/hooks + src/pages) ─
//
// Every endpoint below is gated by `requireAuthHeader`, which validates the
// caller's session JWT against `SESSION_SECRET` — Supabase is never contacted.
// Together these endpoints cover the read/write surface area that used to be
// served by Supabase PostgREST through `src/integrations/supabase/safeClient`,
// so the browser no longer depends on `SUPABASE_JWT_SECRET` for normal data
// reads.
//
// Several tables referenced by the legacy hooks are not yet present in the
// Neon schema (`notifications`, `jobs`, `resume_shares`, `push_subscriptions`,
// `short_links`, `tailor_history`, `talent_pool_views`,
// `wisehire_bulk_screen_jobs`, `wisehire_candidate_briefs`,
// `wisehire_roles`). Those endpoints intentionally return empty results /
// no-op success responses so the UI continues to work. They're stubbed in
// one place, easy to wire to real tables later.

interface NeonRow { [k: string]: unknown }
async function tableExists(name: string): Promise<boolean> {
  if (!sql) return false;
  try {
    const rows = await sql`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${name}
      LIMIT 1
    ` as NeonRow[];
    return rows.length > 0;
  } catch {
    return false;
  }
}

const tableExistsCache = new Map<string, { value: boolean; expiresAt: number }>();
async function tableExistsCached(name: string): Promise<boolean> {
  const now = Date.now();
  const hit = tableExistsCache.get(name);
  if (hit && hit.expiresAt > now) return hit.value;
  const value = await tableExists(name);
  tableExistsCache.set(name, { value, expiresAt: now + 5 * 60_000 });
  return value;
}

function dataErr(res: Response, err: unknown): Response {
  console.error('[data-api] error:', err);
  return res.status(500).json({ error: 'Internal server error' });
}

// ── /api/data/profile ──────────────────────────────────────────────────────────
app.get('/api/data/profile', requireAuthHeader, async (req: AuthedRequest, res) => {
  if (!sql) return res.status(503).json({ error: 'Database not configured' });
  try {
    const userId = req.verifiedUserId!;
    const rows = await sql`
      SELECT * FROM profiles WHERE user_id = ${userId} LIMIT 1
    ` as NeonRow[];
    res.json({ profile: rows[0] ?? null });
  } catch (err) {
    return dataErr(res, err);
  }
});

// Allow-list of profile columns we'll let the client write through. Limits
// blast radius if request shape ever drifts; unknown columns are dropped.
const PROFILE_WRITABLE_COLUMNS = new Set([
  'full_name', 'avatar_url', 'username', 'account_type', 'portfolio_enabled',
  'portfolio_slug',
  // Extended columns the client expects; written only when the column exists.
  'job_title', 'industry', 'career_level', 'location', 'linkedin_url',
  'profile_completed', 'portfolio_bio', 'portfolio_resume_id', 'github_url',
  'website_url', 'twitter_url', 'contact_email', 'portfolio_theme',
  'phone_number', 'portfolio_sections', 'portfolio_meta_title',
  'portfolio_meta_description', 'portfolio_style', 'portfolio_layout',
  'portfolio_accent_color', 'portfolio_font', 'open_to_work',
  'availability_headline', 'portfolio_extras', 'portfolio_sync_mode',
  'login_streak', 'last_login_date', 'digest_enabled', 'hired_at',
  'portfolio_draft', 'portfolio_draft_saved_at', 'onboarding_completed',
]);

let _profileColumnsCache: Set<string> | null = null;
async function getProfileColumns(): Promise<Set<string>> {
  if (_profileColumnsCache) return _profileColumnsCache;
  if (!sql) return new Set();
  const rows = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles'
  ` as NeonRow[];
  _profileColumnsCache = new Set(rows.map(r => String(r.column_name)));
  return _profileColumnsCache;
}

app.patch('/api/data/profile', requireAuthHeader, async (req: AuthedRequest, res) => {
  if (!sql) return res.status(503).json({ error: 'Database not configured' });
  try {
    const userId = req.verifiedUserId!;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const cols = await getProfileColumns();

    // Filter to writable + actually-present columns. Unknown / missing
    // columns are silently dropped so a client referencing a not-yet-
    // migrated column doesn't break the whole request.
    const updates: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (PROFILE_WRITABLE_COLUMNS.has(k) && cols.has(k)) updates[k] = v;
    }

    // Always upsert by user_id. Build the column/value lists dynamically.
    const colNames = Object.keys(updates);
    const params: unknown[] = [userId];
    const insertCols = ['user_id', ...colNames];
    const insertVals = ['$1', ...colNames.map((_, i) => `$${i + 2}`)];
    for (const c of colNames) params.push(updates[c]);

    const setClause = colNames.length
      ? colNames.map((c, i) => `${c} = $${i + 2}`).join(', ')
      : 'user_id = $1';
    const queryText = `
      INSERT INTO profiles (${insertCols.join(', ')})
      VALUES (${insertVals.join(', ')})
      ON CONFLICT (user_id) DO UPDATE SET ${setClause}
      RETURNING *
    `;
    const rows = (await sql.query(queryText, params)) as NeonRow[];
    res.json({ profile: rows[0] ?? null });
  } catch (err) {
    return dataErr(res, err);
  }
});

// ── /api/data/portfolios/me ────────────────────────────────────────────────────
app.get('/api/data/portfolios/me', requireAuthHeader, async (req: AuthedRequest, res) => {
  if (!sql) return res.status(503).json({ error: 'Database not configured' });
  try {
    const rows = await sql`
      SELECT id, username FROM portfolios WHERE user_id = ${req.verifiedUserId!} LIMIT 1
    ` as NeonRow[];
    res.json({ portfolio: rows[0] ?? null });
  } catch (err) {
    return dataErr(res, err);
  }
});

// ── /api/data/activity-rows ────────────────────────────────────────────────────
// Returns the date-stamp arrays needed by useActivityStreak in a single round
// trip. `since` is an ISO timestamp; rows older than that are excluded.
app.get('/api/data/activity-rows', requireAuthHeader, async (req: AuthedRequest, res) => {
  if (!sql) return res.status(503).json({ error: 'Database not configured' });
  try {
    const userId = req.verifiedUserId!;
    const sinceRaw = typeof req.query.since === 'string' ? req.query.since : '';
    const since = sinceRaw && !Number.isNaN(new Date(sinceRaw).getTime())
      ? new Date(sinceRaw).toISOString()
      : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const [resumes, apps, covers] = await Promise.all([
      sql`SELECT created_at FROM resumes WHERE user_id = ${userId} AND created_at >= ${since}` as Promise<NeonRow[]>,
      sql`SELECT applied_at, status FROM job_applications WHERE user_id = ${userId} AND applied_at >= ${since}` as Promise<NeonRow[]>,
      sql`SELECT created_at FROM cover_letters WHERE user_id = ${userId} AND created_at >= ${since}` as Promise<NeonRow[]>,
    ]);
    res.json({
      resumes,
      jobApplications: apps,
      coverLetters: covers,
      tailorHistory: [], // table not present in current schema
    });
  } catch (err) {
    return dataErr(res, err);
  }
});

// ── /api/data/job-activity-rows ────────────────────────────────────────────────
// Backs useJobActivityStats. Returns minimal columns so the client can
// aggregate. `parent_resume_id` doesn't exist on the current schema, so we
// always report it as null; tailor_history is an empty array.
app.get('/api/data/job-activity-rows', requireAuthHeader, async (req: AuthedRequest, res) => {
  if (!sql) return res.status(503).json({ error: 'Database not configured' });
  try {
    const userId = req.verifiedUserId!;
    const [resumes, covers, apps] = await Promise.all([
      sql`SELECT id FROM resumes WHERE user_id = ${userId}` as Promise<NeonRow[]>,
      sql`SELECT id FROM cover_letters WHERE user_id = ${userId}` as Promise<NeonRow[]>,
      sql`SELECT status, applied_at FROM job_applications WHERE user_id = ${userId}` as Promise<NeonRow[]>,
    ]);
    res.json({
      resumes: resumes.map((r) => ({ parent_resume_id: null, ...r })),
      coverLetters: covers,
      jobApplications: apps,
      tailorHistory: [],
    });
  } catch (err) {
    return dataErr(res, err);
  }
});

// ── /api/data/resumes ──────────────────────────────────────────────────────────
// Limited-purpose insert used by useGuestMigration and DashboardPage's
// "create resume from LinkedIn" path. The client passes the rich resume
// payload; we only persist columns that exist on the current Neon schema.
app.post('/api/data/resumes', requireAuthHeader, async (req: AuthedRequest, res) => {
  if (!sql) return res.status(503).json({ error: 'Database not configured' });
  try {
    const userId = req.verifiedUserId!;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const title = typeof body.title === 'string' && body.title ? body.title : 'My Resume';
    const templateId = typeof body.template_id === 'string' ? body.template_id : 'modern';
    // Pack everything else into `content` since the schema is jsonb-centric.
    const { title: _t, template_id: _tid, user_id: _uid, ...rest } = body;
    void _t; void _tid; void _uid;
    const content = rest;
    const rows = await sql`
      INSERT INTO resumes (user_id, title, content, template_id)
      VALUES (${userId}, ${title}, ${JSON.stringify(content)}::jsonb, ${templateId})
      RETURNING *
    ` as NeonRow[];
    res.json({ resume: rows[0] ?? null });
  } catch (err) {
    return dataErr(res, err);
  }
});

app.get('/api/data/resumes/exists/:id', requireAuthHeader, async (req: AuthedRequest, res) => {
  if (!sql) return res.status(503).json({ error: 'Database not configured' });
  try {
    const id = req.params.id;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return res.json({ exists: false });
    const rows = await sql`
      SELECT id FROM resumes WHERE id = ${id} AND user_id = ${req.verifiedUserId!} LIMIT 1
    ` as NeonRow[];
    res.json({ exists: rows.length > 0 });
  } catch (err) {
    return dataErr(res, err);
  }
});

// ── /api/data/hr-analytics ─────────────────────────────────────────────────────
// Aggregator for useHRAnalytics. Only consults tables that currently exist;
// returns 0/empty for the rest so the UI degrades gracefully.
app.get('/api/data/hr-analytics', requireAuthHeader, async (req: AuthedRequest, res) => {
  if (!sql) return res.status(503).json({ error: 'Database not configured' });
  try {
    const userId = req.verifiedUserId!;
    const rangeRaw = typeof req.query.range === 'string' ? req.query.range : 'all';
    let since: string | null = null;
    if (rangeRaw !== 'all') {
      const d = new Date();
      if (rangeRaw === 'week') d.setDate(d.getDate() - 7);
      else if (rangeRaw === 'month') d.setDate(d.getDate() - 30);
      else if (rangeRaw === 'quarter') d.setDate(d.getDate() - 90);
      since = d.toISOString();
    }

    const candidatesRows = since
      ? await sql`SELECT id, pipeline_stage, resume_text, created_at FROM wisehire_candidates WHERE owner_id = ${userId} AND created_at >= ${since}`
      : await sql`SELECT id, pipeline_stage, resume_text, created_at FROM wisehire_candidates WHERE owner_id = ${userId}`;
    const eventsRows = since
      ? await sql`SELECT candidate_id, from_stage, to_stage, moved_at as created_at FROM wisehire_pipeline_events WHERE owner_id = ${userId} AND moved_at >= ${since} ORDER BY moved_at ASC`
      : await sql`SELECT candidate_id, from_stage, to_stage, moved_at as created_at FROM wisehire_pipeline_events WHERE owner_id = ${userId} ORDER BY moved_at ASC`;
    const companyRows = await sql`SELECT id FROM wisehire_companies WHERE owner_id = ${userId} LIMIT 1`;

    res.json({
      candidates: candidatesRows,
      pipelineEvents: eventsRows,
      companyId: (companyRows[0] as NeonRow | undefined)?.id ?? null,
      // Tables not yet in the Neon schema:
      bulkJobs: [],
      briefs: [],
      roles: [],
      talentViews: [],
    });
  } catch (err) {
    return dataErr(res, err);
  }
});

// ── /api/data/notifications ────────────────────────────────────────────────────
// `notifications` table doesn't exist in the current Neon schema — return
// empty/no-op so the UI keeps working until it's added.
app.get('/api/data/notifications', requireAuthHeader, async (_req, res) => {
  if (await tableExistsCached('notifications')) {
    try {
      const rows = await sql!`
        SELECT * FROM notifications WHERE user_id = ${(_req as AuthedRequest).verifiedUserId!}
        ORDER BY created_at DESC
      ` as NeonRow[];
      return res.json({ notifications: rows });
    } catch (err) { return dataErr(res, err); }
  }
  res.json({ notifications: [] });
});
app.get('/api/data/notifications/unread-count', requireAuthHeader, async (_req, res) => {
  res.json({ count: 0 });
});
app.post('/api/data/notifications/mark-read', requireAuthHeader, async (_req, res) => {
  res.json({ ok: true });
});
app.post('/api/data/notifications/mark-all-read', requireAuthHeader, async (_req, res) => {
  res.json({ ok: true });
});
app.delete('/api/data/notifications/:id', requireAuthHeader, async (_req, res) => {
  res.json({ ok: true });
});
app.delete('/api/data/notifications', requireAuthHeader, async (_req, res) => {
  res.json({ ok: true });
});

// ── /api/data/jobs ─────────────────────────────────────────────────────────────
// `jobs` table absent — saved-jobs feature degrades to client-only state.
app.get('/api/data/jobs', requireAuthHeader, async (_req, res) => {
  res.json({ jobs: [] });
});
app.get('/api/data/jobs/:id', requireAuthHeader, async (_req, res) => {
  res.json({ job: null });
});
app.post('/api/data/jobs', requireAuthHeader, async (req, res) => {
  // Echo back the input with a synthesised id so the client can stitch it
  // into its cache. Persisted state will return when the table is added.
  const id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? (crypto as { randomUUID: () => string }).randomUUID()
    : `${Date.now()}-${Math.random()}`;
  res.json({ job: { id, ...(req.body ?? {}) } });
});
app.patch('/api/data/jobs/:id', requireAuthHeader, async (req, res) => {
  res.json({ job: { id: req.params.id, ...(req.body ?? {}) } });
});
app.delete('/api/data/jobs/:id', requireAuthHeader, async (_req, res) => {
  res.json({ ok: true });
});

// ── /api/data/resume-shares ────────────────────────────────────────────────────
app.get('/api/data/resume-shares', requireAuthHeader, async (_req, res) => {
  res.json({ shares: [] });
});
app.post('/api/data/resume-shares', requireAuthHeader, async (req, res) => {
  const id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? (crypto as { randomUUID: () => string }).randomUUID()
    : `${Date.now()}-${Math.random()}`;
  res.json({ share: { id, ...(req.body ?? {}) } });
});
app.patch('/api/data/resume-shares/:id', requireAuthHeader, async (req, res) => {
  res.json({ share: { id: req.params.id, ...(req.body ?? {}) } });
});
app.delete('/api/data/resume-shares/:id', requireAuthHeader, async (_req, res) => {
  res.json({ ok: true });
});

// ── /api/data/push-subscriptions ───────────────────────────────────────────────
app.post('/api/data/push-subscriptions', requireAuthHeader, async (_req, res) => {
  res.json({ ok: true });
});
app.delete('/api/data/push-subscriptions', requireAuthHeader, async (_req, res) => {
  res.json({ ok: true });
});

// ── /api/data/short-links ──────────────────────────────────────────────────────
// `short_links` doesn't exist; `portfolio_short_links` is unrelated. Stub for
// now so the portfolio analytics page renders the empty state.
app.get('/api/data/short-links', requireAuthHeader, async (_req, res) => {
  res.json({ links: [] });
});
app.post('/api/data/short-links', requireAuthHeader, async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const id = typeof body.id === 'string'
    ? body.id
    : Math.random().toString(36).slice(2, 7);
  res.json({ link: { id, click_count: 0, created_at: new Date().toISOString(), ...body } });
});
app.delete('/api/data/short-links/:id', requireAuthHeader, async (_req, res) => {
  res.json({ ok: true });
});

// ── /api/data/portfolio-analytics ──────────────────────────────────────────────
// Was `supabase.rpc('get_portfolio_analytics', …)`. Until the RPC is ported,
// return an empty summary so the page renders.
app.get('/api/data/portfolio-analytics', requireAuthHeader, async (_req, res) => {
  res.json({
    visits: [],
    summary: {
      total_visits: 0,
      unique_countries: 0,
      avg_time_seconds: null,
      avg_time_variant_a: null,
      avg_time_variant_b: null,
      visits_variant_a: 0,
      visits_variant_b: 0,
    },
  });
});

// ── Analytics retention sweeper (Phase 5) ─────────────────────────────────────
//
// Once per day, prune rows older than the per-table retention window from
// `portfolio_visits`, `error_log`, and `audit_logs`. The actual delete loop
// lives in the Postgres RPC `sweep_analytics_retention(...)` (see migration
// 20260425000000_analytics_retention.sql) so the work happens in batches of
// 10k rows server-side and we never hold a long transaction from Node.
//
// Retention windows are env-tunable:
//   PORTFOLIO_VISITS_RETENTION_DAYS (default 90)
//   ERROR_LOG_RETENTION_DAYS        (default 30)
//   AUDIT_LOGS_RETENTION_DAYS       (default 365)
//
// Disable entirely by setting ANALYTICS_SWEEP_ENABLED=false (e.g. in CI).

interface SweepResult {
  ran_at: string;
  portfolio_visits_cutoff: string;
  error_log_cutoff: string;
  audit_logs_cutoff: string;
  admin_audit_log_cutoff: string;
  portfolio_visits_deleted: number;
  error_log_deleted: number;
  audit_logs_deleted: number;
  trial_resumes_deleted: number;
  admin_audit_log_deleted: number;
}
interface SweepStatus {
  lastRanAt: string | null;
  lastDurationMs: number | null;
  lastResult: SweepResult | null;
  lastError: string | null;
  nextScheduledAt: string | null;
  config: {
    enabled: boolean;
    portfolioVisitsRetentionDays: number;
    errorLogRetentionDays: number;
    auditLogsRetentionDays: number;
    adminAuditLogRetentionDays: number;
    intervalMs: number;
  };
}

const ANALYTICS_SWEEP_ENABLED =
  (process.env.ANALYTICS_SWEEP_ENABLED || 'true').toLowerCase() !== 'false';
function parseRetentionDays(envName: string, fallback: number): number {
  const raw = process.env[envName];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    console.warn(
      `[analytics-sweep] invalid ${envName}=${raw} — falling back to ${fallback}`,
    );
    return fallback;
  }
  return n;
}
const PORTFOLIO_VISITS_RETENTION_DAYS =
  parseRetentionDays('PORTFOLIO_VISITS_RETENTION_DAYS', 90);
const ERROR_LOG_RETENTION_DAYS =
  parseRetentionDays('ERROR_LOG_RETENTION_DAYS', 30);
const AUDIT_LOGS_RETENTION_DAYS =
  parseRetentionDays('AUDIT_LOGS_RETENTION_DAYS', 365);
// Task #10 / Step 2: retention for the DevKit's `admin_audit_log` table.
// Default 365d so admin actions are retained for at least a year, matching
// the existing `audit_logs` retention. Tunable via env without a migration.
const ADMIN_AUDIT_LOG_RETENTION_DAYS =
  parseRetentionDays('ADMIN_AUDIT_LOG_RETENTION_DAYS', 365);
const ANALYTICS_SWEEP_BATCH_SIZE = 10000;
// Per-table cap on batch iterations so a runaway loop can't dominate
// the connection forever. 1000 batches × 10k rows = 10M rows/table/run,
// far above any realistic backlog.
const ANALYTICS_SWEEP_MAX_BATCHES_PER_TABLE = 1000;
// Lock TTL for the cross-instance sweep mutex. Sized comfortably above the
// expected sweep duration so a healthy run never times out, but short enough
// that a crashed holder is recovered before the next daily run.
const ANALYTICS_SWEEP_LOCK_TTL_MS = 30 * 60 * 1000; // 30 minutes
// Stable per-process holder id used to release only locks we own.
const ANALYTICS_SWEEP_HOLDER_ID = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const ANALYTICS_SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h
// Wait a few minutes after boot before the first sweep so we don't
// pile work onto a cold start; subsequent runs are 24h apart.
const ANALYTICS_SWEEP_INITIAL_DELAY_MS = 5 * 60 * 1000;

const sweepStatus: SweepStatus = {
  lastRanAt: null,
  lastDurationMs: null,
  lastResult: null,
  lastError: null,
  nextScheduledAt: null,
  config: {
    enabled: ANALYTICS_SWEEP_ENABLED,
    portfolioVisitsRetentionDays: PORTFOLIO_VISITS_RETENTION_DAYS,
    errorLogRetentionDays: ERROR_LOG_RETENTION_DAYS,
    auditLogsRetentionDays: AUDIT_LOGS_RETENTION_DAYS,
    adminAuditLogRetentionDays: ADMIN_AUDIT_LOG_RETENTION_DAYS,
    intervalMs: ANALYTICS_SWEEP_INTERVAL_MS,
  },
};

/**
 * Sweep one analytics table by repeatedly invoking the single-batch RPC.
 * Each RPC call runs in its own transaction (because PL/pgSQL's outer
 * loop and `GET DIAGNOSTICS` would otherwise hold a single long
 * transaction for the whole table). When the RPC returns fewer rows
 * than the batch size, we know the backlog is drained.
 */
async function sweepOneTable(
  table: 'portfolio_visits' | 'error_log' | 'audit_logs',
  days: number,
): Promise<number> {
  if (!sql) return 0;
  let total = 0;
  for (let i = 0; i < ANALYTICS_SWEEP_MAX_BATCHES_PER_TABLE; i++) {
    const rows = await sql`
      SELECT public.sweep_analytics_retention_batch(
        ${table}::text,
        ${days}::int,
        ${ANALYTICS_SWEEP_BATCH_SIZE}::int
      ) AS deleted
    `;
    const deleted = Number(rows[0]?.deleted ?? 0);
    total += deleted;
    if (deleted < ANALYTICS_SWEEP_BATCH_SIZE) return total;
  }
  console.warn(
    `[analytics-sweep] ${table} hit max-batches cap`,
    JSON.stringify({ batches: ANALYTICS_SWEEP_MAX_BATCHES_PER_TABLE, total }),
  );
  return total;
}

/**
 * Run the full sweep across all three analytics tables. Cross-instance
 * overlap is prevented by acquiring the durable single-row mutex
 * `analytics_sweep_lock` (TTL-bounded, holder-tagged) before doing any
 * work, renewing the lease between tables, and deleting our row on
 * exit. A manual trigger can never race with the daily timer —
 * concurrent invocations short-circuit with
 * `lastError = 'sweep already in progress'`.
 */
let sweepInFlight = false;
async function runAnalyticsSweep(): Promise<void> {
  if (!sql) {
    sweepStatus.lastError = 'DATABASE_URL not configured';
    console.warn('[analytics-sweep] skipped — DATABASE_URL not configured');
    return;
  }
  // In-process guard catches the trivially-concurrent case without a
  // DB roundtrip; the advisory lock below catches multi-instance races.
  if (sweepInFlight) {
    sweepStatus.lastError = 'sweep already in progress (in-process)';
    console.warn('[analytics-sweep] skipped — already running in this process');
    return;
  }
  sweepInFlight = true;
  const startedAt = Date.now();
  let lockAcquired = false;
  try {
    // Cross-instance mutex via the analytics_sweep_lock single-row table.
    // Neon's HTTP serverless driver doesn't preserve a session across
    // statements, so a session-scoped pg_advisory_lock would silently
    // be released the moment its HTTP request returns. The row pattern
    // is durable across statement boundaries and TTL-bounded so a
    // crashed holder can't pin the lock indefinitely.
    const newExpiry = new Date(startedAt + ANALYTICS_SWEEP_LOCK_TTL_MS).toISOString();
    const lockRows = await sql`
      INSERT INTO public.analytics_sweep_lock (id, holder, acquired_at, expires_at)
      VALUES (1, ${ANALYTICS_SWEEP_HOLDER_ID}, now(), ${newExpiry}::timestamptz)
      ON CONFLICT (id) DO UPDATE
        SET holder = EXCLUDED.holder,
            acquired_at = EXCLUDED.acquired_at,
            expires_at = EXCLUDED.expires_at
        WHERE public.analytics_sweep_lock.expires_at < now()
      RETURNING holder = ${ANALYTICS_SWEEP_HOLDER_ID} AS got
    `;
    lockAcquired = lockRows[0]?.got === true;
    if (!lockAcquired) {
      sweepStatus.lastError = 'sweep already in progress (lock row held)';
      // Demoted from warn to debug log: a held lock is the EXPECTED outcome
      // when another instance is running its sweep — it's not an error,
      // just a routine "skip this tick." Keeps prod logs clean.
      if (process.env.DEBUG_ANALYTICS_SWEEP === '1') {
        console.log('[analytics-sweep] skipped — lock row held by another holder');
      }
      return;
    }

    const visitsCutoff = new Date(
      startedAt - PORTFOLIO_VISITS_RETENTION_DAYS * 86_400_000,
    ).toISOString();
    const errorCutoff = new Date(
      startedAt - ERROR_LOG_RETENTION_DAYS * 86_400_000,
    ).toISOString();
    const auditCutoff = new Date(
      startedAt - AUDIT_LOGS_RETENTION_DAYS * 86_400_000,
    ).toISOString();
    const adminAuditCutoff = new Date(
      startedAt - ADMIN_AUDIT_LOG_RETENTION_DAYS * 86_400_000,
    ).toISOString();

    // Lease heartbeat — extend the TTL between tables so a sweep that
    // runs longer than the initial 30-minute window cannot be preempted.
    // The UPDATE is guarded by `holder = us`; if rowcount is 0 our lease
    // already expired and was claimed by someone else, so we abort
    // rather than continue working without the mutex.
    async function renewLease(): Promise<boolean> {
      const renewedExpiry = new Date(Date.now() + ANALYTICS_SWEEP_LOCK_TTL_MS).toISOString();
      const renewed = await sql!`
        UPDATE public.analytics_sweep_lock
           SET expires_at = ${renewedExpiry}::timestamptz
         WHERE id = 1 AND holder = ${ANALYTICS_SWEEP_HOLDER_ID}
        RETURNING 1 AS ok
      `;
      return renewed.length > 0;
    }

    const visitsDeleted = await sweepOneTable(
      'portfolio_visits', PORTFOLIO_VISITS_RETENTION_DAYS);
    if (!(await renewLease())) {
      throw new Error('lease lost between portfolio_visits and error_log');
    }
    const errorDeleted = await sweepOneTable(
      'error_log', ERROR_LOG_RETENTION_DAYS);
    if (!(await renewLease())) {
      throw new Error('lease lost between error_log and audit_logs');
    }
    const auditDeleted = await sweepOneTable(
      'audit_logs', AUDIT_LOGS_RETENTION_DAYS);
    if (!(await renewLease())) {
      throw new Error('lease lost between audit_logs and trial_resumes');
    }

    // Task #10 / Step 2: sweep `admin_audit_log` rows older than
    // ADMIN_AUDIT_LOG_RETENTION_DAYS (default 365). Performed inline via
    // a batched `DELETE … WHERE id IN (SELECT … LIMIT batch FOR UPDATE
    // SKIP LOCKED)` rather than through `sweep_analytics_retention_batch`
    // because that RPC's table allow-list lives in a separate Supabase
    // migration and the table is hosted on the Replit Neon DB, not the
    // Supabase DB. The same batch-size + max-batches caps as the other
    // sweep tables apply, so locks stay short and a runaway loop can't
    // dominate the connection. Uses the new `(at DESC, id DESC)` index
    // (Step 1) for the inner ordered scan.
    let adminAuditDeleted = 0;
    for (let i = 0; i < ANALYTICS_SWEEP_MAX_BATCHES_PER_TABLE; i++) {
      const rows = await sql`
        WITH victims AS (
          SELECT id FROM public.admin_audit_log
          WHERE at < ${adminAuditCutoff}::timestamptz
          ORDER BY at, id
          LIMIT ${ANALYTICS_SWEEP_BATCH_SIZE}::int
          FOR UPDATE SKIP LOCKED
        )
        DELETE FROM public.admin_audit_log a
         USING victims
         WHERE a.id = victims.id
        RETURNING 1 AS deleted
      `;
      const deleted = rows.length;
      adminAuditDeleted += deleted;
      if (deleted < ANALYTICS_SWEEP_BATCH_SIZE) break;
      if (i === ANALYTICS_SWEEP_MAX_BATCHES_PER_TABLE - 1) {
        console.warn(
          '[analytics-sweep] admin_audit_log hit max-batches cap',
          JSON.stringify({ batches: ANALYTICS_SWEEP_MAX_BATCHES_PER_TABLE, total: adminAuditDeleted }),
        );
      }
    }
    if (!(await renewLease())) {
      throw new Error('lease lost between admin_audit_log and trial_resumes');
    }

    // Purge expired trial resumes that are past the 3-day client-side grace
    // window. Uses the same batch size and max-batches cap as the analytics
    // tables so a large backlog can't cause a prolonged table lock.
    let trialResumesDeleted = 0;
    for (let i = 0; i < ANALYTICS_SWEEP_MAX_BATCHES_PER_TABLE; i++) {
      const rows = await sql`
        SELECT public.purge_expired_trial_resumes(
          ${ANALYTICS_SWEEP_BATCH_SIZE}::int
        ) AS deleted
      `;
      const deleted = Number(rows[0]?.deleted ?? 0);
      trialResumesDeleted += deleted;
      if (deleted < ANALYTICS_SWEEP_BATCH_SIZE) break;
      if (i === ANALYTICS_SWEEP_MAX_BATCHES_PER_TABLE - 1) {
        console.warn(
          '[analytics-sweep] trial_resumes hit max-batches cap',
          JSON.stringify({ batches: ANALYTICS_SWEEP_MAX_BATCHES_PER_TABLE, total: trialResumesDeleted }),
        );
      }
    }

    const durationMs = Date.now() - startedAt;
    const result: SweepResult = {
      ran_at: new Date(startedAt).toISOString(),
      portfolio_visits_cutoff: visitsCutoff,
      error_log_cutoff: errorCutoff,
      audit_logs_cutoff: auditCutoff,
      admin_audit_log_cutoff: adminAuditCutoff,
      portfolio_visits_deleted: visitsDeleted,
      error_log_deleted: errorDeleted,
      audit_logs_deleted: auditDeleted,
      trial_resumes_deleted: trialResumesDeleted,
      admin_audit_log_deleted: adminAuditDeleted,
    };
    sweepStatus.lastRanAt = new Date(startedAt).toISOString();
    sweepStatus.lastDurationMs = durationMs;
    sweepStatus.lastResult = result;
    sweepStatus.lastError = null;
    console.log(
      '[analytics-sweep] completed',
      JSON.stringify({
        durationMs,
        portfolio_visits_deleted: visitsDeleted,
        error_log_deleted: errorDeleted,
        audit_logs_deleted: auditDeleted,
        trial_resumes_deleted: trialResumesDeleted,
        admin_audit_log_deleted: adminAuditDeleted,
      }),
    );
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    sweepStatus.lastRanAt = new Date(startedAt).toISOString();
    sweepStatus.lastDurationMs = durationMs;
    sweepStatus.lastError = err instanceof Error ? err.message : String(err);
    console.error('[analytics-sweep] failed:', err);
  } finally {
    if (lockAcquired) {
      try {
        // Only release a lock we actually own — avoids stomping on a
        // subsequent holder if we somehow ran past our TTL.
        await sql`
          DELETE FROM public.analytics_sweep_lock
          WHERE id = 1 AND holder = ${ANALYTICS_SWEEP_HOLDER_ID}
        `;
      } catch (releaseErr) {
        console.error('[analytics-sweep] failed to release lock row:', releaseErr);
      }
    }
    sweepInFlight = false;
  }
}

function scheduleAnalyticsSweep(): void {
  if (!ANALYTICS_SWEEP_ENABLED) {
    console.log('[analytics-sweep] disabled via ANALYTICS_SWEEP_ENABLED=false');
    return;
  }
  if (!sql) {
    console.warn('[analytics-sweep] not scheduled — DATABASE_URL missing');
    return;
  }
  console.log(
    '[analytics-sweep] scheduled',
    JSON.stringify({
      portfolioVisitsRetentionDays: PORTFOLIO_VISITS_RETENTION_DAYS,
      errorLogRetentionDays: ERROR_LOG_RETENTION_DAYS,
      auditLogsRetentionDays: AUDIT_LOGS_RETENTION_DAYS,
      initialDelayMs: ANALYTICS_SWEEP_INITIAL_DELAY_MS,
      intervalMs: ANALYTICS_SWEEP_INTERVAL_MS,
    }),
  );
  sweepStatus.nextScheduledAt = new Date(
    Date.now() + ANALYTICS_SWEEP_INITIAL_DELAY_MS,
  ).toISOString();
  const initialTimer = setTimeout(() => {
    void runAnalyticsSweep().finally(() => {
      sweepStatus.nextScheduledAt = new Date(
        Date.now() + ANALYTICS_SWEEP_INTERVAL_MS,
      ).toISOString();
    });
    const recurring = setInterval(() => {
      void runAnalyticsSweep().finally(() => {
        sweepStatus.nextScheduledAt = new Date(
          Date.now() + ANALYTICS_SWEEP_INTERVAL_MS,
        ).toISOString();
      });
    }, ANALYTICS_SWEEP_INTERVAL_MS);
    recurring.unref?.();
  }, ANALYTICS_SWEEP_INITIAL_DELAY_MS);
  initialTimer.unref?.();
}

/**
 * GET /api/admin/analytics-sweep-status
 *
 * Returns the latest analytics-retention sweep summary so the team can
 * confirm the daily job is running. Admin-gated: caller must present a
 * valid Supabase Bearer token AND the verified user's email must be in
 * the comma-separated `ADMIN_EMAILS` env var (same allow-list every
 * admin-* edge function uses).
 */
// Admin email allow-list: read directly from the verified Supabase Auth
// session payload (NOT from `profiles.email`). The `profiles` table is
// user-mutable in places, so trusting it here would let a non-admin
// claim admin status by editing their own profile row. The auth-server
// email is the immutable source of truth and matches the gating used
// by every admin-* edge function.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
function requireAdminEmail(
  req: AuthedRequest, res: Response, next: NextFunction,
): void {
  if (ADMIN_EMAILS.length === 0) {
    res.status(503).json({ error: 'ADMIN_EMAILS not configured' });
    return;
  }
  if (!req.verifiedUserId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const email = (req.verifiedEmail || '').toLowerCase();
  if (!email || !ADMIN_EMAILS.includes(email)) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

app.get(
  '/api/admin/analytics-sweep-status',
  requireAuthHeader,
  requireAdminEmail,
  (_req, res) => {
    res.json(sweepStatus);
  },
);

/**
 * POST /api/admin/analytics-sweep-run — manual trigger for the retention
 * sweep, useful for verifying configuration without waiting 24h. Same
 * admin gate as the status endpoint.
 */
app.post(
  '/api/admin/analytics-sweep-run',
  requireAuthHeader,
  requireAdminEmail,
  async (_req, res) => {
    await runAnalyticsSweep();
    res.json(sweepStatus);
  },
);

// ── AI Provider admin proxy endpoints ─────────────────────────────────────────
// All endpoints below are guarded by requireAuthHeader + requireAdminEmail so
// the managed platform keys (OPENROUTER_API_KEY, GROQ_API_KEY, GEMINI_API_KEY)
// never leave the server. The browser never sees them — only the result data.
//
// Hardening notes (Task #1 / audit findings S1, S2, P1, F2, F3, P6, A3):
//   • S1: errors returned to the browser are generic strings ("upstream error")
//         while full details (e.is Error message + stack) are logged server-side.
//   • S2: Gemini upstream calls use the `x-goog-api-key` header instead of the
//         `?key=` query param so the key never appears in proxy/access logs.
//   • P1: Each upstream-list endpoint is wrapped by a 10-minute in-memory TTL
//         cache keyed by route. The cache is small, per-process, and survives
//         until restart. Acceptable for admin usage patterns.
//   • F2: `gemini-test` accepts an optional `{ model }` body, validates it
//         against the live models list, and falls back to gemini-2.0-flash.
//   • F3: `gemini-models` only returns entries whose `name` is a string and
//         strips the `models/` prefix from both `id` and `name`.
//   • P6: New `openrouter-models` proxy with the same cache treatment so the
//         browser no longer hits openrouter.ai directly (CORS + cache wins).
//   • A3: All admin model-switch and provider-test calls write to the new
//         `admin_audit_log` Drizzle table via `writeAdminAudit()` below.

interface CacheEntry<T> { value: T; expiresAt: number }
// Task #10 / Step 7: `upstreamCache` is keyed by a fixed allow-list of
// short string literals chosen by the four endpoints below — namely
// `'openrouter-status'`, `'openrouter-models'`, `'groq-models'`, and
// `'gemini-models'`. No request input ever flows into the cache key, so
// the map cardinality is bounded by that allow-list and there is zero
// risk of unbounded growth from user-supplied keys. The 5-minute sweep
// timer below only handles TTL eviction, not size eviction.
const upstreamCache = new Map<string, CacheEntry<unknown>>();
const UPSTREAM_CACHE_TTL_MS = 10 * 60 * 1000;
function getCached<T>(key: string): T | null {
  const e = upstreamCache.get(key);
  if (!e) return null;
  if (e.expiresAt < Date.now()) { upstreamCache.delete(key); return null; }
  return e.value as T;
}
function setCached<T>(key: string, value: T): void {
  upstreamCache.set(key, { value, expiresAt: Date.now() + UPSTREAM_CACHE_TTL_MS });
}
// Periodically sweep expired entries.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of upstreamCache) if (v.expiresAt < now) upstreamCache.delete(k);
}, 5 * 60_000).unref?.();

async function writeAdminAudit(
  actorEmail: string,
  action: string,
  payload: Record<string, unknown> | null,
): Promise<void> {
  if (!sql) {
    console.error('[admin-audit] DATABASE_URL not configured — write skipped', { actorEmail, action });
    return;
  }
  try {
    // Using the neon HTTP tagged-template; column names match `admin_audit_log`
    // in `server/schema.ts` (id default uuid, at default now()).
    await sql`
      INSERT INTO admin_audit_log (actor_email, action, payload)
      VALUES (${actorEmail}, ${action}, ${payload ? JSON.stringify(payload) : null}::jsonb)
    `;
  } catch (e) {
    console.error('[admin-audit] write failed', e);
  }
}

function logAndSanitiseUpstreamError(label: string, e: unknown): string {
  console.error(`[server] ${label} upstream error:`, e instanceof Error ? e.stack ?? e.message : e);
  return 'Upstream request failed';
}

/**
 * GET /api/admin/ai-provider/openrouter-status
 * Returns the managed OpenRouter key balance / rate-limit info.
 */
app.get(
  '/api/admin/ai-provider/openrouter-status',
  requireAuthHeader,
  requireAdminEmail,
  async (_req, res) => {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) {
      res.json({ configured: false });
      return;
    }
    const cacheKey = 'openrouter-status';
    const cached = getCached<unknown>(cacheKey);
    if (cached) { res.json(cached); return; }
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    try {
      const r = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { Authorization: `Bearer ${key}` },
        signal: controller.signal,
      });
      if (!r.ok) {
        res.json({ configured: true, error: `Upstream HTTP ${r.status}` });
        return;
      }
      const body = (await r.json()) as { data?: Record<string, unknown> };
      const out = { configured: true, data: body.data ?? null };
      setCached(cacheKey, out);
      res.json(out);
    } catch (e) {
      res.json({ configured: true, error: logAndSanitiseUpstreamError('openrouter-status', e) });
    } finally {
      clearTimeout(t);
    }
  },
);

/**
 * GET /api/admin/ai-provider/openrouter2-status
 * Returns the managed OpenRouter 2 (secondary account) key balance / rate-limit
 * info. Pinned to OPENROUTER2_API_KEY; the model used by the routing layer is
 * always `openrouter/elephant-alpha` regardless of the live model list.
 */
app.get(
  '/api/admin/ai-provider/openrouter2-status',
  requireAuthHeader,
  requireAdminEmail,
  async (_req, res) => {
    const key = process.env.OPENROUTER2_API_KEY;
    if (!key) {
      res.json({ configured: false });
      return;
    }
    const cacheKey = 'openrouter2-status';
    const cached = getCached<unknown>(cacheKey);
    if (cached) { res.json(cached); return; }
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    try {
      const r = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { Authorization: `Bearer ${key}` },
        signal: controller.signal,
      });
      if (!r.ok) {
        res.json({ configured: true, error: `Upstream HTTP ${r.status}` });
        return;
      }
      const body = (await r.json()) as { data?: Record<string, unknown> };
      const out = { configured: true, data: body.data ?? null, pinnedModel: 'openrouter/elephant-alpha' };
      setCached(cacheKey, out);
      res.json(out);
    } catch (e) {
      res.json({ configured: true, error: logAndSanitiseUpstreamError('openrouter2-status', e) });
    } finally {
      clearTimeout(t);
    }
  },
);

/**
 * GET /api/admin/ai-provider/openrouter-models  (P6)
 * Proxies the OpenRouter public model catalogue so the browser doesn't have to
 * hit openrouter.ai directly (CORS + cache benefit). 10-minute server-side cache.
 */
app.get(
  '/api/admin/ai-provider/openrouter-models',
  requireAuthHeader,
  requireAdminEmail,
  async (_req, res) => {
    const cacheKey = 'openrouter-models';
    const cached = getCached<unknown>(cacheKey);
    if (cached) { res.json(cached); return; }
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10000);
    try {
      const r = await fetch('https://openrouter.ai/api/v1/models', { signal: controller.signal });
      if (!r.ok) {
        res.json({ models: [], error: `Upstream HTTP ${r.status}` });
        return;
      }
      const body = (await r.json()) as { data?: unknown[] };
      const out = { models: body.data ?? [] };
      setCached(cacheKey, out);
      res.json(out);
    } catch (e) {
      res.json({ models: [], error: logAndSanitiseUpstreamError('openrouter-models', e) });
    } finally {
      clearTimeout(t);
    }
  },
);

/**
 * GET /api/admin/ai-provider/groq-models
 * Returns the live Groq model list using the managed GROQ_API_KEY.
 */
app.get(
  '/api/admin/ai-provider/groq-models',
  requireAuthHeader,
  requireAdminEmail,
  async (_req, res) => {
    const key = process.env.GROQ_API_KEY;
    if (!key) {
      res.json({ configured: false, models: [] });
      return;
    }
    const cacheKey = 'groq-models';
    const cached = getCached<unknown>(cacheKey);
    if (cached) { res.json(cached); return; }
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    try {
      const r = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
        signal: controller.signal,
      });
      if (!r.ok) {
        res.json({ configured: true, models: [], error: `Upstream HTTP ${r.status}` });
        return;
      }
      const body = (await r.json()) as { data?: unknown[] };
      const out = { configured: true, models: body.data ?? [] };
      setCached(cacheKey, out);
      res.json(out);
    } catch (e) {
      res.json({ configured: true, models: [], error: logAndSanitiseUpstreamError('groq-models', e) });
    } finally {
      clearTimeout(t);
    }
  },
);

/**
 * GET /api/admin/ai-provider/groq-usage
 * Returns today's request/token usage and rate-limit ceiling from the managed GROQ_API_KEY.
 */
app.get(
  '/api/admin/ai-provider/groq-usage',
  requireAuthHeader,
  requireAdminEmail,
  async (_req, res) => {
    const key = process.env.GROQ_API_KEY;
    if (!key) {
      res.json({ configured: false });
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    try {
      const r = await fetch('https://api.groq.com/openai/v1/usage', {
        headers: { Authorization: `Bearer ${key}` },
        signal: controller.signal,
      });
      if (!r.ok) {
        res.json({ configured: true, error: `Upstream HTTP ${r.status}` });
        return;
      }
      const body = await r.json() as Record<string, unknown>;
      res.json({ configured: true, ...body });
    } catch (e) {
      res.json({ configured: true, error: logAndSanitiseUpstreamError('groq-usage', e) });
    } finally {
      clearTimeout(t);
    }
  },
);

/**
 * GET /api/admin/ai-provider/gemini-models
 * Returns Gemini models that support generateContent using the managed GEMINI_API_KEY.
 * Sends the key in the `x-goog-api-key` header (S2) — never in the URL.
 */
app.get(
  '/api/admin/ai-provider/gemini-models',
  requireAuthHeader,
  requireAdminEmail,
  async (_req, res) => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      res.json({ configured: false, models: [] });
      return;
    }
    const cacheKey = 'gemini-models';
    const cached = getCached<unknown>(cacheKey);
    if (cached) { res.json(cached); return; }
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    try {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
        headers: { 'x-goog-api-key': key },
        signal: controller.signal,
      });
      if (!r.ok) {
        res.json({ configured: true, models: [], error: `Upstream HTTP ${r.status}` });
        return;
      }
      const body = (await r.json()) as { models?: Array<Record<string, unknown>> };
      // F3: only keep entries with a string `name`; always strip `models/` prefix.
      const models = (body.models ?? [])
        .filter((m) =>
          typeof m.name === 'string' &&
          Array.isArray(m.supportedGenerationMethods) &&
          (m.supportedGenerationMethods as string[]).includes('generateContent'),
        )
        .map((m) => {
          const rawName = m.name as string;
          const id = rawName.startsWith('models/') ? rawName.slice('models/'.length) : rawName;
          const display = typeof m.displayName === 'string' ? m.displayName : id;
          return {
            id,
            name: display,
            context: typeof m.inputTokenLimit === 'number' ? m.inputTokenLimit : null,
          };
        });
      const out = { configured: true, models };
      setCached(cacheKey, out);
      res.json(out);
    } catch (e) {
      res.json({ configured: true, models: [], error: logAndSanitiseUpstreamError('gemini-models', e) });
    } finally {
      clearTimeout(t);
    }
  },
);

/**
 * POST /api/admin/ai-provider/gemini-test
 * Fires a lightweight generateContent ping using the managed GEMINI_API_KEY.
 * Body: `{ model?: string }`. The model is validated against the cached
 * upstream models list (F2); falls back to gemini-2.0-flash if missing/invalid.
 * Returns { success, model, latencyMs, preview } or { success: false, error }.
 */
app.post(
  '/api/admin/ai-provider/gemini-test',
  requireAuthHeader,
  requireAdminEmail,
  async (req: AuthedRequest, res) => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      res.json({ success: false, error: 'GEMINI_API_KEY not configured on server' });
      return;
    }
    const FALLBACK_MODEL = 'gemini-2.0-flash';
    const requested = typeof req.body?.model === 'string' ? req.body.model.trim() : '';

    // F2: validate the requested model against the cached models list. If we
    // don't have a cache yet, accept any plausibly-formatted slug; the upstream
    // call will reject anything genuinely invalid.
    let model = FALLBACK_MODEL;
    if (requested) {
      const cached = getCached<{ models: Array<{ id: string }> }>('gemini-models');
      if (cached) {
        const ok = cached.models.some(m => m.id === requested);
        model = ok ? requested : FALLBACK_MODEL;
      } else if (/^[A-Za-z0-9._-]{3,64}$/.test(requested)) {
        model = requested;
      }
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 15_000);
    const start = Date.now();
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Reply with exactly one word: OK' }] }] }),
        signal: controller.signal,
      });
      if (!r.ok) {
        res.json({ success: false, error: `Upstream HTTP ${r.status}`, model });
        // A3: same `provider-test` taxonomy/payload as OpenRouter/Groq/Ollama.
        // Task #10 / Step 3: fire-and-forget — don't make the response wait
        // for a 50–200ms audit insert. `writeAdminAudit` already swallows
        // and logs its own errors, so a rejected promise here is impossible
        // in practice; the `.catch` is a defensive guard against future
        // refactors that might re-throw.
        void writeAdminAudit(req.verifiedEmail || 'unknown', 'provider-test', {
          provider: 'gemini', model, ok: false, latencyMs: null, error: `Upstream HTTP ${r.status}`,
        }).catch((e) => console.error('[admin-audit] gemini-test (http-fail) write failed', e));
        return;
      }
      const body = await r.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      const text = body.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const latencyMs = Date.now() - start;
      res.json({ success: true, model, latencyMs, preview: text.slice(0, 120) });
      void writeAdminAudit(req.verifiedEmail || 'unknown', 'provider-test', {
        provider: 'gemini', model, ok: true, latencyMs, error: null,
      }).catch((e) => console.error('[admin-audit] gemini-test (ok) write failed', e));
    } catch (e: unknown) {
      const sanitised = logAndSanitiseUpstreamError('gemini-test', e);
      res.json({ success: false, error: sanitised, model });
      void writeAdminAudit(req.verifiedEmail || 'unknown', 'provider-test', {
        provider: 'gemini', model, ok: false, latencyMs: null, error: sanitised,
      }).catch((e2) => console.error('[admin-audit] gemini-test (catch) write failed', e2));
    } finally {
      clearTimeout(t);
    }
  },
);

/**
 * POST /api/admin/ai-provider/audit-model-switch
 * Records an admin model-switch event in `admin_audit_log` (A3). Called from
 * the DevKit panel when an admin confirms changing the active BYOK or managed
 * model for any provider. The endpoint is purely for audit — it does not
 * mutate provider settings (those are stored client-side in `useSettingsStore`).
 *
 * Body: `{ provider: 'openrouter'|'groq'|'gemini'|'ollama'|'wiseresume-sub', model: string, previousModel?: string }`
 */
app.post(
  '/api/admin/ai-provider/audit-model-switch',
  requireAuthHeader,
  requireAdminEmail,
  async (req: AuthedRequest, res) => {
    const provider = typeof req.body?.provider === 'string' ? req.body.provider : null;
    const model = typeof req.body?.model === 'string' ? req.body.model : null;
    const previousModel = typeof req.body?.previousModel === 'string' ? req.body.previousModel : null;
    if (!provider || !model) {
      res.status(400).json({ error: 'provider and model are required' });
      return;
    }
    // Task #10 / Step 3: fire-and-forget so the response doesn't block on a
    // 50–200ms audit insert. `writeAdminAudit` swallows its own errors.
    void writeAdminAudit(req.verifiedEmail || 'unknown', 'model-switch', { provider, model, previousModel })
      .catch((e) => console.error('[admin-audit] model-switch write failed', e));
    res.json({ ok: true });
  },
);

/**
 * POST /api/admin/ai-provider/audit-test
 * Records an admin provider-test event in `admin_audit_log` with a structured
 * payload (A3). Distinct from `audit-model-switch` so the two intents do not
 * get conflated in the audit trail. Called by the DevKit panel after every
 * OpenRouter / Groq / Gemini / Ollama test, success or failure.
 *
 * Body: `{ provider: string, model?: string|null, ok: boolean,
 *          latencyMs?: number|null, error?: string|null }`
 */
app.post(
  '/api/admin/ai-provider/audit-test',
  requireAuthHeader,
  requireAdminEmail,
  async (req: AuthedRequest, res) => {
    const provider = typeof req.body?.provider === 'string' ? req.body.provider : null;
    if (!provider) {
      res.status(400).json({ error: 'provider is required' });
      return;
    }
    const model = typeof req.body?.model === 'string' ? req.body.model : null;
    const ok = req.body?.ok === true;
    const latencyMs =
      typeof req.body?.latencyMs === 'number' && Number.isFinite(req.body.latencyMs)
        ? req.body.latencyMs
        : null;
    const errorMessage =
      typeof req.body?.error === 'string' ? req.body.error.slice(0, 500) : null;
    // Task #10 / Step 3: fire-and-forget so the response doesn't block on a
    // 50–200ms audit insert. `writeAdminAudit` swallows its own errors.
    void writeAdminAudit(req.verifiedEmail || 'unknown', 'provider-test', {
      provider,
      model,
      ok,
      latencyMs,
      error: errorMessage,
    }).catch((e) => console.error('[admin-audit] provider-test write failed', e));
    res.json({ ok: true });
  },
);

/**
 * GET /api/admin/ai-provider/audit-recent
 * Returns admin audit-log entries for the AI Provider DevKit panel
 * ("Recent activity" section). Limited to model-switch and provider-test
 * actions. Supports server-side filtering and cursor pagination so admins
 * can scroll back through thousands of rows without bloating the payload
 * or scanning the table client-side.
 *
 * Query params (all optional):
 *   - provider:    'openrouter'|'groq'|'gemini'|'ollama'|'wiseresume-sub'
 *                  Filters on payload.provider (jsonb).
 *   - action:      'model-switch'|'provider-test' — narrows the action set.
 *   - okOnly:      'failed' returns only provider-test rows where
 *                  payload.ok = false. Other values are ignored.
 *   - actorEmail:  free-text substring match on actor_email (case-insensitive).
 *   - before:      cursor `${at_iso}|${id}` from a previous response's
 *                  `nextCursor` — returns rows strictly older than that.
 *   - limit:       1..100, default 50.
 *
 * Response: `{ entries, nextCursor }` where `nextCursor` is non-null only
 * when more rows likely exist (i.e. we filled the page). Cursor uses the
 * composite `(at, id)` so ties on identical timestamps don't get skipped
 * or duplicated when paging.
 */
const AUDIT_PROVIDERS = new Set([
  'openrouter',
  'groq',
  'gemini',
  'ollama',
  'wiseresume-sub',
]);
const AUDIT_ACTIONS = new Set(['model-switch', 'provider-test']);

app.get(
  '/api/admin/ai-provider/audit-recent',
  requireAuthHeader,
  requireAdminEmail,
  async (req, res) => {
    if (!sql) {
      res.json({ entries: [], nextCursor: null, error: 'Database not configured' });
      return;
    }

    const q = req.query as Record<string, unknown>;
    const providerRaw = typeof q.provider === 'string' ? q.provider : '';
    const actionRaw = typeof q.action === 'string' ? q.action : '';
    const okOnlyRaw = typeof q.okOnly === 'string' ? q.okOnly : '';
    const actorEmailRaw = typeof q.actorEmail === 'string' ? q.actorEmail.trim() : '';
    const beforeRaw = typeof q.before === 'string' ? q.before : '';
    const limitRaw = typeof q.limit === 'string' ? Number.parseInt(q.limit, 10) : NaN;
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(limitRaw, 1), 100)
      : 50;

    // WHERE-clause assembly. We use sql.query() with $1..$N placeholders
    // because the neon template tag doesn't compose dynamic fragments.
    const where: string[] = [`action IN ('model-switch','provider-test')`];
    const params: unknown[] = [];
    const push = (val: unknown): string => {
      params.push(val);
      return `$${params.length}`;
    };

    if (actionRaw && AUDIT_ACTIONS.has(actionRaw)) {
      where.push(`action = ${push(actionRaw)}`);
    }
    if (providerRaw && AUDIT_PROVIDERS.has(providerRaw)) {
      where.push(`payload->>'provider' = ${push(providerRaw)}`);
    }
    if (okOnlyRaw === 'failed') {
      where.push(`action = 'provider-test'`);
      where.push(`(payload->>'ok')::boolean IS NOT TRUE`);
    }
    if (actorEmailRaw) {
      where.push(`actor_email ILIKE ${push(`%${actorEmailRaw}%`)}`);
    }
    if (beforeRaw) {
      const sep = beforeRaw.lastIndexOf('|');
      if (sep > 0) {
        const cursorAt = beforeRaw.slice(0, sep);
        const cursorId = beforeRaw.slice(sep + 1);
        const tsValid = !Number.isNaN(new Date(cursorAt).getTime());
        // Strict canonical UUID v1-v8 form so a malformed cursor short-
        // circuits here instead of failing as a 500 inside the ::uuid cast.
        const idValid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cursorId);
        if (tsValid && idValid) {
          const atP = push(cursorAt);
          const idP = push(cursorId);
          // Composite < to keep ordering stable across ties on `at`.
          where.push(`(at, id) < (${atP}::timestamptz, ${idP}::uuid)`);
        }
      }
    }

    const limitP = push(limit);
    const queryText = `
      SELECT id, actor_email, action, payload, at
      FROM admin_audit_log
      WHERE ${where.join(' AND ')}
      ORDER BY at DESC, id DESC
      LIMIT ${limitP}
    `;

    try {
      const rows = (await sql.query(queryText, params)) as Array<{
        id: string;
        actor_email: string;
        action: string;
        payload: Record<string, unknown> | null;
        at: string | Date;
      }>;
      const entries = rows.map((r) => ({
        id: r.id,
        actorEmail: r.actor_email,
        action: r.action,
        payload: r.payload,
        at: r.at instanceof Date ? r.at.toISOString() : r.at,
      }));
      const last = entries[entries.length - 1];
      const nextCursor =
        entries.length === limit && last ? `${last.at}|${last.id}` : null;
      res.json({ entries, nextCursor });
    } catch (e) {
      console.error('[admin-audit] read failed', e);
      res
        .status(500)
        .json({ entries: [], nextCursor: null, error: 'Database read failed' });
    }
  },
);

// ── Start server ──────────────────────────────────────────────────────────────
(async () => {
  // Pull missing Supabase secrets (jwt_secret / anon / service_role) from the
  // Management API before opening the port — otherwise the very first
  // /api/fn/token-exchange call would race with the bootstrap and sign a
  // token with the wrong secret.
  await bootstrapSupabaseSecrets();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[server] WiseResume API server running on port ${PORT}`);
    console.log(`[server] Supabase URL: ${SUPABASE_URL ? 'configured' : 'NOT SET'}`);
    console.log(`[server] Supabase JWT secret: ${SUPABASE_JWT_SECRET ? 'configured' : 'MISSING (Supabase calls will 401)'}`);
    console.log(`[server] Database: ${DATABASE_URL ? 'configured' : 'NOT SET'}`);
    scheduleAnalyticsSweep();
  });
})();

export default app;
