export interface ContactInfo {
  fullName: string;
  email: string;
  email2?: string;
  phone: string;
  location: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  photoUrl?: string;
  headerOrder?: string[];
}

export interface Experience {
  id: string;
  company: string;
  position: string;
  account?: string; // Optional client/account served (e.g., Verizon at Concentrix)
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
  achievements: string[];
  responsibilities?: string[]; // Detailed job responsibilities - extracted verbatim
  isProject?: boolean; // Flag for project entries (vs work experience)
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  gpa?: string;
  description?: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  expiryDate?: string;
  credentialId?: string;
}

export interface Award {
  id: string;
  title: string;
  issuer: string;
  date: string;
  description?: string;
}

export interface Project {
  id: string;
  name: string;
  role: string;
  startDate: string;
  endDate: string;
  technologies: string[];
  description: string;
  url?: string;
  githubUrl?: string;
}

export interface Publication {
  id: string;
  title: string;
  publisher: string;
  date: string;
  coAuthors?: string;
  url?: string;
  description?: string;
}

export interface Volunteering {
  id: string;
  organization: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
  hours?: string;
}

export interface Hobby {
  id: string;
  name: string;
  description?: string;
  visible: boolean;
}

export interface Language {
  id: string;
  name: string;
  proficiency: 'native' | 'fluent' | 'professional' | 'basic';
}

export interface Reference {
  id: string;
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  relationship: string;
  availableOnRequest?: boolean;
}

export interface TemplateCustomization {
  accentColor: string;
  fontHeading: string;
  fontBody: string;
  fontSize: 'small' | 'medium' | 'large';
  layout: 'single' | 'two-column';
  spacing: 'compact' | 'normal' | 'spacious';
  margins: 'narrow' | 'normal' | 'wide';
  lineHeight: 'single' | '1.15' | '1.5' | 'double';
  pageFormat: 'a4' | 'letter';
}

export interface ResumeData {
  id?: string;
  contactInfo: ContactInfo;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  certifications: Certification[];
  awards?: Award[];
  projects?: Project[];
  publications?: Publication[];
  volunteering?: Volunteering[];
  hobbies?: Hobby[];
  references?: Reference[];
  languages?: Language[];
  templateId: string;
  customization?: TemplateCustomization;
  createdAt?: string;
  updatedAt?: string;
}

export interface JobMatchScore {
  overallScore: number;
  skillsMatch: number;
  experienceRelevance: number;
  keywordAlignment: number;
  atsCompatibility: number;
  strengths: string[];
  improvements: string[];
}

export interface GapAnalysis {
  missingKeywords: string[];
  missingSkills: string[];
  suggestedSections: string[];
  recommendedPhrases: string[];
  priorityImprovements: {
    priority: 'high' | 'medium' | 'low';
    suggestion: string;
    impact: string;
  }[];
}

export type TemplateId = 'modern' | 'classic' | 'minimal' | 'professional' | 'developer' | 'creative' | 'executive' | 'compact' | 'academic' | 'healthcare' | 'sales' | 'elegant' | 'corporate' | 'banking' | 'consulting' | 'federal' | 'legal' | 'marketing' | 'designer' | 'portfolio' | 'startup' | 'infographic' | 'data-science' | 'devops' | 'cyber' | 'product' | 'clean' | 'swiss' | 'mono' | 'zen';

export type SectionId = 'summary' | 'experience' | 'education' | 'skills' | 'certifications' | 'awards' | 'projects' | 'publications' | 'volunteering' | 'hobbies' | 'references' | 'languages';

export type TailorSectionId = 'summary' | 'skills' | 'experience' | 'education' | 'projects' | 'certifications' | 'awards';


export interface TemplateInfo {
  id: TemplateId;
  name: string;
  description: string;
  atsScore: 'high' | 'medium' | 'low';
  category: 'professional' | 'tech' | 'creative' | 'minimalist';
}

export interface ResumeTemplate {
  id: TemplateId;
  name: string;
  description: string;
  preview: string;
}

// ===== LEGENDARY TAILOR TYPES =====

export interface SkillSuggestion {
  skill: string;
  reason: string;
  frequency: number;
  action: 'add' | 'boost';
}

export interface SectionChange {
  sectionId: TailorSectionId;
  enabled: boolean;
  impactScore: number;
  preview: string;
}

export interface SectionScores {
  summary: { before: number; after: number };
  skills: { before: number; after: number };
  experience: { before: number; after: number };
  education: { before: number; after: number };
}

export interface JobParsed {
  title: string;
  company: string;
  keyRequirements: string[];
  niceToHaves: string[];
}

