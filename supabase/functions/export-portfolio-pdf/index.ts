import { getCorsHeaders } from '../_shared/cors.ts';
import { requireAuth, AuthError } from '../_shared/authMiddleware.ts';
import { wrapHandler } from '../_shared/fnLogger.ts';
import { renderArtifactPdf, jsonError } from '../_shared/pdfRenderer.ts';

Deno.serve(wrapHandler('export-portfolio-pdf', async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonError(corsHeaders, 'Method not allowed', 405);

  try {
    const { userId, client } = await requireAuth(req);
    const body = (await req.json().catch(() => ({}))) as { portfolio_id?: string };
    if (!body.portfolio_id) return jsonError(corsHeaders, 'portfolio_id is required', 400);

    const { data: row, error } = await client
      .from('portfolios')
      .select('id, user_id, title, slug, theme, sections, data')
      .eq('id', body.portfolio_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) return jsonError(corsHeaders, error.message, 500);
    if (!row) return jsonError(corsHeaders, 'Portfolio not found', 404);

    const { url } = await renderArtifactPdf(client, {
      kind: 'portfolio',
      ownerUserId: userId,
      title: typeof row.title === 'string' ? row.title : 'Portfolio',
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
