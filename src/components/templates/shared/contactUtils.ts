/** Extract LinkedIn username from URL */
export function extractLinkedInUsername(url: string): string {
  if (!url) return '';
  const match = url.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([^/?#]+)/i);
  return match ? match[1] : url;
}

/** Extract GitHub username from URL */
export function extractGitHubUsername(url: string): string {
  if (!url) return '';
  const match = url.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^/?#]+)/i);
  return match ? match[1] : url;
}

/** Extract domain from a URL for display */
export function extractDomain(url: string): string {
  if (!url) return '';
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export const DEFAULT_HEADER_ORDER = ['email', 'phone', 'location', 'linkedin', 'github', 'portfolio'];

/** Builds a full LinkedIn profile URL from any form (full URL, domain-relative, or bare username). */
export function ensureLinkedinUrl(raw: string): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/linkedin\.com/i.test(trimmed)) return `https://${trimmed}`;
  return `https://linkedin.com/in/${trimmed}`;
}

/** Builds a full GitHub profile URL from any form (full URL, domain-relative, or bare username). */
export function ensureGithubUrl(raw: string): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/github\.com/i.test(trimmed)) return `https://${trimmed}`;
  return `https://github.com/${trimmed}`;
}
