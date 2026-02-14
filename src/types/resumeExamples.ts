import { ResumeData } from './resume';

export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'executive';

export type Industry =
  | 'Technology'
  | 'Marketing/Sales'
  | 'Healthcare'
  | 'Finance'
  | 'Education'
  | 'Creative/Design'
  | 'Engineering'
  | 'Customer Service'
  | 'Management/Executive'
  | 'HR/Recruiting'
  | 'Legal'
  | 'Hospitality';

export interface ResumeExample {
  id: string;
  title: string;
  industry: Industry;
  experienceLevel: ExperienceLevel;
  description: string;
  highlights: string[];
  atsScore: number;
  templateId: string;
  resumeData: ResumeData;
}

export const INDUSTRIES: Industry[] = [
  'Technology',
  'Marketing/Sales',
  'Healthcare',
  'Finance',
  'Education',
  'Creative/Design',
  'Engineering',
  'Customer Service',
  'Management/Executive',
  'HR/Recruiting',
  'Legal',
  'Hospitality',
];

export const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: 'entry', label: 'Entry Level' },
  { value: 'mid', label: 'Mid-Level' },
  { value: 'senior', label: 'Senior' },
  { value: 'executive', label: 'Executive' },
];
