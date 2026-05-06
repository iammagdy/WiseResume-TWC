import { requireAuth, AuthError } from '../_shared/authMiddleware.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { wrapHandler } from '../_shared/fnLogger.ts';

function jsonError(cors: Record<string, string>, message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(wrapHandler('export-resume-pdf', async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonError(corsHeaders, 'Method not allowed', 405);

  try {
    await requireAuth(req);
  } catch (err) {
    if (err instanceof AuthError) return jsonError(corsHeaders, err.message, err.status);
    return jsonError(corsHeaders, 'Unauthorized', 401);
  }

  const rendererUrl = Deno.env.get('PDF_RENDERER_URL');
  if (!rendererUrl) {
    // Signal to the client that the server-side renderer is not configured.
    // nativePdfGenerator.ts catches this content-type and throws PDFServerUnavailableError,
    // which EditorPage.tsx catches and falls back to browser print-to-PDF.
    return new Response('<html><body>PDF_RENDERER_URL not configured</body></html>', {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'text/html' },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonError(corsHeaders, 'Invalid JSON body', 400);
  }

  const { html, pageFormat, onePage, fitScale, showPageNumbers, showBranding, customBreakPositions, totalContentHeightPx } = body;

  if (typeof html !== 'string' || !html.trim()) {
    return jsonError(corsHeaders, 'html is required', 400);
  }

  const rendererToken = Deno.env.get('PDF_RENDERER_TOKEN');

  const renderRes = await fetch(rendererUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/pdf',
      ...(rendererToken ? { Authorization: `Bearer ${rendererToken}` } : {}),
    },
    body: JSON.stringify({
      html,
      pageFormat,
      onePage,
      fitScale,
      showPageNumbers,
      showBranding,
      customBreakPositions,
      totalContentHeightPx,
    }),
  });

  if (!renderRes.ok) {
    const text = await renderRes.text().catch(() => '');
    return jsonError(corsHeaders, `PDF renderer failed (${renderRes.status}): ${text || 'no body'}`, 502);
  }

  const pdfBytes = await renderRes.arrayBuffer();

  return new Response(pdfBytes, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="resume.pdf"',
    },
  });
}));
