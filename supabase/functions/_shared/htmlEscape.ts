/**
 * Escapes a value for safe interpolation into an HTML template.
 * Prevents HTML injection in server-rendered email bodies.
 *
 * Accepts any value — nullish inputs produce an empty string, non-string
 * values are coerced via String() before escaping. This protects against
 * malformed JSON payloads where a field expected to be a string is sent as
 * a number or boolean.
 *
 * Use this for every user-controlled value placed inside an HTML
 * template string before sending to an email API such as Resend.
 */
export function escapeHtml(s: unknown): string {
  const str = s == null ? '' : String(s);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
