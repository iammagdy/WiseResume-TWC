// admin-config: consolidated router for the 5 admin-only configuration
// edge functions. See task #52 + EDGE_FUNCTION_AUDIT.md for rationale.
//
// Dispatch contract (per task spec):
//   PRIMARY: `body.action` ∈ {
//     "get-settings", "update-settings", "feature-flags",
//     "integrations", "env-check"
//   }
//   FALLBACK: `x-admin-config-action` request header.
//
// Why a header fallback exists:
//   - The original `admin-feature-flags` handler reads `body.action ∈
//     {"list","upsert","delete"}` for its inner sub-path.
//   - The original `admin-integrations` handler reads `body.action ∈
//     {"get_resend_bounces","get_deploy_status","trigger_deploy"}`.
//   In both cases the inner `action` value collides with the router-level
//   dispatch field. To preserve byte-for-byte parity with the originals
//   we must NOT clobber the inner `action` key. The web helper therefore
//   sets `x-admin-config-action: feature-flags` (or `integrations`) and
//   leaves the body untouched. The router sees `body.action = "list"`
//   (not in VALID_ACTIONS), falls back to the header, and the
//   sub-handler re-parses the body and reads its own inner action
//   exactly as before.
//
// Parity strategy: the router buffers the request body ONCE as text,
// then hands the text string (not a parsed object) to each handler.
// Each handler does its OWN JSON.parse inside its original try/catch
// wrapper, so each handler preserves its original parse-vs-validation
// semantics byte-for-byte.
//
// Single documented router-boundary deviation from originals:
// `requireAdminAuth` runs ONCE at the top of `serve` (per task spec —
// explicit "single assertAdmin at top of serve"). All 5 originals
// parsed body BEFORE auth, so an unauthenticated call with a
// malformed body returned 500 from the parse-fail path. With auth
// at top, that combined edge case now returns 401. No real client
// (web helper, dev proxy, mobile) ever hits this case — they all
// post well-formed JSON. The Playwright spec asserts the new 401
// behavior so the deviation is captured in CI.
//
// CRITICAL — env-check parity: the masking surface (which env vars
// the function reports as `present`/`absent`) MUST match the original
// admin-env-check byte-for-byte. Adding or removing keys here is a
// security-relevant change. Do NOT modify REQUIRED_ENV_VARS without
// explicit owner sign-off (per task #52 out-of-scope rules).

import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { invalidateOpenRouterAdminCache } from '../_shared/aiClient.ts';
import { wrapHandler } from '../_shared/fnLogger.ts';

function jsonResponse(payload: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify(payload),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

// ─── get-settings (was admin-get-settings) ──────────────────────────────
// Original: parse body → (auth) → query app_settings → return shape
// `{success:true, settings:{...}}`. Outer try/catch returns 500
// `Internal server error` on any throw.
async function handleGetSettings(bodyText: string, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    // Parity: original did `await req.json()` unconditionally even
    // though it ignored the result. An empty/malformed body therefore
    // threw and was caught by the outer try/catch → 500
    // 'Internal server error'. Replicate verbatim by always parsing
    // (an empty bodyText throws SyntaxError just like req.json()).
    JSON.parse(bodyText);

    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value, updated_at');

    if (error) throw error;

    const settings: Record<string, unknown> = {};
    for (const row of (data || [])) {
      settings[row.key] = row.value;
    }

    return jsonResponse({ success: true, settings }, 200, corsHeaders);
  } catch (err) {
    console.error('[admin-get-settings] Error:', err);
    return jsonResponse({ success: false, error: 'Internal server error' }, 500, corsHeaders);
  }
}

// ─── update-settings (was admin-update-settings) ────────────────────────
// Original: parse body → validate `key` → upsert app_settings → invalidate
// OpenRouter cache for known keys → return `{success:true}`. Validation
// returns 400 `key is required`; outer try/catch returns 500
// `Internal server error`.
async function handleUpdateSettings(bodyText: string, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const body = JSON.parse(bodyText);
    const { key, value } = body;

    if (!key) {
      return jsonResponse({ success: false, error: 'key is required' }, 400, corsHeaders);
    }

    const supabase = getServiceClient();

    const { error } = await supabase
      .from('app_settings')
      .upsert(
        { key, value, updated_at: new Date().toISOString() },
        { onConflict: 'key' },
      );

    if (error) throw error;

    if (key === 'openrouter_curated_model' || key === 'openrouter_auto_fallback') {
      invalidateOpenRouterAdminCache();
    }

    return jsonResponse({ success: true }, 200, corsHeaders);
  } catch (err) {
    console.error('[admin-update-settings] Error:', err);
    return jsonResponse({ success: false, error: 'Internal server error' }, 500, corsHeaders);
  }
}

