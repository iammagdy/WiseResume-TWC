export const PORTFOLIO_DOMAIN = "https://wiseresume.magdysaber.com";

export const getPortfolioUrl = (username: string): string =>
  `${PORTFOLIO_DOMAIN}/p/${username}`;

export const getAppUrl = (): string => PORTFOLIO_DOMAIN;
