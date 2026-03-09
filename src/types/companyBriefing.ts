export interface CompanySnapshot {
  name: string;
  industry: string;
  size: string;
  hq: string;
  founded: string;
  mission: string;
  website?: string;
  stockTicker?: string;
  revenue?: string;
}

export interface RecentHighlight {
  title: string;
  summary: string;
  relevance: string;
}

export interface CultureSignal {
  signal: string;
  detail: string;
}

export interface KeyPerson {
  role: string;
  context: string;
}

export interface TalkingPoint {
  point: string;
  connection: string;
}

export interface QuestionToAsk {
  question: string;
  why: string;
}

export interface GlassdoorInsight {
  rating: string;
  prosThemes: string[];
  consThemes: string[];
}

export interface CompanyBriefing {
  companySnapshot: CompanySnapshot;
  recentHighlights: RecentHighlight[];
  cultureSignals: CultureSignal[];
  keyPeople: KeyPerson[];
  talkingPoints: TalkingPoint[];
  questionsToAsk: QuestionToAsk[];
  competitors?: string[];
  productsOrServices?: string[];
  techStack?: string[];
  glassdoorInsights?: GlassdoorInsight;
}
