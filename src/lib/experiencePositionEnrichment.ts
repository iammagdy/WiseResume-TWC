import type { Experience } from '@/types/resume';
import { parseResumeText } from '@/lib/pdf/sectionParsers';
import { isGenericPositionTitle } from '@/lib/genericPositionTitle';

const JOB_TITLE_KEYWORDS =
  /\b(architect|attorney|accountant|auditor|administrator|analyst|associate|consultant|coordinator|counselor|designer|developer|director|engineer|executive|intern|lecturer|manager|nurse|officer|president|principal|professor|representative|researcher|scientist|specialist|supervisor|technician|therapist|trainer|lead|senior|junior|vp|vice\s*president|cto|ceo|coo|cfo|head\s*of|customer\s*service|sales|support|agent|advisor|consultant|cabin\s*crew|crew|flight\s*attendant)\b/i;

const COMPANY_SUFFIX =
  /\b(Inc\.?|Ltd\.?|LLC|Corp\.?|Co\.?|Group|Holdings|International|Solutions|Services|Technologies|Consulting|Associates|Partners|Foundation|Institute|University|College|Hospital|Medical|Agency|Bureau|Department|Ministry|Airways|Teleperformance)\b/i;

const DATE_LINE =
  /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}\b|\b\d{4}\s*[-–—]\s*(?:\d{4}|present|current)\b|\b(?:present|current)\b/i;

const SECTION_HEADING =
  /^(experience|work\s*experience|employment|work\s*history|professional\s*experience|education|skills)$/i;

function pickPositionFromRecord(exp: Experience): string {
  const raw = exp as Experience & Record<string, unknown>;
  const candidates = [
    exp.position,
    raw.title,
    raw.role,
    raw.jobTitle,
    raw.job_title,
  ].filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
  for (const c of candidates) {
    if (!isGenericPositionTitle(c)) return c.trim();
  }
  return '';
}

function looksLikeTitleLine(line: string): boolean {
  const t = line.trim();
  if (t.length < 3 || t.length > 100) return false;
  if (DATE_LINE.test(t)) return false;
  if (/^[\d\s+().,@#]+$/.test(t)) return false;
  if (/@/.test(t)) return false;
  if (SECTION_HEADING.test(t)) return false;
  if (JOB_TITLE_KEYWORDS.test(t)) return true;
  const words = t.split(/\s+/);
  if (words.length >= 2 && words.length <= 8 && /^[A-Z]/.test(t) && t !== t.toUpperCase()) {
    return !COMPANY_SUFFIX.test(t);
  }
  return false;
}

function normalizeCompanyKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function companiesMatch(a: string, b: string): boolean {
  const ka = normalizeCompanyKey(a);
  const kb = normalizeCompanyKey(b);
  if (!ka || !kb) return false;
  return ka === kb || ka.includes(kb) || kb.includes(ka);
}

function splitTitleCompanyFromLine(line: string): { position: string; company: string } | null {
  const t = line.trim();
  const atMatch = t.match(/^(.+?)\s+at\s+(.+)$/i);
  if (atMatch) {
    const position = atMatch[1].trim();
    const company = atMatch[2].trim();
    if (looksLikeTitleLine(position) && company.length > 1) {
      return { position, company };
    }
  }
  const dashParts = t.split(/\s*[|–—-]\s*/);
  if (dashParts.length === 2) {
    const [a, b] = dashParts.map((p) => p.trim());
    if (looksLikeTitleLine(a) && !looksLikeTitleLine(b)) return { position: a, company: b };
    if (looksLikeTitleLine(b) && !looksLikeTitleLine(a)) return { position: b, company: a };
  }
  return null;
}

function inferTitleFromRawText(rawText: string, company: string): string {
  if (!company.trim()) return '';
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const companyLower = company.toLowerCase();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.toLowerCase().includes(companyLower)) continue;

    const split = splitTitleCompanyFromLine(line);
    if (split && companiesMatch(split.company, company)) {
      return split.position;
    }

    for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
      const prev = lines[j];
      if (SECTION_HEADING.test(prev)) break;
      if (DATE_LINE.test(prev) && !prev.toLowerCase().includes(companyLower)) continue;
      if (looksLikeTitleLine(prev) && !prev.toLowerCase().includes(companyLower)) {
        return prev.slice(0, 100);
      }
    }
  }
  return '';
}

function firstTitleLikeBullet(exp: Experience): string {
  for (const line of [...(exp.responsibilities ?? []), ...(exp.achievements ?? [])]) {
    const t = line.trim();
    if (looksLikeTitleLine(t) && !DATE_LINE.test(t)) return t.slice(0, 100);
  }
  const descLine = exp.description
    ?.split('\n')
    .map((l) => l.trim())
    .find((l) => looksLikeTitleLine(l));
  return descLine?.slice(0, 100) ?? '';
}

function findLocalMatch(exp: Experience, localEntries: Experience[]): Experience | undefined {
  return localEntries.find((local) => {
    if (!companiesMatch(exp.company, local.company)) return false;
    if (exp.startDate && local.startDate) {
      const a = exp.startDate.replace(/\D/g, '').slice(-6);
      const b = local.startDate.replace(/\D/g, '').slice(-6);
      if (a && b && a !== b) return false;
    }
    return true;
  });
}

/**
 * Fills missing job titles after AI parse using local regex parse, raw text proximity,
 * and common field mis-mappings (title stored in company or alternate JSON keys).
 */
export function enrichParsedExperience(
  experience: Experience[],
  rawText: string,
): { items: Experience[]; filledCount: number } {
  if (!experience.length) return { items: experience, filledCount: 0 };

  let localEntries: Experience[] = [];
  try {
    localEntries = parseResumeText(rawText).experience ?? [];
  } catch {
    localEntries = [];
  }

  let filledCount = 0;
  const items = experience.map((exp) => {
    let position = pickPositionFromRecord(exp);
    let company = (exp.company ?? '').trim();

    if (!position && company) {
      const split = splitTitleCompanyFromLine(company);
      if (split) {
        position = split.position;
        company = split.company;
      } else if (looksLikeTitleLine(company) && !COMPANY_SUFFIX.test(company)) {
        const local = findLocalMatch({ ...exp, company }, localEntries);
        if (local?.company) {
          position = company;
          company = local.company;
        }
      }
    }

    if (!position) {
      const local = findLocalMatch(exp, localEntries);
      if (local?.position && !isGenericPositionTitle(local.position)) {
        position = local.position;
        if (!company && local.company) company = local.company;
      }
    }

    if (!position && company) {
      position = inferTitleFromRawText(rawText, company);
    }

    if (!position) {
      position = firstTitleLikeBullet(exp);
    }

    if (!position && isGenericPositionTitle(exp.position)) {
      position = '';
    }

    if (position && !exp.position?.trim()) {
      filledCount += 1;
    }

    return {
      ...exp,
      company: company || exp.company,
      position: position.slice(0, 100),
    };
  });

  return { items, filledCount };
}
