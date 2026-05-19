/** Detect AI placeholder job titles that should not be shown to users. */
export function isGenericPositionTitle(position: string | undefined | null): boolean {
  const p = (position ?? '').trim();
  if (!p) return true;
  if (/^position\s*#?\s*\d+$/i.test(p)) return true;
  if (/^job\s*#?\s*\d+$/i.test(p)) return true;
  if (/^role\s*#?\s*\d+$/i.test(p)) return true;
  if (/^title\s*#?\s*\d+$/i.test(p)) return true;
  if (/^(position|job|role|title|work experience|experience)$/i.test(p)) return true;
  return false;
}

interface ExperienceLike {
  position?: string;
  company?: string;
  description?: string;
  responsibilities?: string[];
  achievements?: string[];
}

/** Clear generic titles; optionally infer from first description line. */
export function sanitizeExperiencePositions<T extends ExperienceLike>(experience: T[]): {
  items: T[];
  hadGenericTitles: boolean;
} {
  let hadGenericTitles = false;
  const items = experience.map((exp) => {
    if (!isGenericPositionTitle(exp.position)) return exp;
    hadGenericTitles = true;
    const fromDesc = exp.description
      ?.split('\n')
      .map((line) => line.trim())
      .find((line) => line.length > 0 && line.length < 100 && !isGenericPositionTitle(line));
    const fallback = fromDesc ?? '';
    return { ...exp, position: fallback };
  });
  return { items, hadGenericTitles };
}
