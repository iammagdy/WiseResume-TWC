/** Canonical public host for portfolio + short links (override via VITE_PORTFOLIO_HOST). */
export const CANONICAL_PORTFOLIO_HOST = (
  (import.meta.env.VITE_PORTFOLIO_HOST as string | undefined)?.trim().replace(/^https?:\/\//, '').replace(/\/$/, '') ||
  'wiseresume.app'
);

export const CANONICAL_PORTFOLIO_ORIGIN = `https://${CANONICAL_PORTFOLIO_HOST}`;

const HOST_ORIGIN_MAP: Record<string, string> = {
  'wiseresume.app': CANONICAL_PORTFOLIO_ORIGIN,
  'www.wiseresume.app': CANONICAL_PORTFOLIO_ORIGIN,
  'resume.thewise.cloud': 'https://resume.thewise.cloud',
  'thewise.cloud': 'https://thewise.cloud',
};

function resolveAppOrigin(): string {
  if (typeof window === 'undefined') return CANONICAL_PORTFOLIO_ORIGIN;
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return window.location.origin;
  }
  return HOST_ORIGIN_MAP[hostname] ?? CANONICAL_PORTFOLIO_ORIGIN;
}

/** App origin for the current environment (localhost in dev, canonical in prod). */
export const PORTFOLIO_DOMAIN = resolveAppOrigin();

/** Canonical portfolio URL for copy, share, QR, and SEO. */
export const getPortfolioUrl = (username: string): string =>
  `${CANONICAL_PORTFOLIO_ORIGIN}/p/${username}`;

/** Display-only portfolio path (no scheme). */
export const getPortfolioDisplayUrl = (username: string): string =>
  `${CANONICAL_PORTFOLIO_HOST}/p/${username}`;

export const getAppUrl = (): string => CANONICAL_PORTFOLIO_ORIGIN;
