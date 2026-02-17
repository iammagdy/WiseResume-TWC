/**
 * Strips Markdown formatting from plain text strings.
 * Preserves list bullet prefixes (- item, * item) as valid resume bullets.
 */
export function stripMarkdown(text: string): string {
  if (typeof text !== 'string') return text;

  return text
    // Bold: **text** or __text__
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    // Italic: *text* or _text_ (but not list bullets at line start)
    .replace(/(?<!^|\n)(\*|_)(.*?)\1/g, '$2')
    // Inline code: `text`
    .replace(/`([^`]*)`/g, '$1')
    // Heading markers: # at start of line
    .replace(/^#{1,6}\s+/gm, '')
    // Trim excessive whitespace
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/**
 * Recursively walks an AI response object and strips Markdown from all string values.
 * Passes through numbers, booleans, and null unchanged.
 */
export function sanitizeAIContent(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') return stripMarkdown(data);
  if (typeof data === 'number' || typeof data === 'boolean') return data;
  if (Array.isArray(data)) return data.map(sanitizeAIContent);
  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      result[key] = sanitizeAIContent(value);
    }
    return result;
  }
  return data;
}
