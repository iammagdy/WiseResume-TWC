import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireAuth, AuthError } from '../_shared/authMiddleware.ts';
import { wrapHandler } from '../_shared/fnLogger.ts';
import { renderArtifactPdf, jsonError } from '../_shared/pdfRenderer.ts';

/**
 * Server-side PDF export for resumes. The mobile app cannot reuse the
 * web's html2canvas pipeline (no DOM), so we delegate to the headless
 * renderer service configured via `PDF_RENDERER_URL`. The renderer
 * receives the resume's data + template_key and returns a PDF stream
 * we hand back as a signed Supabase Storage URL.
 */
serve(wrapHandler('export-resume-pdf', async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonError(corsHeaders, 'Method not allowed', 405);

  try {
    const { userId, client } = await requireAuth(req);
    const body = (await req.json().catch(() => ({}))) as { resume_id?: string };
    if (!body.resume_id) return jsonError(corsHeaders, 'resume_id is required', 400);

    const { data: row, error } = await client
      .from('resumes')
      .select('id, user_id, title, template_key, data')
      .eq('id', body.resume_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) return jsonError(corsHeaders, error.message, 500);
    if (!row) return jsonError(corsHeaders, 'Resume not found', 404);

    const { url } = await renderArtifactPdf(client, {
      kind: 'resume',
      ownerUserId: userId,
      title: typeof row.title === 'string' ? row.title : 'Resume',
      payload: { template_key: row.template_key, data: row.data },
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
