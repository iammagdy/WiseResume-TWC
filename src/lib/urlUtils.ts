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
