/**
 * Escapes a string for safe interpolation into an HTML template.
 * Prevents HTML injection in server-rendered email bodies.
 *
 * Use this for every user-controlled value placed inside an HTML
 * template string before sending to an email API such as Resend.
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
