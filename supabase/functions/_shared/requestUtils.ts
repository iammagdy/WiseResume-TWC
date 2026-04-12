/**
 * Shared request utilities for edge functions.
 */

/**
 * Check if the incoming request payload exceeds the specified size limit.
 * Reads the Content-Length header (if present) and returns an HTTP 413 Response
 * if it exceeds maxBytes. Returns null if size is acceptable or unknown.
 *
 * Call this at the very top of each edge function handler, before parsing the body.
 */
export function checkPayloadSize(req: Request, maxBytes: number): Response | null {
  const contentLengthHeader = req.headers.get('content-length');
  if (!contentLengthHeader) {
    return null;
  }

  const contentLength = parseInt(contentLengthHeader, 10);
  if (isNaN(contentLength)) {
    return null;
  }

  if (contentLength > maxBytes) {
    return new Response(
      JSON.stringify({ error: 'Request payload too large. Maximum allowed size is 500KB.' }),
      {
        status: 413,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return null;
}
