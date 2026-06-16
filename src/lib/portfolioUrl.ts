/** Canonical public host for portfolio + short links (override via VITE_PORTFOLIO_HOST). */
export const CANONICAL_PORTFOLIO_HOST = (
  (import.meta.env.VITE_PORTFOLIO_HOST as string | undefined)?.trim().replace(/^https?:\/\//, '').replace(/\/$/, '') ||
  'wiseresume.app'
);

export const CANONICAL_PORTFOLIO_ORIGIN = `https://${CANONICAL_PORTFOLIO_HOST}`;

/** Primary brand domain for all user-facing portfolio links (alias of canonical origin). */
export const PRIMARY_PORTFOLIO_DOMAIN = CANONICAL_PORTFOLIO_ORIGIN;

// Maps hostnames that the app is served on to the preferred portfolio base URL.
// Old domain is kept for backward-compat — links shared on resume.thewise.cloud
// still work; we just no longer generate new links pointing there.
const DOMAIN_MAP: Record<string, string> = {
  'wiseresume.app': PRIMARY_PORTFOLIO_DOMAIN,
  'www.wiseresume.app': PRIMARY_PORTFOLIO_DOMAIN,
  'resume.thewise.cloud': 'https://resume.thewise.cloud',
  'thewise.cloud': 'https://thewise.cloud',
};

function resolveDomain(): string {
  if (typeof window === 'undefined') return PRIMARY_PORTFOLIO_DOMAIN;
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return window.location.origin;
  }
  return DOMAIN_MAP[hostname] ?? PRIMARY_PORTFOLIO_DOMAIN;
}

// Runtime domain — adapts to whichever hostname the editor is loaded on.
export const PORTFOLIO_DOMAIN = resolveDomain();

/** Full portfolio URL using the runtime domain (for navigation/links on the current host). */
export const getPortfolioUrl = (username: string): string =>
  `${PORTFOLIO_DOMAIN}/p/${username}`;

/** Canonical portfolio URL — always uses the primary brand domain.
 *  Use this for copy/share/QR so shared links always point to wiseresume.app. */
export const getPortfolioCanonicalUrl = (username: string): string =>
  `${PRIMARY_PORTFOLIO_DOMAIN}/p/${username}`;

/** Display-only portfolio path (no scheme). */
export const getPortfolioDisplayUrl = (username: string): string =>
  `${CANONICAL_PORTFOLIO_HOST}/p/${username}`;

export const getAppUrl = (): string => CANONICAL_PORTFOLIO_ORIGIN;
