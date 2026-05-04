// RETIRED — Task #41 (2026-06-03)
// All traffic is now routed through supabase/functions/editor-ai/index.ts
// via the x-editor-ai-action: optimize-for-linkedin dispatch path.
//
// The full original source is preserved in git history (pre-Task-#41 commits).
// Rollback: `supabase functions deploy optimize-for-linkedin` from a pre-retirement tag,
// then flip USE_MERGED_EDITOR_AI=false in src/integrations/supabase/edgeFunctions.ts.
//
// This stub is intentionally NOT deployed. If accidentally deployed it returns 410 Gone.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  return new Response(
    JSON.stringify({ error: 'optimize-for-linkedin has been retired. Use editor-ai with x-editor-ai-action: optimize-for-linkedin.' }),
    { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