// ─── feature-flags (was admin-feature-flags) ────────────────────────────
// Original inner action ∈ {"list","upsert","delete"}. Audit log writes
// preserved verbatim (category="admin_feature_flag", action=<inner>,
// user_id=null, metadata.performed_by=callerEmail).
async function writeFeatureFlagsAuditLog(
  supabase: ReturnType<typeof getServiceClient>,
  action: string,
  callerEmail: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from('audit_logs').insert({
    user_id: null,
    category: 'admin_feature_flag',
    action,
    metadata: { ...metadata, performed_by: callerEmail },
  });
  if (error) {
    console.error('[admin-feature-flags] audit log write failed:', error);
  }
}

async function handleFeatureFlags(
  bodyText: string,
  corsHeaders: Record<string, string>,
  callerEmail: string,
): Promise<Response> {
  try {
    const body = JSON.parse(bodyText);
    const { action } = body as { action: string };
    const supabase = getServiceClient();

    if (action === 'list') {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return jsonResponse({ success: true, flags: data }, 200, corsHeaders);
    }

    if (action === 'upsert') {
      const {
        name,
        description = '',
        enabled_globally = false,
        enabled_plans = [],
        enabled_user_ids = [],
        percentage_rollout = 0,
        kill_switch_function = null,
      } = body as {
        name: string;
        description?: string;
        enabled_globally?: boolean;
        enabled_plans?: string[];
        enabled_user_ids?: string[];
        percentage_rollout?: number;
        kill_switch_function?: string | null;
      };

      if (!name || typeof name !== 'string') {
        return jsonResponse({ success: false, error: 'name is required' }, 400, corsHeaders);
      }

      const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

      const row = {
        name: cleanName,
        description: description.trim(),
        enabled_globally,
        enabled_plans,
        enabled_user_ids,
        percentage_rollout: Math.max(0, Math.min(100, Number(percentage_rollout) || 0)),
        kill_switch_function: kill_switch_function?.trim() || null,
        updated_by: callerEmail,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('feature_flags')
        .upsert(row, { onConflict: 'name' })
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return jsonResponse({ success: false, error: 'not_found' }, 404, corsHeaders);
      }

      await writeFeatureFlagsAuditLog(supabase, 'upsert', callerEmail, {
        flag_name: cleanName,
        enabled_globally,
        enabled_plans,
        enabled_user_ids_count: enabled_user_ids.length,
        percentage_rollout: row.percentage_rollout,
        kill_switch_function: row.kill_switch_function,
      });

      return jsonResponse({ success: true, flag: data }, 200, corsHeaders);
    }

    if (action === 'delete') {
      const { name } = body as { name: string };
      if (!name) {
        return jsonResponse({ success: false, error: 'name is required' }, 400, corsHeaders);
      }

      const { error } = await supabase
        .from('feature_flags')
        .delete()
        .eq('name', name);

      if (error) throw error;

      await writeFeatureFlagsAuditLog(supabase, 'delete', callerEmail, { flag_name: name });

      return jsonResponse({ success: true }, 200, corsHeaders);
    }

    return jsonResponse({ success: false, error: `Unknown action: ${action}` }, 400, corsHeaders);
  } catch (err) {
    console.error('[admin-feature-flags]', err);
    return jsonResponse({ success: false, error: 'Internal server error' }, 500, corsHeaders);
  }
}

