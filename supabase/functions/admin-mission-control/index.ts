import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

const REQUIRED_ENV_VARS: { key: string; label: string }[] = [
  { key: 'SUPABASE_URL', label: 'Supabase URL' },
  { key: 'SUPABASE_ANON_KEY', label: 'Supabase Anon Key' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', label: 'Supabase Service Role Key' },
  { key: 'DEV_KIT_PASSWORD', label: 'DevKit Password' },
  { key: 'KINDE_DOMAIN', label: 'Kinde Domain' },
  { key: 'OPENROUTER_KEY_1', label: 'OpenRouter Key 1' },
  { key: 'OPENROUTER_KEY_2', label: 'OpenRouter Key 2' },
  { key: 'OPENROUTER_KEY_3', label: 'OpenRouter Key 3' },
  { key: 'GROQ_KEY_1', label: 'Groq Key 1' },
  { key: 'GROQ_KEY_2', label: 'Groq Key 2' },
  { key: 'GROQ_KEY_3', label: 'Groq Key 3' },
  { key: 'DEEPSEEK_KEY', label: 'DeepSeek Key 1' },
  { key: 'DEEPSEEK_KEY_2', label: 'DeepSeek Key 2' },
  { key: 'DEEPSEEK_KEY_3', label: 'DeepSeek Key 3' },
  { key: 'GITHUB_TOKEN', label: 'GitHub Token' },
  { key: 'GITHUB_OWNER', label: 'GitHub Owner' },
  { key: 'GITHUB_REPO', label: 'GitHub Repo' },
  { key: 'RESEND_API_KEY', label: 'Resend API Key' },
  { key: 'GEMINI_API_KEY', label: 'Gemini API Key (optional)' },
  { key: 'ELEVENLABS_API_KEY', label: 'ElevenLabs API Key (optional)' },
  { key: 'KINDE_WEBHOOK_SECRET', label: 'Kinde Webhook Secret' },
  { key: 'KINDE_M2M_CLIENT_ID', label: 'Kinde M2M Client ID' },
  { key: 'KINDE_M2M_CLIENT_SECRET', label: 'Kinde M2M Client Secret' },
  { key: 'ADMIN_EMAILS', label: 'Admin Emails Allowlist' },
];

const STALE_DAYS = 90;

async function checkGitHub(owner: string, repo: string, token: string) {
  try {
    const resp = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'WiseResume-DevKit/1.0',
        },
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!resp.ok) return { ok: false, lastCommitAt: null, sha: null, branch: 'main' };
    const commits = await resp.json() as Array<{
      sha: string;
      commit: { author: { date: string } };
    }>;
    const first = commits[0];
    return {
      ok: true,
      lastCommitAt: first?.commit?.author?.date ?? null,
      sha: first?.sha?.slice(0, 7) ?? null,
      branch: 'main',
    };
  } catch {
    return { ok: false, lastCommitAt: null, sha: null, branch: 'main' };
  }
}

async function checkProductionSite(url: string) {
  try {
    const resp = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });
    return { up: resp.ok || resp.status < 500, httpStatus: resp.status };
  } catch {
    return { up: false, httpStatus: 0 };
  }
}

async function checkAIProvider(
  name: string,
  modelsUrl: string,
  apiKey: string,
): Promise<{ provider: string; ok: boolean; latencyMs: number | null; httpStatus: number }> {
  if (!apiKey) return { provider: name, ok: false, latencyMs: null, httpStatus: 0 };
  const start = Date.now();
  try {
    const resp = await fetch(modelsUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(6000),
    });
    const latencyMs = Date.now() - start;
    return { provider: name, ok: resp.ok, latencyMs, httpStatus: resp.status };
  } catch {
    return { provider: name, ok: false, latencyMs: null, httpStatus: 0 };
  }
}

