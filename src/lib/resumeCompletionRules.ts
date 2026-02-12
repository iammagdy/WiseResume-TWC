import type { ContactInfo, Experience, Education, ResumeData } from '@/types/resume';

export function calcContactScore(contact: ContactInfo): number {
  let score = 0;
  if (contact.fullName?.trim()) score += 20;
  if (contact.email?.trim()) score += 20;
  if (contact.phone?.trim()) score += 20;
  if (contact.location?.trim()) score += 20;
  if (contact.linkedin?.trim() || contact.portfolio?.trim()) score += 20;
  return score;
}

export function calcSummaryScore(summary: string): number {
  const text = summary?.trim() || '';
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  if (wordCount === 0) return 0;
  if (wordCount < 20) return 25;
  if (wordCount < 50) return 50;
  if (wordCount < 150) return 75;
  // 150+ words OR 2-4 sentences with 50+ words
  return 100;
}

export function calcExperienceScore(experience: Experience[]): number {
  if (!experience || experience.length === 0) return 0;

  const hasDetails = (e: Experience) => Boolean(e.company?.trim() && e.position?.trim());
  const hasDates = (e: Experience) => hasDetails(e) && Boolean(e.startDate?.trim());
  const bulletCount = (e: Experience) => (e.achievements?.length || 0) + (e.responsibilities?.length || 0);
  const hasBullets = (e: Experience) => hasDates(e) && bulletCount(e) >= 2;

  const detailed = experience.filter(hasDetails);
  if (detailed.length === 0) return 0;

  const withDates = experience.filter(hasDates);
  const withBullets = experience.filter(hasBullets);

  if (withBullets.length >= 2) return 100;
  if (withBullets.length >= 1) return 75;
  if (withDates.length >= 1) return 50;
  return 25;
}

export function calcEducationScore(education: Education[]): number {
  if (!education || education.length === 0) return 0;
  const e = education[0];
  if (!e.institution?.trim()) return 0;
  const hasInstitution = Boolean(e.institution?.trim());
  const hasDegree = Boolean(e.degree?.trim());
  const hasEndDate = Boolean(e.endDate?.trim());

  if (hasInstitution && hasDegree && hasEndDate) return 100;
  if (hasInstitution && hasDegree) return 66;
  if (hasInstitution) return 33;
  return 0;
}

export function calcSkillsScore(skills: string[]): number {
  const count = skills?.length || 0;
  if (count === 0) return 0;
  if (count < 5) return 40;
  if (count < 10) return 70;
  return 100;
}

export function calcOverallScore(resume: ResumeData): number {
  const scores = [
    calcContactScore(resume.contactInfo),
    calcSummaryScore(resume.summary),
    calcExperienceScore(resume.experience),
    calcEducationScore(resume.education),
    calcSkillsScore(resume.skills),
  ];
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export function getSectionStatus(score: number): 'empty' | 'partial' | 'complete' {
  if (score === 0) return 'empty';
  if (score >= 100) return 'complete';
  return 'partial';
}

const SECTION_ORDER = ['contact', 'summary', 'experience', 'education', 'skills'] as const;

const SECTION_SCORE_FNS: Record<string, (resume: ResumeData) => number> = {
  contact: (r) => calcContactScore(r.contactInfo),
  summary: (r) => calcSummaryScore(r.summary),
  experience: (r) => calcExperienceScore(r.experience),
  education: (r) => calcEducationScore(r.education),
  skills: (r) => calcSkillsScore(r.skills),
};

export function getNextIncompleteSection(resume: ResumeData): string | null {
  for (const id of SECTION_ORDER) {
    if (SECTION_SCORE_FNS[id](resume) < 100) return id;
  }
  return null;
}