// ─── integrations (was admin-integrations) ──────────────────────────────
// Original inner action ∈ {"get_resend_bounces","get_deploy_status",
// "trigger_deploy"}. All three return 200 envelopes (even on upstream
// errors, with `success:false`) — preserved verbatim, including the
// `restricted_key` Resend reason and the wildcard 200-on-failure shape.
async function handleIntegrations(
  bodyText: string,
  corsHeaders: Record<string, string>,
  method: string,
): Promise<Response> {
  // Original: `const body = req.method === 'GET' ? {} : await req.json();`
  // Preserve: GET → empty body; POST/etc → unconditional JSON.parse,
  // which throws on an empty or malformed body just like req.json()
  // does. The original had NO try/catch around this, so the throw
  // bubbles out of this function and out of the router (which also
  // has no outer try/catch around dispatch — see router comment) into
  // wrapHandler → re-thrown → platform-default 500. Byte-for-byte
  // identical to the original error surface.
  const body = method === 'GET' ? {} : JSON.parse(bodyText);
  const action: string = body.action ?? '';

  // ── GET RESEND BOUNCES ───────────────────────────────────────────────
  if (action === 'get_resend_bounces') {
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      return jsonResponse({ success: false, error: 'RESEND_API_KEY is not configured', bounces: [] }, 200, corsHeaders);
    }

    try {
      const resp = await fetch('https://api.resend.com/emails?limit=100', {
        headers: { Authorization: `Bearer ${resendKey}` },
      });

      if (!resp.ok) {
        const errText = await resp.text();
        if (resp.status === 401) {
          try {
            const parsed = JSON.parse(errText) as { name?: string; message?: string };
            if (parsed.name === 'restricted_api_key') {
              return jsonResponse({
                success: false,
                reason: 'restricted_key',
                error: 'The configured RESEND_API_KEY is a restricted (send-only) key and cannot list emails. Replace it with a full-access key in Supabase Edge Function secrets.',
                bounces: [],
              }, 200, corsHeaders);
            }
          } catch { /* not JSON — fall through */ }
        }
        return jsonResponse({ success: false, error: `Resend API ${resp.status}: ${errText.slice(0, 200)}`, bounces: [] }, 200, corsHeaders);
      }

      const raw = await resp.json() as { data?: Array<Record<string, unknown>> };
      const emails = raw.data ?? [];

      const bounced = emails.filter((e) => {
        const status = ((e.last_event ?? e.status) as string | undefined)?.toLowerCase() ?? '';
        return status === 'bounced' || status === 'failed' || status === 'complained';
      }).map((e) => {
        const details = (e.last_event_details ?? e.bounce ?? e.click ?? {}) as Record<string, unknown>;
        const reason: string =
          String(e.bounce_reason ?? e.error_message ?? details.status_message ?? details.reason ?? '');
        return {
          id: e.id,
          to: Array.isArray(e.to) ? (e.to as string[]).join(', ') : String(e.to ?? ''),
          subject: String(e.subject ?? ''),
          status: String(e.last_event ?? e.status ?? ''),
          reason: reason || null,
          created_at: String(e.created_at ?? ''),
        };
      });

      return jsonResponse({ success: true, bounces: bounced, total_emails_checked: emails.length }, 200, corsHeaders);
    } catch (err) {
      return jsonResponse({ success: false, error: String(err), bounces: [] }, 200, corsHeaders);
    }
  }

  // ── GET DEPLOY STATUS ────────────────────────────────────────────────
  if (action === 'get_deploy_status') {
    const githubToken = Deno.env.get('GITHUB_TOKEN');
    const githubOwner = Deno.env.get('GITHUB_OWNER');
    const githubRepo = Deno.env.get('GITHUB_REPO');

    if (!githubToken) return jsonResponse({ success: false, error: 'GITHUB_TOKEN is not configured', runs: [] }, 200, corsHeaders);
    if (!githubOwner || !githubRepo) return jsonResponse({ success: false, error: 'GITHUB_OWNER and GITHUB_REPO must be set', runs: [] }, 200, corsHeaders);

    const workflow = body.workflow ?? 'deploy.yml';

    try {
      const resp = await fetch(
        `https://api.github.com/repos/${githubOwner}/${githubRepo}/actions/workflows/${workflow}/runs?per_page=5`,
        {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'WiseResume-DevKit/1.0',
          },
        },
      );

      if (!resp.ok) {
        const errText = await resp.text();
        return jsonResponse({ success: false, error: `GitHub API ${resp.status}: ${errText.slice(0, 200)}`, runs: [] }, 200, corsHeaders);
      }

      const raw = await resp.json() as { workflow_runs?: Array<Record<string, unknown>> };
      const runs = (raw.workflow_runs ?? []).slice(0, 5).map((r) => ({
        id: r.id,
        name: String(r.name ?? ''),
        status: String(r.status ?? ''),
        conclusion: r.conclusion ? String(r.conclusion) : null,
        created_at: String(r.created_at ?? ''),
        updated_at: String(r.updated_at ?? ''),
        html_url: String(r.html_url ?? ''),
        head_commit: r.head_commit
          ? {
              message: (r.head_commit as Record<string, string>).message?.split('\n')[0] ?? '',
              author: (r.head_commit as Record<string, Record<string, string>>).author?.name ?? '',
            }
          : null,
      }));

      return jsonResponse({ success: true, runs, workflow, repo_url: `https://github.com/${githubOwner}/${githubRepo}` }, 200, corsHeaders);
    } catch (err) {
      return jsonResponse({ success: false, error: String(err), runs: [] }, 200, corsHeaders);
    }
  }

  // ── TRIGGER DEPLOY ───────────────────────────────────────────────────
  if (action === 'trigger_deploy') {
    const githubToken = Deno.env.get('GITHUB_TOKEN');
    const githubOwner = Deno.env.get('GITHUB_OWNER');
    const githubRepo = Deno.env.get('GITHUB_REPO');

    if (!githubToken) return jsonResponse({ success: false, error: 'GITHUB_TOKEN is not configured' }, 200, corsHeaders);
    if (!githubOwner || !githubRepo) return jsonResponse({ success: false, error: 'GITHUB_OWNER and GITHUB_REPO must be set' }, 200, corsHeaders);

    const workflow = body.workflow ?? 'deploy.yml';
    const ref = body.ref ?? 'main';

    try {
      const resp = await fetch(
        `https://api.github.com/repos/${githubOwner}/${githubRepo}/actions/workflows/${workflow}/dispatches`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'WiseResume-DevKit/1.0',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ref }),
        },
      );

      if (!resp.ok) {
        const errText = await resp.text();
        return jsonResponse({ success: false, error: `GitHub API ${resp.status}: ${errText.slice(0, 200)}` }, 200, corsHeaders);
      }

      return jsonResponse({ success: true, message: `Deploy triggered on ${ref}`, workflow }, 200, corsHeaders);
    } catch (err) {
      return jsonResponse({ success: false, error: String(err) }, 200, corsHeaders);
    }
  }

  return jsonResponse({ success: false, error: `Unknown action: ${action}` }, 400, corsHeaders);
}