async function checkResend(apiKey: string) {
  if (!apiKey) return { reachable: false, httpStatus: 0, sends24h: null as number | null };
  try {
    const resp = await fetch('https://api.resend.com/emails?limit=100', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) return { reachable: false, httpStatus: resp.status, sends24h: null };
    const body = await resp.json() as { data?: Array<{ created_at: string }> };
    const cutoff = Date.now() - 86400_000;
    const sends24h = (body.data ?? []).filter(
      (e) => new Date(e.created_at).getTime() > cutoff,
    ).length;
    return { reachable: true, httpStatus: resp.status, sends24h };
  } catch {
    return { reachable: false, httpStatus: 0, sends24h: null };
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    try { await req.json(); } catch { /* body may be empty */ }

    try {
      await requireAdminAuth(req);
    } catch (authErr) {
      if (authErr instanceof Response) return authErr;
      throw authErr;
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const githubToken = Deno.env.get('GITHUB_TOKEN') ?? '';
    const githubOwner = Deno.env.get('GITHUB_OWNER') ?? '';
    const githubRepo = Deno.env.get('GITHUB_REPO') ?? '';
    const resendKey = Deno.env.get('RESEND_API_KEY') ?? '';
    // Keys stored in pool format: OPENROUTER_KEY_1/2/3, GROQ_KEY_1/2/3, DEEPSEEK_KEY / DEEPSEEK_KEY_1..3
    const openrouterKey = Deno.env.get('OPENROUTER_KEY_1') ?? Deno.env.get('OPENROUTER_KEY_2') ?? Deno.env.get('OPENROUTER_KEY_3') ?? '';
    const groqKey = Deno.env.get('GROQ_KEY_1') ?? Deno.env.get('GROQ_KEY_2') ?? Deno.env.get('GROQ_KEY_3') ?? '';
    const deepseekKey = Deno.env.get('DEEPSEEK_KEY') ?? Deno.env.get('DEEPSEEK_KEY_1') ?? Deno.env.get('DEEPSEEK_KEY_2') ?? Deno.env.get('DEEPSEEK_KEY_3') ?? '';
    const openrouterSlotsConfigured = [1, 2, 3].filter(n => !!Deno.env.get(`OPENROUTER_KEY_${n}`)?.trim()).length;
    const groqSlotsConfigured = [1, 2, 3].filter(n => !!Deno.env.get(`GROQ_KEY_${n}`)?.trim()).length;
    const deepseekSlotsConfigured = [
      !!(Deno.env.get('DEEPSEEK_KEY') ?? Deno.env.get('DEEPSEEK_KEY_1'))?.trim(),
      !!Deno.env.get('DEEPSEEK_KEY_2')?.trim(),
      !!Deno.env.get('DEEPSEEK_KEY_3')?.trim(),
    ].filter(Boolean).length;
    const productionUrl = Deno.env.get('PRODUCTION_URL') ?? 'https://resume.thewise.cloud';

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600_000).toISOString();

    const [
      githubResult,
      productionSiteResult,
      openrouterPingResult,
      groqPingResult,
      deepseekPingResult,
      resendResult,
      dbResult,
      errorCountResult,
      errorsResult,
      auditActionsResult,
      secretsMetaResult,
    ] = await Promise.allSettled([
      // Deploy: GitHub latest commit
      (githubToken && githubOwner && githubRepo)
        ? checkGitHub(githubOwner, githubRepo, githubToken)
        : Promise.resolve({ ok: false, lastCommitAt: null, sha: null, branch: 'main' }),
      // Deploy: production site liveness
      checkProductionSite(productionUrl),
      // AI: OpenRouter ping (use first available key from pool)
      checkAIProvider('openrouter', 'https://openrouter.ai/api/v1/models?limit=1', openrouterKey),
      // AI: Groq ping (use first available key from pool)
      checkAIProvider('groq', 'https://api.groq.com/openai/v1/models', groqKey),
      // AI: DeepSeek ping (use first available key)
      checkAIProvider('deepseek', 'https://api.deepseek.com/v1/models', deepseekKey),
      // Email: Resend reachability + sends24h
      checkResend(resendKey),
      // DB: basic reachability
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      // DB: error rate in last 1h
      supabase
        .from('error_log')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', oneHourAgo),
      // Recent errors (10 most recent from error_log)
      supabase
        .from('error_log')
        .select('id, message, context, created_at, level')
        .in('level', ['error', 'fatal'])
        .order('created_at', { ascending: false })
        .limit(10),
      // Recent notable admin actions
      supabase
        .from('audit_logs')
        .select('id, action, category, metadata, created_at, user_id')
        .in('action', ['suspend', 'unsuspend', 'delete_user', 'merge_identity', 'credits_override', 'plan_change', 'trial_grant', 'trial_revoke'])
        .order('created_at', { ascending: false })
        .limit(10),
      // Secrets metadata
      supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'secret_rotation_metadata')
        .maybeSingle(),
    ]);

    const envChecks = REQUIRED_ENV_VARS.map(({ key, label }) => ({
      key,
      label,
      present: !!Deno.env.get(key),
    }));

    let secretsMeta: Record<string, { first_seen_at: string; last_rotated_at: string }> = {};
    if (secretsMetaResult.status === 'fulfilled' && secretsMetaResult.value.data?.value) {
      try {
        secretsMeta = JSON.parse(secretsMetaResult.value.data.value);
      } catch { /* ignore */ }
    }

    let metaChanged = false;
    for (const check of envChecks) {
      if (check.present && !secretsMeta[check.key]) {
        secretsMeta[check.key] = {
          first_seen_at: now.toISOString(),
          last_rotated_at: now.toISOString(),
        };
        metaChanged = true;
      }
    }
    if (metaChanged) {
      await supabase.from('app_settings').upsert(
        { key: 'secret_rotation_metadata', value: JSON.stringify(secretsMeta) },
        { onConflict: 'key' },
      );
    }

    const secretsWithAge = envChecks.map((check) => {
      const meta = secretsMeta[check.key];
      const lastRotatedAt = meta?.last_rotated_at ?? meta?.first_seen_at ?? null;
      const daysSinceRotation = lastRotatedAt
        ? Math.floor((now.getTime() - new Date(lastRotatedAt).getTime()) / 86400000)
        : null;
      return {
        ...check,
        lastRotatedAt,
        stale: daysSinceRotation !== null && daysSinceRotation >= STALE_DAYS,
        daysSinceRotation,
      };
    });

    const github = githubResult.status === 'fulfilled' ? githubResult.value : { ok: false, lastCommitAt: null, sha: null, branch: 'main' };
    const prodSite = productionSiteResult.status === 'fulfilled' ? productionSiteResult.value : { up: false, httpStatus: 0 };
    const orPing = openrouterPingResult.status === 'fulfilled' ? openrouterPingResult.value : { provider: 'openrouter', ok: false, latencyMs: null, httpStatus: 0 };
    const groqPing = groqPingResult.status === 'fulfilled' ? groqPingResult.value : { provider: 'groq', ok: false, latencyMs: null, httpStatus: 0 };
    const deepseekPing = deepseekPingResult.status === 'fulfilled' ? deepseekPingResult.value : { provider: 'deepseek', ok: false, latencyMs: null, httpStatus: 0 };
    const emailStatus = resendResult.status === 'fulfilled' ? resendResult.value : { reachable: false, httpStatus: 0, sends24h: null };
    const dbOk = dbResult.status === 'fulfilled' && !dbResult.value.error;
    const dbError = dbResult.status === 'fulfilled' ? (dbResult.value.error?.message ?? null) : 'Check failed';
    const errorCount1h = errorCountResult.status === 'fulfilled' && !errorCountResult.value.error
      ? (errorCountResult.value.count ?? 0)
      : null;

    let recentErrors: unknown[] = [];
    if (errorsResult.status === 'fulfilled' && !errorsResult.value.error) {
      recentErrors = errorsResult.value.data ?? [];
    }

    let recentAdminActions: unknown[] = [];
    if (auditActionsResult.status === 'fulfilled' && !auditActionsResult.value.error) {
      recentAdminActions = auditActionsResult.value.data ?? [];
    }

    const providerPings = [orPing, groqPing, deepseekPing];
    const anyProviderOk = providerPings.some(p => p.ok);
    const allProvidersOk = providerPings.filter(p =>
      (p.provider === 'openrouter' && !!openrouterKey) ||
      (p.provider === 'groq' && !!groqKey) ||
      (p.provider === 'deepseek' && !!deepseekKey)
    ).every(p => p.ok);

    const payload = {
      success: true,
      checkedAt: now.toISOString(),
      deploy: {
        ok: github.ok,
        lastCommitAt: github.lastCommitAt,
        sha: github.sha,
        branch: github.branch,
        repoConfigured: !!(githubToken && githubOwner && githubRepo),
        repoUrl: (githubOwner && githubRepo)
          ? `https://github.com/${githubOwner}/${githubRepo}`
          : null,
        productionUrl,
        siteUp: prodSite.up,
        sitePingedAt: now.toISOString(),
        siteHttpStatus: prodSite.httpStatus,
      },
      ai: {
        providerPings,
        openrouterConfigured: openrouterSlotsConfigured > 0,
        openrouterSlotsConfigured,
        groqConfigured: groqSlotsConfigured > 0,
        groqSlotsConfigured,
        deepseekConfigured: deepseekSlotsConfigured > 0,
        deepseekSlotsConfigured,
        anyProviderOk,
        allProvidersOk,
      },
      email: {
        resendKeyPresent: !!resendKey,
        reachable: emailStatus.reachable,
        httpStatus: emailStatus.httpStatus,
        sends24h: emailStatus.sends24h,
      },
      database: {
        ok: dbOk,
        error: dbError,
        errorCount1h,
      },
      secrets: {
        items: secretsWithAge,
        missingCount: secretsWithAge.filter(s => !s.present).length,
        staleCount: secretsWithAge.filter(s => s.stale).length,
      },
      recentErrors,
      recentAdminActions,
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
