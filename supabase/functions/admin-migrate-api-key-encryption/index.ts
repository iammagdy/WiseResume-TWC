/**
 * AI-2 — admin-gated v1 → v2 BYOK encryption migration.
 *
 * Iterates every `user_api_keys` row whose `key_version <> 2`, decrypts
 * each `encrypted_key` under the legacy static salt (`user-api-keys-salt`),
 * re-encrypts it under the per-user salt (`user-api-keys-salt-v2-<userId>`),
 * and updates the row in-place inside its own statement (Supabase wraps
 * each `update` in an implicit transaction). Each row outcome is recorded
 * in `ai_key_migration_audit`.
 *
 * Properties:
 *   - **Idempotent**: a row already at `key_version = 2` is skipped (and a
 *     `skipped_v2` audit row is written so the runbook can verify
 *     `migrated + skipped_v2 = total`).
 *   - **Atomic per row**: if decrypt or re-encrypt fails, the row is left
 *     untouched and `decrypt_failed` / `reencrypt_failed` is logged. A row
 *     never lands in a half-migrated state where `key_version` was bumped
 *     but the ciphertext is still v1.
 *   - **No key material in audit logs** — only outcome + provider + a
 *     truncated SHA-256 of the ciphertext for forensic correlation.
 *   - **Dry-run safe**: `?dry_run=true` (or body `{ dry_run: true }`) runs
 *     the full decrypt/re-encrypt pipeline but skips both the row update
 *     and the audit insert, returning the would-be summary.
 *
 * Operational sequence: see docs/ops/api-key-encryption-rotation.md.
 */

import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

const ENCRYPTION_SECRET = Deno.env.get('API_KEY_ENCRYPTION_SECRET');

const LEGACY_SALT = 'user-api-keys-salt';
const V2_SALT_PREFIX = 'user-api-keys-salt-v2-';
const BATCH_SIZE = 500;

interface MigrationResult {
  scanned: number;
  migrated: number;
  skipped_v2: number;
  decrypt_failed: number;
  reencrypt_failed: number;
  update_failed: number;
  dry_run: boolean;
  remaining_non_v2: number | null;
  details: Array<{
    user_id: string;
    provider: string;
    action: string;
    error?: string;
    ciphertext_hash: string;
  }>;
}

async function deriveKey(salt: string, usages: KeyUsage[]): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(ENCRYPTION_SECRET!),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: encoder.encode(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    usages,
  );
}

