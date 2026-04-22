// Minimal ResumeData shape — mirrors src/types/resume.ts
// WARNING: If you add top-level required fields to ResumeData in src/types/resume.ts,
// you MUST add them here and provide fallback assignments in localParseResume to prevent UI crashes.
interface MinimalResumeData {
  contactInfo: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
  };
  summary: string;
  experience: Array<{
    id: string;
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    current: boolean;
    description: string;
    achievements: string[];
  }>;
  education: Array<{
    id: string;
    institution: string;
    degree: string;
    field: string;
    startDate: string;
    endDate: string;
  }>;
  skills: string[];
  certifications: Array<{
    id: string;
    name: string;
    issuer: string;
    date: string;
  }>;
  awards: Array<{ id: string; title: string; issuer: string; date: string }>;
  projects: Array<{ id: string; name: string; role: string; startDate: string; endDate: string; technologies: string[]; description: string }>;
  volunteering: Array<{ id: string; organization: string; role: string }>;
  languages: Array<{ id: string; name: string; proficiency: string }>;
  templateId: string;
}

// ===== Date extraction =====
//
// The previous fallback only matched bare 4-digit years (`\b(20\d{2}|19\d{2})\b`),
// which dropped months from every parsed range — uploads of real resumes routinely
// have date strings like "Jan 2021 – Jul 2024" or "03/2020 - Present" and the
// downstream UI then renders bare years which the user has to re-edit.
//
// This expanded regex captures all the common formats:
//   "Jan 2021", "January 2021", "01/2021", "01-2021", "2021-01", "2021/01", "2021"
// followed (optionally) by a separator (`-`, `–`, `—`, `to`, `until`, `through`)
// and an end token of the same shape OR a "current" sentinel
// ("Present", "Current", "Now", "Ongoing").
//
// `extractDateRange` is exported so the unit tests can hit it without going
// through the whole parser.

const MONTH_NAMES =
  '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember|t)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
// One date token: "Jan 2021" / "January, 2021" / "01/2021" / "1-2021" /
// "2021-01" / "2021.1" / "2021"
const DATE_TOKEN = `(?:${MONTH_NAMES}\\s*[, ]?\\s*\\d{4}|(?:0?[1-9]|1[0-2])[\\/\\-.]\\d{4}|\\d{4}[\\/\\-.](?:0?[1-9]|1[0-2])|\\d{4})`;
const PRESENT_TOKEN = `(?:Present|Current|Now|Ongoing|Today)`;
const SEPARATOR = `(?:\\s*[\\-\u2013\u2014]\\s*|\\s+(?:to|until|through)\\s+)`;
const RANGE_REGEX = new RegExp(
  `(${DATE_TOKEN})${SEPARATOR}(${DATE_TOKEN}|${PRESENT_TOKEN})`,
  'i',
);
const SINGLE_DATE_REGEX = new RegExp(`(${DATE_TOKEN}|${PRESENT_TOKEN})`, 'i');

export interface DateRange {
  startDate: string;
  endDate: string;
  current: boolean;
}

/**
 * Pull the first plausible date range out of a free-text block. Always
 * returns a `DateRange`; missing fields come back as empty strings (and
 * `current = false`) so callers don't need to null-check.
 */
export function extractDateRange(text: string): DateRange {
  if (!text) return { startDate: '', endDate: '', current: false };
  const range = text.match(RANGE_REGEX);
  if (range) {
    const start = range[1].trim();
    const end = range[2].trim();
    const isCurrent = new RegExp(`^${PRESENT_TOKEN}$`, 'i').test(end);
    return {
      startDate: start,
      endDate: isCurrent ? 'Present' : end,
      current: isCurrent,
    };
  }
  // Single date — treat as a start date with no end (e.g. issue dates on
  // certifications / awards). Don't infer "Present" because the absence
  // of an end token is genuinely ambiguous for non-experience sections.
  const single = text.match(SINGLE_DATE_REGEX);
  if (single) {
    return { startDate: single[1].trim(), endDate: '', current: false };
  }
  return { startDate: '', endDate: '', current: false };
}

