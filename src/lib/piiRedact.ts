import type { ResumeData } from '@/types/resume';

/**
 * Replaces PII fields in a ResumeData object with placeholders before sending to AI providers.
 * Only applies when `enabled` is true. Returns a shallow clone with `contactInfo` replaced.
 *
 * Fields redacted: fullName, email, email2, phone, location, linkedin, github, portfolio.
 */
export function redactResumeForAI(resume: ResumeData, enabled: boolean): ResumeData {
  if (!enabled || !resume) return resume;

  const redacted = {
    ...resume,
    contactInfo: {
      ...resume.contactInfo,
      fullName: '[Name]',
      email: '[email@example.com]',
      email2: resume.contactInfo.email2 !== undefined ? '[email@example.com]' : undefined,
      phone: '[Phone]',
      location: '[Location]',
      linkedin: resume.contactInfo.linkedin !== undefined ? '[LinkedIn]' : undefined,
      github: resume.contactInfo.github !== undefined ? '[GitHub]' : undefined,
      portfolio: resume.contactInfo.portfolio !== undefined ? '[Portfolio]' : undefined,
    },
  };

  return redacted;
}