export interface EnhancedTailorResult {
  summary: string;
  skills: string[];
  experience: Experience[];
  education: Education[];
  keyChanges: string[];
  sectionScores: SectionScores | null;
  overallScore: { before: number; after: number } | null;
  missingSkills: SkillSuggestion[];
  boostableSkills: SkillSuggestion[];
  jobParsed: JobParsed;
}

export interface TailorHistory {
  id: string;
  jobTitle: string;
  company: string;
  jobDescription: string;
  tailorResult: EnhancedTailorResult;
  scoreBeforeAfter: { before: number; after: number };
  appliedSections: TailorSectionId[];
  createdAt: string;
}

export type TailorStep = 
  | 'analyzing' 
  | 'matching' 
  | 'rewriting_summary' 
  | 'optimizing_skills' 
  | 'enhancing_experience' 
  | 'generating_recs' 
  | 'complete';

export interface TailorProgress {
  step: TailorStep;
  progress: number;
  message: string;
}

// ===== PDF OPTIONS =====

export interface PDFOptions {
  showPageNumbers?: boolean;
  pageNumberFormat?: 'simple' | 'full'; // "1" vs "Page 1 of 3"
  showBranding?: boolean; // WiseResume prestige stamp
}

export type ExportType = 'resume' | 'cover-letter' | 'combined' | 'one-page' | 'docx' | 'ats-pdf' | 'linkedin' | 'plain-text' | 'share-link' | 'interview-prep' | 'json' | 'image';

export interface CoverLetterHistory {
  id: string;
  jobTitle: string;
  company: string;
  tone: string;
  coverLetter: string;
  createdAt: string;
}

export interface CoverLetterContext {
  title: string;
  company: string;
}
 
 // ===== ENHANCED TAILOR TYPES (Phase 1-4) =====
 
 export interface JobIntelligence {
   experienceLevel: 'entry' | 'mid' | 'senior' | 'executive';
   salaryRange?: { min: number; max: number; currency: string };
   workMode: 'remote' | 'hybrid' | 'onsite' | 'unknown';
   mustHaveSkills: string[];
   niceToHaveSkills: string[];
   companyCultureSignals: string[];
   applicationDeadline?: string;
   redFlags: string[];
   industryDetected: string;
 }
 
 export interface InterviewTalkingPoint {
   question: string;
   suggestedAnswer: string;
   relatedExperience?: string;
 }
 
 export interface ATSAnalysis {
   originalKeywordDensity: number;
   optimizedKeywordDensity: number;
   criticalKeywords: string[];
   stuffingWarnings: string[];
 }
 
 export interface BulletTransformation {
   experienceId: string;
   bulletIndex: number;
   originalBullet: string;
   enhancedBullet: string;
   improvement: string;
   metricsAdded: boolean;
 }
 
 export interface StrengthAnalysis {
   strength: string;
   percentile: number;
   recommendation?: string;
 }
 
 export interface EnhancedJobParsed extends JobParsed {
   fullDescription?: string;
   jobIntelligence?: JobIntelligence;
 }
 
 // Extended tailor result with all new fields
  export interface SuperTailorResult extends EnhancedTailorResult {
    jobIntelligence?: JobIntelligence;
    interviewTalkingPoints?: InterviewTalkingPoint[];
    atsAnalysis?: ATSAnalysis;
    bulletTransformations?: BulletTransformation[];
    strengthsAnalysis?: StrengthAnalysis[];
    projects?: Project[];
    certifications?: Certification[];
    awards?: Award[];
  }
 
 // ===== MULTI-JOB COMPARISON TYPES =====
 
 export interface JobComparisonEntry {
   id: string;
   jobTitle: string;
   company: string;
   jobDescription: string;
   tailorResult: SuperTailorResult;
   createdAt: string;
 }
 
 export interface MultiJobComparison {
   id: string;
   resumeId: string;
   jobs: JobComparisonEntry[];
   selectedJobId: string | null;
   createdAt: string;
 }
 
 export type EnhancedTailorStep = 
   | 'fetching_job'
   | 'analyzing_requirements'
   | 'detecting_industry'
   | 'matching_experience'
   | 'rewriting_summary'
   | 'optimizing_skills'
   | 'transforming_bullets'
   | 'calculating_ats'
   | 'generating_interview_prep'
   | 'finalizing'
   | 'complete';
 
 export interface EnhancedTailorProgress {
   step: EnhancedTailorStep;
   progress: number;
   message: string;
   funFact?: string;
 }
