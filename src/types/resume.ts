export interface ContactInfo {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  portfolio?: string;
}

export interface Experience {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
  achievements: string[];
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  gpa?: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  expiryDate?: string;
  credentialId?: string;
}

export interface ResumeData {
  id?: string;
  contactInfo: ContactInfo;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  certifications: Certification[];
  templateId: string;
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

export type TemplateId = 'modern' | 'classic' | 'minimal' | 'professional' | 'developer' | 'creative' | 'executive';

export type SectionId = 'summary' | 'experience' | 'education' | 'skills' | 'certifications';

export type TailorSectionId = 'summary' | 'skills' | 'experience' | 'education';

export interface PageBreakSettings {
  mode: 'auto' | 'manual';
  breakAfterSections: SectionId[];
}

export interface TemplateInfo {
  id: TemplateId;
  name: string;
  description: string;
  atsScore: 'high' | 'medium' | 'low';
  category: 'professional' | 'tech' | 'creative';
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
  sectionScores: SectionScores;
  overallScore: { before: number; after: number };
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

export type ExportType = 'resume' | 'cover-letter' | 'combined';

export interface CoverLetterContext {
  title: string;
  company: string;
}
