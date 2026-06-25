export type AnalyticsRange = 'today' | '24h' | '7d' | '30d' | '90d' | 'all';

export interface KpiPair {
  current: number;
  previous: number;
}

export interface RangeKpis {
  views: KpiPair;
  activeUsers: KpiPair;
  aiCredits: KpiPair;
  portfolioViews: KpiPair;
  stickiness: number;
  dau: number;
  wau: number;
}

export interface ActivityPoint { date: string; views: number; users: number }
export interface SeriesPoint { date: string; value: number }
export interface NewVsReturningPoint { date: string; newUsers: number; returningUsers: number }
export interface NamedCount { name: string; count: number }
export interface FeatureWithTrend { name: string; count: number; trend: SeriesPoint[] }

export interface PremiumAnalyticsData {
  // Back-compat
  pageViewsAllTime: number;
  pageViewsToday: number;
  activeUsersToday: number;
  activeUsersYesterday: number;
  topFeatures: NamedCount[];
  portfolioViewsTotal: number;
  signupsLast14Days: { date: string; count: number }[];
  aiCreditsToday: number;
  aiCreditsYesterday: number;
  countryDistribution: { country: string; count: number }[];
  // New
  range: AnalyticsRange;
  bucket: 'hour' | 'day';
  rangeKpis: RangeKpis;
  activitySeries: ActivityPoint[];
  dauRollingSeries: SeriesPoint[];
  newVsReturning: NewVsReturningPoint[];
  heatmap: number[][];
  topFeaturesRanged: FeatureWithTrend[];
  topReferrers: NamedCount[];
  deviceBreakdown: NamedCount[];
  topPages: NamedCount[];
  countryRanking: { country: string; count: number }[];
  totalCountries: number;
  lastUpdatedAt: Date;
}
