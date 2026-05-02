import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireAuth, AuthError } from '../_shared/authMiddleware.ts';
import { wrapHandler } from '../_shared/fnLogger.ts';
import { renderArtifactPdf, jsonError } from '../_shared/pdfRenderer.ts';

serve(wrapHandler('export-cover-letter-pdf', async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonError(corsHeaders, 'Method not allowed', 405);

  try {
    const { userId, client } = await requireAuth(req);
    const body = (await req.json().catch(() => ({}))) as { cover_letter_id?: string };
    if (!body.cover_letter_id) return jsonError(corsHeaders, 'cover_letter_id is required', 400);

    const { data: row, error } = await client
      .from('cover_letters')
      .select('id, user_id, title, body, recipient, sender, template_key')
      .eq('id', body.cover_letter_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) return jsonError(corsHeaders, error.message, 500);
    if (!row) return jsonError(corsHeaders, 'Cover letter not found', 404);

    const { url } = await renderArtifactPdf(client, {
      kind: 'cover_letter',
      ownerUserId: userId,
      title: typeof row.title === 'string' ? row.title : 'Cover letter',
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
