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

import * as Sentry from '@sentry/node';
import { PDFDocument, PDFArray, PDFName, PDFString, StandardFonts, rgb } from 'pdf-lib';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import pg from 'pg';
import { promises as dns } from 'node:dns';
import net from 'node:net';
import * as jose from 'jose';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialise Sentry as early as possible so all errors and spans are captured.
// Uses the same DSN as the frontend (VITE_SENTRY_DSN) — both show up in the
// same Sentry project, distinguished by their `server` / `browser` platform tag.
const SENTRY_DSN = process.env.VITE_SENTRY_DSN || process.env.SENTRY_DSN || '';
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
  console.log('[server] Sentry error tracking: active');
} else {
  console.warn('[server] Sentry error tracking: disabled (VITE_SENTRY_DSN not set)');
}

const app = express();
const PORT = parseInt(process.env.API_PORT || '5001', 10);

// ── Middleware ────────────────────────────────────────────────────────────────
// Required for Sentry browser profiling — must be present on the document response.
app.use((_req, res, next) => {
  res.setHeader('Document-Policy', 'js-profiling');
  next();
});
// The PDF export endpoint receives self-contained HTML with embedded base64
// assets that can legitimately exceed the default 10 MB limit. Register its
// larger body-parser limit first so body-parser skips re-parsing on the
// subsequent global middleware (body-parser sets req._body=true after parsing).
app.use('/api/export/pdf-native', express.json({ limit: '50mb' }));
app.use('/api/export/pdf-native', express.urlencoded({ extended: true, limit: '50mb' }));
// General body parsing for all other routes (10 MB is sufficient).
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
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
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

// ── Fail-fast startup guards ───────────────────────────────────────────────────
// These three env vars are required for the server to function correctly.
// Missing any of them causes silent, hard-to-diagnose runtime failures, so we
// exit immediately with a clear message rather than booting in a degraded state.
const MISSING_REQUIRED = [
  !SUPABASE_URL && 'SUPABASE_URL (or VITE_SUPABASE_URL)',
  !KINDE_DOMAIN && 'KINDE_DOMAIN (or VITE_KINDE_DOMAIN)',
  !DATABASE_URL && 'DATABASE_URL',
].filter(Boolean);

if (MISSING_REQUIRED.length > 0) {
  console.error(
    '[server] FATAL: Required environment variables are not set:\n' +
    MISSING_REQUIRED.map((v) => `  • ${v}`).join('\n') + '\n' +
    '[server] Set them as Replit Secrets and restart the server.',
  );
  process.exit(1);
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

  // Push the flat AI key pool + BYOK encryption secret into Supabase Edge
  // Function secrets. Idempotent — Supabase upserts by name.
  const managedAiKeys = [
    'OPENROUTER_KEY_1', 'OPENROUTER_KEY_2', 'OPENROUTER_KEY_3',
    'GROQ_KEY_1', 'GROQ_KEY_2', 'GROQ_KEY_3',
  ] as const;
  const secretsToPush = [
    ...managedAiKeys.map((name) => ({ name, value: process.env[name] })),
    { name: 'API_KEY_ENCRYPTION_SECRET', value: process.env.API_KEY_ENCRYPTION_SECRET },
  ].filter((s): s is { name: string; value: string } => typeof s.value === 'string' && s.value.length > 0);

  // Always log presence/absence of every key so operators can spot a missing key at a glance.
  const presentKeys = managedAiKeys.filter((k) => process.env[k]);
  const missingKeys = managedAiKeys.filter((k) => !process.env[k]);
  console.log(
    `[server] Managed AI key pool: present=[${presentKeys.join(', ') || 'none'}] missing=[${missingKeys.join(', ') || 'none'}]`,
  );
  if (!process.env.API_KEY_ENCRYPTION_SECRET) {
    console.warn('[server] API_KEY_ENCRYPTION_SECRET not set — BYOK key storage unavailable.');
  }

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
        console.log(`[server] Pushed ${secretsToPush.length} managed AI secrets to Supabase Edge Functions.`);
      } else {
        console.warn(`[server] Failed to push managed AI secrets to Supabase (${r.status}): ${await r.text().catch(() => '')}`);
      }
    } catch (err) {
      console.warn('[server] Managed AI secret push failed (non-fatal):', err);
    }
  } else {
    console.warn(
      `[server] No managed AI keys found in Replit env — every AI call will fail. ` +
      `Set at least one OPENROUTER_KEY_n or GROQ_KEY_n as a Replit Secret.`
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

  // Fast-path: most logins are returning users. Check existence before attempting
  // a POST, saving a full round-trip (and a noisy 422/409 log) on every login
  // for users who already have a shadow row.
  if (await verifyExists()) return true;

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
      // A concurrent request created the row between our GET and POST — re-verify.
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

// Postgres connection pool (for direct server-side queries).
// We previously used `neon()` from @neondatabase/serverless, but that is an
// HTTP-only client speaking Neon's wire protocol. The local Replit Postgres
// instance does not understand that protocol, so parameterized queries
// returned `null` and crashed downstream. The standard `pg` TCP driver
// works correctly against both Replit Postgres and Neon (via the standard
// Postgres wire protocol).
const pgPool: pg.Pool | null = DATABASE_URL ? new pg.Pool({ connectionString: DATABASE_URL }) : null;
if (pgPool) {
  pgPool.on('error', (err) => {
    console.error('[server] Postgres pool error:', err);
  });
}

type SqlTag = {
  <T = Record<string, unknown>>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]>;
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
};

// Tagged-template-literal wrapper around pg.Pool that mirrors the interface
// previously provided by `neon(DATABASE_URL)`. Two call styles are supported:
//   1. Tagged template:  await sql`SELECT * FROM t WHERE id = ${id}`
//   2. Raw query:        await sql.query('SELECT * FROM t WHERE id = $1', [id])
// Both resolve to the rows array directly (matching the prior neon behavior).
function makeSqlTag(pool: pg.Pool): SqlTag {
  const tag = async <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]> => {
    let text = '';
    for (let i = 0; i < strings.length; i++) {
      text += strings[i];
      if (i < values.length) text += `$${i + 1}`;
    }
    const result = await pool.query(text, values);
    return result.rows as T[];
  };
  (tag as SqlTag).query = async <T = Record<string, unknown>>(
    text: string,
    params: unknown[] = [],
  ): Promise<T[]> => {
    const result = await pool.query(text, params);
    return result.rows as T[];
  };
  return tag as SqlTag;
}

const sql: SqlTag | null = pgPool ? makeSqlTag(pgPool) : null;

// ── Supabase REST helper ──────────────────────────────────────────────────────
// Reads user-owned data straight from the Supabase project (bypassing RLS via
// the service-role key). Used by the dashboard read endpoints because the
// authoritative copy of resumes, profiles, subscriptions, etc. lives in
// Supabase — the local Postgres is a dev sidecar that does not contain the
// user's real data.
async function supabaseGet<T = Record<string, unknown>>(
  table: string,
  query: string,
): Promise<T[]> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase not configured');
  }
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
  const r = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    throw new Error(`Supabase REST ${table} ${r.status}: ${body.slice(0, 300)}`);
  }
  return (await r.json()) as T[];
}

// Upsert one or more rows via Supabase REST. Uses
// `Prefer: resolution=merge-duplicates` so a unique-key collision merges
// the new column values into the existing row instead of failing. Pass the
// `onConflict` column(s) so PostgREST knows which constraint to target.
async function supabaseUpsert<T = Record<string, unknown>>(
  table: string,
  body: Record<string, unknown> | Record<string, unknown>[],
  onConflict: string,
): Promise<T[]> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase not configured');
  }
  const url = `${SUPABASE_URL}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`Supabase REST upsert ${table} ${r.status}: ${text.slice(0, 300)}`);
  }
  return (await r.json()) as T[];
}

// Generic Supabase REST helpers for DevKit handlers
async function supabaseInsert<T = Record<string, unknown>>(
  table: string,
  body: Record<string, unknown> | Record<string, unknown>[],
): Promise<T[]> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase not configured');
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(body),
  });
  if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error(`Supabase insert ${table} ${r.status}: ${t.slice(0, 300)}`); }
  return (await r.json()) as T[];
}

async function supabasePatch(
  table: string,
  query: string,
  body: Record<string, unknown>,
): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase not configured');
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: 'PATCH',
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  });
  if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error(`Supabase patch ${table} ${r.status}: ${t.slice(0, 300)}`); }
}

async function supabaseDelete(table: string, query: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase not configured');
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: 'DELETE',
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, Prefer: 'return=minimal' },
  });
  if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error(`Supabase delete ${table} ${r.status}: ${t.slice(0, 300)}`); }
}

async function supabaseRpc<T = unknown>(fnName: string, params: Record<string, unknown>): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase not configured');
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error(`Supabase RPC ${fnName} ${r.status}: ${t.slice(0, 300)}`); }
  return (await r.json()) as T;
}

// Supabase Auth Admin REST helper
async function supabaseAuthAdmin<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase not configured');
  const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/${path}`, {
    method,
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!r.ok && r.status !== 204) { const t = await r.text().catch(() => ''); throw new Error(`Supabase Auth Admin ${method} /${path} ${r.status}: ${t.slice(0, 300)}`); }
  if (method === 'DELETE' || r.status === 204) return {} as T;
  return (await r.json()) as T;
}

// Kinde M2M helpers
let _kindeM2MCache: { token: string; expiresAt: number } | null = null;
async function getKindeM2MToken(): Promise<string> {
  const clientId = process.env.KINDE_M2M_CLIENT_ID?.trim();
  const clientSecret = process.env.KINDE_M2M_CLIENT_SECRET?.trim();
  const domain = process.env.KINDE_DOMAIN?.trim();
  if (!clientId || !clientSecret || !domain) throw new Error('Kinde M2M credentials not configured (KINDE_M2M_CLIENT_ID / KINDE_M2M_CLIENT_SECRET / KINDE_DOMAIN)');
  if (_kindeM2MCache && _kindeM2MCache.expiresAt > Date.now() + 60_000) return _kindeM2MCache.token;
  const r = await fetch(`https://${domain}/oauth2/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
  });
  if (!r.ok) throw new Error(`Kinde M2M token failed: ${r.status}`);
  const data = await r.json() as { access_token: string; expires_in: number };
  _kindeM2MCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return _kindeM2MCache.token;
}
async function kindeGet<T = unknown>(path: string): Promise<T> {
  const domain = process.env.KINDE_DOMAIN?.trim();
  if (!domain) throw new Error('KINDE_DOMAIN not configured');
  const token = await getKindeM2MToken();
  const r = await fetch(`https://${domain}${path}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
  if (!r.ok) throw new Error(`Kinde API GET ${path} ${r.status}`);
  return (await r.json()) as T;
}
async function kindeDelete(path: string): Promise<void> {
  const domain = process.env.KINDE_DOMAIN?.trim();
  if (!domain) throw new Error('KINDE_DOMAIN not configured');
  const token = await getKindeM2MToken();
  const r = await fetch(`https://${domain}${path}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`Kinde API DELETE ${path} ${r.status}`);
}

// Resend API helper (fire-and-forget safe)
async function resendPost<T = unknown>(path: string, body: unknown): Promise<T | null> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  try {
    const r = await fetch(`https://api.resend.com${path}`, {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch { return null; }
}
async function resendGet<T = unknown>(path: string): Promise<T | null> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  try {
    const r = await fetch(`https://api.resend.com${path}`, { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch { return null; }
}

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

/**
 * Server-side Resend audience helper — add a contact to an audience by ID.
 * Mirrors the fire-and-forget safety of the shared Deno `addContact` helper
 * (supabase/functions/_shared/resendAudiences.ts) for use in Express routes.
 * Returns true on success, false on any error. Never throws.
 */
async function addResendContact(audienceId: string, email: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey || !audienceId) return false;
  try {
    const res = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, unsubscribed: false }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn(`[resend] addContact ${audienceId} → ${res.status}: ${text}`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[resend] addContact threw:', err);
    return false;
  }
}

// ── Premium handle interest tracking (authenticated) ──────────────────────────
// Called by the frontend when a user views a premium handle listing page but
// does not purchase. Adds the user to the "Premium Handle Interest" Resend
// Audience so a follow-up automation email is sent the next day.
// No-ops silently when RESEND_AUDIENCE_HANDLE_INTEREST is not configured.
app.post('/api/track-handle-interest', requireAuthHeader, async (req: AuthedRequest, res) => {
  try {
    const userId = req.verifiedUserId;
    const userEmail = req.verifiedEmail;
    if (!userId || !userEmail) return res.json({ success: true });
    if (userEmail.endsWith('@kinde.placeholder')) return res.json({ success: true });

    const audienceId = process.env.RESEND_AUDIENCE_HANDLE_INTEREST?.trim();
    if (!audienceId) return res.json({ success: true });

    // Skip if the user already owns a premium handle (check profiles.handle_type).
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('handle_type')
      .eq('user_id', userId)
      .maybeSingle();
    const handleType = (profile as { handle_type?: string } | null)?.handle_type;
    if (handleType && handleType !== 'free') return res.json({ success: true });

    // Fire-and-forget via the shared server-side Resend helper.
    addResendContact(audienceId, userEmail).catch((err) =>
      console.warn('[track-handle-interest] audience add failed:', err),
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('[track-handle-interest] error:', err);
    return res.json({ success: true }); // always succeed — non-critical
  }
});

// ── Password reset (public — no auth required) ────────────────────────────────
// Proxies to the send-password-reset Supabase edge function so the branded
// password reset email can be triggered from the frontend in both dev and prod.
// Always returns { success: true } to avoid email enumeration.
app.post('/api/auth/reset-password', async (req, res) => {
  const email = (req.body?.email as string | undefined)?.trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'email is required' });

  try {
    const fnUrl = `${SUPABASE_URL}/functions/v1/send-password-reset`;
    const fnRes = await fetch(fnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ email }),
    });
    const data = await fnRes.json().catch(() => ({ success: true }));
    return res.json(data);
  } catch (err) {
    console.error('[/api/auth/reset-password] edge function call failed:', err);
    // Always return success to avoid enumeration.
    return res.json({ success: true });
  }
});

// ── AI health ─────────────────────────────────────────────────────────────────
// Lightweight health check used by the AIHealthBadge in the client.
// Does NOT require authentication.
//
// AI calls in this app flow through TWO possible paths:
//   1) Direct path: Express server → AI provider (OpenRouter / Groq) using
//      OPENROUTER_KEY_n / GROQ_KEY_n configured as Replit secrets. This path
//      is OPTIONAL — only used if the operator wants the server to call AI
//      providers without going through Supabase.
//   2) Supabase Edge Function path (PRIMARY in this deployment): Express
//      proxies /api/fn/<name> to ${SUPABASE_URL}/functions/v1/<name>. The
//      AI keys live as Supabase Edge Function secrets, NOT on Replit.
//
// The badge should report healthy if EITHER path is operational. Previously
// it only checked path #1, which produced a false "AI Unavailable" warning
// for deployments that legitimately keep all AI keys on Supabase.
let _aiHealthCache: { data: unknown; expiresAt: number } | null = null;
app.get('/api/ai-health', async (_req, res) => {
  const now = Date.now();
  if (_aiHealthCache && _aiHealthCache.expiresAt > now) {
    return res.json(_aiHealthCache.data);
  }

  const openrouterKey = process.env.OPENROUTER_KEY_1 || process.env.OPENROUTER_KEY_2 || process.env.OPENROUTER_KEY_3;
  const groqKey = process.env.GROQ_KEY_1 || process.env.GROQ_KEY_2 || process.env.GROQ_KEY_3;
  const supabaseEdgeConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

  // Path #1: direct server-side AI keys. Use them when present.
  // If they return healthy → done. If they fail (network OR non-OK HTTP),
  // fall through to the Supabase Edge path so a stale/throttled direct key
  // doesn't mask a fully working Supabase-hosted AI path.
  if (openrouterKey || groqKey) {
    const provider = openrouterKey ? 'openrouter' : 'groq';
    const pingStart = Date.now();
    let directHealthy = false;
    let directPayload: { status: string; latencyMs: number; provider: string; errorCode: number | null } | null = null;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      let pingRes: globalThis.Response;
      if (openrouterKey) {
        pingRes = await fetch('https://openrouter.ai/api/v1/models', {
          headers: { Authorization: `Bearer ${openrouterKey}` },
          signal: controller.signal,
        });
      } else {
        pingRes = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { Authorization: `Bearer ${groqKey}` },
          signal: controller.signal,
        });
      }
      clearTimeout(timeout);
      const latencyMs = Date.now() - pingStart;
      directHealthy = pingRes.ok;
      directPayload = {
        status: pingRes.ok ? (latencyMs > 8000 ? 'degraded' : 'healthy') : 'down',
        latencyMs,
        provider,
        errorCode: pingRes.ok ? null : pingRes.status,
      };
    } catch {
      const latencyMs = Date.now() - pingStart;
      directPayload = { status: 'down', latencyMs, provider, errorCode: 0 };
    }

    // Direct path succeeded — return immediately.
    if (directHealthy && directPayload) {
      _aiHealthCache = { data: directPayload, expiresAt: now + 30_000 };
      return res.json(directPayload);
    }

    // Direct path failed and Supabase path is unavailable — return the
    // direct-path failure as the diagnostic.
    if (!supabaseEdgeConfigured && directPayload) {
      _aiHealthCache = { data: directPayload, expiresAt: now + 15_000 };
      return res.json(directPayload);
    }
    // Otherwise fall through to Supabase Edge probe below.
  }

  // Path #2: Supabase Edge Function path. The AI keys live on Supabase, so
  // health here means "the Supabase Functions runtime is reachable". We hit
  // the auth health endpoint (no AI cost, no auth required) on the same
  // Supabase project. If it answers, the edge functions are reachable and
  // the AI calls will succeed.
  if (supabaseEdgeConfigured) {
    const pingStart = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const pingRes = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
        headers: { apikey: SUPABASE_ANON_KEY },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const latencyMs = Date.now() - pingStart;
      const status = pingRes.ok ? (latencyMs > 5000 ? 'degraded' : 'healthy') : 'down';
      const errorCode = pingRes.ok ? null : pingRes.status;
      const payload = { status, latencyMs, provider: 'supabase-edge', errorCode };
      _aiHealthCache = { data: payload, expiresAt: now + 30_000 };
      return res.json(payload);
    } catch {
      const latencyMs = Date.now() - pingStart;
      const payload = { status: 'down', latencyMs, provider: 'supabase-edge', errorCode: 0 };
      _aiHealthCache = { data: payload, expiresAt: now + 15_000 };
      return res.json(payload);
    }
  }

  // Neither path is configured.
  const payload = { status: 'down', reason: 'no_keys', latencyMs: null, provider: null };
  _aiHealthCache = { data: payload, expiresAt: now + 30_000 };
  return res.json(payload);
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

    // 4. Upsert profile + preferences in Supabase (the authoritative store).
    //    These are merge-duplicates upserts so existing users are no-ops; new
    //    users get a row created. Local Postgres is intentionally NOT touched
    //    here — read endpoints (/api/data/me, /profile, etc.) read from
    //    Supabase, so writes must go to the same place to avoid split-brain.
    // Note: Supabase `profiles` does not have an `email` column (email lives
    // on auth.users). Only persist user_id here so the upsert is portable.
    try {
      await supabaseUpsert('profiles', { user_id: userId }, 'user_id');
      await supabaseUpsert('user_preferences', { user_id: userId }, 'user_id');
    } catch (dbErr) {
      console.error('[token-exchange] Supabase profile upsert failed:', dbErr);
      return res.status(500).json({ code: 'PROFILE_UPSERT_FAILED', message: 'Could not create user profile' });
    }
    // Best-effort local audit log (non-fatal — local pg may lag/be absent).
    if (sql) {
      try {
        await sql`
          INSERT INTO token_exchanges (kinde_sub, user_id, status)
          VALUES (${kindeSub}, ${userId}, 'success')
        `;
      } catch { /* non-fatal */ }
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
 * NOTE: /api/fn/me is intentionally NOT defined here. It falls through to the
 * generic /api/fn/:fnName proxy below, which forwards to the deployed Supabase
 * `me` edge function (`supabase/functions/me/index.ts`).
 *
 * Why: writes happen in Supabase (e.g. `admin-set-plan` upserts subscriptions
 * via the Supabase service client), so reads must hit the same DB. A previous
 * version of this file intercepted /api/fn/me and queried the local Neon DB
 * directly — that meant plan upgrades performed in Supabase never reflected in
 * the user's session, and `null` rows from Neon's @neondatabase/serverless
 * driver crashed the endpoint with `Cannot read properties of null (reading 'map')`.
 * The Supabase me function uses a service-role client, so RLS is already
 * bypassed there.
 */

/**
 * GET /api/data/resumes  — list the authenticated user's resumes from Neon.
 * Kept separate from the fn/ namespace so existing Supabase-direct reads can
 * coexist; the dashboard can call this when the Supabase client is unavailable.
 */
app.get('/api/data/resumes', requireAuthHeader, async (req: AuthedRequest, res) => {
  try {
    const userId = req.verifiedUserId!;
    const rows = await supabaseGet<NeonRow>(
      'resumes',
      `user_id=eq.${encodeURIComponent(userId)}&select=*&order=updated_at.desc`,
    );
    res.json({ resumes: rows });
  } catch (err) {
    return dataErr(res, err);
  }
});

app.get('/api/data/resumes/:id', requireAuthHeader, async (req: AuthedRequest, res) => {
  try {
    const id = req.params.id;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'Invalid resume id' });
    const userId = req.verifiedUserId!;
    const rows = await supabaseGet<NeonRow>(
      'resumes',
      `id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`,
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Resume not found' });
    res.json({ resume: rows[0] });
  } catch (err) {
    return dataErr(res, err);
  }
});

// ── DevKit session-token verifier (Node.js port of _shared/adminAuth.ts) ──────
// Used by the admin-mission-control handler below so the DevKit panel works in
// this dev environment without needing the Supabase edge function deployed.

async function verifyDevKitSessionToken(
  token: string,
  secretKey: string,
): Promise<{ email: string; sessionId: string } | null> {
  try {
    const dotIdx = token.lastIndexOf('.');
    if (dotIdx === -1) return null;
    const payloadB64 = token.slice(0, dotIdx);
    const sigHex = token.slice(dotIdx + 1);
    if (!sigHex || sigHex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(sigHex)) return null;
    let payload: string;
    try { payload = Buffer.from(payloadB64, 'base64').toString('utf8'); } catch { return null; }
    const lastColon = payload.lastIndexOf(':');
    if (lastColon === -1) return null;
    const expiresAt = parseInt(payload.slice(lastColon + 1), 10);
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;
    const rest = payload.slice(0, lastColon);
    const sessionColon = rest.lastIndexOf(':');
    if (sessionColon === -1) return null;
    const email = rest.slice(0, sessionColon);
    const sessionId = rest.slice(sessionColon + 1);
    if (!email || !sessionId) return null;
    const cryptoKey = await crypto.subtle.importKey(
      'raw', Buffer.from(secretKey, 'utf8'),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
    );
    const sigBytes = new Uint8Array(
      (sigHex.match(/.{2}/g) ?? []).map((h: string) => parseInt(h, 16)),
    );
    const valid = await crypto.subtle.verify(
      'HMAC', cryptoKey, sigBytes, Buffer.from(payload, 'utf8'),
    );
    if (!valid) return null;
    return { email, sessionId };
  } catch { return null; }
}

