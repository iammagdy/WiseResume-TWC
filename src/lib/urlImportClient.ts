export class UrlImportRequestError extends Error {
  readonly name = 'UrlImportRequestError';

  constructor(readonly code: string) {
    super(code);
  }
}

export function urlImportErrorKey(code: string): string {
  switch (code) {
    case 'BLOCKED_URL':
      return 'app.uploadPage.urlImport.blocked';
    case 'FETCH_TIMEOUT':
      return 'app.uploadPage.urlImport.timeout';
    case 'RESPONSE_TOO_LARGE':
      return 'app.uploadPage.urlImport.tooLarge';
    case 'UNREADABLE_CONTENT':
    case 'UNREADABLE_URL':
      return 'app.uploadPage.urlImport.noReadableText';
    default:
      return 'app.uploadPage.urlImport.importFailed';
  }
}

export function normalizePublicUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (/\s/.test(trimmed)) throw new UrlImportRequestError('INVALID_URL');
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^https?:/i.test(trimmed)) {
    throw new UrlImportRequestError('BLOCKED_URL');
  }
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new UrlImportRequestError('INVALID_URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new UrlImportRequestError('BLOCKED_URL');
  }
  if (!parsed.hostname || parsed.hostname.includes('%')) {
    throw new UrlImportRequestError('INVALID_URL');
  }
  return parsed.toString();
}

export async function fetchUrlHtml(url: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  let response: Response;
  try {
    response = await fetchImpl('/api/fetch-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
  } catch {
    throw new UrlImportRequestError('FETCH_FAILED');
  }

  let body: { code?: string; html?: string } = {};
  try {
    body = await response.json() as { code?: string; html?: string };
  } catch {
    throw new UrlImportRequestError('UNREADABLE_CONTENT');
  }

  if (!response.ok) {
    throw new UrlImportRequestError(body.code || 'FETCH_FAILED');
  }
  if (typeof body.html !== 'string' || !body.html.trim()) {
    throw new UrlImportRequestError('UNREADABLE_CONTENT');
  }
  return body.html;
}
