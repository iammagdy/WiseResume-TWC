import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireAuth, AuthError } from '../_shared/authMiddleware.ts';
import { wrapHandler } from '../_shared/fnLogger.ts';
import { renderArtifactPdf, jsonError } from '../_shared/pdfRenderer.ts';

serve(wrapHandler('export-resignation-letter-pdf', async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonError(corsHeaders, 'Method not allowed', 405);

  try {
    const { userId, client } = await requireAuth(req);
    const body = (await req.json().catch(() => ({}))) as { resignation_letter_id?: string };
    if (!body.resignation_letter_id) {
      return jsonError(corsHeaders, 'resignation_letter_id is required', 400);
    }

    const { data: row, error } = await client
      .from('resignation_letters')
      .select('id, user_id, title, body, recipient, sender, notice_days')
      .eq('id', body.resignation_letter_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) return jsonError(corsHeaders, error.message, 500);
    if (!row) return jsonError(corsHeaders, 'Resignation letter not found', 404);

    const { url } = await renderArtifactPdf(client, {
      kind: 'resignation_letter',
      ownerUserId: userId,
      title: typeof row.title === 'string' ? row.title : 'Resignation letter',
      payload: row,
    });

    return new Response(JSON.stringify({ url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    if (err instanceof AuthError) return jsonError(corsHeaders, err.message, err.status);
    return jsonError(corsHeaders, err instanceof Error ? err.message : 'Unknown error', 500);
  }
}));
