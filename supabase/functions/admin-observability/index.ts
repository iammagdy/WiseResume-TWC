import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

interface LogRow {
  function_name: string;
  latency_ms: number;
  error: boolean;
  created_at: string;
  status_code: number;
}

interface HourBucket {
  hour: number;
  count: number;
}

interface TelemetryRow {
  function_name: string;
  total_count: number;
  error_count: number;
  error_rate: number;
  p50_ms: number;
  p95_ms: number;
  sparkline: number[];
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

function buildSparkline(rows: LogRow[], functionName: string, nowMs: number): number[] {
  const hourMs = 60 * 60 * 1000;
  const cutoff = nowMs - 24 * hourMs;
  const buckets = new Array(24).fill(0) as number[];
  for (const row of rows) {
    if (row.function_name !== functionName) continue;
    const ts = new Date(row.created_at).getTime();
    if (ts < cutoff) continue;
    const hoursAgo = Math.floor((nowMs - ts) / hourMs);
    const slot = 23 - hoursAgo;
    if (slot >= 0 && slot < 24) {
      buckets[slot]++;
    }
  }
  return buckets;
}

function computeTelemetry(rows: LogRow[], nowMs: number): TelemetryRow[] {
  const byFn = new Map<string, LogRow[]>();
  for (const row of rows) {
    const arr = byFn.get(row.function_name) ?? [];
    arr.push(row);
    byFn.set(row.function_name, arr);
  }

  const result: TelemetryRow[] = [];
  for (const [fnName, fnRows] of byFn) {
    const latencies = fnRows.map(r => r.latency_ms).sort((a, b) => a - b);
    const errorCount = fnRows.filter(r => r.error).length;
    result.push({
      function_name: fnName,
      total_count: fnRows.length,
      error_count: errorCount,
      error_rate: fnRows.length > 0 ? Math.round((errorCount / fnRows.length) * 100) : 0,
      p50_ms: percentile(latencies, 50),
      p95_ms: percentile(latencies, 95),
      sparkline: buildSparkline(rows, fnName, nowMs),
    });
  }

  return result.sort((a, b) => b.total_count - a.total_count);
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    try {
      await requireAdminAuth(req);
    } catch (authErr) {
      if (authErr instanceof Response) return authErr;
      throw authErr;
    }

    const supabase = getServiceClient();
    const body = req.method === 'GET' ? {} : await req.json();
    const action: string = body.action ?? 'get_telemetry';

    // ── GET_TELEMETRY ─────────────────────────────────────────────────────────
    if (action === 'get_telemetry') {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('edge_function_logs')
        .select('function_name, latency_ms, error, created_at, status_code')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(50000);

      if (error) {
        if (error.code === '42P01') {
          return new Response(
            JSON.stringify({ success: true, telemetry: [], missing_table: true }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const nowMs = Date.now();
      const telemetry = computeTelemetry((data ?? []) as LogRow[], nowMs);

      return new Response(
        JSON.stringify({ success: true, telemetry, generated_at: new Date().toISOString() }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── GET_ERROR_STREAM ─────────────────────────────────────────────────────
    if (action === 'get_error_stream') {
      const { function_name, severity, since } = body as {
        function_name?: string;
        severity?: 'error' | 'warn' | 'warning' | 'all';
        since?: string;
      };

      let query = supabase
        .from('error_log')
        .select('id, message, context, source, level, user_id, resolved, reviewed_at, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (function_name) {
        query = query.eq('source', function_name);
      }

      if (severity && severity !== 'all') {
        const levels = severity === 'warn' || severity === 'warning'
          ? ['warn', 'warning']
          : ['error', 'fatal'];
        query = query.in('level', levels);
      }

      if (since) {
        query = query.gte('created_at', since);
      }

      const { data, error } = await query;

      if (error) {
        if (error.code === '42P01') {
          return new Response(
            JSON.stringify({ success: true, errors: [], missing_table: true }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({ success: true, errors: data ?? [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── MARK_REVIEWED ─────────────────────────────────────────────────────────
    if (action === 'mark_reviewed') {
      const { error_id } = body as { error_id?: string };

      if (!error_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'error_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const { error } = await supabase
        .from('error_log')
        .update({ reviewed_at: new Date().toISOString(), resolved: true })
        .eq('id', error_id);

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({ success: true, error_id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[admin-observability] Unexpected error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
