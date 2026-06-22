/**
 * Validates if the given string is a correctly formatted URL.
 * Accepts both http:// and https:// protocols.
 */
export function isValidUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Normalizes a URL by adding https:// if the protocol is missing.
 * Cleans up common copy-paste errors and whitespace.
 * Returns empty string if the input is empty or just whitespace.
 */
export function normalizeUrl(url: string | null | undefined): string {
  if (!url) return '';
  let trimmed = url.trim();
  if (!trimmed) return '';

  // Return mailto/tel links as is
  if (trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) {
    return trimmed;
  }

  // Add https:// if no protocol is present
  if (!/^[a-zA-Z]+:\/\//.test(trimmed)) {
    trimmed = 'https://' + trimmed;
  }

  return trimmed;
}

/** Schemes permitted in a rendered anchor href. */
const SAFE_HREF_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:']);

/**
 * Returns a sanitized href safe to place in an anchor's `href`, or `undefined`
 * when the URL uses a disallowed scheme (e.g. `javascript:`, `data:`,
 * `vbscript:`). Bare values without a scheme (e.g. "example.com") are treated
 * as `https://`. Only http(s), mailto, and tel are permitted.
 *
 * Unlike {@link normalizeUrl}, this never returns an unsafe scheme — callers
 * should render the label as plain text (no anchor) when this returns
 * `undefined`. This is the only function whose output may be trusted directly
 * in an href for owner/user-supplied URLs.
 */
export function safeHref(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;

  // Prepend https:// only when there is no scheme at all, so bare domains stay
  // clickable. A value that already carries a scheme is parsed as-is so that
  // disallowed schemes are rejected rather than neutralized into a fake host.
  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed);
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return undefined;
  }
  if (!SAFE_HREF_SCHEMES.has(parsed.protocol)) return undefined;
  return parsed.href;
}
