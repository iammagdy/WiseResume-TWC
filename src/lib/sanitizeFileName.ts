const UNSAFE_CHARS = /[/\\:*?"<>|]/g;

export function sanitizeFileName(raw: string, fallback = 'Resume', maxLength = 100): string {
  const cleaned = raw.replace(UNSAFE_CHARS, '').replace(/\s+/g, '_').trim().slice(0, maxLength);
  return cleaned.length >= 2 ? cleaned : fallback;
}
