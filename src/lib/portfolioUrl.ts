const CUSTOM_DOMAIN = "https://wiseresume.magdysaber.com";
const FALLBACK_DOMAIN = "https://wiseresume.lovable.app";

export const PORTFOLIO_DOMAIN =
  typeof window !== 'undefined' && window.location.hostname === 'wiseresume.magdysaber.com'
    ? CUSTOM_DOMAIN
    : FALLBACK_DOMAIN;

export const getPortfolioUrl = (username: string): string =>
  `${PORTFOLIO_DOMAIN}/p/${username}`;

export const getAppUrl = (): string => PORTFOLIO_DOMAIN;
