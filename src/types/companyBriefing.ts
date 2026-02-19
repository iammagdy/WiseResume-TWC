export interface CompanySnapshot {
  name: string;
  industry: string;
  size: string;
  hq: string;
  founded: string;
  mission: string;
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

export interface CompanyBriefing {
  companySnapshot: CompanySnapshot;
  recentHighlights: RecentHighlight[];
  cultureSignals: CultureSignal[];
  keyPeople: KeyPerson[];
  talkingPoints: TalkingPoint[];
  questionsToAsk: QuestionToAsk[];
}