// ─── env-check (was admin-env-check) ────────────────────────────────────
// CRITICAL: keep REQUIRED_ENV_VARS byte-for-byte identical to the
// original. Any change here is a security-relevant masking change and
// is explicitly out of scope for task #52.
const REQUIRED_ENV_VARS: { key: string; label: string }[] = [
  { key: 'SUPABASE_URL', label: 'Supabase URL' },
  { key: 'SUPABASE_ANON_KEY', label: 'Supabase Anon Key' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', label: 'Supabase Service Role Key' },
  { key: 'DEV_KIT_PASSWORD', label: 'DevKit Password' },
  { key: 'KINDE_DOMAIN', label: 'Kinde Domain (token-exchange)' },
  { key: 'OPENROUTER_KEY_1', label: 'OpenRouter Key 1' },
  { key: 'OPENROUTER_KEY_2', label: 'OpenRouter Key 2' },
  { key: 'OPENROUTER_KEY_3', label: 'OpenRouter Key 3' },
  { key: 'GROQ_KEY_1', label: 'Groq Key 1' },
  { key: 'GROQ_KEY_2', label: 'Groq Key 2' },
  { key: 'GROQ_KEY_3', label: 'Groq Key 3' },
  { key: 'GITHUB_TOKEN', label: 'GitHub Token' },
  { key: 'GITHUB_OWNER', label: 'GitHub Owner' },
  { key: 'GITHUB_REPO', label: 'GitHub Repo' },
  { key: 'RESEND_API_KEY', label: 'Resend API Key' },
  { key: 'KINDE_WEBHOOK_SECRET', label: 'Kinde Webhook Secret (kinde-webhook instant provisioning)' },
  { key: 'KINDE_M2M_CLIENT_ID', label: 'Kinde M2M Client ID (admin-get-identity email lookup + admin-kinde-reconcile + wisehire-reset-user)' },
  { key: 'KINDE_M2M_CLIENT_SECRET', label: 'Kinde M2M Client Secret (admin-get-identity email lookup + admin-kinde-reconcile + wisehire-reset-user)' },
];

async function handleEnvCheck(_bodyText: string, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const checks = REQUIRED_ENV_VARS.map(({ key, label }) => ({
      key,
      label,
      present: !!Deno.env.get(key),
    }));

    const supabaseProjectRef = Deno.env.get('SUPABASE_URL')?.match(/https:\/\/([^.]+)/)?.[1];
    const supabaseUrl = supabaseProjectRef
      ? `https://supabase.com/dashboard/project/${supabaseProjectRef}`
      : null;

    return jsonResponse({ success: true, checks, supabaseUrl }, 200, corsHeaders);
  } catch (err) {
    return jsonResponse({ success: false, error: String(err) }, 500, corsHeaders);
  }
}