async function decryptWithSalt(encoded: string, salt: string): Promise<string> {
  const key = await deriveKey(salt, ['decrypt']);
  const combined = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  if (combined.length < 13) throw new Error('ciphertext too short');
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

async function encryptWithSalt(plaintext: string, salt: string): Promise<string> {
  const key = await deriveKey(salt, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function shortHash(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  if (!ENCRYPTION_SECRET) {
    return new Response(
      JSON.stringify({ success: false, error: 'API_KEY_ENCRYPTION_SECRET is not configured' }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    try {
      await requireAdminAuth(req);
    } catch (authErr) {
      if (authErr instanceof Response) return authErr;
      throw authErr;
    }

    let dryRun = false;
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        dryRun = !!body?.dry_run;
      } catch {
        // body optional
      }
    }
    const url = new URL(req.url);
    if (url.searchParams.get('dry_run') === 'true') dryRun = true;

    const supabase = getServiceClient();

    const result: MigrationResult = {
      scanned: 0,
      migrated: 0,
      skipped_v2: 0,
      decrypt_failed: 0,
      reencrypt_failed: 0,
      update_failed: 0,
      dry_run: dryRun,
      remaining_non_v2: null,
      details: [],
    };

    // Page through legacy rows in deterministic id order so re-runs after
    // a partial failure pick up where they left off.
    let lastId: string | null = null;
    while (true) {
      let q = supabase
        .from('user_api_keys')
        .select('id, user_id, provider, encrypted_key, key_version')
        .neq('key_version', 2)
        .order('id', { ascending: true })
        .limit(BATCH_SIZE);
      if (lastId) q = q.gt('id', lastId);

      const { data: rows, error } = await q;
      if (error) {
        console.error('[admin-migrate-api-key-encryption] fetch error:', error);
        return new Response(
          JSON.stringify({ success: false, error: error.message, partial: result }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      if (!rows || rows.length === 0) break;

      for (const r of rows as Array<{
        id: string;
        user_id: string;
        provider: string;
        encrypted_key: string;
        key_version: number | null;
      }>) {
        result.scanned++;
        lastId = r.id;
        const ctHash = await shortHash(r.encrypted_key ?? '');

        // Idempotency belt-and-braces: even though the query filters
        // key_version <> 2, a concurrent writer could have just flipped
        // a row to v2. Skip it explicitly.
        if (r.key_version === 2) {
          result.skipped_v2++;
          if (!dryRun) {
            await supabase.from('ai_key_migration_audit').insert({
              user_id: r.user_id,
              provider: r.provider,
              action: 'skipped_v2',
              from_version: 2,
              to_version: 2,
              details: { ciphertext_hash: ctHash },
            });
          }
          continue;
        }

        let plaintext: string;
        try {
          plaintext = await decryptWithSalt(r.encrypted_key, LEGACY_SALT);
        } catch (decryptErr) {
          result.decrypt_failed++;
          const message = decryptErr instanceof Error ? decryptErr.message : String(decryptErr);
          result.details.push({
            user_id: r.user_id,
            provider: r.provider,
            action: 'decrypt_failed',
            error: message.slice(0, 200),
            ciphertext_hash: ctHash,
          });
          if (!dryRun) {
            await supabase.from('ai_key_migration_audit').insert({
              user_id: r.user_id,
              provider: r.provider,
              action: 'decrypt_failed',
              from_version: r.key_version ?? 1,
              to_version: null,
              details: { ciphertext_hash: ctHash, error: message.slice(0, 200) },
            });
          }
          continue;
        }

        let newCiphertext: string;
        try {
          newCiphertext = await encryptWithSalt(plaintext, `${V2_SALT_PREFIX}${r.user_id}`);
          // Round-trip self-check: decrypt the freshly-encrypted blob and
          // confirm we can recover the same plaintext under the v2 salt
          // before we ever touch the row. Defends against a silent crypto
          // misconfig that would otherwise lock the user out.
          const verify = await decryptWithSalt(newCiphertext, `${V2_SALT_PREFIX}${r.user_id}`);
          if (verify !== plaintext) throw new Error('round-trip self-check failed');
        } catch (reErr) {
          result.reencrypt_failed++;
          const message = reErr instanceof Error ? reErr.message : String(reErr);
          result.details.push({
            user_id: r.user_id,
            provider: r.provider,
            action: 'reencrypt_failed',
            error: message.slice(0, 200),
            ciphertext_hash: ctHash,
          });
          if (!dryRun) {
            await supabase.from('ai_key_migration_audit').insert({
              user_id: r.user_id,
              provider: r.provider,
              action: 'reencrypt_failed',
              from_version: r.key_version ?? 1,
              to_version: null,
              details: { ciphertext_hash: ctHash, error: message.slice(0, 200) },
            });
          }
          // Plaintext is held in a local var that goes out of scope.
          continue;
        }

        if (dryRun) {
          result.migrated++;
          continue;
        }

        const { error: updErr } = await supabase
          .from('user_api_keys')
          .update({
            encrypted_key: newCiphertext,
            key_version: 2,
            updated_at: new Date().toISOString(),
          })
          .eq('id', r.id)
          .neq('key_version', 2); // guard against concurrent writer
        if (updErr) {
          result.update_failed++;
          result.details.push({
            user_id: r.user_id,
            provider: r.provider,
            action: 'update_failed',
            error: updErr.message.slice(0, 200),
            ciphertext_hash: ctHash,
          });
          await supabase.from('ai_key_migration_audit').insert({
            user_id: r.user_id,
            provider: r.provider,
            action: 'update_failed',
            from_version: r.key_version ?? 1,
            to_version: null,
            details: { ciphertext_hash: ctHash, error: updErr.message.slice(0, 200) },
          });
          continue;
        }

        result.migrated++;
        await supabase.from('ai_key_migration_audit').insert({
          user_id: r.user_id,
          provider: r.provider,
          action: 'migrated',
          from_version: r.key_version ?? 1,
          to_version: 2,
          details: { ciphertext_hash: ctHash },
        });
      }

      if ((rows as unknown[]).length < BATCH_SIZE) break;
    }

    // Final verification: count the rows still on a non-v2 version. The
    // operator uses this to decide whether it's safe to apply the CHECK
    // constraint migration.
    const { count: remaining, error: countErr } = await supabase
      .from('user_api_keys')
      .select('id', { count: 'exact', head: true })
      .neq('key_version', 2);
    if (countErr) {
      console.warn('[admin-migrate-api-key-encryption] remaining count failed:', countErr);
      result.remaining_non_v2 = null;
    } else {
      result.remaining_non_v2 = remaining ?? 0;
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[admin-migrate-api-key-encryption] unexpected error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
