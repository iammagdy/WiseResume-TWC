/** Human-readable labels for `[data-section]` attribute values on resume templates. */
export const SECTION_LABELS: Record<string, string> = {
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

const ARABIC_SECTION_LABELS: Record<string, string> = {
  summary: 'الملخص المهني',
  experience: 'الخبرة العملية',
  education: 'التعليم',
  skills: 'المهارات',
  certifications: 'الشهادات',
  awards: 'الإنجازات',
  projects: 'المشاريع',
  publications: 'المنشورات',
  volunteering: 'العمل التطوعي',
  hobbies: 'الهوايات',
  references: 'المراجع',
  languages: 'اللغات',
};

export function getSectionLabel(sectionId: string, locale: 'en' | 'ar' = 'en'): string {
  const labels = locale === 'ar' ? ARABIC_SECTION_LABELS : SECTION_LABELS;
  return labels[sectionId] ?? SECTION_LABELS[sectionId] ?? sectionId;
}
