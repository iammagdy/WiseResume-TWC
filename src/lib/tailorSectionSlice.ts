import type { ResumeData, SuperTailorResult, TailorSectionId } from '@/types/resume';

export const TAILOR_COMPARE_SECTION_ORDER: TailorSectionId[] = [
  'summary',
  'skills',
  'experience',
  'education',
  'projects',
  'certifications',
  'awards',
];

const EMPTY_SLICE: Pick<
  ResumeData,
  | 'summary'
  | 'skills'
  | 'experience'
  | 'education'
  | 'projects'
  | 'certifications'
  | 'awards'
  | 'publications'
  | 'volunteering'
  | 'hobbies'
  | 'references'
  | 'languages'
> = {
  summary: '',
  skills: [],
  experience: [],
  education: [],
  projects: [],
  certifications: [],
  awards: [],
  publications: [],
  volunteering: [],
  hobbies: [],
  references: [],
  languages: [],
};

/** Resume containing only one section's data (for isolated template rendering). */
export function sliceResumeForCompareSection(resume: ResumeData, section: TailorSectionId): ResumeData {
  const base = { ...resume, ...EMPTY_SLICE };
  switch (section) {
    case 'summary':
      return { ...base, summary: resume.summary ?? '' };
    case 'skills':
      return { ...base, skills: resume.skills ?? [] };
    case 'experience':
      return { ...base, experience: resume.experience ?? [] };
    case 'education':
      return { ...base, education: resume.education ?? [] };
    case 'projects':
      return { ...base, projects: resume.projects ?? [] };
    case 'certifications':
      return { ...base, certifications: resume.certifications ?? [] };
    case 'awards':
      return { ...base, awards: resume.awards ?? [] };
    default:
      return base;
  }
}

export function sectionHasResumeContent(resume: ResumeData, section: TailorSectionId): boolean {
  switch (section) {
    case 'summary':
      return !!(resume.summary || '').trim();
    case 'skills':
      return (resume.skills?.length ?? 0) > 0;
    case 'experience':
      return (resume.experience?.length ?? 0) > 0;
    case 'education':
      return (resume.education?.length ?? 0) > 0;
    case 'projects':
      return (resume.projects?.length ?? 0) > 0;
    case 'certifications':
      return (resume.certifications?.length ?? 0) > 0;
    case 'awards':
      return (resume.awards?.length ?? 0) > 0;
    default:
      return false;
  }
}

export function tailorSectionHasChanges(
  section: TailorSectionId,
  original: ResumeData,
  tailored: ResumeData,
  tailorResult?: SuperTailorResult | null,
): boolean {
  switch (section) {
    case 'summary':
      return (original.summary || '').trim() !== (tailored.summary || '').trim();
    case 'skills':
      return JSON.stringify(original.skills ?? []) !== JSON.stringify(tailored.skills ?? []);
    case 'experience':
      return (
        (tailorResult?.bulletTransformations?.length ?? 0) > 0 ||
        JSON.stringify(original.experience ?? []) !== JSON.stringify(tailored.experience ?? [])
      );
    case 'education':
      return JSON.stringify(original.education ?? []) !== JSON.stringify(tailored.education ?? []);
    case 'projects':
      return JSON.stringify(original.projects ?? []) !== JSON.stringify(tailored.projects ?? []);
    case 'certifications':
      return JSON.stringify(original.certifications ?? []) !== JSON.stringify(tailored.certifications ?? []);
    case 'awards':
      return JSON.stringify(original.awards ?? []) !== JSON.stringify(tailored.awards ?? []);
    default:
      return false;
  }
}
