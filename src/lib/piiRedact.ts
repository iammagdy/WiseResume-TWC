import type { ContactInfo, ResumeData } from '@/types/resume';

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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Redact contact details from pre-extracted CV text before an AI parser sees
 * it. The local parser's contact snapshot can be restored after the provider
 * returns structured data, so privacy mode does not erase the user's fields.
 */
export function redactResumeTextForAI(
  text: string,
  contactInfo: Partial<ContactInfo> | null | undefined,
  enabled: boolean,
): string {
  if (!enabled || !text) return text;

  let redacted = text;
  const replacements: Array<[string | undefined, string]> = [
    [contactInfo?.fullName, '[Name]'],
    [contactInfo?.email, '[email@example.com]'],
    [contactInfo?.email2, '[email@example.com]'],
    [contactInfo?.phone, '[Phone]'],
    [contactInfo?.location, '[Location]'],
    [contactInfo?.linkedin, '[LinkedIn]'],
    [contactInfo?.github, '[GitHub]'],
    [contactInfo?.portfolio, '[Portfolio]'],
  ];

  for (const [source, placeholder] of replacements) {
    const value = source?.trim();
    if (!value || value.length < 3) continue;
    redacted = redacted.replace(new RegExp(escapeRegExp(value), 'gi'), placeholder);
  }

  // Defence in depth when the local parser missed or normalized a contact.
  redacted = redacted
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email@example.com]')
    .replace(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[^\s)]+/gi, '[LinkedIn]')
    .replace(/(?:https?:\/\/)?(?:www\.)?github\.com\/[^\s)]+/gi, '[GitHub]')
    .replace(/(?:\+?\d{1,4}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g, '[Phone]');

  return redacted;
}

/**
 * AI features receive stable contact placeholders while privacy redaction is
 * enabled. Restore those placeholders only after the provider response has
 * returned so generated copy is ready to use without disclosing contact data
 * to the provider.
 */
export function restoreResumeContactPlaceholders<T>(
  value: T,
  contactInfo: Partial<ContactInfo> | null | undefined,
): T {
  const replacements: Array<[string, string | undefined]> = [
    ['[Name]', contactInfo?.fullName],
    ['[email@example.com]', contactInfo?.email],
    ['[Phone]', contactInfo?.phone],
    ['[Location]', contactInfo?.location],
    ['[LinkedIn]', contactInfo?.linkedin],
    ['[GitHub]', contactInfo?.github],
    ['[Portfolio]', contactInfo?.portfolio],
  ];

  const restore = (node: unknown, depth: number): unknown => {
    if (depth > 8) return node;
    if (typeof node === 'string') {
      return replacements.reduce((result, [placeholder, replacement]) => {
        if (!replacement?.trim()) return result;
        return result.replace(new RegExp(escapeRegExp(placeholder), 'gi'), replacement.trim());
      }, node);
    }
    if (Array.isArray(node)) return node.map(item => restore(item, depth + 1));
    if (typeof node === 'object' && node !== null) {
      return Object.fromEntries(
        Object.entries(node).map(([key, item]) => [key, restore(item, depth + 1)]),
      );
    }
    return node;
  };

  return restore(value, 0) as T;
}
