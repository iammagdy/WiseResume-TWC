export interface ProofreadIssue {
  id: string;
  sectionId: string;
  sectionName: string;
  type: 'spelling' | 'grammar' | 'style';
  original: string;
  suggestions: string[];
  explanation: string;
  offset: number;
  length: number;
}

export interface WritingScore {
  overall: number;
  spelling: number;
  grammar: number;
  style: number;
  tone: 'professional' | 'casual' | 'mixed';
}

export interface ProofreadResult {
  issues: ProofreadIssue[];
  score: WritingScore;
}
