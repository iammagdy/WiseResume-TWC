import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

import { wrapHandler } from '../_shared/fnLogger.ts';
interface AuditRow {
  user_id: string | null;
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const FUNNEL_STEPS = ['started', 'path_selected', 'review_opened', 'completed'] as const;
type FunnelStep = (typeof FUNNEL_STEPS)[number];

serve(wrapHandler("admin-onboarding-funnel", async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { days = 14, granularity = 'day' } = body as {
      days?: number;
      granularity?: 'day' | 'week';
    };

    try {
      await requireAdminAuth(req);
    } catch (authErr) {
      if (authErr instanceof Response) return authErr;
      throw authErr;
    }

    const safeDays = Math.max(1, Math.min(90, Math.floor(days)));
    const fromTs = new Date(Date.now() - safeDays * 86400000);
    const fromIso = fromTs.toISOString();
    const toIso = new Date().toISOString();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Page through audit_logs to handle large windows.
    const PAGE = 1000;
    const HARD_CAP = 20000;
    let offset = 0;
    let truncated = false;
    const rows: AuditRow[] = [];
    while (true) {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('user_id, action, metadata, created_at')
        .eq('category', 'onboarding')
        .gte('created_at', fromIso)
        .lte('created_at', toIso)
        .order('created_at', { ascending: true })
        .range(offset, offset + PAGE - 1);
      if (error) {
        if (error.code === '42P01') {
          break; // table missing — treat as empty
        }
        throw new Error(error.message);
      }
      const batch = (data ?? []) as AuditRow[];
      rows.push(...batch);
      if (batch.length < PAGE) break;
      offset += PAGE;
      if (offset >= HARD_CAP) {
        truncated = true;
        break;
      }
    }

    // Method breakdown for `path_selected`.
    const methodCounts: Record<string, number> = {};
    // Funnel: unique users that reached each step.
    const usersAtStep: Record<FunnelStep, Set<string>> = {
      started: new Set(),
      path_selected: new Set(),
      review_opened: new Set(),
      completed: new Set(),
    };
    // Skip counts grouped by step.
    const skippedByStep: Record<string, number> = {};
    // save_failed errors grouped by message.
    const saveFailedByError: Record<string, number> = {};

    // Time-series buckets keyed by ISO date (YYYY-MM-DD) or ISO week start.
    const bucketKey = (iso: string): string => {
      const d = new Date(iso);
      if (granularity === 'week') {
        // Monday-based week start.
        const day = d.getUTCDay();
        const diff = (day === 0 ? -6 : 1 - day);
        const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff));
        return monday.toISOString().slice(0, 10);
      }
      return iso.slice(0, 10);
    };

    const seriesBuckets: Record<string, Record<FunnelStep, number>> = {};
    const ensureBucket = (key: string) => {
      if (!seriesBuckets[key]) {
        seriesBuckets[key] = { started: 0, path_selected: 0, review_opened: 0, completed: 0 };
      }
      return seriesBuckets[key];
    };

    // Pre-seed buckets so the chart shows zero days too.
    const bucketCount = granularity === 'week' ? Math.ceil(safeDays / 7) + 1 : safeDays;
    for (let i = bucketCount - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * (granularity === 'week' ? 7 : 1) * 86400000);
      ensureBucket(bucketKey(d.toISOString()));
    }

    for (const row of rows) {
      const action = row.action;
      const meta = (row.metadata ?? {}) as Record<string, unknown>;
      const uid = row.user_id;

      if (action === 'path_selected') {
        const method = (meta.method as string | undefined) ?? 'unknown';
        methodCounts[method] = (methodCounts[method] ?? 0) + 1;
      } else if (action === 'skipped') {
        const step = (meta.step as string | undefined) ?? 'unknown';
        skippedByStep[step] = (skippedByStep[step] ?? 0) + 1;
      } else if (action === 'save_failed') {
        const msg = ((meta.error as string | undefined) ?? (meta.message as string | undefined) ?? 'unknown error').slice(0, 200);
        saveFailedByError[msg] = (saveFailedByError[msg] ?? 0) + 1;
      }

      if (uid && (FUNNEL_STEPS as readonly string[]).includes(action)) {
        usersAtStep[action as FunnelStep].add(uid);
      }

      if ((FUNNEL_STEPS as readonly string[]).includes(action)) {
        const bucket = ensureBucket(bucketKey(row.created_at));
        bucket[action as FunnelStep] += 1;
      }
    }

    const funnel = FUNNEL_STEPS.map((step) => ({ step, users: usersAtStep[step].size }));
    const startedUsersCount = usersAtStep.started.size;

    const methodBreakdown = Object.entries(methodCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([method, count]) => ({ method, count }));

    // Skip rate per step = skipped events at step / unique users that reached
    // the corresponding funnel step. Map the metadata `step` value to the
    // funnel step that immediately precedes that skip.
    const STEP_TO_FUNNEL: Record<string, FunnelStep> = {
      welcome: 'started',
      method: 'started',
      path: 'started',
      cv: 'path_selected',
      manual: 'path_selected',
      linkedin: 'path_selected',
      'linkedin-paste': 'path_selected',
      'linkedin-wizard': 'path_selected',
      'linkedin-pdf': 'path_selected',
      'linkedin-url': 'path_selected',
      review: 'review_opened',
    };
    const skipRates = Object.entries(skippedByStep)
      .sort((a, b) => b[1] - a[1])
      .map(([step, count]) => {
        const denomStep = STEP_TO_FUNNEL[step];
        const denominator = denomStep ? usersAtStep[denomStep].size : startedUsersCount;
        const rate = denominator > 0 ? count / denominator : 0;
        return { step, count, denominator, rate };
      });

    const saveFailures = Object.entries(saveFailedByError)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([message, count]) => ({ message, count }));

    const series = Object.entries(seriesBuckets)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, counts]) => ({ date, ...counts }));

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          rangeFrom: fromIso,
          rangeTo: toIso,
          totalEvents: rows.length,
          truncated,
          methodBreakdown,
          funnel,
          skipRates,
          saveFailures,
          series,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
}));
