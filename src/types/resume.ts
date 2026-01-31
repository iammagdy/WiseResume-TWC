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