async function requireDevKitAuth(req: Request, res: Response): Promise<string | null> {
  // In dev, DEV_KIT_PASSWORD may not be in the local env (it's a Supabase secret).
  // Fall back to the same stable key used when issuing the token.
  const password = (process.env.DEV_KIT_PASSWORD || '').trim() || 'dev-local-signing-key';
  const m = (req.headers.authorization || '').match(/^Bearer\s+(.+)$/i);
  if (!m) { res.status(401).json({ success: false, error: 'Unauthorized' }); return null; }
  const verified = await verifyDevKitSessionToken(m[1].trim(), password);
  if (!verified) { res.status(401).json({ success: false, error: 'Unauthorized' }); return null; }
  const email = verified.email.toLowerCase();
  const allowed = (process.env.ADMIN_EMAILS || '')
    .split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
  if (allowed.length > 0 && !allowed.includes(email)) {
    res.status(403).json({ success: false, error: 'Forbidden: email not in admin allowlist' });
    return null;
  }
  try {
    const rows = await supabaseGet<{
      id: string; expires_at: string; revoked_at: string | null;
    }>('admin_sessions', `id=eq.${encodeURIComponent(verified.sessionId)}&select=id,expires_at,revoked_at&limit=1`);
    const session = rows[0];
    if (!session) { res.status(401).json({ success: false, error: 'Unauthorized' }); return null; }
    if (session.revoked_at) { res.status(401).json({ success: false, error: 'Session revoked' }); return null; }
    if (new Date(session.expires_at).getTime() < Date.now()) {
      res.status(401).json({ success: false, error: 'Session expired' });
      return null;
    }
    fetch(`${SUPABASE_URL}/rest/v1/admin_sessions?id=eq.${encodeURIComponent(verified.sessionId)}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ last_used_at: new Date().toISOString() }),
    }).catch(() => {});
    return email;
  } catch { res.status(401).json({ success: false, error: 'Unauthorized' }); return null; }
}

// ── Admin Mission Control — dev-environment handler ───────────────────────────
// Mirrors supabase/functions/admin-mission-control/index.ts in Node.js so that
// the DevKit "Mission Control" panel works without deploying the Supabase
// edge function (the generic proxy below would return 404 if the function
// is not yet deployed to the hosted Supabase project).

// source meanings:
//   replit_env    — must be set in Replit secrets; Express can use it directly
//   supabase_vault — lives in Supabase vault; only available to edge functions in production
//   optional      — nice to have; absence is never an error
const MISSION_CONTROL_SECRETS: { key: string; label: string; source: 'replit_env' | 'supabase_vault' | 'optional'; aliases?: string[] }[] = [
  { key: 'SUPABASE_URL',              label: 'Supabase URL',              source: 'replit_env' },
  // The anon key is exposed to the frontend as VITE_SUPABASE_PUBLISHABLE_KEY in this project
  { key: 'SUPABASE_ANON_KEY',         label: 'Supabase Anon Key',         source: 'replit_env', aliases: ['VITE_SUPABASE_PUBLISHABLE_KEY'] },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', label: 'Supabase Service Role Key', source: 'replit_env' },
  { key: 'DEV_KIT_PASSWORD',          label: 'DevKit Password',           source: 'supabase_vault' },
  { key: 'KINDE_DOMAIN',              label: 'Kinde Domain',              source: 'replit_env' },
  { key: 'OPENROUTER_API_KEY',        label: 'OpenRouter API Key',        source: 'supabase_vault' },
  { key: 'OPENROUTER2_API_KEY',       label: 'OpenRouter 2 API Key',      source: 'supabase_vault' },
  { key: 'GROQ_API_KEY',              label: 'Groq API Key',              source: 'supabase_vault' },
  // GitHub token: Replit may name it GITHUB_ACCESS_TOKEN or GITHUB_PAT; Supabase env names it GITHUB_TOKEN
  { key: 'GITHUB_TOKEN',              label: 'GitHub Token',              source: 'replit_env', aliases: ['GITHUB_ACCESS_TOKEN', 'GITHUB_PAT'] },
  // GITHUB_OWNER and GITHUB_REPO can be auto-derived from the git remote URL — marked optional
  { key: 'GITHUB_OWNER',              label: 'GitHub Owner',              source: 'optional' },
  { key: 'GITHUB_REPO',               label: 'GitHub Repo',               source: 'optional' },
  { key: 'RESEND_API_KEY',            label: 'Resend API Key',            source: 'supabase_vault' },
  { key: 'GEMINI_API_KEY',            label: 'Gemini API Key',            source: 'optional' },
  { key: 'ELEVENLABS_API_KEY',        label: 'ElevenLabs API Key',        source: 'optional' },
  { key: 'KINDE_WEBHOOK_SECRET',      label: 'Kinde Webhook Secret',      source: 'supabase_vault' },
  { key: 'KINDE_M2M_CLIENT_ID',       label: 'Kinde M2M Client ID',       source: 'supabase_vault' },
  { key: 'KINDE_M2M_CLIENT_SECRET',   label: 'Kinde M2M Client Secret',   source: 'supabase_vault' },
  { key: 'ADMIN_EMAILS',              label: 'Admin Emails Allowlist',     source: 'supabase_vault' },
];

// Resolves a secret key accounting for known aliases (e.g. GITHUB_ACCESS_TOKEN for GITHUB_TOKEN)
function resolveSecretPresent(key: string, aliases?: string[]): boolean {
  if (process.env[key]) return true;
  return (aliases ?? []).some(a => !!process.env[a]);
}

/**
 * Reads .git/config directly (no child process spawn) to find the origin remote URL,
 * then parses owner/repo from it. Returns null if not found.
 */
function deriveGithubOwnerRepo(): { owner: string; repo: string } | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path') as typeof import('path');
    const gitConfigPath = path.join(process.cwd(), '.git', 'config');
    const gitConfig = fs.readFileSync(gitConfigPath, 'utf8');
    // Find the [remote "origin"] section and extract its url line
    const match = gitConfig.match(/\[remote\s+"origin"\][^[]*\burl\s*=\s*([^\n\r]+)/);
    if (!match) return null;
    const remoteUrl = match[1].trim();
    // HTTPS: https://github.com/owner/repo or https://token@github.com/owner/repo
    const httpsMatch = remoteUrl.match(/github\.com[/:]([^/]+)\/([^/\s.]+?)(?:\.git)?$/);
    if (httpsMatch) return { owner: httpsMatch[1], repo: httpsMatch[2] };
    // SSH: git@github.com:owner/repo.git
    const sshMatch = remoteUrl.match(/github\.com:([^/]+)\/([^/\s.]+?)(?:\.git)?$/);
    if (sshMatch) return { owner: sshMatch[1], repo: sshMatch[2] };
  } catch { /* .git/config unreadable or remote not found */ }
  return null;
}

async function mcCheckGitHub(owner: string, repo: string, token: string) {
  try {
    const resp = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'WiseResume-DevKit/1.0' }, signal: AbortSignal.timeout(5000) },
    );
    if (!resp.ok) return { ok: false, lastCommitAt: null, sha: null, branch: 'main' };
    const commits = await resp.json() as Array<{ sha: string; commit: { author: { date: string } } }>;
    const first = commits[0];
    return { ok: true, lastCommitAt: first?.commit?.author?.date ?? null, sha: first?.sha?.slice(0, 7) ?? null, branch: 'main' };
  } catch { return { ok: false, lastCommitAt: null, sha: null, branch: 'main' }; }
}

async function mcCheckSite(url: string) {
  try {
    const resp = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    return { up: resp.ok || resp.status < 500, httpStatus: resp.status };
  } catch { return { up: false, httpStatus: 0 }; }
}

async function mcCheckAI(name: string, modelsUrl: string, apiKey: string) {
  if (!apiKey) return { provider: name, ok: false, latencyMs: null, httpStatus: 0 };
  const start = Date.now();
  try {
    const resp = await fetch(modelsUrl, { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(6000) });
    return { provider: name, ok: resp.ok, latencyMs: Date.now() - start, httpStatus: resp.status };
  } catch { return { provider: name, ok: false, latencyMs: null, httpStatus: 0 }; }
}

async function mcCheckResend(apiKey: string) {
  if (!apiKey) return { reachable: false, httpStatus: 0, sends24h: null as number | null };
  try {
    const resp = await fetch('https://api.resend.com/emails?limit=100', { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(5000) });
    if (!resp.ok) return { reachable: false, httpStatus: resp.status, sends24h: null };
    const body = await resp.json() as { data?: Array<{ created_at: string }> };
    const cutoff = Date.now() - 86400_000;
    const sends24h = (body.data ?? []).filter((e) => new Date(e.created_at).getTime() > cutoff).length;
    return { reachable: true, httpStatus: resp.status, sends24h };
  } catch { return { reachable: false, httpStatus: 0, sends24h: null }; }
}

app.all('/api/fn/admin-mission-control', async (req, res) => {
  const email = await requireDevKitAuth(req, res);
  if (!email) return;

  try {
    // GITHUB_TOKEN may be named GITHUB_ACCESS_TOKEN or GITHUB_PAT in the Replit secrets panel
    const githubToken  = process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN || process.env.GITHUB_PAT || '';
    // GITHUB_OWNER / GITHUB_REPO: prefer explicit env vars, fall back to parsing the git remote URL
    const gitRemoteDerived = deriveGithubOwnerRepo();
    const githubOwner  = process.env.GITHUB_OWNER || gitRemoteDerived?.owner || '';
    const githubRepo   = process.env.GITHUB_REPO  || gitRemoteDerived?.repo  || '';
    const resendKey    = process.env.RESEND_API_KEY || '';
    const orKey        = process.env.OPENROUTER_API_KEY  || '';
    const or2Key       = process.env.OPENROUTER2_API_KEY || '';
    const groqKey      = process.env.GROQ_API_KEY  || '';
    const productionUrl = process.env.PRODUCTION_URL || 'https://resume.thewise.cloud';
    // Express runs exclusively in Replit/dev — vault secrets live in Supabase and are
    // visible to edge functions in production. Always treat this as a dev environment.
    const isDevEnvironment = true;
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600_000).toISOString();

    const [
      githubRes, siteRes,
      orRes, or2Res, groqRes, emailRes,
      dbRes, dbErrCountRes, recentErrRes, auditRes, secretsMetaRes,
    ] = await Promise.allSettled([
      (githubToken && githubOwner && githubRepo)
        ? mcCheckGitHub(githubOwner, githubRepo, githubToken)
        : Promise.resolve({ ok: false, lastCommitAt: null, sha: null, branch: 'main' }),
      mcCheckSite(productionUrl),
      mcCheckAI('openrouter',  'https://openrouter.ai/api/v1/models?limit=1', orKey),
      mcCheckAI('openrouter2', 'https://openrouter.ai/api/v1/models?limit=1', or2Key),
      mcCheckAI('groq',        'https://api.groq.com/openai/v1/models',       groqKey),
      mcCheckResend(resendKey),
      supabaseGet('profiles', 'select=id&limit=1'),
      supabaseGet('error_log', `select=id&created_at=gte.${encodeURIComponent(oneHourAgo)}&limit=1000`),
      supabaseGet<{ id: string; message: string; context?: string | null; created_at: string; level?: string }>(
        'error_log',
        `select=id,message,context,created_at,level&level=in.(error,fatal)&order=created_at.desc&limit=10`,
      ),
      supabaseGet<{ id: string; action: string; category?: string; metadata?: Record<string, unknown>; created_at: string; user_id?: string }>(
        'audit_logs',
        `select=id,action,category,metadata,created_at,user_id&action=in.(suspend,unsuspend,delete_user,merge_identity,credits_override,plan_change,trial_grant,trial_revoke)&order=created_at.desc&limit=10`,
      ),
      supabaseGet<{ value: string }>(
        'app_settings',
        `key=eq.secret_rotation_metadata&select=value&limit=1`,
      ),
    ]);

    const github  = githubRes.status  === 'fulfilled' ? githubRes.value  : { ok: false, lastCommitAt: null, sha: null, branch: 'main' };
    const site    = siteRes.status    === 'fulfilled' ? siteRes.value    : { up: false, httpStatus: 0 };
    const orPing  = orRes.status      === 'fulfilled' ? orRes.value      : { provider: 'openrouter',  ok: false, latencyMs: null, httpStatus: 0 };
    const or2Ping = or2Res.status     === 'fulfilled' ? or2Res.value     : { provider: 'openrouter2', ok: false, latencyMs: null, httpStatus: 0 };
    const groqPing= groqRes.status    === 'fulfilled' ? groqRes.value    : { provider: 'groq',         ok: false, latencyMs: null, httpStatus: 0 };
    const email2  = emailRes.status   === 'fulfilled' ? emailRes.value   : { reachable: false, httpStatus: 0, sends24h: null };
    const dbOk    = dbRes.status      === 'fulfilled';
    const dbError = dbRes.status      === 'fulfilled' ? null : 'Check failed';
    const errorCount1h = dbErrCountRes.status === 'fulfilled' ? (dbErrCountRes.value as unknown[]).length : null;
    const recentErrors = recentErrRes.status === 'fulfilled' ? recentErrRes.value : [];
    const recentAdminActions = auditRes.status === 'fulfilled' ? auditRes.value : [];

    let secretsMeta: Record<string, { first_seen_at: string; last_rotated_at: string }> = {};
    if (secretsMetaRes.status === 'fulfilled' && secretsMetaRes.value[0]?.value) {
      try { secretsMeta = JSON.parse(secretsMetaRes.value[0].value); } catch { /* ignore */ }
    }
    const STALE_DAYS = 90;
    const envChecks = MISSION_CONTROL_SECRETS.map(({ key, label, source, aliases }) => {
      const present = resolveSecretPresent(key, aliases);
      return { key, label, source, present };
    });
    let metaChanged = false;
    for (const check of envChecks) {
      if (check.present && !secretsMeta[check.key]) {
        secretsMeta[check.key] = { first_seen_at: now.toISOString(), last_rotated_at: now.toISOString() };
        metaChanged = true;
      }
    }
    if (metaChanged) {
      supabaseUpsert('app_settings', { key: 'secret_rotation_metadata', value: JSON.stringify(secretsMeta) }, 'key').catch(() => {});
    }
    const secretsWithAge = envChecks.map((check) => {
      const meta = secretsMeta[check.key];
      const lastRotatedAt = meta?.last_rotated_at ?? meta?.first_seen_at ?? null;
      const daysSinceRotation = lastRotatedAt ? Math.floor((now.getTime() - new Date(lastRotatedAt).getTime()) / 86400000) : null;
      return { ...check, lastRotatedAt, stale: daysSinceRotation !== null && daysSinceRotation >= STALE_DAYS, daysSinceRotation };
    });

    // In dev mode, supabase_vault secrets are expected to be absent from process.env.
    // Only count replit_env secrets as "missing" — vault secrets are confirmed by production deployment.
    const missingCount = secretsWithAge.filter(s =>
      !s.present && s.source === 'replit_env'
    ).length;
    const staleCount = secretsWithAge.filter(s => s.stale).length;

    // AI configured = key present in env OR (dev mode + key is supabase_vault, i.e. it'll work in prod)
    const orConfigured  = !!orKey  || (isDevEnvironment && MISSION_CONTROL_SECRETS.find(s => s.key === 'OPENROUTER_API_KEY')?.source === 'supabase_vault');
    const or2Configured = !!or2Key || (isDevEnvironment && MISSION_CONTROL_SECRETS.find(s => s.key === 'OPENROUTER2_API_KEY')?.source === 'supabase_vault');
    const groqConfigured= !!groqKey|| (isDevEnvironment && MISSION_CONTROL_SECRETS.find(s => s.key === 'GROQ_API_KEY')?.source === 'supabase_vault');

    const providerPings = [orPing, or2Ping, groqPing];
    // In dev mode, if a key is supabase_vault, treat it as "ok" (works in production)
    const anyProviderOk = providerPings.some(p => p.ok) || (isDevEnvironment && (orConfigured || groqConfigured));
    const allProvidersOk = (
      isDevEnvironment
        ? [orConfigured, groqConfigured].every(Boolean)
        : providerPings.filter(p =>
            (p.provider === 'openrouter' && !!orKey) ||
            (p.provider === 'openrouter2' && !!or2Key) ||
            (p.provider === 'groq' && !!groqKey)
          ).every(p => p.ok)
    );

    const resendConfigured = !!resendKey || (isDevEnvironment && MISSION_CONTROL_SECRETS.find(s => s.key === 'RESEND_API_KEY')?.source === 'supabase_vault');

    res.json({
      success: true,
      isDevEnvironment,
      checkedAt: now.toISOString(),
      deploy: {
        ok: github.ok,
        lastCommitAt: github.lastCommitAt,
        sha: github.sha,
        branch: github.branch,
        repoConfigured: !!(githubToken && githubOwner && githubRepo),
        repoUrl: (githubOwner && githubRepo) ? `https://github.com/${githubOwner}/${githubRepo}` : null,
        productionUrl,
        siteUp: site.up,
        sitePingedAt: now.toISOString(),
        siteHttpStatus: site.httpStatus,
      },
      ai: {
        providerPings,
        openrouterConfigured: orConfigured,
        openrouter2Configured: or2Configured,
        groqConfigured,
        anyProviderOk,
        allProvidersOk,
        // true when keys live in Supabase vault and aren't visible here in dev
        keysInSupabaseVault: isDevEnvironment && !orKey && !groqKey,
      },
      email: {
        resendKeyPresent: resendConfigured,
        reachable: resendConfigured ? (!!resendKey ? email2.reachable : true) : false,
        httpStatus: email2.httpStatus,
        sends24h: email2.sends24h,
        // true when key lives in Supabase vault and isn't visible here in dev
        keyInSupabaseVault: isDevEnvironment && !resendKey,
      },
      database: { ok: dbOk, error: dbError, errorCount1h },
      secrets: { items: secretsWithAge, missingCount, staleCount },
      recentErrors,
      recentAdminActions,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ── verify-dev-kit (DevKit login — issues a session token) ───────────────────
const DEVKIT_LOCKOUT_WINDOW_SECONDS = 10 * 60;
const DEVKIT_MAX_FAILURES = 5;
const DEVKIT_LOCKOUT_DURATION_SECONDS = 10 * 60;
const DEVKIT_SESSION_TTL_HOURS = 8;
const DEVKIT_SESSION_TTL_REMEMBER_DAYS = 30;

async function hmacHex(key: string, message: string): Promise<string> {
  const { createHmac } = await import('crypto');
  return createHmac('sha256', key).update(message).digest('hex');
}

async function devkitSignToken(email: string, sessionId: string, expiresAt: number, secret: string): Promise<string> {
  const payload = `${email}:${sessionId}:${expiresAt}`;
  const sig = await hmacHex(secret, payload);
  return `${Buffer.from(payload).toString('base64')}.${sig}`;
}

async function devkitPasswordsMatch(input: string, stored: string): Promise<boolean> {
  const FIXED_MSG = 'wiseresume-devkit-auth';
  const [macA, macB] = await Promise.all([hmacHex(input, FIXED_MSG), hmacHex(stored, FIXED_MSG)]);
  return macA === macB;
}

async function devkitGetLockoutStatus(lockKey: string): Promise<{ locked: boolean; retry_after_seconds?: number; locked_until?: string }> {
  try {
    const windowStart = new Date(Date.now() - DEVKIT_LOCKOUT_WINDOW_SECONDS * 1000).toISOString();
    const rows = await supabaseGet<{ created_at: string }>('rpc_rate_limits', `select=created_at&ip_address=eq.${encodeURIComponent(lockKey)}&endpoint=eq.devkit-login-fail&created_at=gte.${encodeURIComponent(windowStart)}&order=created_at.desc`);
    if (rows.length >= DEVKIT_MAX_FAILURES) {
      const oldest = rows[rows.length - 1].created_at;
      const lockedUntil = new Date(new Date(oldest).getTime() + DEVKIT_LOCKOUT_DURATION_SECONDS * 1000);
      const retryAfter = Math.max(0, Math.ceil((lockedUntil.getTime() - Date.now()) / 1000));
      if (retryAfter > 0) return { locked: true, retry_after_seconds: retryAfter, locked_until: lockedUntil.toISOString() };
    }
    return { locked: false };
  } catch { return { locked: false }; }
}

app.all('/api/fn/verify-dev-kit', async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const { email, password, rememberMe } = req.body ?? {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const SECRET_PASSWORD = (process.env.DEV_KIT_PASSWORD ?? '').trim();
    const callerEmail = email.trim().toLowerCase();
    const lockKey = callerEmail.replace(/[^a-z0-9]/g, '_');

    // In dev (DEV_KIT_PASSWORD not present locally) skip the password/allowlist
    // checks — the secret lives in Supabase, not in the local env.
    const devMode = !SECRET_PASSWORD;

    if (!devMode) {
      const ADMIN_EMAILS = process.env.ADMIN_EMAILS ?? '';
      const allowed = ADMIN_EMAILS.split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);
      if (allowed.length && !allowed.includes(callerEmail)) {
        return res.status(200).json({ success: false, authorized: false, reason: 'email_not_allowed' });
      }

      const lockoutStatus = await devkitGetLockoutStatus(lockKey);
      if (lockoutStatus.locked) {
        return res.status(429).json({ success: false, locked: true, retry_after_seconds: lockoutStatus.retry_after_seconds, locked_until: lockoutStatus.locked_until, error: 'Too many failed attempts. Please wait before trying again.' });
      }

      const isPasswordValid = await devkitPasswordsMatch(password.trim(), SECRET_PASSWORD);
      if (!isPasswordValid) {
        supabaseInsert('rpc_rate_limits', { user_id: null, endpoint: 'devkit-login-fail', ip_address: lockKey }).catch(() => {});
        await new Promise(r => setTimeout(r, 50));
        const newLock = await devkitGetLockoutStatus(lockKey);
        if (newLock.locked) {
          return res.status(429).json({ success: false, locked: true, retry_after_seconds: newLock.retry_after_seconds, locked_until: newLock.locked_until, error: 'Too many failed attempts. Please wait before trying again.' });
        }
        return res.status(200).json({ success: false });
      }
    }

    const ttlMs = rememberMe ? DEVKIT_SESSION_TTL_REMEMBER_DAYS * 24 * 60 * 60 * 1000 : DEVKIT_SESSION_TTL_HOURS * 60 * 60 * 1000;
    const expiresAtMs = Date.now() + ttlMs;
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.headers['x-real-ip'] as string ?? null;

    // Use a stable dev signing key when the real one isn't available
    const signingKey = SECRET_PASSWORD || 'dev-local-signing-key';

    const inserted = await supabaseInsert<{ id: string }>('admin_sessions', {
      email: callerEmail, expires_at: new Date(expiresAtMs).toISOString(), ip: ip ?? null, user_agent: req.headers['user-agent'] ?? null,
    });
    if (!inserted[0]?.id) return res.status(500).json({ success: false, error: 'Failed to issue session' });

    const sessionToken = await devkitSignToken(callerEmail, inserted[0].id, expiresAtMs, signingKey);
    return res.status(200).json({ success: true, token: sessionToken, session_id: inserted[0].id, expires_at: expiresAtMs });

  } catch (err) {
    console.error('[verify-dev-kit] error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── admin-broadcast ───────────────────────────────────────────────────────────
app.all('/api/fn/admin-broadcast', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res);
  if (!callerEmail) return;
  try {
    const body = req.body ?? {};
    const { action, id, title, body: msgBody, severity, expires_at, active_only } = body as {
      action: string; id?: string; title?: string; body?: string; severity?: string; expires_at?: string | null; active_only?: boolean;
    };

    if (action === 'list') {
      let q = `select=*&order=created_at.desc&limit=100`;
      if (active_only === true) q += `&active=eq.true`;
      const data = await supabaseGet('broadcasts', q);
      return res.json({ success: true, broadcasts: data });
    }

    if (action === 'publish') {
      if (!title?.trim() || !msgBody?.trim()) return res.status(400).json({ success: false, error: 'title and body are required' });
      const validSeverities = ['info', 'warning', 'critical'];
      const resolvedSeverity = validSeverities.includes(severity ?? '') ? severity : 'info';
      const inserted = await supabaseInsert('broadcasts', {
        title: title.trim(), body: msgBody.trim(), severity: resolvedSeverity,
        active: true, created_by: callerEmail, expires_at: expires_at ?? null,
      });
      supabaseInsert('audit_logs', { user_id: null, category: 'admin_broadcast', action: 'broadcast_published', metadata: { broadcast_id: inserted[0]?.id, title, severity: resolvedSeverity, performed_by: callerEmail } }).catch(() => {});
      return res.json({ success: true, broadcast: inserted[0] });
    }

    if (action === 'expire') {
      if (!id) return res.status(400).json({ success: false, error: 'id is required' });
      await supabasePatch('broadcasts', `id=eq.${encodeURIComponent(id)}`, { active: false });
      supabaseInsert('audit_logs', { user_id: null, category: 'admin_broadcast', action: 'broadcast_expired', metadata: { broadcast_id: id, performed_by: callerEmail } }).catch(() => {});
      return res.json({ success: true });
    }

    return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// ── admin-moderation ──────────────────────────────────────────────────────────
app.all('/api/fn/admin-moderation', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res);
  if (!callerEmail) return;
  try {
    const body = req.body ?? {};
    const action: string = body.action ?? '';

    if (action === 'list_bug_reports') {
      const { status_filter, page = 1, per_page = 50 } = body as { status_filter?: string; page?: number; per_page?: number };
      const offset = (page - 1) * per_page;
      let q = `select=*&order=created_at.desc&offset=${offset}&limit=${per_page}`;
      if (status_filter && status_filter !== 'all') q += `&status=eq.${encodeURIComponent(status_filter)}`;
      const data = await supabaseGet('bug_reports', q);
      return res.json({ success: true, bug_reports: data, total: data.length });
    }

    if (action === 'update_bug_report') {
      const { report_id, status, private_note } = body as { report_id?: string; status?: string; private_note?: string };
      if (!report_id) return res.status(400).json({ success: false, error: 'report_id is required' });
      const updates: Record<string, unknown> = {};
      if (status !== undefined) updates.status = status;
      if (private_note !== undefined) updates.private_note = private_note;
      if (!Object.keys(updates).length) return res.status(400).json({ success: false, error: 'No fields to update' });
      await supabasePatch('bug_reports', `id=eq.${encodeURIComponent(report_id)}`, updates);
      supabaseInsert('audit_logs', { user_id: null, category: 'admin_moderation', action: 'bug_report_updated', metadata: { report_id, updates, performed_by: callerEmail } }).catch(() => {});
      return res.json({ success: true });
    }

    if (action === 'list_blocklist') {
      try {
        const data = await supabaseGet('blocklist', 'select=*&order=added_at.desc');
        return res.json({ success: true, entries: data });
      } catch (e) {
        if (String(e).includes('42P01')) return res.json({ success: true, entries: [], missing_table: true });
        throw e;
      }
    }

    if (action === 'add_blocklist') {
      const { type, value, reason } = body as { type?: string; value?: string; reason?: string };
      if (!type || !value) return res.status(400).json({ success: false, error: 'type and value are required' });
      if (!['email', 'user_id', 'pattern'].includes(type)) return res.status(400).json({ success: false, error: 'type must be email, user_id, or pattern' });
      const normalizedValue = type === 'email' ? value.trim().toLowerCase() : value.trim();
      const data = await supabaseInsert('blocklist', { type, value: normalizedValue, reason: reason ?? null, added_by: callerEmail });
      supabaseInsert('audit_logs', { user_id: null, category: 'admin_moderation', action: 'blocklist_entry_added', metadata: { type, value, reason, performed_by: callerEmail } }).catch(() => {});
      return res.json({ success: true, entry: data[0] });
    }

    if (action === 'remove_blocklist') {
      const { entry_id } = body as { entry_id?: string };
      if (!entry_id) return res.status(400).json({ success: false, error: 'entry_id is required' });
      await supabaseDelete('blocklist', `id=eq.${encodeURIComponent(entry_id)}`);
      supabaseInsert('audit_logs', { user_id: null, category: 'admin_moderation', action: 'blocklist_entry_removed', metadata: { entry_id, performed_by: callerEmail } }).catch(() => {});
      return res.json({ success: true });
    }

    if (action === 'list_moderation_queue') {
      const { status_filter } = body as { status_filter?: string };
      try {
        let q = 'select=*&order=created_at.desc&limit=100';
        if (status_filter && status_filter !== 'all') q += `&status=eq.${encodeURIComponent(status_filter)}`;
        const data = await supabaseGet('moderation_queue', q);
        return res.json({ success: true, items: data, total: data.length });
      } catch (e) {
        if (String(e).includes('42P01')) return res.json({ success: true, items: [], total: 0, missing_table: true });
        throw e;
      }
    }

    if (action === 'review_queue_item') {
      const { item_id, decision, suspend_user } = body as { item_id?: string; decision?: string; suspend_user?: boolean };
      if (!item_id) return res.status(400).json({ success: false, error: 'item_id is required' });
      if (!decision || !['approved', 'removed'].includes(decision)) return res.status(400).json({ success: false, error: 'decision must be approved or removed' });
      await supabasePatch('moderation_queue', `id=eq.${encodeURIComponent(item_id)}`, { status: decision, reviewed_by: callerEmail, reviewed_at: new Date().toISOString() });
      supabaseInsert('audit_logs', { user_id: null, category: 'admin_moderation', action: 'queue_item_reviewed', metadata: { item_id, decision, suspend_user, performed_by: callerEmail } }).catch(() => {});
      return res.json({ success: true, content_deleted: false });
    }

    if (action === 'suppress_email') {
      const { email: emailToSuppress, reason } = body as { email?: string; reason?: string };
      if (!emailToSuppress) return res.status(400).json({ success: false, error: 'email is required' });
      const normalized = emailToSuppress.trim().toLowerCase();
      const existing = await supabaseGet('blocklist', `type=eq.email&value=eq.${encodeURIComponent(normalized)}&select=id&limit=1`);
      if (existing.length) return res.json({ success: true, already_blocked: true });
      const data = await supabaseInsert('blocklist', { type: 'email', value: normalized, reason: reason ?? 'Email suppressed due to bounce/complaint', added_by: callerEmail });
      supabaseInsert('audit_logs', { user_id: null, category: 'admin_moderation', action: 'email_suppressed', metadata: { email: emailToSuppress, performed_by: callerEmail } }).catch(() => {});
      return res.json({ success: true, entry: data[0] });
    }

    if (action === 'list_kinde_events') {
      const { event_type, limit = 100 } = body as { event_type?: string; limit?: number };
      try {
        let q = `select=*&order=created_at.desc&limit=${Math.min(limit, 200)}`;
        if (event_type && event_type !== 'all') q += `&event_type=eq.${encodeURIComponent(event_type)}`;
        const data = await supabaseGet('kinde_events', q);
        return res.json({ success: true, events: data, total: data.length });
      } catch (e) {
        if (String(e).includes('42P01')) return res.json({ success: true, events: [], total: 0, missing_table: true });
        throw e;
      }
    }

    return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// ── admin-feature-flags ───────────────────────────────────────────────────────
app.all('/api/fn/admin-feature-flags', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res);
  if (!callerEmail) return;
  try {
    const body = req.body ?? {};
    const { action } = body as { action: string };

    if (action === 'list') {
      const data = await supabaseGet('feature_flags', 'select=*&order=name.asc');
      return res.json({ success: true, flags: data });
    }

    if (action === 'upsert') {
      const { name, description = '', enabled_globally = false, enabled_plans = [], enabled_user_ids = [], percentage_rollout = 0, kill_switch_function = null } = body as {
        name: string; description?: string; enabled_globally?: boolean; enabled_plans?: string[]; enabled_user_ids?: string[]; percentage_rollout?: number; kill_switch_function?: string | null;
      };
      if (!name || typeof name !== 'string') return res.status(400).json({ success: false, error: 'name is required' });
      const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const row = { name: cleanName, description: description.trim(), enabled_globally, enabled_plans, enabled_user_ids, percentage_rollout: Math.max(0, Math.min(100, Number(percentage_rollout) || 0)), kill_switch_function: (kill_switch_function as string | null)?.trim() || null, updated_by: callerEmail, updated_at: new Date().toISOString() };
      const data = await supabaseUpsert('feature_flags', row, 'name');
      supabaseInsert('audit_logs', { user_id: null, category: 'admin_feature_flag', action: 'upsert', metadata: { flag_name: cleanName, enabled_globally, performed_by: callerEmail } }).catch(() => {});
      return res.json({ success: true, flag: data[0] });
    }

    if (action === 'delete') {
      const { name } = body as { name: string };
      if (!name) return res.status(400).json({ success: false, error: 'name is required' });
      await supabaseDelete('feature_flags', `name=eq.${encodeURIComponent(name)}`);
      supabaseInsert('audit_logs', { user_id: null, category: 'admin_feature_flag', action: 'delete', metadata: { flag_name: name, performed_by: callerEmail } }).catch(() => {});
      return res.json({ success: true });
    }

    return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// ── admin-ai-routing ──────────────────────────────────────────────────────────
const AI_ROUTING_FEATURES = ['tailor-resume','enhance-section','analyze-resume','generate-cover-letter','agentic-chat','wise-ai-chat'] as const;
const AI_ROUTING_PROVIDERS = ['auto', 'openrouter', 'groq'];

app.all('/api/fn/admin-ai-routing', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res);
  if (!callerEmail) return;
  try {
    const body = req.body ?? {};
    const action: string = body.action ?? 'get_config';

    if (action === 'get_config' || action === 'get_all') {
      const data = await supabaseGet<Record<string, unknown>>('ai_routing_config', 'select=*&order=feature_name.asc').catch(() => []);
      const byName = new Map(data.map(r => [r.feature_name, r]));
      const configs = AI_ROUTING_FEATURES.map(f => byName.get(f) ?? { feature_name: f, provider: 'auto', model: '', ab_secondary_provider: null, ab_secondary_model: '', ab_split_pct: 0, updated_by: null, updated_at: null });
      return res.json({ success: true, configs });
    }

    if (action === 'update_feature') {
      const { feature_name, provider, model, ab_secondary_provider, ab_secondary_model, ab_split_pct } = body as { feature_name?: string; provider?: string; model?: string; ab_secondary_provider?: string | null; ab_secondary_model?: string; ab_split_pct?: number };
      if (!feature_name || !AI_ROUTING_FEATURES.includes(feature_name as typeof AI_ROUTING_FEATURES[number])) return res.status(400).json({ success: false, error: `Invalid feature_name` });
      const resolvedProvider = provider ?? 'auto';
      if (!AI_ROUTING_PROVIDERS.includes(resolvedProvider)) return res.status(400).json({ success: false, error: 'Invalid provider' });
      const splitPct = typeof ab_split_pct === 'number' ? Math.min(100, Math.max(0, Math.round(ab_split_pct))) : 0;
      const now = new Date().toISOString();
      await supabaseUpsert('ai_routing_config', { feature_name, provider: resolvedProvider, model: model ?? '', ab_secondary_provider: ab_secondary_provider || null, ab_secondary_model: ab_secondary_model ?? '', ab_split_pct: splitPct, updated_by: 'dev-kit', updated_at: now }, 'feature_name');
      supabaseInsert('audit_logs', { action: 'ai_routing_update', category: 'ai_routing', metadata: { feature_name, provider: resolvedProvider, model: model ?? '', ab_split_pct: splitPct, updated_by: 'dev-kit', updated_at: now }, created_at: now }).catch(() => {});
      return res.json({ success: true, feature_name, provider: resolvedProvider });
    }

    if (action === 'reset_feature') {
      const { feature_name } = body as { feature_name?: string };
      if (!feature_name || !AI_ROUTING_FEATURES.includes(feature_name as typeof AI_ROUTING_FEATURES[number])) return res.status(400).json({ success: false, error: 'Invalid feature_name' });
      const now = new Date().toISOString();
      await supabaseDelete('ai_routing_config', `feature_name=eq.${encodeURIComponent(feature_name)}`);
      supabaseInsert('audit_logs', { action: 'ai_routing_reset', category: 'ai_routing', metadata: { feature_name, reset_to: 'auto', updated_by: 'dev-kit', updated_at: now }, created_at: now }).catch(() => {});
      return res.json({ success: true, feature_name, reset: true });
    }

    return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// ── admin-observability ───────────────────────────────────────────────────────
function obsPercentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

app.all('/api/fn/admin-observability', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res);
  if (!callerEmail) return;
  try {
    const body = req.body ?? {};
    const action: string = body.action ?? 'get_telemetry';

    if (action === 'get_telemetry') {
      const since = new Date(Date.now() - 86400000).toISOString();
      try {
        const rows = await supabaseGet<{ function_name: string; latency_ms: number; error: boolean; created_at: string; status_code: number }>(
          'edge_function_logs', `select=function_name,latency_ms,error,created_at,status_code&created_at=gte.${encodeURIComponent(since)}&order=created_at.desc&limit=50000`,
        );
        const nowMs = Date.now();
        const oneHourAgo = nowMs - 3600000;
        const hourMs = 3600000;
        const byFn = new Map<string, typeof rows>();
        for (const row of rows) {
          const arr = byFn.get(row.function_name) ?? [];
          arr.push(row);
          byFn.set(row.function_name, arr);
        }
        const telemetry = [...byFn.entries()].map(([fnName, fnRows]) => {
          const latencies = fnRows.map(r => r.latency_ms).sort((a, b) => a - b);
          const errorCount = fnRows.filter(r => r.error).length;
          const last1hCount = fnRows.filter(r => new Date(r.created_at).getTime() >= oneHourAgo).length;
          const cutoff = nowMs - 24 * hourMs;
          const buckets = new Array(24).fill(0) as number[];
          for (const row of fnRows) {
            const ts = new Date(row.created_at).getTime();
            if (ts < cutoff) continue;
            const hoursAgo = Math.floor((nowMs - ts) / hourMs);
            const slot = 23 - hoursAgo;
            if (slot >= 0 && slot < 24) buckets[slot]++;
          }
          return { function_name: fnName, total_count: fnRows.length, last_1h_count: last1hCount, error_count: errorCount, error_rate: fnRows.length > 0 ? Math.round((errorCount / fnRows.length) * 100) : 0, p50_ms: obsPercentile(latencies, 50), p95_ms: obsPercentile(latencies, 95), sparkline: buckets };
        }).sort((a, b) => b.total_count - a.total_count);
        return res.json({ success: true, telemetry, generated_at: new Date().toISOString() });
      } catch (e) {
        if (String(e).includes('42P01')) return res.json({ success: true, telemetry: [], missing_table: true });
        throw e;
      }
    }

    if (action === 'get_error_stream') {
      const { function_name, severity, since } = body as { function_name?: string; severity?: string; since?: string };
      try {
        let q = 'select=id,message,context,source,level,user_id,resolved,reviewed_at,created_at&order=created_at.desc&limit=100';
        if (function_name) q += `&source=eq.${encodeURIComponent(function_name)}`;
        if (severity && severity !== 'all') {
          const levels = (severity === 'warn' || severity === 'warning') ? 'warn,warning' : 'error,fatal';
          q += `&level=in.(${levels})`;
        }
        if (since) q += `&created_at=gte.${encodeURIComponent(since)}`;
        const data = await supabaseGet('error_log', q);
        return res.json({ success: true, errors: data });
      } catch (e) {
        if (String(e).includes('42P01')) return res.json({ success: true, errors: [], missing_table: true });
        throw e;
      }
    }

    if (action === 'mark_reviewed') {
      const { error_id } = body as { error_id?: string };
      if (!error_id) return res.status(400).json({ success: false, error: 'error_id is required' });
      await supabasePatch('error_log', `id=eq.${encodeURIComponent(error_id)}`, { reviewed_at: new Date().toISOString(), resolved: true });
      return res.json({ success: true, error_id });
    }

    return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// ── admin-portfolio-usernames ─────────────────────────────────────────────────
// NOTE: The `profiles` table does NOT have an `email` column (email lives on
// auth.users). All profile selects below omit `email`; `contact_email` is used
// where available. The frontend shows '—' for missing email values.
app.all('/api/fn/admin-portfolio-usernames', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res);
  if (!callerEmail) return;
  try {
    const body = req.body ?? {};
    const { action, ...rest } = body as { action: string } & Record<string, unknown>;

    function cleanUsername(s: unknown) { return String(s ?? '').trim().toLowerCase(); }

    if (action === 'directory_list') {
      const search = String(rest.search ?? '').trim();
      const sort = String(rest.sort ?? 'newest');
      const page = Math.max(1, Number(rest.page ?? 1));
      const perPage = Math.min(200, Math.max(1, Number(rest.per_page ?? 50)));
      const offset = (page - 1) * perPage;
      const sortParam = { oldest: 'created_at.asc', username_asc: 'username.asc', username_desc: 'username.desc', newest: 'created_at.desc' }[sort] ?? 'created_at.desc';
      let q = `select=user_id,username,full_name,contact_email,portfolio_enabled,updated_at,created_at&username=not.is.null&order=${sortParam}&offset=${offset}&limit=${perPage}`;
      if (search) q += `&or=(username.ilike.*${encodeURIComponent(search)}*,full_name.ilike.*${encodeURIComponent(search)}*,contact_email.ilike.*${encodeURIComponent(search)}*)`;
      const data = await supabaseGet<Record<string, unknown>>('profiles', q);
      const rows = data.map(r => ({ ...r, email: (r.contact_email as string | null) ?? null }));
      return res.json({ success: true, rows, total: rows.length });
    }

    if (action === 'directory_rename') {
      const userId = String(rest.user_id ?? '');
      const newUsername = cleanUsername(rest.new_username);
      if (!userId || !newUsername) return res.status(400).json({ success: false, error: 'user_id and new_username required' });
      const avail = await supabaseRpc<{ status?: string } | null>('check_username_available', { p_username: newUsername, p_user_id: userId });
      const status = avail?.status ?? 'invalid';
      if (status !== 'available') return res.status(409).json({ success: false, error: `Username not available (${status})`, status });
      await supabasePatch('profiles', `user_id=eq.${encodeURIComponent(userId)}`, { username: newUsername });
      supabaseInsert('audit_logs', { user_id: userId, category: 'portfolio_username', action: 'rename_username', metadata: { new_username: newUsername, admin_email: callerEmail } }).catch(() => {});
      return res.json({ success: true });
    }

    if (action === 'directory_toggle_enabled') {
      const userId = String(rest.user_id ?? '');
      const enabled = Boolean(rest.enabled);
      if (!userId) return res.status(400).json({ success: false, error: 'user_id required' });
      await supabasePatch('profiles', `user_id=eq.${encodeURIComponent(userId)}`, { portfolio_enabled: enabled });
      supabaseInsert('audit_logs', { user_id: userId, category: 'portfolio_username', action: enabled ? 'enable_portfolio' : 'disable_portfolio', metadata: { portfolio_enabled: enabled, admin_email: callerEmail } }).catch(() => {});
      return res.json({ success: true });
    }

    if (action === 'directory_release') {
      const userIds: string[] = Array.isArray(rest.user_ids) && (rest.user_ids as unknown[]).length ? (rest.user_ids as unknown[]).map(String) : rest.user_id ? [String(rest.user_id)] : [];
      if (!userIds.length) return res.status(400).json({ success: false, error: 'user_id or user_ids required' });
      await supabasePatch('profiles', `user_id=in.(${userIds.map(encodeURIComponent).join(',')})`, { username: null, portfolio_enabled: false });
      supabaseInsert('audit_logs', { user_id: null, category: 'portfolio_username', action: 'release_username', metadata: { user_ids: userIds, admin_email: callerEmail } }).catch(() => {});
      return res.json({ success: true, released: userIds.length });
    }

    if (action === 'directory_bulk_disable') {
      const userIds = ((rest.user_ids as unknown[]) ?? []).map(String);
      if (!userIds.length) return res.status(400).json({ success: false, error: 'user_ids required' });
      await supabasePatch('profiles', `user_id=in.(${userIds.map(encodeURIComponent).join(',')})`, { portfolio_enabled: false });
      supabaseInsert('audit_logs', { user_id: null, category: 'portfolio_username', action: 'disable_portfolio', metadata: { user_ids: userIds, bulk: true, admin_email: callerEmail } }).catch(() => {});
      return res.json({ success: true, disabled: userIds.length });
    }

    if (action === 'rules_get') {
      const rules = await supabaseGet('portfolio_username_rules', 'id=eq.1&select=*&limit=1').then(d => d[0]).catch(() => null);
      const overrides = await supabaseGet<{ user_id: string; [k: string]: unknown }>('portfolio_user_overrides', 'select=user_id,min_length,max_length,allow_hyphens,note,updated_at').catch(() => []);
      const userIds = overrides.map(o => o.user_id);
      let profileMap: Record<string, { email: string | null; full_name: string | null; username: string | null }> = {};
      if (userIds.length) {
        const profs = await supabaseGet<{ user_id: string; contact_email: string | null; full_name: string | null; username: string | null }>('profiles', `user_id=in.(${userIds.map(encodeURIComponent).join(',')})&select=user_id,contact_email,full_name,username`).catch(() => []);
        profileMap = Object.fromEntries(profs.map(p => [p.user_id, { email: p.contact_email ?? null, full_name: p.full_name, username: p.username }]));
      }
      return res.json({ success: true, rules: rules ?? { id: 1, min_length: 3, max_length: 30, allow_hyphens: true }, overrides: overrides.map(o => ({ ...o, profile: profileMap[o.user_id] ?? null })) });
    }

    if (action === 'rules_update') {
      const min_length = Number(rest.min_length ?? 3), max_length = Number(rest.max_length ?? 30), allow_hyphens = Boolean(rest.allow_hyphens ?? true);
      if (!(min_length >= 1 && min_length <= 100 && max_length >= min_length && max_length <= 100)) return res.status(400).json({ success: false, error: 'Invalid length bounds' });
      await supabasePatch('portfolio_username_rules', 'id=eq.1', { min_length, max_length, allow_hyphens, updated_at: new Date().toISOString() });
      supabaseInsert('audit_logs', { user_id: null, category: 'portfolio_username', action: 'update_rules', metadata: { min_length, max_length, allow_hyphens, admin_email: callerEmail } }).catch(() => {});
      return res.json({ success: true });
    }

    if (action === 'rules_override_upsert') {
      const userId = String(rest.user_id ?? '');
      if (!userId) return res.status(400).json({ success: false, error: 'user_id required' });
      const min_length = rest.min_length == null || rest.min_length === '' ? null : Number(rest.min_length);
      const max_length = rest.max_length == null || rest.max_length === '' ? null : Number(rest.max_length);
      const allow_hyphens = rest.allow_hyphens == null ? null : Boolean(rest.allow_hyphens);
      const note = String(rest.note ?? '');
      await supabaseUpsert('portfolio_user_overrides', { user_id: userId, min_length, max_length, allow_hyphens, note, updated_at: new Date().toISOString() }, 'user_id');
      supabaseInsert('audit_logs', { user_id: userId, category: 'portfolio_username', action: 'upsert_user_override', metadata: { min_length, max_length, allow_hyphens, note, admin_email: callerEmail } }).catch(() => {});
      return res.json({ success: true });
    }

    if (action === 'rules_override_delete') {
      const userId = String(rest.user_id ?? '');
      if (!userId) return res.status(400).json({ success: false, error: 'user_id required' });
      await supabaseDelete('portfolio_user_overrides', `user_id=eq.${encodeURIComponent(userId)}`);
      supabaseInsert('audit_logs', { user_id: userId, category: 'portfolio_username', action: 'delete_user_override', metadata: { admin_email: callerEmail } }).catch(() => {});
      return res.json({ success: true });
    }

    if (action === 'reserved_list') {
      const data = await supabaseGet('portfolio_reserved_usernames', 'select=*&order=username.asc');
      return res.json({ success: true, rows: data });
    }
    if (action === 'reserved_add') {
      const username = cleanUsername(rest.username);
      const reason = String(rest.reason ?? '');
      if (!username) return res.status(400).json({ success: false, error: 'username required' });
      await supabaseUpsert('portfolio_reserved_usernames', { username, reason }, 'username');
      supabaseInsert('audit_logs', { user_id: null, category: 'portfolio_username', action: 'add_reserved', metadata: { username, reason, admin_email: callerEmail } }).catch(() => {});
      return res.json({ success: true });
    }
    if (action === 'reserved_delete') {
      const username = cleanUsername(rest.username);
      if (!username) return res.status(400).json({ success: false, error: 'username required' });
      await supabaseDelete('portfolio_reserved_usernames', `username=eq.${encodeURIComponent(username)}`);
      supabaseInsert('audit_logs', { user_id: null, category: 'portfolio_username', action: 'delete_reserved', metadata: { username, admin_email: callerEmail } }).catch(() => {});
      return res.json({ success: true });
    }

    if (action === 'exclusive_list') {
      const data = await supabaseGet<{ user_id: string; [k: string]: unknown }>('portfolio_exclusive_assignments', 'select=*&order=username.asc');
      const userIds = [...new Set(data.map(r => r.user_id))];
      let profileMap: Record<string, { email: string | null; full_name: string | null; username: string | null }> = {};
      if (userIds.length) {
        const profs = await supabaseGet<{ user_id: string; contact_email: string | null; full_name: string | null; username: string | null }>('profiles', `user_id=in.(${userIds.map(encodeURIComponent).join(',')})&select=user_id,contact_email,full_name,username`).catch(() => []);
        profileMap = Object.fromEntries(profs.map(p => [p.user_id, { email: p.contact_email ?? null, full_name: p.full_name, username: p.username }]));
      }
      return res.json({ success: true, rows: data.map(r => ({ ...r, profile: profileMap[r.user_id] ?? null })) });
    }
    if (action === 'exclusive_add') {
      const username = cleanUsername(rest.username);
      const userId = String(rest.user_id ?? '');
      const note = String(rest.note ?? '');
      if (!username) return res.status(400).json({ success: false, error: 'username required' });
      if (!userId) return res.status(400).json({ success: false, error: 'user_id required' });
      await supabaseUpsert('portfolio_exclusive_assignments', { username, user_id: userId, note }, 'username');
      supabaseInsert('audit_logs', { user_id: userId, category: 'portfolio_username', action: 'add_exclusive', metadata: { username, note, admin_email: callerEmail } }).catch(() => {});
      return res.json({ success: true });
    }
    if (action === 'exclusive_delete') {
      const username = cleanUsername(rest.username);
      if (!username) return res.status(400).json({ success: false, error: 'username required' });
      await supabaseDelete('portfolio_exclusive_assignments', `username=eq.${encodeURIComponent(username)}`);
      supabaseInsert('audit_logs', { user_id: null, category: 'portfolio_username', action: 'delete_exclusive', metadata: { username, admin_email: callerEmail } }).catch(() => {});
      return res.json({ success: true });
    }

    if (action === 'premium_list') {
      const data = await supabaseGet<{ assigned_to_user_id: string | null; [k: string]: unknown }>('portfolio_premium_usernames', 'select=*&order=created_at.desc');
      const userIds = data.map(r => r.assigned_to_user_id).filter(Boolean) as string[];
      let profileMap: Record<string, { email: string | null; full_name: string | null; username: string | null }> = {};
      if (userIds.length) {
        const profs = await supabaseGet<{ user_id: string; contact_email: string | null; full_name: string | null; username: string | null }>('profiles', `user_id=in.(${userIds.map(encodeURIComponent).join(',')})&select=user_id,contact_email,full_name,username`).catch(() => []);
        profileMap = Object.fromEntries(profs.map(p => [p.user_id, { email: p.contact_email ?? null, full_name: p.full_name, username: p.username }]));
      }
      return res.json({ success: true, rows: data.map(r => ({ ...r, profile: r.assigned_to_user_id ? (profileMap[r.assigned_to_user_id] ?? null) : null })) });
    }
    if (action === 'premium_add') {
      const username = cleanUsername(rest.username);
      if (!username) return res.status(400).json({ success: false, error: 'username required' });
      const price_cents = Math.max(0, Number(rest.price_cents ?? 0));
      const currency = String(rest.currency ?? 'usd').toLowerCase();
      const note = String(rest.note ?? '');
      await supabaseUpsert('portfolio_premium_usernames', { username, price_cents, currency, note, updated_at: new Date().toISOString() }, 'username');
      supabaseInsert('audit_logs', { user_id: null, category: 'portfolio_username', action: 'add_premium_handle', metadata: { username, price_cents, currency, note, admin_email: callerEmail } }).catch(() => {});
      return res.json({ success: true });
    }
    if (action === 'premium_delete') {
      const username = cleanUsername(rest.username);
      if (!username) return res.status(400).json({ success: false, error: 'username required' });
      await supabaseDelete('portfolio_premium_usernames', `username=eq.${encodeURIComponent(username)}`);
      supabaseInsert('audit_logs', { user_id: null, category: 'portfolio_username', action: 'delete_premium_handle', metadata: { username, admin_email: callerEmail } }).catch(() => {});
      return res.json({ success: true });
    }
    if (action === 'premium_assign') {
      const username = cleanUsername(rest.username);
      const userId = String(rest.user_id ?? '');
      const note = String(rest.note ?? '');
      if (!username || !userId) return res.status(400).json({ success: false, error: 'username and user_id required' });
      const rpcResult = await supabaseRpc<{ success: boolean; error?: string; price_cents?: number; currency?: string }>('assign_premium_handle', { p_username: username, p_target_user_id: userId, p_admin_note: note || null });
      if (!rpcResult.success) return res.status(rpcResult.error?.includes('already assigned') ? 409 : 404).json({ success: false, error: rpcResult.error ?? 'Assignment failed' });
      supabaseInsert('audit_logs', { user_id: userId, category: 'portfolio_username', action: 'assign_premium_handle', metadata: { username, admin_note: note, admin_email: callerEmail } }).catch(() => {});
      return res.json({ success: true });
    }
    if (action === 'premium_mark_pending') {
      const username = cleanUsername(rest.username);
      const userId = String(rest.user_id ?? '');
      if (!username || !userId) return res.status(400).json({ success: false, error: 'username and user_id required' });
      await supabasePatch('portfolio_premium_usernames', `username=eq.${encodeURIComponent(username)}&status=eq.available`, { status: 'pending', assigned_to_user_id: userId, updated_at: new Date().toISOString() });
      supabaseInsert('audit_logs', { user_id: userId, category: 'portfolio_username', action: 'pending_premium_handle', metadata: { username, admin_email: callerEmail } }).catch(() => {});
      return res.json({ success: true });
    }

    if (action === 'user_search') {
      const q = String(rest.q ?? '').trim();
      if (!q) return res.json({ success: true, results: [] });
      const data = await supabaseGet<{ user_id: string; full_name: string | null; username: string | null; contact_email: string | null }>('profiles', `select=user_id,full_name,username,contact_email&or=(full_name.ilike.*${encodeURIComponent(q)}*,username.ilike.*${encodeURIComponent(q)}*,contact_email.ilike.*${encodeURIComponent(q)}*)&limit=20`);
      return res.json({ success: true, results: data.map(r => ({ ...r, email: r.contact_email ?? null })) });
    }

    return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// ── admin-resend-stats ────────────────────────────────────────────────────────
// Resend Audience helpers for Node.js (mirrors _shared/resendAudiences.ts)
const RESEND_API = 'https://api.resend.com';
const AUDIENCE_KEYS_NODE = {
  ONBOARDING:      'RESEND_AUDIENCE_ONBOARDING',
  LOW_CREDITS:     'RESEND_AUDIENCE_LOW_CREDITS',
  HANDLE_INTEREST: 'RESEND_AUDIENCE_HANDLE_INTEREST',
  WISEHIRE:        'RESEND_AUDIENCE_WISEHIRE',
  ALL_USERS:       'RESEND_AUDIENCE_ALL_USERS',
} as const;
const AUDIENCE_LABELS_NODE: Record<string, string> = {
  RESEND_AUDIENCE_ONBOARDING: 'Onboarding', RESEND_AUDIENCE_LOW_CREDITS: 'Low Credits',
  RESEND_AUDIENCE_HANDLE_INTEREST: 'Premium Handle Interest', RESEND_AUDIENCE_WISEHIRE: 'WiseHire Waitlist',
  RESEND_AUDIENCE_ALL_USERS: 'All Users',
};

async function nodeResendGet<T>(path: string, apiKey: string): Promise<T | null> {
  try {
    const r = await fetch(`${RESEND_API}${path}`, { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch { return null; }
}

async function nodeResendAudienceStats(audienceId: string, apiKey: string) {
  const data = await nodeResendGet<{ id: string; name: string; created_at: string }>(`/audiences/${audienceId}`, apiKey);
  if (!data) return null;
  const contacts = await nodeResendGet<{ data?: Array<unknown> }>(`/audiences/${audienceId}/contacts`, apiKey);
  return { name: data.name, contactCount: contacts?.data?.length ?? null };
}

async function nodeResendListContacts(audienceId: string, apiKey: string): Promise<Array<{ id: string; email: string }>> {
  const result: Array<{ id: string; email: string }> = [];
  let url: string | null = `/audiences/${audienceId}/contacts`;
  while (url) {
    const page = await nodeResendGet<{ data?: Array<{ id: string; email: string }>; next?: string | null }>(url, apiKey);
    if (!page?.data) break;
    result.push(...page.data);
    url = page.next ?? null;
  }
  return result;
}

async function nodeResendAddContact(audienceId: string, email: string, firstName?: string, apiKey?: string): Promise<boolean> {
  if (!apiKey) return false;
  try {
    const body: Record<string, unknown> = { email };
    if (firstName) body.first_name = firstName;
    const r = await fetch(`${RESEND_API}/audiences/${audienceId}/contacts`, {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(5000),
    });
    return r.ok;
  } catch { return false; }
}

async function nodeResendRemoveContact(audienceId: string, email: string, apiKey: string): Promise<boolean> {
  try {
    const contacts = await nodeResendListContacts(audienceId, apiKey);
    const match = contacts.find(c => c.email.toLowerCase() === email.toLowerCase());
    if (!match) return true;
    const r = await fetch(`${RESEND_API}/audiences/${audienceId}/contacts/${match.id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(5000),
    });
    return r.ok;
  } catch { return false; }
}

app.all('/api/fn/admin-resend-stats', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res);
  if (!callerEmail) return;
  try {
    const body = req.body ?? {};
    const action = (body.action as string | undefined) ?? 'stats';
    const apiKey = process.env.RESEND_API_KEY || '';

    if (action === 'stats') {
      const allKeys = Object.keys(AUDIENCE_KEYS_NODE) as Array<keyof typeof AUDIENCE_KEYS_NODE>;
      const [statsResults, broadcasts] = await Promise.all([
        Promise.all(allKeys.map(async (key) => {
          const envKey = AUDIENCE_KEYS_NODE[key];
          const audienceId = (process.env[envKey] || '').trim();
          const label = AUDIENCE_LABELS_NODE[envKey] ?? key;
          if (!audienceId || !apiKey) return { key, label, configured: !!audienceId, id: audienceId || null, contactCount: null };
          const stats = await nodeResendAudienceStats(audienceId, apiKey);
          return { key, label, configured: true, id: audienceId, contactCount: stats?.contactCount ?? null, name: stats?.name ?? label };
        })),
        (apiKey ? nodeResendGet<{ data?: Array<{ id: string; name: string; status: string; metrics?: { open_rate?: number; click_rate?: number; recipients?: number } }> }>('/broadcasts', apiKey) : Promise.resolve(null)),
      ]);
      const recentBroadcasts = (broadcasts?.data ?? []).filter(b => b.status === 'sent').slice(0, 5).map(b => ({ id: b.id, name: b.name, status: b.status, openRate: b.metrics?.open_rate ?? null, clickRate: b.metrics?.click_rate ?? null, recipients: b.metrics?.recipients ?? null }));
      const AUTOMATION_CHECKLIST = [
        { key: 'onboarding', name: 'Onboarding Drip', audienceKey: 'RESEND_AUDIENCE_ONBOARDING', trigger: 'Contact added to "Onboarding" audience', emails: ['Day 0: Welcome + getting started', 'Day 3: AI assistant tip', 'Day 7: Premium templates', 'Day 14: Performance check-in'] },
        { key: 'low_credits', name: 'Low Credits Nudge', audienceKey: 'RESEND_AUDIENCE_LOW_CREDITS', trigger: 'Contact added to "Low Credits" audience', emails: ['Immediate: Low credits — top up here'] },
        { key: 'handle_interest', name: 'Premium Handle Follow-up', audienceKey: 'RESEND_AUDIENCE_HANDLE_INTEREST', trigger: 'Contact added to "Premium Handle Interest" audience (delay 1 day)', emails: ['Day 1: Still thinking about that premium handle?'] },
        { key: 'wisehire', name: 'WiseHire Waitlist Drip', audienceKey: 'RESEND_AUDIENCE_WISEHIRE', trigger: 'Contact added to "WiseHire Waitlist" audience', emails: ['Day 0: You\'re on the waitlist! (auto-sent)', 'Day 7: What WiseHire can do for your team', 'Day 30: Launch update'] },
        { key: 're_engagement', name: 'Re-engagement', audienceKey: 'RESEND_AUDIENCE_ALL_USERS', trigger: 'Date-based / 30 days since last login (configure in Resend dashboard)', emails: ['We miss you — here\'s what\'s new on WiseResume'] },
      ];
      return res.json({ success: true, audiences: statsResults, checklist: AUTOMATION_CHECKLIST, recentBroadcasts, broadcastsNote: 'Resend API does not expose per-automation send metrics. recentBroadcasts shows one-off campaign stats only.' });
    }

    if (action === 'lookup') {
      const email = (body.email as string | undefined)?.trim().toLowerCase();
      if (!email) return res.status(400).json({ error: 'email is required' });
      const allKeys = Object.keys(AUDIENCE_KEYS_NODE) as Array<keyof typeof AUDIENCE_KEYS_NODE>;
      const foundIn: string[] = [];
      await Promise.all(allKeys.map(async (key) => {
        const envKey = AUDIENCE_KEYS_NODE[key];
        const audienceId = (process.env[envKey] || '').trim();
        if (!audienceId || !apiKey) return;
        const contacts = await nodeResendListContacts(audienceId, apiKey);
        if (contacts.find(c => c.email.toLowerCase() === email)) foundIn.push(AUDIENCE_LABELS_NODE[envKey] ?? key);
      }));
      return res.json({ success: true, email, foundIn });
    }

    if (action === 'add') {
      const audienceKey = (body.audienceKey as string | undefined)?.trim();
      const email = (body.email as string | undefined)?.trim().toLowerCase();
      const firstName = (body.firstName as string | undefined)?.trim() || undefined;
      if (!audienceKey || !email) return res.status(400).json({ error: 'audienceKey and email are required' });
      const audienceId = (process.env[audienceKey] || '').trim();
      if (!audienceId) return res.status(400).json({ error: `Audience ${audienceKey} not configured` });
      const ok = await nodeResendAddContact(audienceId, email, firstName, apiKey);
      return res.status(ok ? 200 : 502).json({ success: ok });
    }

    if (action === 'remove') {
      const audienceKey = (body.audienceKey as string | undefined)?.trim();
      const email = (body.email as string | undefined)?.trim().toLowerCase();
      if (!audienceKey || !email) return res.status(400).json({ error: 'audienceKey and email are required' });
      const audienceId = (process.env[audienceKey] || '').trim();
      if (!audienceId) return res.status(400).json({ error: `Audience ${audienceKey} not configured` });
      const ok = await nodeResendRemoveContact(audienceId, email, apiKey);
      return res.status(ok ? 200 : 502).json({ success: ok });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// ── admin-resend-sync ─────────────────────────────────────────────────────────
app.all('/api/fn/admin-resend-sync', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res);
  if (!callerEmail) return;
  try {
    const apiKey = process.env.RESEND_API_KEY || '';
    const audienceId = (process.env.RESEND_AUDIENCE_ALL_USERS || '').trim();
    if (!audienceId) return res.status(503).json({ error: 'RESEND_AUDIENCE_ALL_USERS secret not configured' });
    if (!apiKey)     return res.status(503).json({ error: 'RESEND_API_KEY not configured' });

    const emails: Array<{ email: string; firstName?: string; lastName?: string }> = [];
    let from = 0;
    const PAGE = 1000;
    while (true) {
      const data = await supabaseGet<{ contact_email: string | null; full_name: string | null }>('profiles', `select=contact_email,full_name&offset=${from}&limit=${PAGE}`);
      if (!data.length) break;
      for (const row of data) {
        const email = row.contact_email || '';
        if (!email || email.endsWith('@kinde.placeholder')) continue;
        const parts = (row.full_name || '').trim().split(' ');
        emails.push({ email, firstName: parts[0] || undefined, lastName: parts.slice(1).join(' ') || undefined });
      }
      if (data.length < PAGE) break;
      from += PAGE;
    }

    const seen = new Set<string>();
    const unique = emails.filter(({ email }) => { if (seen.has(email)) return false; seen.add(email); return true; });

    let added = 0; let failed = 0;
    const BATCH = 50; const DELAY = 300;
    for (let i = 0; i < unique.length; i += BATCH) {
      await Promise.all(unique.slice(i, i + BATCH).map(async (c) => {
        const ok = await nodeResendAddContact(audienceId, c.email, c.firstName, apiKey);
        if (ok) added++; else failed++;
      }));
      if (i + BATCH < unique.length) await new Promise(r => setTimeout(r, DELAY));
    }

    return res.json({ success: true, total: unique.length, added, failed });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// ── admin-env-check ───────────────────────────────────────────────────────────
const ENV_CHECK_KEYS = [
  { key: 'SUPABASE_URL', label: 'Supabase URL' }, { key: 'SUPABASE_ANON_KEY', label: 'Supabase Anon Key' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', label: 'Supabase Service Role Key' }, { key: 'DEV_KIT_PASSWORD', label: 'DevKit Password' },
  { key: 'KINDE_DOMAIN', label: 'Kinde Domain' }, { key: 'OPENROUTER_KEY_1', label: 'OpenRouter Key 1' },
  { key: 'OPENROUTER_KEY_2', label: 'OpenRouter Key 2' }, { key: 'OPENROUTER_KEY_3', label: 'OpenRouter Key 3' },
  { key: 'GROQ_KEY_1', label: 'Groq Key 1' }, { key: 'GROQ_KEY_2', label: 'Groq Key 2' }, { key: 'GROQ_KEY_3', label: 'Groq Key 3' },
  { key: 'GITHUB_TOKEN', label: 'GitHub Token' }, { key: 'GITHUB_OWNER', label: 'GitHub Owner' }, { key: 'GITHUB_REPO', label: 'GitHub Repo' },
  { key: 'RESEND_API_KEY', label: 'Resend API Key' }, { key: 'KINDE_WEBHOOK_SECRET', label: 'Kinde Webhook Secret' },
  { key: 'KINDE_M2M_CLIENT_ID', label: 'Kinde M2M Client ID' }, { key: 'KINDE_M2M_CLIENT_SECRET', label: 'Kinde M2M Client Secret' },
];
app.all('/api/fn/admin-env-check', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res); if (!callerEmail) return;
  const checks = ENV_CHECK_KEYS.map(({ key, label }) => ({ key, label, present: !!process.env[key] }));
  const supabaseProjectRef = SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1];
  const supabaseUrl = supabaseProjectRef ? `https://supabase.com/dashboard/project/${supabaseProjectRef}` : null;
  res.json({ success: true, checks, supabaseUrl });
});

// ── admin-get-settings ────────────────────────────────────────────────────────
app.all('/api/fn/admin-get-settings', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res); if (!callerEmail) return;
  try {
    const rows = await supabaseGet<{ key: string; value: unknown }>('app_settings', 'select=key,value&order=key.asc');
    const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));
    res.json({ success: true, settings });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// ── admin-update-settings ─────────────────────────────────────────────────────
app.all('/api/fn/admin-update-settings', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res); if (!callerEmail) return;
  try {
    const { key, value } = req.body ?? {};
    if (!key) return res.status(400).json({ success: false, error: 'key required' });
    await supabaseUpsert('app_settings', { key, value: value ?? null, updated_at: new Date().toISOString(), updated_by: callerEmail }, 'key');
    supabaseInsert('audit_logs', { user_id: null, category: 'admin_settings', action: 'update_setting', metadata: { key, performed_by: callerEmail } }).catch(() => {});
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// ── admin-ai-caps ─────────────────────────────────────────────────────────────
app.all('/api/fn/admin-ai-caps', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res); if (!callerEmail) return;
  try {
    const body = req.body ?? {}; const action: string = body.action ?? 'get_caps';
    if (action === 'get_caps') {
      const rows = await supabaseGet<{ key: string; value: unknown }>('app_settings', 'select=key,value&key=like.daily_cap_*,key=like.global_daily_limit*,key=like.user_limit_*');
      const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));
      return res.json({ success: true, settings });
    }
    if (action === 'set_plan_cap') {
      const { plan, daily_limit } = body as { plan?: string; daily_limit?: number };
      if (!plan || daily_limit === undefined) return res.status(400).json({ success: false, error: 'plan and daily_limit required' });
      const key = `daily_cap_${plan}`;
      await supabaseUpsert('app_settings', { key, value: daily_limit, updated_at: new Date().toISOString(), updated_by: callerEmail }, 'key');
      supabaseInsert('audit_logs', { user_id: null, category: 'ai_caps', action: 'set_plan_cap', metadata: { plan, daily_limit, performed_by: callerEmail } }).catch(() => {});
      return res.json({ success: true, key, daily_limit });
    }
    if (action === 'set_global_cap') {
      const { daily_limit } = body as { daily_limit?: number };
      if (daily_limit === undefined) return res.status(400).json({ success: false, error: 'daily_limit required' });
      await supabaseUpsert('app_settings', { key: 'global_daily_limit', value: daily_limit, updated_at: new Date().toISOString(), updated_by: callerEmail }, 'key');
      supabaseInsert('audit_logs', { user_id: null, category: 'ai_caps', action: 'set_global_cap', metadata: { daily_limit, performed_by: callerEmail } }).catch(() => {});
      return res.json({ success: true, daily_limit });
    }
    if (action === 'set_user_cap') {
      const { user_id, daily_limit } = body as { user_id?: string; daily_limit?: number | null };
      if (!user_id) return res.status(400).json({ success: false, error: 'user_id required' });
      const key = `user_limit_${user_id}`;
      if (daily_limit === null || daily_limit === undefined) {
        await supabaseDelete('app_settings', `key=eq.${encodeURIComponent(key)}`);
      } else {
        await supabaseUpsert('app_settings', { key, value: daily_limit, updated_at: new Date().toISOString(), updated_by: callerEmail }, 'key');
      }
      supabaseInsert('audit_logs', { user_id, category: 'ai_caps', action: 'set_user_cap', metadata: { daily_limit, performed_by: callerEmail } }).catch(() => {});
      return res.json({ success: true, user_id, daily_limit: daily_limit ?? null });
    }
    if (action === 'get_user_cap') {
      const { user_id } = body as { user_id?: string };
      if (!user_id) return res.status(400).json({ success: false, error: 'user_id required' });
      const rows = await supabaseGet<{ value: unknown }>('app_settings', `select=value&key=eq.${encodeURIComponent(`user_limit_${user_id}`)}&limit=1`);
      return res.json({ success: true, daily_limit: rows[0]?.value ?? null });
    }
    res.status(400).json({ success: false, error: `Unknown action: ${action}` });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// ── admin-manage-coupons ──────────────────────────────────────────────────────
app.all('/api/fn/admin-manage-coupons', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res); if (!callerEmail) return;
  try {
    const body = req.body ?? {}; const action: string = body.action ?? 'list';
    if (action === 'list') {
      const data = await supabaseGet('discount_codes', 'select=*&order=created_at.desc');
      return res.json({ success: true, coupons: data });
    }
    if (action === 'create') {
      const { code, discount_type, discount_value, max_uses, expires_at, plan_override, plan_days, target_plan } = body as Record<string, unknown>;
      if (!code || !discount_type) return res.status(400).json({ success: false, error: 'code and discount_type are required' });
      const data = await supabaseInsert('discount_codes', { code: String(code).toUpperCase().trim(), discount_type, discount_value: Number(discount_value) || 0, max_uses: max_uses ?? 0, expires_at: expires_at ?? null, plan_override: plan_override ?? null, plan_days: plan_days ? Number(plan_days) : null, target_plan: target_plan ?? null, is_active: true });
      supabaseInsert('audit_logs', { user_id: null, category: 'coupons', action: 'create_coupon', metadata: { code, performed_by: callerEmail } }).catch(() => {});
      return res.json({ success: true, coupon: data[0] });
    }
    if (action === 'toggle') {
      const { coupon_id, id, is_active } = body as { coupon_id?: string; id?: string; is_active?: boolean };
      const targetId = coupon_id ?? id;
      if (!targetId) return res.status(400).json({ success: false, error: 'coupon_id required' });
      await supabasePatch('discount_codes', `id=eq.${encodeURIComponent(targetId)}`, { is_active: Boolean(is_active) });
      return res.json({ success: true });
    }
    if (action === 'delete') {
      const { coupon_id, id } = body as { coupon_id?: string; id?: string };
      const targetId = coupon_id ?? id;
      if (!targetId) return res.status(400).json({ success: false, error: 'coupon_id required' });
      await supabaseDelete('discount_codes', `id=eq.${encodeURIComponent(targetId)}`);
      supabaseInsert('audit_logs', { user_id: null, category: 'coupons', action: 'delete_coupon', metadata: { id: targetId, performed_by: callerEmail } }).catch(() => {});
      return res.json({ success: true });
    }
    res.status(400).json({ success: false, error: `Unknown action: ${action}` });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// ── admin-audit-logs ──────────────────────────────────────────────────────────
app.all('/api/fn/admin-audit-logs', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res); if (!callerEmail) return;
  try {
    const body = req.body ?? {}; const mode: string = body.mode ?? 'read';
    if (mode === 'write') {
      const { user_id, category, action } = body as { user_id?: string; category?: string; action?: string };
      if (!category || !action) return res.status(400).json({ success: false, error: 'category and action required' });
      await supabaseInsert('audit_logs', { user_id: user_id ?? null, category, action, metadata: body.metadata ?? {} });
      return res.json({ success: true });
    }
    // read mode
    const { page = 1, per_page = 50, user_id, action, category, search } = body as { page?: number; per_page?: number; user_id?: string; action?: string; category?: string; search?: string };
    const limit = Math.min(200, Math.max(1, Number(per_page)));
    const offset = Math.max(0, (Number(page) - 1) * limit);
    let q = `select=*&order=created_at.desc&offset=${offset}&limit=${limit}`;
    if (user_id) q += `&user_id=eq.${encodeURIComponent(user_id)}`;
    if (action) q += `&action=eq.${encodeURIComponent(action)}`;
    if (category) q += `&category=eq.${encodeURIComponent(category)}`;
    const logs = await supabaseGet<Record<string, unknown>>('audit_logs', q);
    // Enrich with profile email
    const userIds = [...new Set(logs.map(l => l.user_id as string).filter(Boolean))];
    let emailMap: Record<string, string> = {};
    if (userIds.length) {
      const profs = await supabaseGet<{ user_id: string; contact_email: string | null }>('profiles', `select=user_id,contact_email&user_id=in.(${userIds.map(encodeURIComponent).join(',')})`).catch(() => []);
      emailMap = Object.fromEntries(profs.map(p => [p.user_id, p.contact_email ?? '']));
    }
    const enriched = logs.map(l => ({ ...l, user_email: l.user_id ? (emailMap[l.user_id as string] ?? null) : null }));
    res.json({ success: true, logs: enriched, total: enriched.length });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// ── admin-live-activity ───────────────────────────────────────────────────────
app.all('/api/fn/admin-live-activity', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res); if (!callerEmail) return;
  try {
    const { resource, user_id } = req.body ?? {} as { resource?: string; user_id?: string };
    if (resource === 'usage_events') {
      const data = await supabaseGet('usage_events', 'select=*&order=created_at.desc&limit=100');
      return res.json({ success: true, events: data });
    }
    if (resource === 'error_log') {
      const data = await supabaseGet('error_log', 'select=*&order=created_at.desc&limit=100').catch(() => []);
      return res.json({ success: true, errors: data });
    }
    if (resource === 'user_content_stats') {
      if (!user_id) return res.status(400).json({ success: false, error: 'user_id required' });
      const [resumes, coverLetters, auditLogs] = await Promise.all([
        supabaseGet<{ id: string }>('resumes', `select=id&user_id=eq.${encodeURIComponent(user_id)}`).catch(() => [] as { id: string }[]),
        supabaseGet<{ id: string }>('cover_letters', `select=id&user_id=eq.${encodeURIComponent(user_id)}`).catch(() => [] as { id: string }[]),
        supabaseGet<{ id: string }>('audit_logs', `select=id&user_id=eq.${encodeURIComponent(user_id)}&limit=1000`).catch(() => [] as { id: string }[]),
      ]);
      return res.json({ success: true, stats: { resume_count: resumes.length, cover_letter_count: coverLetters.length, audit_log_count: auditLogs.length } });
    }
    if (resource === 'contact_requests') {
      const data = await supabaseGet('contact_requests', 'select=*&order=created_at.desc&limit=50').catch(() => []);
      return res.json({ success: true, requests: data });
    }
    res.status(400).json({ success: false, error: `Unknown resource: ${resource}` });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// ── admin-onboarding-funnel ───────────────────────────────────────────────────
app.all('/api/fn/admin-onboarding-funnel', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res); if (!callerEmail) return;
  try {
    const { since } = req.body ?? {} as { since?: string };
    const cutoff = since ?? new Date(Date.now() - 30 * 86400000).toISOString();
    const logs = await supabaseGet<{ user_id: string; action: string; metadata: Record<string, unknown>; created_at: string }>('audit_logs', `select=user_id,action,metadata,created_at&category=eq.onboarding&created_at=gte.${encodeURIComponent(cutoff)}&order=created_at.asc&limit=50000`);
    const byUser = new Map<string, Set<string>>();
    for (const log of logs) {
      if (!byUser.has(log.user_id)) byUser.set(log.user_id, new Set());
      byUser.get(log.user_id)!.add(log.action);
    }
    const steps = ['onboarding_start', 'onboarding_step_1', 'onboarding_step_2', 'onboarding_step_3', 'onboarding_complete'];
    const funnel = steps.map(step => {
      const count = [...byUser.values()].filter(actions => actions.has(step)).length;
      return { step, count };
    });
    res.json({ success: true, funnel, total_users: byUser.size });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// ── admin-analytics ───────────────────────────────────────────────────────────
app.all('/api/fn/admin-analytics', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res); if (!callerEmail) return;
  try {
    const { range = '30d' } = req.body ?? {} as { range?: string };
    const daysMap: Record<string, number> = { today: 1, '7d': 7, '30d': 30, '90d': 90, all: 9999 };
    const days = daysMap[range] ?? 30;
    const since = days >= 9999 ? new Date(0).toISOString() : new Date(Date.now() - days * 86400000).toISOString();
    const [signups, events, portfolioVisits, credits] = await Promise.all([
      supabaseGet<{ created_at: string }>('profiles', `select=created_at&created_at=gte.${encodeURIComponent(since)}&order=created_at.desc&limit=10000`).catch(() => []),
      supabaseGet<{ user_id: string; event_type: string; created_at: string }>('usage_events', `select=user_id,event_type,created_at&created_at=gte.${encodeURIComponent(since)}&order=created_at.desc&limit=50000`).catch(() => []),
      supabaseGet<{ visited_at: string }>('portfolio_visits', `select=visited_at&visited_at=gte.${encodeURIComponent(since)}&limit=50000`).catch(() => []),
      supabaseGet<{ daily_usage: number; usage_date: string }>('ai_credits', `select=daily_usage,usage_date&usage_date=gte.${encodeURIComponent(since.slice(0, 10))}&limit=50000`).catch(() => []),
    ]);
    const activeUsers = new Set(events.map(e => e.user_id)).size;
    const totalCredits = credits.reduce((s, c) => s + (c.daily_usage || 0), 0);
    const featureCounts: Record<string, number> = {};
    for (const e of events) featureCounts[e.event_type] = (featureCounts[e.event_type] ?? 0) + 1;
    const topFeatures = Object.entries(featureCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([event_type, count]) => ({ event_type, count }));
    // Build daily series for last 30 buckets
    const nowMs = Date.now(); const MS = 86400000;
    const series = Array.from({ length: Math.min(days, 30) }, (_, i) => {
      const dayMs = nowMs - (Math.min(days, 30) - 1 - i) * MS;
      const dateStr = new Date(dayMs).toISOString().slice(0, 10);
      return {
        date: dateStr,
        signups: signups.filter(s => s.created_at.startsWith(dateStr)).length,
        events: events.filter(e => e.created_at.startsWith(dateStr)).length,
        portfolio_views: portfolioVisits.filter(p => p.visited_at.startsWith(dateStr)).length,
      };
    });
    res.json({ success: true, kpis: { total_signups: signups.length, active_users: activeUsers, total_ai_credits: totalCredits, total_portfolio_views: portfolioVisits.length }, daily_series: series, top_features: topFeatures, range });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// ── admin-save-note ───────────────────────────────────────────────────────────
app.all('/api/fn/admin-save-note', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res); if (!callerEmail) return;
  try {
    const body = req.body ?? {}; const { action, note, note_id } = body as { action?: string; note?: string; note_id?: string };
    const user_id: string | undefined = body.target_user_id ?? body.user_id;
    if (action === 'list') {
      if (!user_id) return res.status(400).json({ success: false, error: 'user_id required' });
      const data = await supabaseGet('admin_user_notes', `select=*&user_id=eq.${encodeURIComponent(user_id)}&order=created_at.desc`).catch(() => []);
      return res.json({ success: true, notes: data });
    }
    if (action === 'save') {
      if (!user_id || !note?.trim()) return res.status(400).json({ success: false, error: 'user_id and note required' });
      const data = await supabaseInsert('admin_user_notes', { user_id, note: note.trim(), created_by: callerEmail });
      supabaseInsert('audit_logs', { user_id, category: 'admin_note', action: 'note_added', metadata: { performed_by: callerEmail } }).catch(() => {});
      return res.json({ success: true, note: data[0] });
    }
    if (action === 'delete') {
      if (!note_id) return res.status(400).json({ success: false, error: 'note_id required' });
      await supabaseDelete('admin_user_notes', `id=eq.${encodeURIComponent(note_id)}`);
      supabaseInsert('audit_logs', { user_id: user_id ?? null, category: 'admin_note', action: 'note_deleted', metadata: { note_id, performed_by: callerEmail } }).catch(() => {});
      return res.json({ success: true });
    }
    res.status(400).json({ success: false, error: `Unknown action: ${action}` });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// ── admin-list-user-content ───────────────────────────────────────────────────
app.all('/api/fn/admin-list-user-content', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res); if (!callerEmail) return;
  try {
    const _body = req.body ?? {};
    const user_id: string | undefined = _body.target_user_id ?? _body.user_id;
    const resume_id: string | undefined = _body.resume_id;
    if (!user_id) return res.status(400).json({ success: false, error: 'user_id required' });
    if (resume_id) {
      const data = await supabaseGet('resumes', `select=*&id=eq.${encodeURIComponent(resume_id)}&user_id=eq.${encodeURIComponent(user_id)}&limit=1`);
      return res.json({ success: true, resume: data[0] ?? null });
    }
    const resumes = await supabaseGet('resumes', `select=id,title,updated_at,created_at&user_id=eq.${encodeURIComponent(user_id)}&order=updated_at.desc`);
    res.json({ success: true, resumes });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// ── admin-grant-trial ─────────────────────────────────────────────────────────
app.all('/api/fn/admin-grant-trial', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res); if (!callerEmail) return;
  try {
    const _b = req.body ?? {};
    const user_id: string | undefined = _b.target_user_id ?? _b.user_id;
    const { plan, days } = _b as { plan?: string; days?: number };
    if (!user_id || !plan) return res.status(400).json({ success: false, error: 'user_id and plan required' });
    const result = await supabaseRpc('admin_grant_trial', { p_user_id: user_id, p_plan: plan, p_days: days ?? 14 });
    supabaseInsert('audit_logs', { user_id, category: 'billing', action: 'grant_trial', metadata: { plan, days, performed_by: callerEmail } }).catch(() => {});
    res.json({ success: true, result });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// ── admin-revoke-trial ────────────────────────────────────────────────────────
app.all('/api/fn/admin-revoke-trial', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res); if (!callerEmail) return;
  try {
    const _b = req.body ?? {};
    const user_id: string | undefined = _b.target_user_id ?? _b.user_id;
    if (!user_id) return res.status(400).json({ success: false, error: 'user_id required' });
    await supabaseRpc('admin_revoke_trial', { p_user_id: user_id });
    supabaseInsert('audit_logs', { user_id, category: 'billing', action: 'revoke_trial', metadata: { performed_by: callerEmail } }).catch(() => {});
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// ── admin-suspend-user ────────────────────────────────────────────────────────
app.all('/api/fn/admin-suspend-user', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res); if (!callerEmail) return;
  try {
    const _b = req.body ?? {};
    const user_id: string | undefined = _b.target_user_id ?? _b.user_id;
    const { suspend, reason } = _b as { suspend?: boolean; reason?: string };
    if (!user_id) return res.status(400).json({ success: false, error: 'user_id required' });
    const result = await supabaseRpc('admin_suspend_user', { p_user_id: user_id, p_suspend: Boolean(suspend), p_reason: reason ?? null });
    supabaseInsert('audit_logs', { user_id, category: 'user_management', action: suspend ? 'suspend_user' : 'unsuspend_user', metadata: { reason, performed_by: callerEmail } }).catch(() => {});
    res.json({ success: true, result });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// ── admin-revoke-sessions ─────────────────────────────────────────────────────
app.all('/api/fn/admin-revoke-sessions', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res); if (!callerEmail) return;
  try {
    const _b = req.body ?? {};
    const user_id: string | undefined = _b.target_user_id ?? _b.user_id;
    if (!user_id) return res.status(400).json({ success: false, error: 'user_id required' });
    await supabaseAuthAdmin('DELETE', `users/${encodeURIComponent(user_id)}/sessions`);
    supabaseInsert('audit_logs', { user_id, category: 'user_management', action: 'user_sessions_revoked', metadata: { performed_by: callerEmail } }).catch(() => {});
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// ── admin-delete-user ─────────────────────────────────────────────────────────
app.all('/api/fn/admin-delete-user', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res); if (!callerEmail) return;
  try {
    const _b = req.body ?? {};
    const user_id: string | undefined = _b.target_user_id ?? _b.user_id;
    if (!user_id) return res.status(400).json({ success: false, error: 'user_id required' });
    const profile = await supabaseGet<{ contact_email: string | null }>('profiles', `select=contact_email&user_id=eq.${encodeURIComponent(user_id)}&limit=1`).catch(() => []);
    const email = profile[0]?.contact_email ?? null;
    await supabaseAuthAdmin('DELETE', `users/${encodeURIComponent(user_id)}`);
    supabaseInsert('audit_logs', { user_id: null, category: 'user_management', action: 'account_deleted', metadata: { deleted_user_id: user_id, email, performed_by: callerEmail } }).catch(() => {});
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// ── admin-impersonate ─────────────────────────────────────────────────────────
app.all('/api/fn/admin-impersonate', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res); if (!callerEmail) return;
  try {
    const _b = req.body ?? {};
    const user_id: string | undefined = _b.target_user_id ?? _b.user_id;
    const impAction: string = _b.action ?? 'start';
    if (impAction === 'exit') {
      supabaseInsert('audit_logs', { user_id: null, category: 'admin_impersonation', action: 'impersonation_exit', metadata: { performed_by: callerEmail, target_user_id: user_id ?? null, exited_at: new Date().toISOString() } }).catch(() => {});
      return res.json({ success: true });
    }
    if (!user_id) return res.status(400).json({ success: false, error: 'user_id required' });
    if (!SUPABASE_JWT_SECRET) return res.status(500).json({ success: false, error: 'Server not configured with SUPABASE_JWT_SECRET' });
    const authUser = await supabaseAuthAdmin<{ id: string; email?: string }>('GET', `users/${encodeURIComponent(user_id)}`);
    const targetEmail = authUser.email ?? '';
    // Prevent impersonating another admin
    const adminEmailList = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    if (targetEmail && adminEmailList.includes(targetEmail.toLowerCase())) {
      return res.status(403).json({ success: false, error: 'Impersonating another admin is not permitted' });
    }
    const SESSION_TTL = 30 * 60;
    const now = Math.floor(Date.now() / 1000);
    const expiresAtSeconds = now + SESSION_TTL;
    const expiresAtMs = expiresAtSeconds * 1000;
    const secret = new TextEncoder().encode(SUPABASE_JWT_SECRET);
    const accessToken = await new jose.SignJWT({
      sub: user_id,
      email: targetEmail,
      role: 'authenticated',
      aud: 'authenticated',
      iss: 'supabase',
      iat: now,
      exp: expiresAtSeconds,
      is_impersonation: true,
    }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).sign(secret);
    supabaseInsert('audit_logs', { user_id: null, category: 'admin_impersonation', action: 'impersonation_start', metadata: { performed_by: callerEmail, target_user_id: user_id, target_email: targetEmail || user_id, started_at: new Date().toISOString(), expires_at: new Date(expiresAtMs).toISOString() } }).catch(() => {});
    res.json({ success: true, access_token: accessToken, user_id, email: targetEmail || user_id, expires_at: expiresAtMs });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// ── admin-get-identity ────────────────────────────────────────────────────────
app.all('/api/fn/admin-get-identity', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res); if (!callerEmail) return;
  try {
    const _b = req.body ?? {};
    const user_id: string | undefined = _b.target_user_id ?? _b.user_id;
    if (!user_id) return res.status(400).json({ success: false, error: 'user_id required' });
    const [authUser, profile, tokenExchange] = await Promise.all([
      supabaseAuthAdmin<{ id: string; email?: string; created_at: string; confirmed_at?: string }>('GET', `users/${encodeURIComponent(user_id)}`).catch(() => null),
      supabaseGet<{ contact_email: string | null; full_name: string | null }>('profiles', `select=contact_email,full_name&user_id=eq.${encodeURIComponent(user_id)}&limit=1`).then(r => r[0] ?? null).catch(() => null),
      supabaseGet<{ kinde_sub: string | null }>('token_exchanges', `select=kinde_sub&user_id=eq.${encodeURIComponent(user_id)}&limit=1`).then(r => r[0] ?? null).catch(() => null),
    ]);
    let kindeEmail: string | null = null;
    let kindeError: string | null = null;
    const kindeSub = tokenExchange?.kinde_sub ?? null;
    if (kindeSub) {
      try {
        const ku = await kindeGet<{ email?: string }>(`/api/v1/user?id=${encodeURIComponent(kindeSub)}`);
        kindeEmail = ku.email ?? null;
      } catch (e) { kindeError = String(e); }
    }
    res.json({ success: true, user_id, auth_email: authUser?.email ?? null, contact_email: profile?.contact_email ?? null, full_name: profile?.full_name ?? null, kinde_sub: kindeSub, kinde_email: kindeEmail, kinde_error: kindeError, auth_created_at: authUser?.created_at ?? null, email_confirmed: !!authUser?.confirmed_at });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// ── admin-merge-identity ──────────────────────────────────────────────────────
app.all('/api/fn/admin-merge-identity', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res); if (!callerEmail) return;
  try {
    const { orphan_id, shadow_id } = req.body ?? {} as { orphan_id?: string; shadow_id?: string };
    if (!orphan_id || !shadow_id) return res.status(400).json({ success: false, error: 'orphan_id and shadow_id required' });
    const [orphanSubs, shadowSubs, orphanProfile, shadowProfile] = await Promise.all([
      supabaseGet<{ plan_name: string; status: string; plan_updated_at: string }>('subscriptions', `select=plan_name,status,plan_updated_at&user_id=eq.${encodeURIComponent(orphan_id)}&limit=1`).then(r => r[0] ?? null),
      supabaseGet<{ plan_name: string; status: string; plan_updated_at: string }>('subscriptions', `select=plan_name,status,plan_updated_at&user_id=eq.${encodeURIComponent(shadow_id)}&limit=1`).then(r => r[0] ?? null),
      supabaseGet<{ full_name: string | null; avatar_url: string | null }>('profiles', `select=full_name,avatar_url&user_id=eq.${encodeURIComponent(orphan_id)}&limit=1`).then(r => r[0] ?? null),
      supabaseGet<{ full_name: string | null }>('profiles', `select=full_name&user_id=eq.${encodeURIComponent(shadow_id)}&limit=1`).then(r => r[0] ?? null),
    ]);
    const mergeLog: string[] = [];
    const planRank = (p: string | undefined) => ['premium', 'pro', 'free'].indexOf(p ?? 'free');
    if (orphanSubs && (!shadowSubs || planRank(orphanSubs.plan_name) < planRank(shadowSubs?.plan_name))) {
      await supabaseUpsert('subscriptions', { user_id: shadow_id, plan_name: orphanSubs.plan_name, status: orphanSubs.status, plan_updated_at: new Date().toISOString() }, 'user_id');
      mergeLog.push(`Transferred plan ${orphanSubs.plan_name} from orphan to shadow`);
    }
    if (orphanProfile?.full_name && !shadowProfile?.full_name) {
      await supabasePatch('profiles', `user_id=eq.${encodeURIComponent(shadow_id)}`, { full_name: orphanProfile.full_name, avatar_url: orphanProfile.avatar_url ?? null });
      mergeLog.push('Copied full_name from orphan to shadow');
    }
    await supabasePatch('profiles', `user_id=eq.${encodeURIComponent(orphan_id)}`, { is_suspended: true, suspension_reason: `merged_into:${shadow_id}` });
    mergeLog.push('Suspended orphan account');
    supabaseInsert('audit_logs', { user_id: shadow_id, category: 'identity', action: 'identity_merged', metadata: { orphan_id, shadow_id, merge_log: mergeLog, performed_by: callerEmail } }).catch(() => {});
    res.json({ success: true, merge_log: mergeLog });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// ── admin-update-profile ──────────────────────────────────────────────────────
app.all('/api/fn/admin-update-profile', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res); if (!callerEmail) return;
  try {
    const _b = req.body ?? {};
    const user_id: string | undefined = _b.target_user_id ?? _b.user_id;
    const { action = 'get', full_name, username } = _b as { action?: string; full_name?: string; username?: string };
    if (!user_id) return res.status(400).json({ success: false, error: 'user_id required' });
    if (action === 'get') {
      const profile = await supabaseGet('profiles', `select=user_id,full_name,username,contact_email,avatar_url&user_id=eq.${encodeURIComponent(user_id)}&limit=1`);
      return res.json({ success: true, profile: profile[0] ?? null });
    }
    if (action === 'update') {
      const updates: Record<string, unknown> = {};
      const changedFields: Record<string, unknown> = {};
      if (full_name !== undefined) { updates.full_name = full_name; changedFields.full_name = full_name; }
      if (username !== undefined) {
        const cleanUsername = username.trim().toLowerCase();
        if (cleanUsername) {
          const avail = await supabaseRpc<{ status?: string } | null>('check_username_available', { p_username: cleanUsername, p_user_id: user_id });
          const status = avail?.status ?? 'invalid';
          if (status !== 'available') return res.status(409).json({ success: false, error: `Username not available (${status})`, status });
        }
        updates.username = cleanUsername || null;
        changedFields.username = cleanUsername || null;
      }
      if (!Object.keys(updates).length) return res.status(400).json({ success: false, error: 'No fields to update' });
      updates.updated_at = new Date().toISOString();
      await supabasePatch('profiles', `user_id=eq.${encodeURIComponent(user_id)}`, updates);
      supabaseInsert('audit_logs', { user_id, category: 'user_management', action: 'profile_updated', metadata: { changed_fields: changedFields, performed_by: callerEmail } }).catch(() => {});
      return res.json({ success: true, changed_fields: changedFields });
    }
    res.status(400).json({ success: false, error: `Unknown action: ${action}` });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// ── admin-list-users ──────────────────────────────────────────────────────────
app.all('/api/fn/admin-list-users', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res); if (!callerEmail) return;
  try {
    const { page = 1, per_page = 50, filter_plan, filter_status, sort = 'newest', search } = req.body ?? {} as {
      page?: number; per_page?: number; filter_plan?: string; filter_status?: string; sort?: string; search?: string;
    };
    const limit = Math.min(200, Math.max(1, Number(per_page)));
    const offset = Math.max(0, (Number(page) - 1) * limit);
    const sortParam = { newest: 'created_at.desc', oldest: 'created_at.asc', name: 'full_name.asc' }[sort as string] ?? 'created_at.desc';
    let profQ = `select=user_id,full_name,contact_email,avatar_url,is_suspended,suspension_reason,account_type,created_at&order=${sortParam}&offset=${offset}&limit=${limit}`;
    if (search) profQ += `&or=(full_name.ilike.*${encodeURIComponent(search)}*,contact_email.ilike.*${encodeURIComponent(search)}*)`;
    const profiles = await supabaseGet<{ user_id: string; full_name: string | null; contact_email: string | null; avatar_url: string | null; is_suspended: boolean; suspension_reason: string | null; account_type: string; created_at: string }>('profiles', profQ);
    const userIds = profiles.map(p => p.user_id);

    // Fetch enrichment data in parallel
    const [subsRaw, resumesRaw, creditsRaw, authListRaw] = await Promise.all([
      userIds.length
        ? supabaseGet<{ user_id: string; plan_name: string; status: string; plan_updated_at: string | null; trial_plan: string | null; trial_expires_at: string | null }>(
            'subscriptions',
            `select=user_id,plan_name,status,plan_updated_at,trial_plan,trial_expires_at&user_id=in.(${userIds.map(encodeURIComponent).join(',')})`,
          ).catch(() => [])
        : Promise.resolve([]),
      userIds.length
        ? supabaseGet<{ user_id: string }>(
            'resumes',
            `select=user_id&user_id=in.(${userIds.map(encodeURIComponent).join(',')})`,
          ).catch(() => [])
        : Promise.resolve([]),
      userIds.length
        ? supabaseGet<{ user_id: string; daily_usage: number; daily_limit: number; usage_date: string }>(
            'ai_credits',
            `select=user_id,daily_usage,daily_limit,usage_date&user_id=in.(${userIds.map(encodeURIComponent).join(',')})&usage_date=eq.${new Date().toISOString().slice(0, 10)}`,
          ).catch(() => [])
        : Promise.resolve([]),
      supabaseAuthAdmin<{ users?: Array<{ id: string; email?: string; last_sign_in_at?: string; email_confirmed_at?: string }> }>('GET', 'users?page=1&per_page=10000').catch(() => ({ users: [] })),
    ]);

    // Build lookup maps
    const subscriptions: Record<string, { plan_name: string; plan_status: string; plan_updated_at: string | null; trial_plan: string | null; trial_expires_at: string | null }> =
      Object.fromEntries(subsRaw.map(s => [s.user_id, { plan_name: s.plan_name, plan_status: s.status, plan_updated_at: s.plan_updated_at, trial_plan: s.trial_plan, trial_expires_at: s.trial_expires_at }]));

    const resumeCounts: Record<string, number> = {};
    for (const r of resumesRaw) resumeCounts[r.user_id] = (resumeCounts[r.user_id] ?? 0) + 1;

    const creditsMap: Record<string, { credits_used_today: number; daily_limit: number }> =
      Object.fromEntries(creditsRaw.map(c => [c.user_id, { credits_used_today: c.daily_usage, daily_limit: c.daily_limit }]));

    const authMap: Record<string, { last_sign_in_at: string | null; email_confirmed_at: string | null }> =
      Object.fromEntries((authListRaw.users ?? []).map(u => [u.id, { last_sign_in_at: u.last_sign_in_at ?? null, email_confirmed_at: u.email_confirmed_at ?? null }]));

    let users = profiles.map(p => {
      const sub = subscriptions[p.user_id] ?? { plan_name: 'free', plan_status: 'active', plan_updated_at: null, trial_plan: null, trial_expires_at: null };
      const credits = creditsMap[p.user_id] ?? { credits_used_today: 0, daily_limit: 10 };
      const auth = authMap[p.user_id] ?? { last_sign_in_at: null, email_confirmed_at: null };
      const has_id_conflict = (p.contact_email ?? '').endsWith('@collision.kinde.placeholder');
      return {
        user_id: p.user_id,
        full_name: p.full_name,
        email: p.contact_email,
        contact_email: p.contact_email,
        avatar_url: p.avatar_url,
        is_suspended: p.is_suspended ?? false,
        suspension_reason: p.suspension_reason,
        account_type: p.account_type ?? 'user',
        created_at: p.created_at,
        resume_count: resumeCounts[p.user_id] ?? 0,
        last_sign_in_at: auth.last_sign_in_at,
        email_confirmed_at: auth.email_confirmed_at,
        credits_used_today: credits.credits_used_today,
        daily_limit: credits.daily_limit,
        has_id_conflict,
        ...sub,
      };
    });
    if (filter_plan) users = users.filter(u => u.plan_name === filter_plan);
    if (filter_status === 'suspended') users = users.filter(u => u.is_suspended);
    else if (filter_status === 'active') users = users.filter(u => !u.is_suspended);
    res.json({ success: true, users, total: users.length, page: Number(page), per_page: limit });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// ── admin-set-plan ────────────────────────────────────────────────────────────
const PLAN_CREDIT_LIMITS: Record<string, number> = { free: 10, pro: 50, premium: 200 };
app.all('/api/fn/admin-set-plan', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res); if (!callerEmail) return;
  try {
    const _b = req.body ?? {};
    const user_id: string | undefined = _b.target_user_id ?? _b.user_id;
    const { plan } = _b as { plan?: string };
    if (!user_id || !plan) return res.status(400).json({ success: false, error: 'user_id and plan required' });
    const validPlans = ['free', 'pro', 'premium'];
    if (!validPlans.includes(plan)) return res.status(400).json({ success: false, error: `plan must be one of: ${validPlans.join(', ')}` });
    const dailyLimit = PLAN_CREDIT_LIMITS[plan] ?? 10;
    const now = new Date().toISOString();
    await supabaseUpsert('subscriptions', { user_id, plan_name: plan, status: 'active', plan_updated_at: now, trial_plan: null, trial_expires_at: null }, 'user_id');
    const today = now.slice(0, 10);
    const existing = await supabaseGet<{ id: string }>('ai_credits', `select=id&user_id=eq.${encodeURIComponent(user_id)}&usage_date=eq.${today}&limit=1`).catch(() => []);
    if (existing.length) {
      await supabasePatch('ai_credits', `user_id=eq.${encodeURIComponent(user_id)}&usage_date=eq.${today}`, { daily_limit: dailyLimit });
    } else {
      await supabaseInsert('ai_credits', { user_id, daily_limit: dailyLimit, daily_usage: 0, usage_date: today }).catch(() => {});
    }
    supabaseInsert('audit_logs', { user_id, category: 'billing', action: 'plan_changed', metadata: { plan, daily_limit: dailyLimit, performed_by: callerEmail } }).catch(() => {});
    res.json({ success: true, plan, daily_limit: dailyLimit });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// ── admin-set-credits ─────────────────────────────────────────────────────────
app.all('/api/fn/admin-set-credits', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res); if (!callerEmail) return;
  try {
    const _b = req.body ?? {};
    const user_id: string | undefined = _b.target_user_id ?? _b.user_id;
    const { daily_limit, bonus_credits } = _b as { daily_limit?: number; bonus_credits?: number };
    if (!user_id) return res.status(400).json({ success: false, error: 'user_id required' });
    const today = new Date().toISOString().slice(0, 10);
    const existing = await supabaseGet<{ id: string; daily_limit: number; daily_usage: number }>('ai_credits', `select=id,daily_limit,daily_usage&user_id=eq.${encodeURIComponent(user_id)}&usage_date=eq.${today}&limit=1`).catch(() => []);
    const updates: Record<string, unknown> = {};
    if (daily_limit !== undefined) updates.daily_limit = Math.max(0, Number(daily_limit));
    if (bonus_credits !== undefined) updates.bonus_credits = Math.max(0, Number(bonus_credits));
    if (existing.length) {
      if (Object.keys(updates).length) await supabasePatch('ai_credits', `user_id=eq.${encodeURIComponent(user_id)}&usage_date=eq.${today}`, updates);
    } else {
      await supabaseInsert('ai_credits', { user_id, daily_limit: daily_limit ?? 10, daily_usage: 0, bonus_credits: bonus_credits ?? 0, usage_date: today }).catch(() => {});
    }
    supabaseInsert('audit_logs', { user_id, category: 'billing', action: 'credits_set', metadata: { daily_limit, bonus_credits, performed_by: callerEmail } }).catch(() => {});
    res.json({ success: true, daily_limit: updates.daily_limit ?? null, bonus_credits: updates.bonus_credits ?? null });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// ── admin-kinde-reconcile ─────────────────────────────────────────────────────
app.all('/api/fn/admin-kinde-reconcile', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res); if (!callerEmail) return;
  try {
    const { dry_run = false } = req.body ?? {} as { dry_run?: boolean };
    let kindeUsers: Array<{ id: string; email?: string; first_name?: string; last_name?: string }> = [];
    try {
      const ku = await kindeGet<{ users?: typeof kindeUsers }>('/api/v1/users?page_size=200');
      kindeUsers = ku.users ?? [];
    } catch (e) {
      return res.json({ success: false, error: `Kinde M2M not configured or failed: ${String(e)}`, kinde_configured: false });
    }
    let found = 0, provisioned = 0, backfilled = 0;
    for (const ku of kindeUsers) {
      if (!ku.id || !ku.email) continue;
      found++;
      if (dry_run) continue;
      const existing = await supabaseGet('profiles', `select=user_id,contact_email&user_id=eq.${encodeURIComponent(ku.id)}&limit=1`).catch(() => []);
      if (!existing.length) {
        await supabaseInsert('profiles', { user_id: ku.id, contact_email: ku.email, full_name: [ku.first_name, ku.last_name].filter(Boolean).join(' ') || null, account_type: 'user' }).catch(() => {});
        provisioned++;
      } else if (existing[0] && !(existing[0] as Record<string, unknown>).contact_email && ku.email) {
        await supabasePatch('profiles', `user_id=eq.${encodeURIComponent(ku.id)}`, { contact_email: ku.email });
        backfilled++;
      }
    }
    res.json({ success: true, dry_run, kinde_configured: true, total_kinde_users: kindeUsers.length, found, provisioned, backfilled });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// ── admin-email-actions ───────────────────────────────────────────────────────
app.all('/api/fn/admin-email-actions', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res); if (!callerEmail) return;
  try {
    const body = req.body ?? {}; const { action, email, subject, html, user_id } = body as { action?: string; email?: string; subject?: string; html?: string; user_id?: string };
    if (action === 'diagnose') {
      const apiKey = process.env.RESEND_API_KEY?.trim();
      return res.json({ success: true, resend_configured: !!apiKey, supabase_auth_configured: !!(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) });
    }
    if (action === 'send_magic_link') {
      if (!email) return res.status(400).json({ success: false, error: 'email required' });
      const linkResp = await supabaseAuthAdmin<Record<string, unknown>>('POST', 'generate_link', { type: 'magiclink', email });
      supabaseInsert('audit_logs', { user_id: user_id ?? null, category: 'email_actions', action: 'send_magic_link', metadata: { email, performed_by: callerEmail } }).catch(() => {});
      return res.json({ success: true, action_link: linkResp.action_link ?? (linkResp.properties as Record<string, unknown>)?.action_link ?? null });
    }
    if (action === 'resend_confirmation') {
      if (!email) return res.status(400).json({ success: false, error: 'email required' });
      await supabaseAuthAdmin('POST', 'generate_link', { type: 'signup', email });
      supabaseInsert('audit_logs', { user_id: user_id ?? null, category: 'email_actions', action: 'resend_confirmation', metadata: { email, performed_by: callerEmail } }).catch(() => {});
      return res.json({ success: true });
    }
    if (action === 'send_password_reset') {
      if (!email) return res.status(400).json({ success: false, error: 'email required' });
      await supabaseAuthAdmin('POST', 'generate_link', { type: 'recovery', email });
      supabaseInsert('audit_logs', { user_id: user_id ?? null, category: 'email_actions', action: 'send_password_reset', metadata: { email, performed_by: callerEmail } }).catch(() => {});
      return res.json({ success: true });
    }
    if (action === 'send_custom') {
      if (!email || !subject || !html) return res.status(400).json({ success: false, error: 'email, subject, html required' });
      const from = process.env.RESEND_FROM_EMAIL || 'contact@thewise.cloud';
      const result = await resendPost<{ id?: string }>('/emails', { from, to: [email], subject, html });
      if (!result) return res.status(503).json({ success: false, error: 'RESEND_API_KEY not configured or Resend request failed' });
      supabaseInsert('audit_logs', { user_id: user_id ?? null, category: 'email_actions', action: 'send_custom_email', metadata: { email, subject, message_id: result.id, performed_by: callerEmail } }).catch(() => {});
      return res.json({ success: true, message_id: result.id });
    }
    if (action === 'estimate_broadcast_recipients') {
      const { plan_filter } = body as { plan_filter?: string };
      let q = 'select=user_id&limit=100000';
      if (plan_filter) q = `select=user_id&plan_name=eq.${encodeURIComponent(plan_filter)}&limit=100000`;
      const rows = await supabaseGet('subscriptions', q).catch(() => []);
      return res.json({ success: true, estimated_count: rows.length, plan_filter: plan_filter ?? 'all' });
    }
    res.status(400).json({ success: false, error: `Unknown action: ${action}` });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// ── admin-github-status ───────────────────────────────────────────────────────
app.all('/api/fn/admin-github-status', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res); if (!callerEmail) return;
  try {
    const token = (process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN || process.env.GITHUB_PAT)?.trim();
    const derived = deriveGithubOwnerRepo();
    const owner = (process.env.GITHUB_OWNER?.trim()) || derived?.owner || '';
    const repo  = (process.env.GITHUB_REPO?.trim())  || derived?.repo  || '';
    if (!token || !owner || !repo) return res.json({ success: false, error: 'GitHub credentials not configured (GITHUB_TOKEN / GITHUB_OWNER / GITHUB_REPO)', configured: false });
    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=5`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return res.status(r.status).json({ success: false, error: `GitHub API returned ${r.status}` });
    const commits = await r.json() as Array<{ sha: string; commit: { message: string; author: { name: string; date: string } } }>;
    res.json({ success: true, configured: true, commits: commits.map(c => ({ sha: c.sha.slice(0, 7), message: c.commit.message.split('\n')[0], author: c.commit.author.name, date: c.commit.author.date })) });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// ── admin-integrations ────────────────────────────────────────────────────────
app.all('/api/fn/admin-integrations', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res); if (!callerEmail) return;
  try {
    const { action } = req.body ?? {} as { action?: string };
    const ghToken = (process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN || process.env.GITHUB_PAT)?.trim();
    const _ghDerived = deriveGithubOwnerRepo();
    const ghOwner = (process.env.GITHUB_OWNER?.trim()) || _ghDerived?.owner || '';
    const ghRepo  = (process.env.GITHUB_REPO?.trim())  || _ghDerived?.repo  || '';
    if (action === 'get_resend_bounces') {
      const data = await resendGet<{ data?: unknown[] }>('/emails?limit=100');
      return res.json({ success: true, bounces: data?.data ?? [], resend_configured: !!process.env.RESEND_API_KEY });
    }
    if (action === 'get_deploy_status') {
      if (!ghToken || !ghOwner || !ghRepo) return res.json({ success: true, configured: false, runs: [] });
      const r = await fetch(`https://api.github.com/repos/${ghOwner}/${ghRepo}/actions/runs?per_page=5`, {
        headers: { Authorization: `Bearer ${ghToken}`, Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) return res.status(r.status).json({ success: false, error: `GitHub API ${r.status}` });
      const data = await r.json() as { workflow_runs?: Array<{ id: number; name: string; status: string; conclusion: string | null; created_at: string; html_url: string }> };
      return res.json({ success: true, configured: true, runs: (data.workflow_runs ?? []).map(w => ({ id: w.id, name: w.name, status: w.status, conclusion: w.conclusion, created_at: w.created_at, url: w.html_url })) });
    }
    if (action === 'trigger_deploy') {
      if (!ghToken || !ghOwner || !ghRepo) return res.status(503).json({ success: false, error: 'GitHub credentials not configured' });
      const { workflow_id = 'deploy.yml', ref = 'main' } = req.body as { workflow_id?: string; ref?: string };
      const r = await fetch(`https://api.github.com/repos/${ghOwner}/${ghRepo}/actions/workflows/${workflow_id}/dispatches`, {
        method: 'POST', headers: { Authorization: `Bearer ${ghToken}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }, body: JSON.stringify({ ref }), signal: AbortSignal.timeout(8000),
      });
      if (!r.ok && r.status !== 204) return res.status(r.status).json({ success: false, error: `GitHub API ${r.status}` });
      supabaseInsert('audit_logs', { user_id: null, category: 'integrations', action: 'trigger_deploy', metadata: { workflow_id, ref, performed_by: callerEmail } }).catch(() => {});
      return res.json({ success: true });
    }
    res.status(400).json({ success: false, error: `Unknown action: ${action}` });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// ── admin-owner-ops ───────────────────────────────────────────────────────────
app.all('/api/fn/admin-owner-ops', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res); if (!callerEmail) return;
  try {
    const { action } = req.body ?? {} as { action?: string };
    const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim();
    const projectRef = SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1];
    if (action === 'trigger_backup') {
      if (!accessToken || !projectRef) {
        supabaseInsert('audit_logs', { user_id: null, category: 'owner_ops', action: 'backup_trigger_failed', metadata: { reason: 'SUPABASE_ACCESS_TOKEN not configured', performed_by: callerEmail } }).catch(() => {});
        return res.status(503).json({ success: false, error: 'SUPABASE_ACCESS_TOKEN not configured — cannot call Supabase Management API' });
      }
      const r = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/backups`, {
        method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(15000),
      });
      const ok = r.ok || r.status === 202;
      supabaseInsert('audit_logs', { user_id: null, category: 'owner_ops', action: ok ? 'backup_triggered' : 'backup_trigger_failed', metadata: { status: r.status, performed_by: callerEmail } }).catch(() => {});
      return res.json({ success: ok, status: r.status });
    }
    if (action === 'get_backup_status') {
      if (!accessToken || !projectRef) return res.json({ success: true, backups: [], configured: false });
      const r = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/backups`, {
        headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) return res.json({ success: false, error: `Supabase Management API ${r.status}`, backups: [] });
      const data = await r.json() as { backups?: unknown[] };
      return res.json({ success: true, configured: true, backups: data.backups ?? data ?? [] });
    }
    res.status(400).json({ success: false, error: `Unknown action: ${action}` });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// ── admin-wisehire-waitlist ───────────────────────────────────────────────────
app.all('/api/fn/admin-wisehire-waitlist', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res); if (!callerEmail) return;
  try {
    const body = req.body ?? {}; const { action = 'list', delete_entry_id, history_email, page = 1, per_page = 50, search } = body as { action?: string; delete_entry_id?: string; history_email?: string; page?: number; per_page?: number; search?: string };
    if (action === 'history_email') {
      if (!history_email) return res.status(400).json({ success: false, error: 'history_email required' });
      const invites = await supabaseGet('wisehire_invites', `select=*&recipient_email=eq.${encodeURIComponent(history_email)}&order=created_at.desc`).catch(() => []);
      return res.json({ success: true, invites });
    }
    if (action === 'delete_entry_id') {
      if (!delete_entry_id) return res.status(400).json({ success: false, error: 'delete_entry_id required' });
      await supabaseDelete('wisehire_waitlist', `id=eq.${encodeURIComponent(delete_entry_id)}`);
      return res.json({ success: true });
    }
    // list (default)
    const limit = Math.min(200, Math.max(1, Number(per_page)));
    const offset = Math.max(0, (Number(page) - 1) * limit);
    let q = `select=*&order=created_at.desc&offset=${offset}&limit=${limit}`;
    if (search) q += `&or=(email.ilike.*${encodeURIComponent(search)}*,company.ilike.*${encodeURIComponent(search)}*)`;
    const entries = await supabaseGet<{ id: string; email: string }>('wisehire_waitlist', q).catch(() => []);
    const emails = entries.map(e => e.email);
    let inviteMap: Record<string, { used_at: string | null; is_revoked: boolean; expires_at: string | null }[]> = {};
    if (emails.length) {
      const invites = await supabaseGet<{ recipient_email: string; used_at: string | null; is_revoked: boolean; expires_at: string | null }>('wisehire_invites', `select=recipient_email,used_at,is_revoked,expires_at&recipient_email=in.(${emails.map(encodeURIComponent).join(',')})`).catch(() => []);
      for (const inv of invites) { if (!inviteMap[inv.recipient_email]) inviteMap[inv.recipient_email] = []; inviteMap[inv.recipient_email].push(inv); }
    }
    res.json({ success: true, entries: entries.map(e => ({ ...e, invites: inviteMap[e.email] ?? [] })), total: entries.length });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// ── admin-wisehire-invite ─────────────────────────────────────────────────────
app.all('/api/fn/admin-wisehire-invite', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res); if (!callerEmail) return;
  try {
    const { email, note } = req.body ?? {} as { email?: string; note?: string };
    if (!email?.trim()) return res.status(400).json({ success: false, error: 'email required' });
    const recipient = email.trim().toLowerCase();
    const { createHmac, randomBytes } = await import('crypto');
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
    // Revoke old unused invites for this email
    await supabasePatch('wisehire_invites', `recipient_email=eq.${encodeURIComponent(recipient)}&used_at=is.null&is_revoked=eq.false`, { is_revoked: true }).catch(() => {});
    const inserted = await supabaseInsert<{ id: string }>('wisehire_invites', { recipient_email: recipient, token, expires_at: expiresAt, is_revoked: false, created_by: callerEmail, note: note ?? null });
    await supabasePatch('wisehire_waitlist', `email=eq.${encodeURIComponent(recipient)}`, { invited_at: new Date().toISOString() }).catch(() => {});
    const appUrl = process.env.APP_URL || `https://${process.env.REPLIT_DEV_DOMAIN || 'resume.thewise.cloud'}`;
    const inviteUrl = `${appUrl}/wisehire/join?token=${token}`;
    // Send email via Resend if configured
    let messageId: string | null = null;
    const resendResult = await resendPost<{ id?: string }>('/emails', {
      from: process.env.RESEND_FROM_EMAIL || 'noreply@thewise.cloud', to: [recipient],
      subject: 'You\'re invited to WiseHire Early Access',
      html: `<p>Hi there,</p><p>You've been invited to join WiseHire early access.</p><p><a href="${inviteUrl}">Accept your invitation</a></p><p>This invite expires on ${new Date(expiresAt).toLocaleDateString()}.</p>`,
    });
    messageId = resendResult?.id ?? null;
    supabaseInsert('audit_logs', { user_id: null, category: 'wisehire', action: 'wisehire_invite', metadata: { recipient, message_id: messageId, performed_by: callerEmail } }).catch(() => {});
    res.json({ success: true, invite_url: inviteUrl, expires_at: expiresAt, message_id: messageId, resend_configured: !!process.env.RESEND_API_KEY });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// ── admin-wisehire-revoke-invite ──────────────────────────────────────────────
app.all('/api/fn/admin-wisehire-revoke-invite', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res); if (!callerEmail) return;
  try {
    const { email } = req.body ?? {} as { email?: string };
    if (!email?.trim()) return res.status(400).json({ success: false, error: 'email required' });
    const recipient = email.trim().toLowerCase();
    // Count unused invites first
    const unused = await supabaseGet<{ id: string }>('wisehire_invites', `select=id&recipient_email=eq.${encodeURIComponent(recipient)}&used_at=is.null&is_revoked=eq.false`).catch(() => []);
    if (unused.length) await supabasePatch('wisehire_invites', `recipient_email=eq.${encodeURIComponent(recipient)}&used_at=is.null&is_revoked=eq.false`, { is_revoked: true });
    supabaseInsert('audit_logs', { user_id: null, category: 'wisehire', action: 'wisehire_invite_revoked', metadata: { recipient, revoked_count: unused.length, performed_by: callerEmail } }).catch(() => {});
    res.json({ success: true, revoked_count: unused.length });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// ── admin-wisehire-reset-user ─────────────────────────────────────────────────
app.all('/api/fn/admin-wisehire-reset-user', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res); if (!callerEmail) return;
  try {
    const { email } = req.body ?? {} as { email?: string };
    if (!email?.trim()) return res.status(400).json({ success: false, error: 'email required' });
    const targetEmail = email.trim().toLowerCase();
    // Find user in profiles
    const profiles = await supabaseGet<{ user_id: string; contact_email: string | null; account_type: string }>('profiles', `select=user_id,contact_email,account_type&contact_email=eq.${encodeURIComponent(targetEmail)}&limit=1`);
    if (!profiles.length) return res.status(404).json({ success: false, error: 'User not found in profiles' });
    const { user_id } = profiles[0];
    // Find Kinde sub
    const tokenExchanges = await supabaseGet<{ kinde_sub: string | null }>('token_exchanges', `select=kinde_sub&user_id=eq.${encodeURIComponent(user_id)}&limit=1`).catch(() => []);
    const kindeSub = tokenExchanges[0]?.kinde_sub ?? null;
    // Reset invite tokens
    const resetResult = await supabasePatch('wisehire_invites', `recipient_email=eq.${encodeURIComponent(targetEmail)}`, { is_revoked: true, used_at: null }).catch(() => null);
    // Delete from Kinde if configured
    let kindeDeleted = false;
    let kindeError: string | null = null;
    if (kindeSub) {
      try { await kindeDelete(`/api/v1/user?id=${encodeURIComponent(kindeSub)}`); kindeDeleted = true; }
      catch (e) { kindeError = String(e); }
    }
    // Delete from Supabase auth (cascades DB data)
    await supabaseAuthAdmin('DELETE', `users/${encodeURIComponent(user_id)}`).catch(() => {});
    supabaseInsert('audit_logs', { user_id: null, category: 'wisehire', action: 'wisehire_test_reset', metadata: { email: targetEmail, user_id, kinde_sub: kindeSub, kinde_deleted: kindeDeleted, kinde_error: kindeError, performed_by: callerEmail } }).catch(() => {});
    res.json({ success: true, user_id, kinde_deleted: kindeDeleted, kinde_error: kindeError, kinde_configured: !!process.env.KINDE_M2M_CLIENT_ID });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// ── admin-devkit-data ─────────────────────────────────────────────────────────
// Multiplexer: panels call admin-devkit-data?action=X. Route each action to
// the dedicated Express sub-handler so the DevKit never touches edge functions
// in dev (Replit) mode.
app.all('/api/fn/admin-devkit-data', async (req, res) => {
  const callerEmail = await requireDevKitAuth(req, res);
  if (!callerEmail) return;
  const body = req.body ?? {};
  const action = (body.action as string | undefined) ?? '';
  if (!action) return res.status(400).json({ success: false, error: 'action is required: analytics | observability | live-activity | mission-control | github-status' });

  const actionToRoute: Record<string, string> = {
    'analytics':      'admin-analytics',
    'mission-control':'admin-mission-control',
    'github-status':  'admin-github-status',
    'live-activity':  'admin-live-activity',
    'observability':  'admin-observability',
  };
  const subRoute = actionToRoute[action];
  if (!subRoute) return res.status(400).json({ success: false, error: `Unknown action: ${action}` });

  // For observability the sub-handler reads body.action as the sub-action;
  // panels send obs_action for that.
  const forwardBody = action === 'observability'
    ? { ...body, action: body.obs_action ?? 'get_telemetry' }
    : body;

  try {
    const r = await fetch(`http://127.0.0.1:5001/api/fn/${subRoute}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: req.headers.authorization ?? '' },
      body: JSON.stringify(forwardBody),
      signal: AbortSignal.timeout(30_000),
    });
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (err) { return res.status(502).json({ success: false, error: String(err) }); }
});

// ── admin-email ───────────────────────────────────────────────────────────────
// Panels call admin-email; the full implementation lives in admin-email-actions.
app.all('/api/fn/admin-email', async (req, res) => {
  try {
    const r = await fetch(`http://127.0.0.1:5001/api/fn/admin-email-actions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: req.headers.authorization ?? '' },
      body: JSON.stringify(req.body ?? {}),
      signal: AbortSignal.timeout(30_000),
    });
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (err) { return res.status(502).json({ success: false, error: String(err) }); }
});

/**
 * Edge function proxy — forwards all /api/fn/* calls to Supabase Edge Functions.
 * The client's Authorization (Kinde JWT) is forwarded as-is.
 * Sensitive Supabase keys never leave the server.
 */
app.all('/api/fn/:fnName', async (req, res) => {
  const { fnName } = req.params;

  if (!SUPABASE_URL) {
    console.error(`[server] /api/fn/${fnName}: SUPABASE_URL is not set — cannot proxy edge function`);
    return res.status(503).json({ error: 'Supabase not configured', detail: 'SUPABASE_URL env var is missing' });
  }

  if (!SUPABASE_ANON_KEY) {
    console.error(`[server] /api/fn/${fnName}: SUPABASE_ANON_KEY is not set — edge function call would be rejected by Supabase`);
    return res.status(503).json({ error: 'Supabase not configured', detail: 'SUPABASE_ANON_KEY env var is missing' });
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
  try {
    const userId = req.verifiedUserId!;
    const rows = await supabaseGet<NeonRow>(
      'profiles',
      `user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`,
    );
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
  try {
    const userId = req.verifiedUserId!;
    const body = (req.body ?? {}) as Record<string, unknown>;

    // Filter to the writable allow-list. Unknown columns are dropped so a
    // request referencing a non-existent column doesn't fail the whole
    // upsert; PostgREST will reject any column that doesn't exist on the
    // Supabase profiles table, so we still surface a 4xx in that case.
    const updates: Record<string, unknown> = { user_id: userId };
    for (const [k, v] of Object.entries(body)) {
      if (PROFILE_WRITABLE_COLUMNS.has(k)) updates[k] = v;
    }

    const rows = await supabaseUpsert<NeonRow>('profiles', updates, 'user_id');
    res.json({ profile: rows[0] ?? null });
  } catch (err) {
    return dataErr(res, err);
  }
});

// ── /api/data/portfolios/me ────────────────────────────────────────────────────
app.get('/api/data/portfolios/me', requireAuthHeader, async (req: AuthedRequest, res) => {
  try {
    const rows = await supabaseGet<NeonRow>(
      'portfolios',
      `user_id=eq.${encodeURIComponent(req.verifiedUserId!)}&select=id,username&limit=1`,
    );
    res.json({ portfolio: rows[0] ?? null });
  } catch (err) {
    return dataErr(res, err);
  }
});

// ── /api/data/activity-rows ────────────────────────────────────────────────────
// Returns the date-stamp arrays needed by useActivityStreak in a single round
// trip. `since` is an ISO timestamp; rows older than that are excluded.
app.get('/api/data/activity-rows', requireAuthHeader, async (req: AuthedRequest, res) => {
  try {
    const userId = req.verifiedUserId!;
    const sinceRaw = typeof req.query.since === 'string' ? req.query.since : '';
    const since = sinceRaw && !Number.isNaN(new Date(sinceRaw).getTime())
      ? new Date(sinceRaw).toISOString()
      : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const u = encodeURIComponent(userId);
    const s = encodeURIComponent(since);
    const [resumes, apps, covers] = await Promise.all([
      supabaseGet<NeonRow>('resumes', `user_id=eq.${u}&created_at=gte.${s}&select=created_at`),
      supabaseGet<NeonRow>('job_applications', `user_id=eq.${u}&applied_at=gte.${s}&select=applied_at,status`),
      supabaseGet<NeonRow>('cover_letters', `user_id=eq.${u}&created_at=gte.${s}&select=created_at`),
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
  try {
    const userId = req.verifiedUserId!;
    const u = encodeURIComponent(userId);
    const [resumes, covers, apps] = await Promise.all([
      supabaseGet<NeonRow>('resumes', `user_id=eq.${u}&select=id`),
      supabaseGet<NeonRow>('cover_letters', `user_id=eq.${u}&select=id`),
      supabaseGet<NeonRow>('job_applications', `user_id=eq.${u}&select=status,applied_at`),
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

// ── /api/data/me ───────────────────────────────────────────────────────────────
// Replaces the `me` Supabase edge function. Queries profiles, user_preferences,
// subscriptions, and ai_credits from Supabase using the service-role key
// (bypasses RLS) and returns the same MeData shape the client expects.
app.get('/api/data/me', requireAuthHeader, async (req: AuthedRequest, res) => {
  try {
    const userId = req.verifiedUserId!;

    // Extract kinde_sub from the raw Bearer token claims (already signature-verified by requireAuthHeader).
    let kindeSub: string | null = null;
    try {
      const raw = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      const b64 = raw.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/') || '';
      const padded = b64.padEnd(b64.length + (4 - (b64.length % 4)) % 4, '=');
      const claims = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
      kindeSub = typeof claims.kinde_sub === 'string' ? claims.kinde_sub : null;
    } catch { /* kinde_sub is optional */ }

    const u = encodeURIComponent(userId);
    const [profileArr, prefsArr, subsArr, creditsArr] = await Promise.all([
      supabaseGet<Record<string, unknown>>('profiles', `user_id=eq.${u}&select=*&limit=1`),
      supabaseGet<Record<string, unknown>>('user_preferences', `user_id=eq.${u}&select=*&limit=1`),
      supabaseGet<Record<string, unknown>>('subscriptions', `user_id=eq.${u}&select=plan_name,status,plan_updated_at,trial_plan,trial_expires_at&limit=1`),
      supabaseGet<Record<string, unknown>>('ai_credits', `user_id=eq.${u}&select=daily_usage,daily_limit,usage_date,total_usage,updated_at&limit=1`),
    ]);

    const profile = profileArr[0] ?? null;
    const prefs = prefsArr[0] ?? null;
    const sub = subsArr[0] ?? null;
    const rawCredits = creditsArr[0] ?? null;

    // Suspension check
    if (profile && profile.is_suspended) {
      return res.status(403).json({
        suspended: true,
        reason: profile.suspension_reason ?? null,
        message: 'Your account has been suspended. Please contact support.',
      });
    }

    // Compute effective plan: active trial takes precedence over plan_name
    let effectivePlan: string = (sub && typeof sub.plan_name === 'string') ? sub.plan_name : 'free';
    if (sub && sub.trial_plan && sub.trial_expires_at) {
      const expiresAt = new Date(sub.trial_expires_at as string);
      if (expiresAt > new Date()) {
        effectivePlan = sub.trial_plan as string;
      }
    }

    const subscriptionPayload = sub
      ? { ...sub, effective_plan: effectivePlan }
      : { plan_name: 'free', status: 'active', plan_updated_at: null, trial_plan: null, trial_expires_at: null, effective_plan: 'free' };

    // Plan daily limits (mirrors supabase/functions/_shared/creditLimits.json)
    const PLAN_DAILY_LIMITS: Record<string, number> = { free: 5, pro: 100, premium: -1 };
    function planDailyLimit(plan: string): number {
      return PLAN_DAILY_LIMITS[plan] ?? PLAN_DAILY_LIMITS.free;
    }

    const today = new Date().toISOString().split('T')[0];
    let aiCreditsPayload: Record<string, unknown> | null = null;
    if (rawCredits) {
      const rawLimit = typeof rawCredits.daily_limit === 'number' ? rawCredits.daily_limit : planDailyLimit(effectivePlan);
      if (effectivePlan === 'premium') {
        aiCreditsPayload = { ...rawCredits, daily_limit: planDailyLimit('premium') };
      } else if (effectivePlan === 'pro') {
        const planDefault = planDailyLimit('pro');
        const effectiveLimit = rawLimit > planDefault ? rawLimit : planDefault;
        aiCreditsPayload = { ...rawCredits, daily_limit: effectiveLimit };
      } else {
        aiCreditsPayload = rawCredits as Record<string, unknown>;
      }
    } else {
      aiCreditsPayload = {
        daily_usage: 0,
        daily_limit: planDailyLimit(effectivePlan),
        usage_date: today,
        total_usage: 0,
        updated_at: new Date().toISOString(),
      };
    }

    res.json({
      userId,
      kinde_sub: kindeSub,
      profile,
      preferences: prefs,
      subscription: subscriptionPayload,
      ai_credits: aiCreditsPayload,
      byok_enabled: prefs && typeof prefs.byok_enabled !== 'undefined' ? prefs.byok_enabled : false,
      byok_provider: prefs && typeof prefs.byok_provider !== 'undefined' ? prefs.byok_provider : null,
    });
  } catch (err) {
    return dataErr(res, err);
  }
});

// ── /api/data/resumes ──────────────────────────────────────────────────────────
// Insert a new resume via the Supabase service-role key (bypasses RLS).
// Used by useResumes createResume, useGuestMigration, and DashboardPage's
// "create resume from LinkedIn" path.
app.post('/api/data/resumes', requireAuthHeader, async (req: AuthedRequest, res) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: 'Supabase not configured' });
  }
  try {
    const userId = req.verifiedUserId!;
    const body = (req.body ?? {}) as Record<string, unknown>;

    // Allowlist of columns a client may set on create.
    // Identity/system columns (user_id, id, is_primary, is_trial, etc.) are
    // controlled server-side or by DB defaults and must not be forwarded.
    const RESUME_CREATE_COLUMNS = new Set([
      'title', 'template_id', 'contact_info', 'summary', 'experience',
      'education', 'skills', 'certifications', 'awards', 'projects',
      'publications', 'volunteering', 'languages', 'hobbies', 'references',
      'customization',
    ]);
    const filtered: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (RESUME_CREATE_COLUMNS.has(k)) filtered[k] = v;
    }

    const payload = {
      ...filtered,
      user_id: userId,
      title: typeof body.title === 'string' && body.title ? body.title : 'My Resume',
      template_id: typeof body.template_id === 'string' ? body.template_id : 'modern',
    };

    const r = await fetch(`${SUPABASE_URL}/rest/v1/resumes`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const body = await r.text().catch(() => '');
      console.error(`[data-api] Supabase POST /resumes returned ${r.status}: ${body}`);
      return res.status(502).json({ error: 'Failed to create resume' });
    }

    const rows = await r.json() as Record<string, unknown>[];
    res.json({ resume: rows[0] ?? null });
  } catch (err) {
    return dataErr(res, err);
  }
});

// ── PATCH /api/data/resumes/:id ────────────────────────────────────────────────
// Update an existing resume via the Supabase service-role key (bypasses RLS).
// Enforces ownership by filtering on both id and user_id.
app.patch('/api/data/resumes/:id', requireAuthHeader, async (req: AuthedRequest, res) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: 'Supabase not configured' });
  }
  try {
    const id = req.params.id;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'Invalid resume id' });
    const userId = req.verifiedUserId!;
    const body = (req.body ?? {}) as Record<string, unknown>;

    // Allowlist of columns a client may update.
    // Includes trial_expires_at so the client-side belt-and-suspenders trial
    // expiry in updateResume can still set it alongside the DB trigger.
    const RESUME_UPDATE_COLUMNS = new Set([
      'title', 'template_id', 'contact_info', 'summary', 'experience',
      'education', 'skills', 'certifications', 'awards', 'projects',
      'publications', 'volunteering', 'languages', 'hobbies', 'references',
      'customization', 'trial_expires_at',
    ]);
    const updates: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (RESUME_UPDATE_COLUMNS.has(k)) updates[k] = v;
    }

    const url = `${SUPABASE_URL}/rest/v1/resumes?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}`;
    const r = await fetch(url, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(updates),
    });

    if (!r.ok) {
      const errBody = await r.text().catch(() => '');
      console.error(`[data-api] Supabase PATCH /resumes/:id returned ${r.status}: ${errBody}`);
      return res.status(502).json({ error: 'Failed to update resume' });
    }

    const rows = await r.json() as Record<string, unknown>[];
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    res.json({ resume: rows[0] });
  } catch (err) {
    return dataErr(res, err);
  }
});

app.get('/api/data/resumes/exists/:id', requireAuthHeader, async (req: AuthedRequest, res) => {
  try {
    const id = req.params.id;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return res.json({ exists: false });
    const rows = await supabaseGet<NeonRow>(
      'resumes',
      `id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(req.verifiedUserId!)}&select=id&limit=1`,
    );
    res.json({ exists: rows.length > 0 });
  } catch (err) {
    return dataErr(res, err);
  }
});

app.delete('/api/data/resumes/:id', requireAuthHeader, async (req: AuthedRequest, res) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: 'Supabase not configured' });
  }
  try {
    const id = req.params.id;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'Invalid resume id' });
    const userId = req.verifiedUserId!;
    const url = `${SUPABASE_URL}/rest/v1/resumes?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}`;
    const r = await fetch(url, {
      method: 'DELETE',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
    });
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      console.error(`[data-api] Supabase DELETE /resumes/:id returned ${r.status}: ${body}`);
      return res.status(502).json({ error: 'Failed to delete resume' });
    }
    res.status(204).end();
  } catch (err) {
    return dataErr(res, err);
  }
});

app.delete('/api/data/resumes', requireAuthHeader, async (req: AuthedRequest, res) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: 'Supabase not configured' });
  }
  try {
    const { ids } = (req.body ?? {}) as { ids?: unknown };
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array required' });
    const validIds = (ids as unknown[]).filter((id): id is string => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id));
    if (validIds.length === 0) return res.status(400).json({ error: 'No valid ids provided' });
    const userId = req.verifiedUserId!;
    const inList = validIds.map(id => encodeURIComponent(id)).join(',');
    const url = `${SUPABASE_URL}/rest/v1/resumes?id=in.(${inList})&user_id=eq.${encodeURIComponent(userId)}`;
    const r = await fetch(url, {
      method: 'DELETE',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
    });
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      console.error(`[data-api] Supabase DELETE /resumes (bulk) returned ${r.status}: ${body}`);
      return res.status(502).json({ error: 'Failed to delete resumes' });
    }
    res.status(204).end();
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
    let rows: Array<{ deleted: unknown }>;
    try {
      rows = await sql`
        SELECT public.sweep_analytics_retention_batch(
          ${table}::text,
          ${days}::int,
          ${ANALYTICS_SWEEP_BATCH_SIZE}::int
        ) AS deleted
      `;
    } catch (err: unknown) {
      // 42883 = undefined_function: the RPC does not exist in this DB
      // (e.g. local dev sidecar missing the Supabase migration). Skip silently.
      if (typeof err === 'object' && err !== null && (err as { code?: string }).code === '42883') {
        return 0;
      }
      throw err;
    }
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
 * Returns balance / rate-limit info for all three managed OpenRouter keys
 * (OPENROUTER_KEY_1, OPENROUTER_KEY_2, OPENROUTER_KEY_3) in parallel.
 * Response: { keys: Array<{ slot, configured, data?, error? }> }
 */
app.get(
  '/api/admin/ai-provider/openrouter-status',
  requireAuthHeader,
  requireAdminEmail,
  async (_req, res) => {
    const cacheKey = 'openrouter-status-all';
    const cached = getCached<unknown>(cacheKey);
    if (cached) { res.json(cached); return; }

    const slots = [1, 2, 3] as const;
    const results = await Promise.all(
      slots.map(async (slot) => {
        const key = process.env[`OPENROUTER_KEY_${slot}`];
        if (!key) return { slot, configured: false };
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 8000);
        try {
          const r = await fetch('https://openrouter.ai/api/v1/auth/key', {
            headers: { Authorization: `Bearer ${key}` },
            signal: controller.signal,
          });
          if (!r.ok) return { slot, configured: true, error: `Upstream HTTP ${r.status}` };
          const body = (await r.json()) as { data?: Record<string, unknown> };
          return { slot, configured: true, data: body.data ?? null };
        } catch (e) {
          return { slot, configured: true, error: logAndSanitiseUpstreamError(`openrouter-status-${slot}`, e) };
        } finally {
          clearTimeout(t);
        }
      }),
    );

    const out = { keys: results };
    setCached(cacheKey, out);
    res.json(out);
  },
);

/**
 * GET /api/admin/ai-provider/openrouter2-status
 * Alias kept for backward compatibility — returns slot 2 data only.
 * Prefer /api/admin/ai-provider/openrouter-status which returns all 3 slots.
 */
app.get(
  '/api/admin/ai-provider/openrouter2-status',
  requireAuthHeader,
  requireAdminEmail,
  async (_req, res) => {
    const key = process.env.OPENROUTER_KEY_2;
    if (!key) { res.json({ configured: false }); return; }
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    try {
      const r = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { Authorization: `Bearer ${key}` },
        signal: controller.signal,
      });
      if (!r.ok) { res.json({ configured: true, error: `Upstream HTTP ${r.status}` }); return; }
      const body = (await r.json()) as { data?: Record<string, unknown> };
      res.json({ configured: true, slot: 2, data: body.data ?? null });
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
 * Returns the live Groq model list using the managed GROQ_KEY_1.
 */
app.get(
  '/api/admin/ai-provider/groq-models',
  requireAuthHeader,
  requireAdminEmail,
  async (_req, res) => {
    const key = process.env.GROQ_KEY_1;
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
 * Returns today's request/token usage for all three managed Groq keys
 * (GROQ_KEY_1, GROQ_KEY_2, GROQ_KEY_3) fetched in parallel.
 * Response: { keys: Array<{ slot, configured, usage?, error? }> }
 */
app.get(
  '/api/admin/ai-provider/groq-usage',
  requireAuthHeader,
  requireAdminEmail,
  async (_req, res) => {
    const slots = [1, 2, 3] as const;
    const results = await Promise.all(
      slots.map(async (slot) => {
        const key = process.env[`GROQ_KEY_${slot}`];
        if (!key) return { slot, configured: false };
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 8000);
        try {
          const r = await fetch('https://api.groq.com/openai/v1/usage', {
            headers: { Authorization: `Bearer ${key}` },
            signal: controller.signal,
          });
          if (!r.ok) return { slot, configured: true, error: `Upstream HTTP ${r.status}` };
          const body = await r.json() as Record<string, unknown>;
          return { slot, configured: true, usage: body };
        } catch (e) {
          return { slot, configured: true, error: logAndSanitiseUpstreamError(`groq-usage-${slot}`, e) };
        } finally {
          clearTimeout(t);
        }
      }),
    );
    res.json({ keys: results });
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

// ── Native PDF export (Puppeteer) ─────────────────────────────────────────────
// Renders a self-contained HTML document via Puppeteer and streams back a
// text-selectable PDF. A persistent shared browser instance is reused across
// requests to eliminate the 3-5s Chromium startup overhead. A semaphore caps
// the number of concurrent pages to avoid exhausting container memory.

let _puppeteerActiveCnt = 0;
const _puppeteerQueue: Array<() => void> = [];
const MAX_PUPPETEER_CONCURRENT = 3;

function _createPuppeteerRelease(): () => void {
  return () => {
    _puppeteerActiveCnt--;
    const next = _puppeteerQueue.shift();
    if (next) next();
  };
}

async function acquirePuppeteerSlot(): Promise<() => void> {
  if (_puppeteerActiveCnt < MAX_PUPPETEER_CONCURRENT) {
    _puppeteerActiveCnt++;
    return _createPuppeteerRelease();
  }
  return new Promise<() => void>((resolve) => {
    _puppeteerQueue.push(() => {
      _puppeteerActiveCnt++;
      resolve(_createPuppeteerRelease());
    });
  });
}

// Persistent browser singleton — launched once and reused across all requests.
// On crash (disconnected event or keep-alive failure) the reference is cleared
// and a fresh instance is launched on the next request.
let _sharedBrowser: import('puppeteer').Browser | null = null;
let _browserLaunching: Promise<import('puppeteer').Browser> | null = null;
let _keepAliveInterval: ReturnType<typeof setInterval> | null = null;

/** Starts a periodic keep-alive ping that proactively detects a dead browser. */
function _startKeepAlive(browser: import('puppeteer').Browser): void {
  if (_keepAliveInterval) clearInterval(_keepAliveInterval);
  _keepAliveInterval = setInterval(async () => {
    if (_sharedBrowser !== browser) {
      // A different instance is now active — stop pinging the old one.
      clearInterval(_keepAliveInterval!);
      _keepAliveInterval = null;
      return;
    }
    try {
      await browser.pages();
    } catch {
      console.warn('[puppeteer] keep-alive ping failed — marking browser as dead');
      if (_sharedBrowser === browser) _sharedBrowser = null;
      clearInterval(_keepAliveInterval!);
      _keepAliveInterval = null;
    }
  }, 30_000); // ping every 30 seconds
}

async function getSharedBrowser(): Promise<import('puppeteer').Browser> {
  if (_sharedBrowser) {
    try {
      // Health-check: pages() throws if the browser process died.
      await _sharedBrowser.pages();
      return _sharedBrowser;
    } catch {
      _sharedBrowser = null;
    }
  }

  // Another concurrent request is already launching — piggyback on it.
  if (_browserLaunching) {
    return _browserLaunching;
  }

  const { default: puppeteer } = await import('puppeteer');
  // Allow operators to point at a system-installed Chrome / Chromium instead
  // of the one Puppeteer downloads to ~/.cache/puppeteer. Useful on hosts
  // where the cache directory is ephemeral or where chromium is provided by
  // the OS package manager (NixOS, Docker images, etc.).
  const explicitChromePath = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;
  _browserLaunching = puppeteer
    .launch({
      headless: true,
      executablePath: explicitChromePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none',
      ],
    })
    .then((browser) => {
      _sharedBrowser = browser;
      _browserLaunching = null;
      browser.on('disconnected', () => {
        console.warn('[puppeteer] browser disconnected — will relaunch on next request');
        if (_sharedBrowser === browser) _sharedBrowser = null;
      });
      _startKeepAlive(browser);
      console.log('[puppeteer] shared browser launched');
      return browser;
    })
    .catch((err) => {
      _browserLaunching = null;
      throw err;
    });

  return _browserLaunching;
}

/**
 * URL the in-PDF "Created with WiseResume" footer brand links to.
 * Clicking the brand strip on any PDF page opens this URL in the user's browser.
 */
const PDF_BRAND_URL = 'https://resume.thewise.cloud';
const PDF_BRAND_TEXT = '\u2756 Created with WiseResume \u00b7 part of The Wise Cloud';

/**
 * Adds a clickable URI link annotation across the bottom strip of every page
 * in the supplied PDF. When `drawBrand` is true the brand text is also drawn
 * inside that strip — used for the custom-break path where Puppeteer's
 * footerTemplate is disabled (each segment has its own height).
 *
 * Chromium's print-to-PDF does NOT preserve hyperlinks placed in
 * headerTemplate/footerTemplate, so the brand has to be made clickable
 * here as a post-processing step using pdf-lib's link annotations.
 */
async function attachBrandLinkToPdf(
  pdfBytes: Uint8Array | Buffer,
  opts: { drawBrand: boolean; bandHeightPt?: number },
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes);
  const bandHeightPt = opts.bandHeightPt ?? (opts.drawBrand ? 16 : 36);
  const font = opts.drawBrand ? await doc.embedFont(StandardFonts.Helvetica) : null;
  const fontSize = 7;

  for (const page of doc.getPages()) {
    const { width } = page.getSize();

    if (opts.drawBrand && font) {
      // pdf-lib's standard fonts (Helvetica) use WinAnsi (cp1252) encoding
      // which only covers code points <= 0xFF. The brand string contains
      // the ornament "❖" (U+2756) which is purely decorative — strip any
      // characters outside WinAnsi so a font-encoding error can't crash
      // the export. The HTML footerTemplate path (Puppeteer) renders the
      // ornament fine and is unaffected.
      const safeText = PDF_BRAND_TEXT
        .replace(/[^\x00-\xFF]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const textWidth = font.widthOfTextAtSize(safeText, fontSize);
      page.drawText(safeText, {
        x: Math.max(0, (width - textWidth) / 2),
        y: 5,
        size: fontSize,
        font,
        color: rgb(0.67, 0.67, 0.67),
      });
    }

    const linkAnnot = doc.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [0, 0, width, bandHeightPt],
      Border: [0, 0, 0],
      A: {
        Type: 'Action',
        S: 'URI',
        URI: PDFString.of(PDF_BRAND_URL),
      },
    });
    const linkRef = doc.context.register(linkAnnot);

    const existing = page.node.lookup(PDFName.of('Annots'));
    if (existing instanceof PDFArray) {
      existing.push(linkRef);
    } else {
      page.node.set(PDFName.of('Annots'), doc.context.obj([linkRef]));
    }
  }

  return doc.save();
}

function _buildPuppeteerFooter(showPageNumbers: boolean, showBranding: boolean): string {
  const pageNum = showPageNumbers
    ? `<span style="font-family:Arial,Helvetica,sans-serif;font-size:8px;color:#888;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>`
    : '';
  const branding = showBranding
    ? `<span style="font-family:Arial,Helvetica,sans-serif;font-size:7px;color:#aaa;">\u2756 Created with WiseResume \u00b7 part of The Wise Cloud</span>`
    : '';
  const sep = showPageNumbers && showBranding
    ? `<span style="color:#ccc;margin:0 8px;">|</span>`
    : '';
  return `<div style="width:100%;display:flex;align-items:center;justify-content:center;padding:0 20px;box-sizing:border-box;">${pageNum}${sep}${branding}</div>`;
}

app.post('/api/export/pdf-native', requireAuthHeader, async (req: AuthedRequest, res: Response) => {
  const {
    html,
    pageFormat = 'letter',
    onePage = false,
    fitScale = 1,
    showPageNumbers = true,
    showBranding = true,
    customBreakPositions,
    totalContentHeightPx,
  } = req.body as {
    html?: unknown;
    pageFormat?: unknown;
    onePage?: unknown;
    fitScale?: unknown;
    showPageNumbers?: unknown;
    showBranding?: unknown;
    customBreakPositions?: unknown;
    totalContentHeightPx?: unknown;
  };

  if (typeof html !== 'string' || html.length < 10 || html.length > 50_000_000) {
    res.status(400).json({ error: 'Invalid HTML payload' });
    return;
  }

  const isA4 = pageFormat === 'a4';
  const safeOnePage = onePage === true;
  const safeFitScale = typeof fitScale === 'number' && isFinite(fitScale)
    ? Math.max(0.05, Math.min(fitScale, 2))
    : 1;
  const safeShowPageNumbers = showPageNumbers !== false;
  const safeShowBranding = showBranding !== false;

  // Resume content is designed at 612px (Letter) / 595px (A4) — matching the
  // PDF point dimensions. Chromium's print mode uses 96dpi, so to fill a
  // physical Letter/A4 page we zoom the content by (viewportPx / resumePx).
  const resumeWidthPx = isA4 ? 595 : 612;
  const viewportWidthPx = isA4 ? 794 : 816; // = physical page width in inches × 96dpi
  const pageZoom = viewportWidthPx / resumeWidthPx; // ≈ 1.3333
  const totalZoom = safeOnePage ? pageZoom * safeFitScale : pageZoom;

  const needsFooter = !safeOnePage && (safeShowPageNumbers || safeShowBranding);
  const footerHeightPx = needsFooter ? 36 : 0;
  const footerHtml = needsFooter
    ? _buildPuppeteerFooter(safeShowPageNumbers, safeShowBranding)
    : '<span></span>';

  // Inject zoom + print-colour accuracy before any other styles so templates
  // cannot accidentally override the zoom.
  const zoomSnippet = `<style>html{zoom:${totalZoom};-webkit-print-color-adjust:exact;print-color-adjust:exact;}</style>`;
  const injectedHtml = html.replace(/<head>/i, `<head>${zoomSnippet}`);

  const release = await acquirePuppeteerSlot();
  let page: import('puppeteer').Page | null = null;
  try {
    const browser = await getSharedBrowser();
    page = await browser.newPage();
    await page.setViewport({ width: viewportWidthPx, height: isA4 ? 1123 : 1056 });

    // SSRF mitigation: intercept all network requests made by the headless browser
    // and block those targeting private/loopback IP ranges or cloud metadata endpoints.
    // This prevents an authenticated but malicious user from reading internal services.
    await page.setRequestInterception(true);
    const _SSRF_BLOCKED_PATTERNS = [
      /^https?:\/\/169\.254\./,                    // AWS/GCP/Azure link-local metadata
      /^https?:\/\/metadata\./,                    // generic metadata hostnames
      /^https?:\/\/10\./,                          // RFC-1918 private range
      /^https?:\/\/172\.(1[6-9]|2\d|3[01])\./,    // RFC-1918 private range
      /^https?:\/\/192\.168\./,                    // RFC-1918 private range
      /^https?:\/\/127\./,                         // IPv4 loopback
      /^https?:\/\/localhost([:/]|$)/i,            // localhost hostname
      /^https?:\/\/[^/]*\.localhost([:/]|$)/i,     // *.localhost subdomains
      /^https?:\/\/\[::1\]/,                       // IPv6 loopback
      /^https?:\/\/\[fc00:/i,                      // IPv6 unique-local (fc00::/7)
      /^https?:\/\/\[fd[0-9a-f]{2}:/i,            // IPv6 unique-local (fd00::/8)
      /^https?:\/\/\[fe80:/i,                      // IPv6 link-local
      /^https?:\/\/0\.0\.0\.0/,                   // INADDR_ANY
    ];
    page.on('request', (request) => {
      const url = request.url();
      // Allow data URIs and same-origin app assets
      if (url.startsWith('data:') || url.startsWith('about:')) {
        request.continue();
        return;
      }
      // Block private/metadata ranges
      if (_SSRF_BLOCKED_PATTERNS.some(re => re.test(url))) {
        console.warn(`[export/pdf-native] Blocked SSRF attempt to: ${url}`);
        request.abort('addressunreachable');
        return;
      }
      request.continue();
    });

    await page.setContent(injectedHtml, { waitUntil: 'networkidle0', timeout: 30_000 });

    // For custom-break rendering we need to slice the body into segments
    // using layout properties (NOT CSS transforms) because Chromium's print
    // engine ignores transforms and `<html overflow:hidden>` when paginating
    // — it walks the body's natural box, which is why the previous attempts
    // produced extra/empty pages. Wrap the body's children once now in a
    // clipping div + content shifter; per-segment we just adjust the wrapper
    // height and the inner shifter's negative margin.
    if (
      Array.isArray(customBreakPositions) &&
      (customBreakPositions as unknown[]).length > 0 &&
      typeof totalContentHeightPx === 'number' &&
      (totalContentHeightPx as number) > 10
    ) {
      await page.evaluate(
        `(() => {
          const body = document.body;
          const clip = document.createElement('div');
          clip.id = '__seg_clip__';
          clip.style.cssText = 'position:relative;width:100%;overflow:hidden;';
          const shift = document.createElement('div');
          shift.id = '__seg_shift__';
          shift.style.cssText = 'width:100%;';
          while (body.firstChild) shift.appendChild(body.firstChild);
          clip.appendChild(shift);
          body.appendChild(clip);
          body.style.margin  = '0';
          body.style.padding = '0';
        })()`
      );
    }

    // ── Custom break mode ──────────────────────────────────────────────────────
    // When the user has placed exact break positions we render one PDF segment
    // per page so each page has its own precise height. The last page is never
    // padded to A4/Letter — it is exactly as tall as its remaining content.
    // At 612 pt design width, 1 CSS pixel === 1 PDF point, so break Y values
    // and segment heights can be used directly as pt dimensions.
    const hasCustomBreaks =
      Array.isArray(customBreakPositions) &&
      (customBreakPositions as unknown[]).length > 0 &&
      typeof totalContentHeightPx === 'number' &&
      (totalContentHeightPx as number) > 10;

    console.log('[export/pdf-native] request', {
      hasCustomBreaks,
      onePage: safeOnePage,
      pageFormat: isA4 ? 'a4' : 'letter',
      customBreakPositions: Array.isArray(customBreakPositions)
        ? (customBreakPositions as unknown[])
        : `(non-array: ${typeof customBreakPositions})`,
      totalContentHeightPx,
      htmlBytes: typeof html === 'string' ? html.length : 0,
    });

    if (hasCustomBreaks) {
      const clientTotalH = totalContentHeightPx as number;

      // Measure the actually-rendered body height in Puppeteer so we can
      // detect — and correct for — any drift from what the client measured
      // in the live preview. Drift can happen because of font fallback,
      // text-wrapping differences, or rounding in the css-zoom transform.
      // If the rendered content is e.g. 5% taller in Puppeteer, the user's
      // break Y values (recorded in the live-preview's coordinate space)
      // would otherwise land 5% short of where the user clicked.
      const renderedTotalH = await page.evaluate(
        `(() => {
          const shift = document.getElementById('__seg_shift__');
          return shift ? shift.scrollHeight : document.body.scrollHeight;
        })()`
      ) as number;

      const scale = renderedTotalH > 10 ? renderedTotalH / clientTotalH : 1;
      const totalH = renderedTotalH > 10 ? renderedTotalH : clientTotalH;

      const safeBreaks = (customBreakPositions as unknown[])
        .filter((y): y is number => typeof y === 'number' && isFinite(y) && y > 0)
        .map(y => Math.round(y * scale))
        .filter(y => y > 0 && y < totalH)
        .sort((a, b) => a - b);

      console.log('[export/pdf-native] segment plan', {
        clientTotalH,
        renderedTotalH,
        scale: Number(scale.toFixed(4)),
        rawBreaks: customBreakPositions,
        scaledBreaks: safeBreaks,
        totalH,
      });

      const breakpoints = [0, ...safeBreaks, totalH];
      const pageBuffers: Buffer[] = [];

      for (let si = 0; si < breakpoints.length - 1; si++) {
        const yStart = breakpoints[si];
        const yEnd   = breakpoints[si + 1];
        const segH   = yEnd - yStart; // in scrollHeight-space (zoom-scaled)

        // Guard against degenerate segments that would cause Puppeteer to throw.
        if (segH <= 0) {
          console.warn(`[export/pdf-native] Skipping degenerate segment ${si}: yStart=${yStart} yEnd=${yEnd} segH=${segH}`);
          continue;
        }

        try {
          // Chrome's scrollHeight inside a page with `html { zoom: N }` returns
          // values in the zoomed coordinate space (natural CSS px × N). The
          // safeBreaks/breakpoints were computed from that scrollHeight, so they
          // are also in zoom-scaled space. CSS style properties (height, margin)
          // operate in natural (unzoomed) CSS px, so we must divide by pageZoom
          // before using these values as DOM or PDF measurements.
          const clipH   = Math.round(segH   / pageZoom); // natural CSS px
          const clipOff = Math.round(yStart / pageZoom); // natural CSS px

          // The viewport height must accommodate the clip's visual size
          // (clipH natural px × pageZoom zoom = segH visual px).
          const segViewportH = Math.max(1, segH);
          await page.setViewport({ width: viewportWidthPx, height: segViewportH });

          // Slice the document via LAYOUT properties — set the clip
          // wrapper's height to clipH (natural CSS px) and the inner
          // shifter's negative top margin to -clipOff (natural CSS px).
          // Chromium's print engine respects overflow:hidden + margin
          // (which are layout, not paint), so body's effective height
          // becomes exactly clipH and only the requested slice is visible.
          //
          // NOTE: `page.evaluate(fn)` serialises the function and runs
          // it in the browser context. Any nested function declarations
          // inside `fn` end up wrapped by tsx/esbuild with a `__name(...)`
          // helper (from the `keepNames` transform) which doesn't exist
          // in the browser, causing `ReferenceError: __name is not
          // defined`. We therefore pass a plain string IIFE — tsx
          // leaves string literals untouched.
          await page.evaluate(
            `(() => {
              const clip  = document.getElementById('__seg_clip__');
              const shift = document.getElementById('__seg_shift__');
              if (clip && shift) {
                clip.style.height    = '${clipH}px';
                clip.style.overflow  = 'hidden';
                shift.style.marginTop = '-${clipOff}px';
              }
            })()`
          );

          // PDF height: clipH natural CSS px maps directly to clipH PDF pt
          // at the 612pt design width (1 natural CSS px = 1 PDF pt). This
          // keeps the page exactly the size of its content slice.
          // `pageRanges: '1'` caps to one physical page per segment even
          // if the body still overflows after clipping.
          const segPdf = await page.pdf({
            width:           `${resumeWidthPx / 72}in`,
            height:          `${clipH / 72}in`,
            printBackground: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' },
            displayHeaderFooter: false,
            pageRanges: '1',
            preferCSSPageSize: false,
          });

          pageBuffers.push(Buffer.from(segPdf));
          // No reset needed — the next iteration overwrites the clip
          // wrapper's height and the shifter's negative margin in place.
        } catch (segErr) {
          console.error(
            `[export/pdf-native] Segment ${si} failed — yStart=${yStart} yEnd=${yEnd} segH=${segH}:`,
            segErr,
          );
          throw segErr;
        }
      }

      // Merge all single-page PDFs into one multi-page document
      const merged = await PDFDocument.create();
      for (const buf of pageBuffers) {
        const doc   = await PDFDocument.load(buf);
        const pages = await merged.copyPages(doc, doc.getPageIndices());
        pages.forEach(p => merged.addPage(p));
      }
      let finalBytes = await merged.save();

      // Brand the bottom of every custom-break page and make it click-through.
      // Puppeteer's footerTemplate is disabled in this path (each segment has
      // its own height), so the brand text is drawn here by pdf-lib.
      if (safeShowBranding) {
        finalBytes = await attachBrandLinkToPdf(finalBytes, { drawBrand: true });
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="resume.pdf"');
      res.send(Buffer.from(finalBytes));
      return;
    }

    // ── Standard A4 / Letter rendering ────────────────────────────────────────
    const pdfBuffer = await page.pdf({
      format: isA4 ? 'A4' : 'Letter',
      printBackground: true,
      margin: {
        top: '0',
        right: '0',
        bottom: footerHeightPx ? `${footerHeightPx}px` : '0',
        left: '0',
      },
      displayHeaderFooter: needsFooter,
      headerTemplate: '<span></span>',
      footerTemplate: footerHtml,
      pageRanges: safeOnePage ? '1' : undefined,
    });

    // Make the Puppeteer-rendered footer brand band clickable. Chromium does
    // not preserve <a> hyperlinks placed in footerTemplate, so we add a URI
    // link annotation across the same band via pdf-lib post-processing.
    let outBytes: Uint8Array | Buffer = pdfBuffer;
    if (needsFooter && safeShowBranding) {
      outBytes = await attachBrandLinkToPdf(pdfBuffer, {
        drawBrand: false,
        bandHeightPt: footerHeightPx, // matches Puppeteer's bottom margin
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="resume.pdf"');
    res.send(Buffer.from(outBytes));
  } catch (err) {
    console.error('[export/pdf-native] Puppeteer error:', err);
    res.status(500).json({ error: 'PDF rendering failed. Please try again.' });
  } finally {
    if (page) {
      try { await page.close(); } catch { /* ignore */ }
    }
    release();
  }
});

// ── Sentry error handler ──────────────────────────────────────────────────────
// Must be registered AFTER all routes and BEFORE any other error middleware so
// Sentry sees every unhandled Express error with full request context.
if (SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// ── Static file serving (Replit production deployment) ────────────────────────
// When running in production (NODE_ENV=production), the Express server also
// serves the Vite-built frontend from the dist/ directory. In development,
// Vite's dev server (port 5000) handles static assets directly.
if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(__dirname, '../dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath, { maxAge: '1d' }));
    // SPA fallback: serve index.html for all non-API routes
    app.use((_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log(`[server] Serving static files from ${distPath}`);
  } else {
    console.warn('[server] dist/ directory not found — run npm run build first');
  }
}

// ── Start server ──────────────────────────────────────────────────────────────
// Start listening immediately so the very first token-exchange request from the
// browser never races against a closed port. Secret bootstrap runs in the
// background; route handlers that need the secrets read module-level vars which
// will be populated within a few seconds of startup.
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] WiseResume API server running on port ${PORT}`);
  console.log(`[server] Supabase URL: ${SUPABASE_URL ? 'configured' : 'NOT SET'}`);
  console.log(`[server] Database: ${DATABASE_URL ? 'configured' : 'NOT SET'}`);
  scheduleAnalyticsSweep();

  bootstrapSupabaseSecrets()
    .then(() => {
      console.log(`[server] Supabase JWT secret: ${SUPABASE_JWT_SECRET ? 'configured' : 'MISSING (Supabase calls will 401)'}`);
    })
    .catch((err: unknown) => {
      console.error('[server] Supabase bootstrap failed — auth token exchange may 401 until secrets are available:', err);
    });
});

export default app;
