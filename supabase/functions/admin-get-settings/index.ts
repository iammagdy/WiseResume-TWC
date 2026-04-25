import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    try {
      await requireAdminAuth(req);
    } catch (authErr) {
      if (authErr instanceof Response) return authErr;
      throw authErr;
    }

    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value, updated_at');

    if (error) throw error;

    const settings: Record<string, unknown> = {};
    for (const row of (data || [])) {
      settings[row.key] = row.value;
    }

    // Maintenance window auto-check:
    // If a maintenance_window_start / maintenance_window_end are configured,
    // auto-activate or auto-deactivate maintenance_mode based on current time.
    const windowStart = settings['maintenance_window_start'] as string | undefined | null;
    const windowEnd   = settings['maintenance_window_end']   as string | undefined | null;

    if (windowStart && windowEnd) {
      const now    = Date.now();
      const start  = new Date(windowStart as string).getTime();
      const end    = new Date(windowEnd as string).getTime();
      const inWindow = now >= start && now <= end;
      const pastEnd  = now > end;
      const currentlyOn = settings['maintenance_mode'] === true || settings['maintenance_mode'] === 'true';

      if (inWindow && !currentlyOn) {
        // Auto-activate
        await supabase.from('app_settings').upsert(
          { key: 'maintenance_mode', value: true, updated_at: new Date().toISOString() },
          { onConflict: 'key' },
        );
        settings['maintenance_mode'] = true;
        console.info('[admin-get-settings] Auto-activated maintenance_mode (within window)');
      } else if (pastEnd && currentlyOn) {
        // Auto-deactivate — only if mode was window-managed
        const windowSource = settings['maintenance_mode_source'];
        if (windowSource === 'window') {
          await supabase.from('app_settings').upsert(
            { key: 'maintenance_mode', value: false, updated_at: new Date().toISOString() },
            { onConflict: 'key' },
          );
          settings['maintenance_mode'] = false;
          console.info('[admin-get-settings] Auto-deactivated maintenance_mode (window ended)');
        }
      }

      // Stamp the source when entering the window
      if (inWindow && !currentlyOn) {
        await supabase.from('app_settings').upsert(
          { key: 'maintenance_mode_source', value: 'window', updated_at: new Date().toISOString() },
          { onConflict: 'key' },
        ).catch(() => { /* best-effort */ });
        settings['maintenance_mode_source'] = 'window';
      }
    }

    return new Response(
      JSON.stringify({ success: true, settings }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[admin-get-settings] Error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
