import { ResumeData, SectionId } from '@/types/resume';

export interface SectionPreviewData {
  id: SectionId;
  name: string;
  icon: string;
  preview: string;
  hasBreakAfter: boolean;
  pageNumber: number;
}

const SECTION_NAMES: Record<SectionId, string> = {
  summary: 'Summary',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
  certifications: 'Certifications',
  awards: 'Awards',
  projects: 'Projects',
  publications: 'Publications',
  volunteering: 'Volunteering',
  hobbies: 'Hobbies',
  references: 'References',
  languages: 'Languages',
};

const SECTION_ICONS: Record<SectionId, string> = {
  summary: '📝',
  experience: '💼',
  education: '🎓',
  skills: '🛠️',
  certifications: '📜',
  awards: '🏆',
  projects: '🚀',
  publications: '📚',
  volunteering: '🤝',
  hobbies: '🎨',
  references: '👤',
  languages: '🌍',
};

/**
 * Gets a human-readable preview of section content.
 */
export function getSectionPreview(resume: ResumeData, sectionId: SectionId): string {
  switch (sectionId) {
    case 'summary':
      if (!resume.summary) return 'No summary';
      const words = resume.summary.split(/\s+/).length;
      return `${words} words`;
      
    case 'experience':
      const expCount = resume.experience?.length || 0;
      if (expCount === 0) return 'No experience';
      return expCount === 1 ? '1 position' : `${expCount} positions`;
      
    case 'education':
      const eduCount = resume.education?.length || 0;
      if (eduCount === 0) return 'No education';
      return eduCount === 1 ? '1 degree' : `${eduCount} degrees`;
      
    case 'skills':
      const skillCount = resume.skills?.length || 0;
      if (skillCount === 0) return 'No skills';
      return skillCount === 1 ? '1 skill' : `${skillCount} skills`;
      
    case 'certifications':
      const certCount = resume.certifications?.length || 0;
      if (certCount === 0) return 'No certifications';
      return certCount === 1 ? '1 certification' : `${certCount} certifications`;
      
    default:
      return '';
  }
}

/**
 * Gets the emoji icon for a section.
 */
export function getSectionIcon(sectionId: SectionId): string {
  return SECTION_ICONS[sectionId] || '📄';
}

/**
 * Gets the display name for a section.
 */
export function getSectionName(sectionId: SectionId): string {
  return SECTION_NAMES[sectionId] || sectionId;
}

/**
 * Calculates page numbers for each section based on break selections.
 * Sections after a break are on the next page.
 */
export function calculatePageNumbers(
  sections: SectionId[],
  breakAfterSections: SectionId[]
): Map<SectionId, number> {
  const pageNumbers = new Map<SectionId, number>();
  let currentPage = 1;
  
  for (let i = 0; i < sections.length; i++) {
    const sectionId = sections[i];
    pageNumbers.set(sectionId, currentPage);
    
    // Check if there's a break after this section
    if (breakAfterSections.includes(sectionId) && i < sections.length - 1) {
      currentPage++;
    }
  }
  
  return pageNumbers;
}

/**
 * Counts total pages based on break selections.
 */
export function countPagesFromBreaks(
  sections: SectionId[],
  breakAfterSections: SectionId[]
): number {
  if (sections.length === 0) return 1;
  
  // Filter breaks to only count valid ones (not after last section)
  let pages = 1;
  for (let i = 0; i < sections.length - 1; i++) {
    if (breakAfterSections.includes(sections[i])) {
      pages++;
    }
  }
  
  return pages;
}
