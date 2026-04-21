/**
 * AI-1 backfill (admin-gated, one-shot).
 *
 * Scans every `user_api_keys` row with provider='ollama' and re-validates
 * the stored `base_url` with the new `validateBaseUrl` helper. Rows that
 * fail validation have `base_url` nulled so the next BYOK attempt produces
 * the user-facing "please re-add your Ollama URL in AI Settings" surface
 * error rather than silently retaining an SSRF-capable value.
 *
 * Each change writes one row to `audit_logs` (no key material — only the
 * provider, the safety failure code, and a hashed version of the offending
 * URL for forensic correlation). The encrypted_key column is left untouched.
 *
 * Invoke with `?dry_run=true` (or body `{ dry_run: true }`) to preview
 * without writing. Returns a summary of {scanned, ok, nulled, dry_run}.
 */

import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { validateBaseUrl } from '../_shared/urlSafety.ts';

interface BackfillResult {
  scanned: number;
  ok: number;
  nulled: number;
  already_null: number;
  errors: number;
  dry_run: boolean;
  details: Array<{
    user_id: string;
    code: string;
    message: string;
    url_hash: string;
  }>;
}

async function hashUrl(url: string): Promise<string> {
  const data = new TextEncoder().encode(url);
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

    const { data: rows, error } = await supabase
      .from('user_api_keys')
      .select('user_id, provider, base_url')
      .eq('provider', 'ollama');

    if (error) {
      console.error('[admin-backfill-ollama-urls] fetch error:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const result: BackfillResult = {
      scanned: rows?.length ?? 0,
      ok: 0,
      nulled: 0,
      already_null: 0,
      errors: 0,
      dry_run: dryRun,
      details: [],
    };

    for (const row of rows ?? []) {
      const r = row as { user_id: string; base_url: string | null };
      if (!r.base_url) {
        result.already_null++;
        continue;
      }
      const safety = await validateBaseUrl(r.base_url);
      if (safety.ok) {
        result.ok++;
        continue;
      }
      const urlHash = await hashUrl(r.base_url);
      result.details.push({
        user_id: r.user_id,
        code: safety.code,
        message: safety.message,
        url_hash: urlHash,
      });

      if (dryRun) {
        result.nulled++;
        continue;
      }

      const { error: updErr } = await supabase
        .from('user_api_keys')
        .update({ base_url: null, updated_at: new Date().toISOString() })
        .eq('user_id', r.user_id)
        .eq('provider', 'ollama');

      if (updErr) {
        console.error('[admin-backfill-ollama-urls] update error:', updErr);
        result.errors++;
        continue;
      }
      result.nulled++;

      try {
        await supabase.from('audit_logs').insert({
          user_id: r.user_id,
          action: 'ollama_base_url_nulled',
          category: 'security',
          metadata: {
            reason: 'AI-1 backfill: base_url failed validateBaseUrl',
            code: safety.code,
            message: safety.message,
            url_hash: urlHash,
          },
          created_at: new Date().toISOString(),
        });
      } catch (auditErr) {
        console.warn('[admin-backfill-ollama-urls] audit log failed (non-fatal):', auditErr);
      }
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[admin-backfill-ollama-urls] unexpected error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
