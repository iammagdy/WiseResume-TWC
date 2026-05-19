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
  current?: boolean;
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
  current?: boolean;
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
  /**
   * User-placed exact page break positions in CSS pixels at the active export design width.
   * When non-empty the export engine uses ONLY these positions — each segment is
   * rendered at its exact height so the last page is never padded to A4/Letter.
   */
  customBreakPositions?: number[];
  /** Optional fine-tuning knobs surfaced through the Style Customization panel.
   *  All optional — when undefined, the template's natural styling is used. */
  headerAlign?: 'left' | 'center' | 'right';
  /** Multiplier on top of the fontSize enum (0.85–1.15). */
  fontScale?: number;
  /** Px gap between top-level sections. Overrides the spacing preset when set. */
  sectionGap?: number;
  /** Px gap between consecutive entries (data-break-avoid blocks) within a section. */
  entryGap?: number;
  /** Master ON/OFF for the Style Customization panel. When false, all overrides
   *  are skipped and the template renders with its natural designer styling.
   *  Undefined is treated as ON (true) for backward compatibility with existing
   *  resumes that were customized before this flag existed. */
  enabled?: boolean;
  /** Auto-fit mode: when set, useFitToPages computes fontScale automatically so
   *  the rendered resume occupies this many pages (or shows a warning if even
   *  the minimum scale isn't enough). When set, the manual Font Size slider in
   *  the panel is read-only. Undefined disables auto-fit. */
  targetPageCount?: 1 | 2 | 3;
  /** Snapshot of the user's manual fontScale at the moment auto-fit was
   *  enabled. Used to restore the prior manual value when auto-fit is
   *  switched Off. Stored on customization (rather than in component state)
   *  so the snapshot survives panel remounts and resume reloads. */
  manualFontScale?: number;
  /** Per-section visual overrides, keyed by `data-section` attribute value
   *  (e.g. "summary", "experience"). Set via the inline section editor
   *  overlay in the desktop live preview. Each entry is independent of the
   *  global typography/spacing knobs and applies only to that one section. */
  sectionOverrides?: Record<string, SectionStyleOverride>;
}

export interface SectionStyleOverride {
  /** Top padding in px applied to `[data-section="<name>"]`. */
  paddingTop?: number;
  /** Bottom padding in px applied to `[data-section="<name>"]`. */
  paddingBottom?: number;
  /** Margin below the section in px. Overrides the global `sectionGap`
   *  rule for this specific section. */
  marginBottom?: number;
  /** Multiplier applied to the section's natural font size, e.g. 0.9 = 90%. */
  fontScale?: number;
}

export interface ParseMeta {
  /** Overall completeness score (0-100) from the server-side parser. */
  completeness?: number;
  /** Per-field confidence (0-1). Keys: name, email, phone, summary, experience, education, skills, certifications, awards, volunteering */
  fieldConfidence?: Record<string, number>;
  /** Raw text quality score (0-1) produced during extraction. */
  textQuality?: number;
  /** True if server ran an AI text-cleaning pre-pass. */
  aiCleaned?: boolean;
  /** True if server needed a second extraction pass. */
  multiPass?: boolean;
  /** Source hint: pdf | url | word | image | json | html | ocr */
  source?: 'pdf' | 'url' | 'word' | 'image' | 'json' | 'html' | 'ocr';
  /** True when generic job titles (e.g. Position 1) were stripped — user should fill titles. */
  positionTitlesNeedReview?: boolean;
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
  /** Non-persistent parse metadata — surfaced in UI, not saved to DB. */
  _meta?: ParseMeta;
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

export type TemplateId = 'modern' | 'classic' | 'minimal' | 'professional' | 'developer' | 'creative' | 'executive' | 'compact' | 'academic' | 'healthcare' | 'sales' | 'elegant' | 'banking' | 'consulting' | 'federal' | 'legal' | 'marketing' | 'designer' | 'portfolio' | 'data-science' | 'devops' | 'product' | 'clean' | 'swiss' | 'bento' | 'brutalist' | 'bold-type';

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
  type?: 'hard' | 'soft';
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
  projects?: { before: number; after: number };
  certifications?: { before: number; after: number };
  awards?: { before: number; after: number };
}

export interface JobParsed {
  title: string;
  company: string;
  keyRequirements: string[];
  niceToHaves: string[];
}

export interface KeyChange {
  section?: string;
  description: string;
  type?: string;
  impact?: string;
}

export interface EnhancedTailorResult {
  summary: string;
  skills: string[];
  experience: Experience[];
  education: Education[];
  keyChanges: (string | KeyChange)[];
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
  /** Verified match score from validate-tailor (or generator fallback). Stored when the resume is saved. */
  verifiedScore?: number | null;
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

export type ExportType = 'resume' | 'cover-letter' | 'combined' | 'one-page' | 'docx' | 'ats-pdf' | 'linkedin' | 'plain-text' | 'share-link' | 'interview-prep' | 'json' | 'image' | 'latex';

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
 
 export interface MatchedKeyword {
   keyword: string;
   originalCount: number;
   tailoredCount: number;
 }

 export interface ATSAnalysis {
   originalKeywordDensity: number;
   optimizedKeywordDensity: number;
   criticalKeywords: string[];
   stuffingWarnings: string[];
   matchedKeywords?: MatchedKeyword[];
   unmatchedKeywords?: string[];
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

export interface ValidatorResult {
  score: number;
  matched_keywords: string[];
  missing_keywords: string[];
  issues: string[];
  strengths: string[];
  verdict: 'weak' | 'average' | 'strong' | null;
}

export interface FixSuggestion {
  type: 'add_skill' | 'improve_bullet' | 'enhance_summary';
  section: 'skills' | 'experience' | 'summary';
  target_id?: string;
  before?: string;
  after: string;
  reason: string;
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
    validatorResult?: ValidatorResult;
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
