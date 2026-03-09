const DOMAIN_MAP: Record<string, string> = {
  'wiseresume.magdysaber.com': 'https://wiseresume.magdysaber.com',
  'thewise.cloud': 'https://thewise.cloud',
};

const FALLBACK_DOMAIN = 'https://thewise.cloud';

function resolveDomain(): string {
  if (typeof window === 'undefined') return FALLBACK_DOMAIN;
  return DOMAIN_MAP[window.location.hostname] ?? FALLBACK_DOMAIN;
}

export const PORTFOLIO_DOMAIN = resolveDomain();

export const getPortfolioUrl = (username: string): string =>
  `${PORTFOLIO_DOMAIN}/p/${username}`;

export const getAppUrl = (): string => PORTFOLIO_DOMAIN;