// ─── router ─────────────────────────────────────────────────────────────
const VALID_ACTIONS = new Set([
  'get-settings',
  'update-settings',
  'feature-flags',
  'integrations',
  'env-check',
]);

Deno.serve(wrapHandler('admin-config', async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Buffer body once as text. Each handler will JSON.parse from this
  // text string with its own try/catch wrapper so each handler
  // preserves its original parse-vs-validation semantics
  // byte-for-byte.
  let bodyText: string;
  try {
    bodyText = await req.text();
  } catch {
    return jsonResponse({ success: false, error: 'Internal server error' }, 500, corsHeaders);
  }

  // Soft-parse for dispatch ONLY. Failure here is non-fatal — handlers
  // re-parse and reproduce their original parse-error envelopes.
  let dispatchAction: string | undefined;
  try {
    const parsedForDispatch = JSON.parse(bodyText) as { action?: unknown };
    if (typeof parsedForDispatch?.action === 'string') {
      dispatchAction = parsedForDispatch.action;
    }
  } catch {
    /* fall through to header fallback below */
  }

  // Prefer body.action when it names a valid router action (per task
  // spec). Header fallback is consulted otherwise — this is what lets
  // the feature-flags / integrations sub-handlers read their own
  // inner `action` field (list/upsert/delete, get_resend_bounces,
  // etc.) without colliding with the router's dispatch.
  let action: string;
  if (dispatchAction && VALID_ACTIONS.has(dispatchAction)) {
    action = dispatchAction;
  } else {
    action = req.headers.get('x-admin-config-action') ?? '';
  }

  // Single admin auth gate (per task spec — explicit "single
  // assertAdmin at top of serve"). Documented router-boundary
  // deviation: all 5 originals parsed body before auth, so
  // unauth + malformed body returned 500 from those originals.
  // With auth at top, that combined edge case now returns 401.
  let actorEmail: string;
  try {
    actorEmail = await requireAdminAuth(req, corsHeaders);
  } catch (authErr) {
    if (authErr instanceof Response) return authErr;
    console.error('[admin-config] auth error:', authErr);
    return jsonResponse({ success: false, error: 'Internal server error' }, 500, corsHeaders);
  }

  // No outer try/catch around dispatch — parity requirement: the
  // original `admin-integrations` had no try/catch wrapping
  // `await req.json()`, so a malformed body threw out of the handler
  // and bubbled to wrapHandler → re-thrown → platform default 500
  // (NOT a JSON `{success:false,error:...}` envelope). Wrapping it
  // here would change that error surface and break byte-for-byte
  // parity. Each sub-handler that DID have its own outer try/catch
  // (get-settings, update-settings, feature-flags, env-check)
  // implements it internally and returns the original JSON 500.
  switch (action) {
    case 'get-settings':
      return await handleGetSettings(bodyText, corsHeaders);
    case 'update-settings':
      return await handleUpdateSettings(bodyText, corsHeaders);
    case 'feature-flags':
      return await handleFeatureFlags(bodyText, corsHeaders, actorEmail);
    case 'integrations':
      return await handleIntegrations(bodyText, corsHeaders, req.method);
    case 'env-check':
      return await handleEnvCheck(bodyText, corsHeaders);
    default:
      return jsonResponse(
        {
          success: false,
          error: `Unknown action: ${action || '(missing)'}. Use one of: get-settings, update-settings, feature-flags, integrations, env-check`,
        },
        400,
        corsHeaders,
      );
  }
}));
