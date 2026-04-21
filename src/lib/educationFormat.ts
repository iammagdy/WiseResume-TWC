/**
 * Format an education entry's degree + field of study so we never produce
 * repetitive output like "HR in HR" or "Computer Science in Computer Science".
 *
 * Rules (case-insensitive, whitespace-trimmed):
 *  - If either side is empty → return the non-empty side.
 *  - If degree and field are textually equal → return just the degree.
 *  - If one side fully contains the other (e.g. degree="Bachelor of Computer
 *    Science", field="Computer Science") → return the longer/containing side.
 *  - Otherwise → "<degree> in <field>".
 */
export function formatDegreeAndField(degree?: string | null, field?: string | null): string {
  const d = (degree || '').trim();
  const f = (field || '').trim();

  if (!d && !f) return '';
  if (!d) return f;
  if (!f) return d;

  const dLower = d.toLowerCase();
  const fLower = f.toLowerCase();

  if (dLower === fLower) return d;
  if (dLower.includes(fLower)) return d;
  if (fLower.includes(dLower)) return f;

  return `${d} in ${f}`;
}
