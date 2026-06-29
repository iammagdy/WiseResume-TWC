import { directionForLocale, type SupportedLocale } from './core';
import { getSectionLabel, SECTION_LABELS } from '@/lib/sectionLabels';

const SECTION_ALIASES: Record<string, string[]> = {
  summary: ['summary', 'professional summary', 'profile', 'professional profile', 'about me'],
  experience: ['experience', 'work experience', 'professional experience', 'career experience', 'employment'],
  education: ['education', 'academic background'],
  skills: ['skills', 'core skills', 'technical skills', 'expertise'],
  certifications: ['certifications', 'certificates', 'licenses & certifications'],
  awards: ['awards', 'achievements', 'awards & achievements'],
  projects: ['projects', 'selected projects'],
  publications: ['publications'],
  volunteering: ['volunteering', 'volunteer experience'],
  hobbies: ['hobbies', 'interests', 'hobbies & interests'],
  references: ['references'],
  languages: ['languages'],
};

function normalizeHeading(value: string): string {
  return value.trim().toLocaleLowerCase('en').replace(/\s+/g, '');
}

function findGeneratedHeading(section: HTMLElement, sectionId: string): HTMLElement | null {
  const candidates = Array.from(section.querySelectorAll<HTMLElement>('h1, h2, h3, h4'));
  const accepted = new Set([
    SECTION_LABELS[sectionId],
    getSectionLabel(sectionId, 'ar'),
    ...(SECTION_ALIASES[sectionId] ?? []),
  ].filter(Boolean).map(normalizeHeading));
  return candidates.find((candidate) => accepted.has(normalizeHeading(candidate.textContent ?? ''))) ?? null;
}

export function localizeResumeTemplateElement(
  root: HTMLElement,
  locale: SupportedLocale,
): void {
  root.lang = locale;
  root.dir = directionForLocale(locale);
  root.dataset.documentLocale = locale;
  if (locale === 'ar') root.style.fontFamily = '"Noto Sans Arabic", sans-serif';

  root.querySelectorAll<HTMLElement>('[data-section]').forEach((section) => {
    const sectionId = section.dataset.section;
    if (!sectionId) return;
    const heading = findGeneratedHeading(section, sectionId);
    if (!heading) return;
    heading.textContent = getSectionLabel(sectionId, locale);
    heading.dataset.i18nSectionHeading = sectionId;
    if (locale === 'ar') {
      heading.style.textTransform = 'none';
      heading.style.letterSpacing = 'normal';
    }
  });

  root.querySelectorAll<HTMLElement>('a[href], [data-contact-email], [data-contact-phone]').forEach((element) => {
    element.dir = 'ltr';
    element.style.unicodeBidi = 'isolate';
  });
}
