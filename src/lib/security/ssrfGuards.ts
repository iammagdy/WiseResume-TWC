export const MAX_PUBLIC_FETCH_REDIRECTS = 5;
export const MAX_PUBLIC_FETCH_BYTES = 2 * 1024 * 1024;

export function isPrivateOrLocalIpAddress(address: string): boolean {
  const h = address.toLowerCase().replace(/^\[|\]$/g, '');

  if (h === '::' || h === '::1') return true;
  if (/^(fc|fd)[0-9a-f]{0,2}:/i.test(h)) return true;
  if (/^fe80:/i.test(h)) return true;

  const mapped = h.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  const ipv4 = mapped ? mapped[1] : h;
  const m = ipv4.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;

  const octets = m.slice(1).map(value => Number.parseInt(value, 10));
  if (octets.some(value => !Number.isInteger(value) || value < 0 || value > 255)) return true;
  const [a, b, c] = octets;

  if (a === 0 || a === 10 || a === 127 || a === 255) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 0 && c === 0) return true;
  if (a === 192 && b === 0 && c === 2) return true;
  if (a === 192 && b === 168) return true;
  if (a === 198 && b >= 18 && b <= 19) return true;
  return false;
}

export function isPrivateOrLocalHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!h) return true;
  if (
    h === 'localhost' ||
    h === '0.0.0.0' ||
    h === 'ip6-localhost' ||
    h === 'ip6-loopback' ||
    h.endsWith('.localhost') ||
    h.endsWith('.local')
  ) {
    return true;
  }
  return isPrivateOrLocalIpAddress(h);
}

export function assertPublicHttpUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http and https URLs are supported.');
  }
  if (parsed.username || parsed.password) {
    throw new Error('URL credentials are not permitted.');
  }
  if (isPrivateOrLocalHostname(parsed.hostname)) {
    throw new Error('URL host is not permitted.');
  }
  return parsed;
}

export function resolveRedirectUrl(baseUrl: URL, locationHeader: string | null): URL {
  if (!locationHeader) throw new Error('Redirect response is missing a Location header.');
  return assertPublicHttpUrl(new URL(locationHeader, baseUrl).toString());
}

export function isPuppeteerRequestUrlAllowed(rawUrl: string): boolean {
  if (rawUrl === 'about:blank') return true;
  if (rawUrl.startsWith('data:')) return true;
  return false;
}
