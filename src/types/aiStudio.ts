// ===== RECRUITER SIMULATION TYPES =====

export type RecruiterPersona = 'fortune500' | 'startup' | 'tech' | 'agency';

export interface RecruiterPersonaInfo {
  id: RecruiterPersona;
  name: string;
  title: string;
  emoji: string;
  description: string;
}

export const RECRUITER_PERSONAS: RecruiterPersonaInfo[] = [
  {
    id: 'fortune500',
    name: 'Sarah Chen',
    title: 'Fortune 500 HR Director',
    emoji: '🏢',
    description: 'Values structure, progression, and brand-name companies',
  },
  {
    id: 'startup',
    name: 'Marcus Rivera',
    title: 'Startup Founder & CEO',
    emoji: '🚀',
    description: 'Looks for scrappiness, builders, and ownership mentality',
  },
  {
    id: 'tech',
    name: 'Priya Sharma',
    title: 'FAANG Tech Recruiter',
    emoji: '💻',
    description: 'Focuses on technical depth and engineering excellence',
  },
  {
    id: 'agency',
    name: "James O'Connor",
    title: 'Executive Headhunter',
    emoji: '👔',
    description: 'Thinks in terms of executive presence and career narrative',
  },
];

export interface RedFlag {
  issue: string;
  severity: 'high' | 'medium' | 'low';
  quote: string;
  fix: string;
  fixType: 'summary' | 'experience' | 'skills' | 'education' | 'contact';
}

export interface InterviewQuestion {
  question: string;
  concern: string;
  idealAnswer: string;
}

export interface CallMeFactor {
  strength: string;
  impact: string;
}

export interface RecruiterAnalysis {
  hireabilityScore: number;
  scoreExplanation: string;
  firstImpression: string;
  redFlags: RedFlag[];
  questionsIdAsk: InterviewQuestion[];
  callMeFactors: CallMeFactor[];
  overallVerdict: 'would_call' | 'maybe_call' | 'pass';
  verdictReasoning: string;
  topPriorityFix: string;
}

export interface RecruiterSimulationResult {
  success: boolean;
  persona: {
    id: RecruiterPersona;
    name: string;
  };
  analysis: RecruiterAnalysis;
}

// ===== SALARY NEGOTIATOR TYPES =====

export interface SalaryRange {
  min: number;
  max: number;
  median: number;
  currency: string;
}

export interface LeveragePoint {
  factor: string;
  impact: 'strong' | 'moderate' | 'weak';
  explanation: string;
}

export interface NegotiationScript {
  scenario: string;
  yourResponse: string;
  reasoning: string;
}

export interface SalaryIntelligence {
  estimatedRange: SalaryRange;
  confidenceLevel: number;
  leveragePoints: LeveragePoint[];
  weaknesses: string[];
  openingAsk: {
    amount: number;
    reasoning: string;
  };
  walkAwayNumber: {
    amount: number;
    reasoning: string;
  };
  counterOfferScripts: NegotiationScript[];
  alternativeBenefits: string[];
  confidenceMeter: number; // 1-100
}

// ===== REVERSE ENGINEER TYPES =====

export interface ProfileComparison {
  theirStrength: string;
  yourEquivalent: string;
  bridgeStrategy: string;
}

export interface CareerBridgePlan {
  shortTerm: string[];
  mediumTerm: string[];
  longTerm: string[];
}

export interface ReverseEngineerResult {
  targetProfile: {
    name: string;
    currentRole: string;
    company: string;
    careerPath: string[];
  };
  comparisons: ProfileComparison[];
  hiddenAdvantages: string[];
  pivotPatterns: string[];
  bridgePlan: CareerBridgePlan;
  keyTakeaways: string[];
}

// ===== REJECTION ANALYZER TYPES =====

export interface RejectionEntry {
  id: string;
  company: string;
  role: string;
  stage: 'resume_screen' | 'phone_screen' | 'technical' | 'final_round' | 'offer_stage' | 'unknown';
  feedback?: string;
  date: string;
}

export interface RejectionPattern {
  pattern: string;
  frequency: number;
  severity: 'critical' | 'important' | 'minor';
  affectedStage: string;
}

export interface RejectionAnalysis {
  patterns: RejectionPattern[];
  diagnosis: string;
  rootCauses: string[];
  recoveryPlan: {
    action: string;
    priority: 'high' | 'medium' | 'low';
    expectedImpact: string;
  }[];
  encouragement: string;
}

// ===== CAREER COACH TYPES =====

export interface CoachMessage {
  id: string;
  role: 'user' | 'coach';
  content: string;
  timestamp: string;
  suggestions?: string[];
}

export interface CoachNudge {
  id: string;
  type: 'insight' | 'suggestion' | 'warning' | 'encouragement';
  message: string;
  action?: {
    label: string;
    type: 'navigate' | 'apply_change' | 'open_sheet';
    payload?: string;
  };
}
