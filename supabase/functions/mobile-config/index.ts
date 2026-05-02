import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/dbClient.ts';
import { wrapHandler } from '../_shared/fnLogger.ts';

/**
 * Returns runtime configuration for the mobile app: the minimum
 * supported version, latest released version, optional banner copy,
 * and feature flags. Called by the Expo app on cold-start so we can
 * force-update obsolete clients without an EAS Update push.
 *
 * No auth required — this is read-only and rate-limited by Supabase
 * itself. The platform / version query parameters let us tailor the
 * response per-build (e.g. force-update only iOS < 1.2.0).
 */
interface VersionRow {
  platform: 'ios' | 'android';
  min_supported_version: string;
  latest_version: string;
  release_notes: string | null;
  is_force_update: boolean;
  banner_message: string | null;
  banner_severity: 'info' | 'warning' | 'critical' | null;
  updated_at: string;
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((x) => Number(x) || 0);
  const pb = b.split('.').map((x) => Number(x) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const av = pa[i] ?? 0;
    const bv = pb[i] ?? 0;
    if (av !== bv) return av < bv ? -1 : 1;
  }
  return 0;
}

serve(wrapHandler('mobile-config', async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const platform = (url.searchParams.get('platform') ?? '').toLowerCase();
  const version = url.searchParams.get('version') ?? '0.0.0';

  if (platform !== 'ios' && platform !== 'android') {
    return new Response(JSON.stringify({ error: 'platform query param must be ios|android' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const client = getServiceClient();
  const { data: row, error } = await client
    .from('mobile_app_versions')
    .select('*')
    .eq('platform', platform)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const versionRow = row as VersionRow | null;
  const latest = versionRow?.latest_version ?? '1.0.0';
  const minSupported = versionRow?.min_supported_version ?? '1.0.0';

  const updateRequired = compareVersions(version, minSupported) < 0;
  const updateAvailable = compareVersions(version, latest) < 0;

  return new Response(
    JSON.stringify({
      platform,
      version,
      latest_version: latest,
      min_supported_version: minSupported,
      update_available: updateAvailable,
      update_required: updateRequired || (versionRow?.is_force_update ?? false),
      release_notes: versionRow?.release_notes ?? null,
      banner: versionRow?.banner_message
        ? { message: versionRow.banner_message, severity: versionRow.banner_severity ?? 'info' }
        : null,
      // Feature flags surface the same per-user feature gates the web
      // app reads via /me, but this endpoint is anonymous so we only
      // emit "global" rollout flags here.
      flags: {
        revenuecat_paywall: true,
        biometric_lock: true,
        push_notifications: true,
      },
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
}));
