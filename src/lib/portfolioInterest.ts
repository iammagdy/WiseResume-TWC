import { resolvePublicApiBase } from '@/lib/publicApiBase';

function portfolioInterestUrl(): string {
  const apiBase = resolvePublicApiBase();
  if (apiBase) return `${apiBase}/api/portfolio-interest`;
  if (typeof window !== 'undefined') return `${window.location.origin}/api/portfolio-interest`;
  return '/api/portfolio-interest';
}

export async function sendPortfolioInterest(
  username: string,
  token: string,
  correlationId?: string,
): Promise<{ ok: boolean; duplicate?: boolean }> {
  try {
    const res = await fetch(portfolioInterestUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.toLowerCase(),
        token,
        referrer: typeof document !== 'undefined' ? document.referrer || null : null,
        correlationId,
      }),
    });

    if (res.status === 429) return { ok: false };
    if (!res.ok) return { ok: false };

    const payload = (await res.json().catch(() => ({}))) as { ok?: boolean; duplicate?: boolean };
    return { ok: !!payload.ok, duplicate: Boolean(payload.duplicate) };
  } catch {
    return { ok: false };
  }
}
