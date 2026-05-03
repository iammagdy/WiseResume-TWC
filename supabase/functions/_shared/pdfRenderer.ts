import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1';

/**
 * Shared helper used by every `export-*-pdf` edge function. Calls the
 * external headless-Chromium renderer at `PDF_RENDERER_URL`, uploads
 * the resulting bytes to the `exports` Supabase Storage bucket, and
 * returns a 1-hour signed URL the mobile client can hand straight to
 * `expo-file-system` for download / share.
 *
 * The web app keeps its existing client-side html2canvas + jsPDF
 * pipeline; this server-side path exists specifically so the mobile
 * app can avoid shipping a WebView purely for PDF rendering.
 */
export interface RenderRequest {
  kind: 'resume' | 'cover_letter' | 'resignation_letter' | 'portfolio';
  ownerUserId: string;
  title: string;
  payload: unknown;
}

export interface RenderResult {
  url: string;
  storagePath: string;
}

const BUCKET = 'exports';
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export async function renderArtifactPdf(
  client: SupabaseClient,
  req: RenderRequest,
): Promise<RenderResult> {
  const rendererUrl = Deno.env.get('PDF_RENDERER_URL');
  const rendererToken = Deno.env.get('PDF_RENDERER_TOKEN');
  if (!rendererUrl) {
    throw new Error(
      'PDF_RENDERER_URL is not configured. Set it to the Cloud Run / Render endpoint that serves your headless-Chromium renderer.',
    );
  }

  const renderRes = await fetch(rendererUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/pdf',
      ...(rendererToken ? { Authorization: `Bearer ${rendererToken}` } : {}),
    },
    body: JSON.stringify({
      kind: req.kind,
      title: req.title,
      payload: req.payload,
    }),
  });

  if (!renderRes.ok) {
    const text = await renderRes.text().catch(() => '');
    throw new Error(`PDF renderer failed (${renderRes.status}): ${text || 'no body'}`);
  }

  const pdfBytes = new Uint8Array(await renderRes.arrayBuffer());
  const safeTitle = req.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 64) || req.kind;
  const storagePath = `${req.ownerUserId}/${req.kind}/${Date.now()}-${safeTitle}.pdf`;

  const { error: uploadError } = await client.storage.from(BUCKET).upload(storagePath, pdfBytes, {
    contentType: 'application/pdf',
    upsert: false,
  });
  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data: signed, error: signError } = await client.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  if (signError || !signed) throw new Error(`Signing failed: ${signError?.message ?? 'unknown'}`);

  return { url: signed.signedUrl, storagePath };
}

export function jsonError(corsHeaders: Record<string, string>, message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
