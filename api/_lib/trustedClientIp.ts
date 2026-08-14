import type { VercelRequest } from '@vercel/node';
import { ipAddress } from '@vercel/functions';

/**
 * Return the client IP supplied by Vercel's own request context.
 *
 * Vercel documents that its edge overwrites x-forwarded-for to prevent
 * spoofing. We deliberately use @vercel/functions rather than accepting
 * cf-connecting-ip, x-real-ip, or an arbitrary forwarded header directly.
 * Outside Vercel, there is no trusted edge identity, so callers receive the
 * shared unknown bucket instead of trusting test/client input.
 */
export function getTrustedVercelClientIp(req: Pick<VercelRequest, 'headers'>): string {
  const isVercelRuntime = process.env.VERCEL === '1' || Boolean(process.env.VERCEL_ENV);
  if (!isVercelRuntime) return 'unknown';

  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers ?? {})) {
    if (typeof value === 'string') {
      headers.set(name, value);
    } else if (Array.isArray(value)) {
      headers.set(name, value.join(', '));
    }
  }

  const ip = ipAddress(headers)?.trim();
  return ip && ip.length <= 128 ? ip : 'unknown';
}
