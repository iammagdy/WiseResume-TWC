/**
 * Canonical production domain for shareable portfolio links.
 * Update this value when the custom domain changes.
 */
const PORTFOLIO_BASE_URL = 'https://wiseresume.magdysaber.com';

export const getPortfolioBaseUrl = () => PORTFOLIO_BASE_URL;

export const getPortfolioUrl = (username: string) =>
  `${PORTFOLIO_BASE_URL}/p/${username}`;