// ===== Institution detection =====
//
// The previous parser always took the first non-empty line of the education
// bucket as the institution — but PDF text-extraction order is unreliable
// and the first line is just as often the degree, the date range, or even
// a stray heading. This heuristic prefers a line that "looks like" a
// school/university name and falls back to the first line only when no
// candidate matches.

const INSTITUTION_KEYWORDS = [
  'university',
  'college',
  'institute',
  'school',
  'academy',
  'polytechnic',
  'seminary',
  'conservatory',
  // A few well-known suffixes that are not strictly the words above.
  'tech',
];

/**
 * Pick the line in `lines` that most resembles a school/university name.
 * Returns `null` when no line matches so callers can fall back to their
 * own default (typically the first line).
 */
export function pickInstitutionLine(lines: string[]): string | null {
  if (!lines.length) return null;
  // Score each line: keyword match wins, then capitalisation density, then
  // length. We deliberately ignore lines that look like dates or degrees so
  // a "Bachelor of Science" line on its own doesn't beat a real institution.
  const isDateLine = (l: string) => RANGE_REGEX.test(l) || /^\s*\d{4}\s*$/.test(l);
  const isDegreeLine = (l: string) =>
    /\b(bachelor|master|phd|doctorate|associate|diploma|certificate|bsc|msc|mba|ba|bs|ma|ms|b\.?sc|m\.?sc)\b/i.test(l);

  type Scored = { line: string; score: number };
  const scored: Scored[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (isDateLine(line)) continue;
    let score = 0;
    const lower = line.toLowerCase();
    for (const kw of INSTITUTION_KEYWORDS) {
      if (lower.includes(kw)) {
        score += 10;
        break;
      }
    }
    // Capitalised words are common in institution names ("Stanford
    // University", "Massachusetts Institute of Technology"). Count words
    // that start with an uppercase letter.
    const capWords = (line.match(/\b[A-Z][a-zA-Z'.-]+/g) || []).length;
    score += capWords;
    // De-prioritise lines that are clearly a degree on their own.
    if (isDegreeLine(line) && score < 10) score -= 3;
    scored.push({ line, score });
  }
  if (!scored.length) return null;
  scored.sort((a, b) => b.score - a.score);
  return scored[0].score > 0 ? scored[0].line : null;
}

export function localParseResume(text: string): MinimalResumeData {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Extract email
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

  // Extract phone
  const phoneMatch = text.match(/(\+?\d{1,4}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/);

  // Extract LinkedIn
  const linkedinMatch = text.match(/linkedin\.com\/in\/([a-zA-Z0-9-]+)/i);

  // Extract name: first non-contact line, 1–5 words
  let fullName = '';
  for (const line of lines.slice(0, 8)) {
    if (!line.includes('@') && !line.match(/^\+?[0-9(]/) && line.length < 60) {
      if (/^[A-Za-z\u00C0-\u024F\u0600-\u06FF\s.\-']+$/.test(line) && line.split(/\s+/).length <= 5) {
        fullName = line;
        break;
      }
    }
  }

  // Section detection
  const SECTION_MAP: Record<string, RegExp> = {
    summary: /^(summary|objective|profile|about\s*me|professional\s*summary|career\s*summary|career\s*objective|personal\s*statement)$/i,
    experience: /^(experience|work\s*experience|employment|work\s*history|professional\s*experience|career\s*history)$/i,
    education: /^(education|academic|qualifications|degrees?)$/i,
    skills: /^(skills|technical\s*skills|core\s*competencies|key\s*skills)$/i,
    certifications: /^(certifications?|certificates?|licenses?)$/i,
    awards: /^(awards?|honors?|achievements?|recognition)$/i,
    projects: /^(projects?|personal\s*projects|academic\s*projects)$/i,
    volunteering: /^(volunteering|volunteer\s*experience|community\s*service)$/i,
    languages: /^(languages?|linguistic\s*skills)$/i,
  };

  const buckets: Record<string, string[]> = {
    summary: [], experience: [], education: [], skills: [], certifications: [], 
    awards: [], projects: [], volunteering: [], languages: [], header: [],
  };
  let current = 'header';

  for (const line of lines) {
    const clean = line.replace(/[:\-–—|•]/g, '').trim();
    let found = false;
    for (const [section, pattern] of Object.entries(SECTION_MAP)) {
      if (pattern.test(clean)) { current = section; found = true; break; }
    }
    if (!found) buckets[current].push(line);
  }

  // Parse skills
  const skills = buckets.skills
    .join(' ')
    .split(/[,|•·;]/)
    .map(s => s.trim())
    .filter(s => s.length > 1 && s.length < 80);

  // Parse experience (simple — one entry per non-empty block).
  // We now also pull a date range out of the joined block so the UI gets
  // month + year instead of nothing on the fallback path.
  const expLines = buckets.experience;
  const expBlob = expLines.join(' ');
  const expDates = extractDateRange(expBlob);
  const experience = expLines.length > 0
    ? [{
        id: crypto.randomUUID(),
        company: expLines[0] || '',
        position: expLines[1] || '',
        startDate: expDates.startDate,
        endDate: expDates.endDate,
        current: expDates.current,
        description: expLines.slice(2).join(' ').slice(0, 500),
        achievements: [],
      }]
    : [];

  // Parse education using the position-aware institution heuristic and
  // the new date range extractor.
  const eduLines = buckets.education;
  const eduDates = extractDateRange(eduLines.join(' '));
  const institution = pickInstitutionLine(eduLines) ?? eduLines[0] ?? '';
  // Pick a degree line: prefer one with degree keywords; fall back to the
  // first non-institution line so we don't double-map institution → degree.
  let degreeLine = '';
  for (const l of eduLines) {
    if (l === institution) continue;
    if (/\b(bachelor|master|phd|doctorate|associate|diploma|certificate|bsc|msc|mba|ba|bs|ma|ms|b\.?sc|m\.?sc)\b/i.test(l)) {
      degreeLine = l;
      break;
    }
  }
  if (!degreeLine) {
    degreeLine = eduLines.find(l => l !== institution) ?? '';
  }
  const education = eduLines.length > 0
    ? [{
        id: crypto.randomUUID(),
        institution,
        degree: degreeLine,
        field: '',
        startDate: eduDates.startDate,
        endDate: eduDates.endDate,
      }]
    : [];

  // Parse certifications
  const certifications = buckets.certifications
    .slice(0, 5)
    .filter(l => l.length > 2)
    .map(l => ({
      id: crypto.randomUUID(),
      name: l.slice(0, 150),
      issuer: '',
      date: extractDateRange(l).startDate,
    }));

  return {
    contactInfo: {
      fullName,
      email: emailMatch?.[0] ?? '',
      phone: phoneMatch?.[0] ?? '',
      location: '',
      linkedin: linkedinMatch ? `https://linkedin.com/in/${linkedinMatch[1]}` : '',
    },
    summary: buckets.summary.join(' ').slice(0, 500) ||
      '⚠️ Parsed in fallback mode — AI was unavailable. Please review and correct all fields.',
    experience,
    education,
    skills: skills.slice(0, 40),
    certifications,
    awards: buckets.awards.slice(0, 5).map(l => ({
      id: crypto.randomUUID(),
      title: l.slice(0, 150),
      issuer: '',
      date: extractDateRange(l).startDate,
    })),
    projects: buckets.projects.slice(0, 5).map(l => ({
      id: crypto.randomUUID(),
      name: l.slice(0, 100),
      role: '',
      startDate: '',
      endDate: '',
      technologies: [],
      description: '',
    })),
    volunteering: buckets.volunteering.slice(0, 5).map(l => ({
      id: crypto.randomUUID(),
      organization: l.slice(0, 150),
      role: '',
    })),
    languages: buckets.languages.join(' ').split(/[,;|•]/).map(s => s.trim()).filter(s => s.length > 2).slice(0, 10).map(l => ({
      id: crypto.randomUUID(),
      name: l.charAt(0).toUpperCase() + l.slice(1),
      proficiency: 'professional',
    })),
    templateId: 'modern',
  };
}
