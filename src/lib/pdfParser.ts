/**
 * PDF Resume Parser
 * 
 * Main entry point for parsing PDF resumes. Uses layout-aware text extraction
 * to preserve line breaks and structure, then uses AI to parse into structured resume data.
 * 
 * Supports OCR fallback for scanned/image-based PDFs via parseResumePDFWithOCR.
 */

import { ResumeData, ParseMeta } from '@/types/resume';
import { extractTextFromPDF, PDFParseError, ExtractionResult } from './pdf/textExtractor';
import { extractTextWithOCR, OCRProgressCallback, estimateOCRTime } from './pdf/ocrExtractor';
import { parseResumeText } from './pdf/sectionParsers';
import { preprocessResumeText, extractContactHints, computeTextConfidence } from './pdf/textPreprocessor';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { sanitizeExperiencePositions } from './genericPositionTitle';
import { enrichParsedExperience } from './experiencePositionEnrichment';

export { PDFParseError, estimateOCRTime };
export type { ExtractionResult, OCRProgressCallback };

/** Timeout for AI parsing requests (20 seconds - falls back to local parser quickly) */
const PARSE_TIMEOUT = 20000;

function isResumeDataShape(value: unknown): value is ResumeData {
  if (!isRecord(value)) return false;
  if (!isRecord(value.contactInfo)) return false;
  return (
    typeof value.summary === 'string' &&
    Array.isArray(value.experience) &&
    Array.isArray(value.education) &&
    Array.isArray(value.skills) &&
    Array.isArray(value.certifications) &&
    typeof value.templateId === 'string'
  );
}

function hasMeaningfulResumeData(data: ResumeData): boolean {
  const contact = data.contactInfo ?? { fullName: '', email: '', phone: '', location: '' };
  return Boolean(
    contact.fullName?.trim() ||
    contact.email?.trim() ||
    contact.phone?.trim() ||
    data.summary?.trim() ||
    data.skills.length ||
    data.experience.length ||
    data.education.length ||
    data.certifications.length ||
    (data.awards?.length || 0) ||
    (data.projects?.length || 0) ||
    (data.publications?.length || 0) ||
    (data.volunteering?.length || 0) ||
    (data.hobbies?.length || 0) ||
    (data.references?.length || 0) ||
    (data.languages?.length || 0)
  );
}

/**
 * Result from initial PDF parsing attempt.
 * If needsOCR is true, call parseResumePDFWithOCR to try OCR extraction.
 */
export interface ParseResult {
  success: boolean;
  data?: ResumeData;
  needsOCR: boolean;
  pageCount: number;
  parseStatus: 'success' | 'partial' | 'failed';
  parseWarnings: string[];
  /**
   * When the text path failed, why. Forwarded from the extractor so the
   * upload UI can show the right recovery (scanned PDF vs iOS-WebKit
   * font/asset decode failure). See ExtractionFailureReason.
   */
  failureReason?: import('./pdf/textExtractor').ExtractionFailureReason;
  /** True when the user is on iOS Safari/WebKit (incl. iOS Chrome). */
  isIOS?: boolean;
}

/**
 * Call the AI edge function to parse resume text into structured data.
 * Falls back to local regex parsing if AI fails.
 * Includes 60s timeout to prevent infinite hangs.
 * Exported for use with Word and Image parsing.
 */
export async function parseTextWithAI(text: string): Promise<ResumeData> {
  try {
    if (import.meta.env.DEV) console.log('Calling AI to parse resume text...');
    if (import.meta.env.DEV) console.log(`AI parse timeout budget: ${PARSE_TIMEOUT}ms`);

    // fileType: 'text/plain' because the function receives pre-extracted plain text
    // regardless of the source document format (PDF, DOCX, etc).
    const { data, error } = await appwriteFunctions.invoke<ResumeData>('parse-resume', {
      body: { text, fileType: 'text/plain' },
    });

    if (error) {
      const msg = error.message;
      const status = error.status;
      if (status === 429 || msg.toLowerCase().includes('rate limit')) {
        throw new Error('Rate limit reached. Please try again in a moment.');
      }
      if (status === 402 || msg.toLowerCase().includes('credits')) {
        throw new Error('AI credits exhausted for today.');
      }
      throw new Error(msg || 'AI parsing failed');
    }

    if (!data) {
      throw new Error('AI parsing returned empty response');
    }

    if (!isResumeDataShape(data)) {
      throw new Error('Malformed AI resume response');
    }

    if (!hasMeaningfulResumeData(data)) {
      throw new Error('AI parser returned an empty resume');
    }

    if (import.meta.env.DEV) console.log('AI parsing successful');

    // If the AI returned experience entries but all positions are empty, the model
    // failed to extract job titles. Supplement positions from the local parser.
    if (
      data.experience?.length > 0 &&
      data.experience.every(e => !e.position?.trim())
    ) {
      const localText = text.replace(/\n\n---\s*CONTACT INFO HINTS[\s\S]*$/i, '').trim();
      const localData = parseResumeText(localText);
      const localByCompany = new Map<string, string>();
      for (const le of localData.experience) {
        const key = le.company.toLowerCase().trim();
        if (!localByCompany.has(key) && le.position?.trim()) {
          localByCompany.set(key, le.position.trim());
        }
      }
      data.experience = data.experience.map(exp => ({
        ...exp,
        position: localByCompany.get(exp.company.toLowerCase().trim()) || exp.position,
      }));
      if (import.meta.env.DEV) console.log('AI positions were empty — filled from local parser');
    }

    // Preserve server-side _meta (section-level fieldConfidence, completeness,
    // textQuality). Accept both the new nested `_meta` shape and the legacy
    // top-level shape for forward/backward compat.
    const nestedMeta = isRecord(data) ? readNestedMeta(data._meta) : undefined;
    const legacyMeta = extractLegacyMeta(data);
    const serverMeta: ParseMeta = { ...(legacyMeta ?? {}), ...(nestedMeta ?? {}) };

    let cleaned = regenerateResumeIds(data);
    const { items: sanitizedExperience, hadGenericTitles } = sanitizeExperiencePositions(
      cleaned.experience ?? [],
    );
    const { items: enrichedExperience } = enrichParsedExperience(sanitizedExperience, text);
    const titlesStillMissing = enrichedExperience.some(
      (e) => !e.position?.trim() && !!e.company?.trim(),
    );
    cleaned = { ...cleaned, experience: enrichedExperience };
    // Compute per-field-instance confidence and merge with server's section-level
    // scores so the UI can flag low-confidence fields at full granularity.
    const itemConfidence = computeFieldLevelConfidence(cleaned);
    const mergedConfidence: Record<string, number> = {
      ...(serverMeta.fieldConfidence ?? {}),
      ...itemConfidence,
    };
    cleaned._meta = {
      ...(cleaned._meta ?? {}),
      ...serverMeta,
      fieldConfidence: mergedConfidence,
      ...((hadGenericTitles || titlesStillMissing) ? { positionTitlesNeedReview: true } : {}),
    };
    return cleaned;
  } catch (error) {
    // Re-throw rate limit and payment errors
    if (error instanceof Error &&
        (error.message.includes('Rate limit') || error.message.includes('credits'))) {
      throw error;
    }

    if (import.meta.env.DEV) {
      console.warn('AI parsing unavailable, falling back to local parser:', error);
    } else {
      console.error('AI parsing error:', error);
    }

    // Fall back to local regex parsing for all non-billing failures.
    // Strip the contact-hints block before local parsing — it is a structured
    // signal intended only for the AI and corrupts section extraction otherwise.
    if (import.meta.env.DEV) console.log('Using fallback local parser...');
    const localText = text.replace(/\n\n---\s*CONTACT INFO HINTS[\s\S]*$/i, '').trim();
    const localParsed = parseResumeText(localText);
    const { items: enrichedExperience } = enrichParsedExperience(
      localParsed.experience ?? [],
      text,
    );
    return attachFieldConfidence({ ...localParsed, experience: enrichedExperience });
  }
}

/**
 * Regenerate all IDs in resume data to prevent React key conflicts.
 * Applied after AI parsing or JSON import.
 */
export function regenerateResumeIds(data: ResumeData): ResumeData {
  return {
    ...data,
    id: undefined,
    experience: data.experience?.map(exp => ({ ...exp, id: crypto.randomUUID() })) || [],
    education: data.education?.map(edu => ({ ...edu, id: crypto.randomUUID() })) || [],
    certifications: data.certifications?.map(cert => ({ ...cert, id: crypto.randomUUID() })) || [],
    awards: data.awards?.map(a => ({ ...a, id: crypto.randomUUID() })) || [],
    projects: data.projects?.map(p => ({ ...p, id: crypto.randomUUID() })) || [],
    publications: data.publications?.map(p => ({ ...p, id: crypto.randomUUID() })) || [],
    volunteering: data.volunteering?.map(v => ({ ...v, id: crypto.randomUUID() })) || [],
    hobbies: data.hobbies?.map(h => ({ ...h, id: crypto.randomUUID() })) || [],
    references: data.references?.map(r => ({ ...r, id: crypto.randomUUID() })) || [],
    languages: data.languages?.map(l => ({ ...l, id: crypto.randomUUID() })) || [],
    _meta: data._meta,
  };
}

/**
 * Shape of an edge-function response that may carry parse metadata. Both the
 * new (`_meta`) and legacy (top-level) layouts are accepted.
 */
interface ParseResponseLike {
  _meta?: unknown;
  completeness?: unknown;
  fieldConfidence?: unknown;
  textQuality?: unknown;
  aiCleaned?: unknown;
  multiPass?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Some deployments may emit meta fields at the top level instead of under
 * `_meta`. Pull them into a ParseMeta object so the UI receives them
 * uniformly. Uses structural guards rather than `any` casts.
 */
function extractLegacyMeta(raw: unknown): ParseMeta | undefined {
  if (!isRecord(raw)) return undefined;
  const src = raw as ParseResponseLike;
  const meta: ParseMeta = {};
  if (typeof src.completeness === 'number') meta.completeness = src.completeness;
  if (isRecord(src.fieldConfidence)) {
    // Keep only numeric entries so we don't smuggle untyped data downstream.
    const fc: Record<string, number> = {};
    for (const [k, v] of Object.entries(src.fieldConfidence)) {
      if (typeof v === 'number') fc[k] = v;
    }
    if (Object.keys(fc).length > 0) meta.fieldConfidence = fc;
  }
  if (typeof src.textQuality === 'number') meta.textQuality = src.textQuality;
  if (typeof src.aiCleaned === 'boolean') meta.aiCleaned = src.aiCleaned;
  if (typeof src.multiPass === 'boolean') meta.multiPass = src.multiPass;
  return Object.keys(meta).length > 0 ? meta : undefined;
}

/**
 * Normalise a possibly-nested `_meta` blob from the parse response into a
 * strongly-typed ParseMeta.
 */
function readNestedMeta(raw: unknown): ParseMeta | undefined {
  if (!isRecord(raw)) return undefined;
  const result: ParseMeta = {};
  if (typeof raw.completeness === 'number') result.completeness = raw.completeness;
  if (isRecord(raw.fieldConfidence)) {
    const fc: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw.fieldConfidence)) {
      if (typeof v === 'number') fc[k] = v;
    }
    if (Object.keys(fc).length > 0) result.fieldConfidence = fc;
  }
  if (typeof raw.textQuality === 'number') result.textQuality = raw.textQuality;
  if (typeof raw.aiCleaned === 'boolean') result.aiCleaned = raw.aiCleaned;
  if (typeof raw.multiPass === 'boolean') result.multiPass = raw.multiPass;
  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Compute per-item confidence scores for every individual field on the
 * extracted resume — name, email, phone, summary and every experience,
 * education, certification, award entry (company/position/date/degree/etc).
 *
 * Produces keys like:
 *   contact.fullName, contact.email, contact.phone
 *   experience[0].company, experience[0].position, experience[0].dates
 *   education[2].institution, education[2].degree
 *   certifications[0].name
 *
 * Heuristics: presence, regex confirmation (email/phone/year), token count,
 * and date-range plausibility. Merged with any section-level confidence
 * already provided by the server.
 */
function computeFieldLevelConfidence(data: ResumeData): Record<string, number> {
  const scores: Record<string, number> = {};
  const clamp = (n: number) => Math.max(0, Math.min(1, n));

  // Contact fields
  const c = data.contactInfo || ({} as ResumeData['contactInfo']);
  const name = (c.fullName || '').trim();
  scores['contact.fullName'] = name
    ? clamp(0.4 + Math.min(name.split(/\s+/).length, 3) * 0.2 + (/^[A-Z]/.test(name) ? 0.1 : 0))
    : 0;
  const email = (c.email || '').trim();
  scores['contact.email'] = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? 1 : email ? 0.3 : 0;
  const phone = (c.phone || '').trim();
  const digits = phone.replace(/\D/g, '');
  scores['contact.phone'] = digits.length >= 7 && digits.length <= 15 ? 0.9 : phone ? 0.3 : 0;

  // Summary
  const summary = (data.summary || '').trim();
  const summaryWords = summary ? summary.split(/\s+/).length : 0;
  scores['summary'] = summary ? clamp(0.2 + Math.min(summaryWords, 60) / 60 * 0.7) : 0;

  // Experience items
  (data.experience || []).forEach((exp, i) => {
    scores[`experience[${i}].company`] = exp.company?.trim() ? 0.9 : 0;
    scores[`experience[${i}].position`] = exp.position?.trim() ? 0.9 : 0;
    const hasStart = !!(exp.startDate && String(exp.startDate).trim());
    const hasEnd = !!(exp.endDate && String(exp.endDate).trim()) || exp.current === true;
    scores[`experience[${i}].dates`] = hasStart && hasEnd ? 0.9 : hasStart ? 0.5 : 0;
    const bullets = (exp.responsibilities?.length || 0) + (exp.achievements?.length || 0);
    scores[`experience[${i}].details`] = bullets > 0 ? clamp(0.3 + Math.min(bullets, 5) * 0.14) : 0.2;
  });

  // Education items
  (data.education || []).forEach((edu, i) => {
    scores[`education[${i}].institution`] = edu.institution?.trim() ? 0.9 : 0;
    scores[`education[${i}].degree`] = edu.degree?.trim() ? 0.9 : 0;
    const endYear = String(edu.endDate || '').match(/\b(19|20)\d{2}\b/);
    scores[`education[${i}].endDate`] = endYear ? 0.95 : edu.endDate ? 0.5 : 0.3;
  });

  // Certifications
  (data.certifications || []).forEach((cert, i) => {
    scores[`certifications[${i}].name`] = cert.name?.trim() ? 0.9 : 0;
    scores[`certifications[${i}].issuer`] = cert.issuer?.trim() ? 0.8 : 0.4;
  });

  // Awards
  (data.awards || []).forEach((a, i) => {
    scores[`awards[${i}].title`] = a.title?.trim() ? 0.9 : 0;
    scores[`awards[${i}].issuer`] = a.issuer?.trim() ? 0.8 : 0.4;
    scores[`awards[${i}].date`] = /\b(19|20)\d{2}\b/.test(String(a.date || '')) ? 0.95 : a.date ? 0.5 : 0.3;
  });

  // Skills — each skill string gets its own confidence based on length and
  // plausibility (skills are usually 1–5 words; runaway strings suggest a
  // parse failure that pulled in a sentence).
  (data.skills || []).forEach((skill, i) => {
    const s = (skill || '').trim();
    if (!s) { scores[`skills[${i}]`] = 0; return; }
    const wc = s.split(/\s+/).length;
    scores[`skills[${i}]`] = wc <= 5 ? 0.9 : wc <= 10 ? 0.6 : 0.3;
  });

  // Projects
  (data.projects || []).forEach((proj, i) => {
    scores[`projects[${i}].name`] = proj.name?.trim() ? 0.9 : 0;
    scores[`projects[${i}].role`] = proj.role?.trim() ? 0.7 : 0.4;
    const hasStart = !!(proj.startDate && String(proj.startDate).trim());
    const hasEnd = !!(proj.endDate && String(proj.endDate).trim());
    scores[`projects[${i}].dates`] = hasStart && hasEnd ? 0.9 : hasStart ? 0.5 : 0.3;
    scores[`projects[${i}].description`] = proj.description?.trim()
      ? clamp(0.3 + Math.min(proj.description.split(/\s+/).length, 30) / 30 * 0.6)
      : 0.2;
    scores[`projects[${i}].technologies`] = (proj.technologies || []).length > 0 ? 0.8 : 0.4;
  });

  // Publications
  (data.publications || []).forEach((pub, i) => {
    scores[`publications[${i}].title`] = pub.title?.trim() ? 0.9 : 0;
    scores[`publications[${i}].publisher`] = pub.publisher?.trim() ? 0.8 : 0.4;
    scores[`publications[${i}].date`] =
      /\b(19|20)\d{2}\b/.test(String(pub.date || '')) ? 0.95 : pub.date ? 0.5 : 0.3;
  });

  // Volunteering
  (data.volunteering || []).forEach((v, i) => {
    scores[`volunteering[${i}].organization`] = v.organization?.trim() ? 0.9 : 0;
    scores[`volunteering[${i}].role`] = v.role?.trim() ? 0.8 : 0.4;
    const hasStart = !!(v.startDate && String(v.startDate).trim());
    const hasEnd = !!(v.endDate && String(v.endDate).trim());
    scores[`volunteering[${i}].dates`] = hasStart && hasEnd ? 0.9 : hasStart ? 0.5 : 0.3;
    scores[`volunteering[${i}].description`] = v.description?.trim() ? 0.7 : 0.3;
  });

  // Hobbies
  (data.hobbies || []).forEach((h, i) => {
    scores[`hobbies[${i}].name`] = h.name?.trim() ? 0.9 : 0;
  });

  // Languages
  (data.languages || []).forEach((lang, i) => {
    scores[`languages[${i}].name`] = lang.name?.trim() ? 0.9 : 0;
    scores[`languages[${i}].proficiency`] = lang.proficiency ? 0.9 : 0.5;
  });

  // References
  (data.references || []).forEach((ref, i) => {
    scores[`references[${i}].name`] = ref.name?.trim() ? 0.9 : 0;
    scores[`references[${i}].title`] = ref.title?.trim() ? 0.7 : 0.4;
    scores[`references[${i}].company`] = ref.company?.trim() ? 0.8 : 0.4;
    const refEmail = (ref.email || '').trim();
    scores[`references[${i}].email`] =
      /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(refEmail) ? 1 : refEmail ? 0.3 : 0.3;
    const refPhoneDigits = (ref.phone || '').replace(/\D/g, '');
    scores[`references[${i}].phone`] =
      refPhoneDigits.length >= 7 && refPhoneDigits.length <= 15 ? 0.9 : ref.phone ? 0.3 : 0.3;
  });

  // Contact sub-fields beyond name/email/phone
  scores['contact.location'] = c.location?.trim() ? 0.85 : 0.3;
  if (c.linkedin !== undefined) {
    scores['contact.linkedin'] = /linkedin\.com\//i.test(String(c.linkedin || '')) ? 0.95 : c.linkedin ? 0.4 : 0.5;
  }
  if (c.github !== undefined) {
    scores['contact.github'] = /github\.com\//i.test(String(c.github || '')) ? 0.95 : c.github ? 0.4 : 0.5;
  }
  if (c.portfolio !== undefined) {
    scores['contact.portfolio'] = /^https?:\/\//i.test(String(c.portfolio || '')) ? 0.9 : c.portfolio ? 0.4 : 0.5;
  }

  return scores;
}

/**
 * Attach per-field-instance confidence scores to a ResumeData object in-place
 * and return it. Ensures every parse outcome — AI success, AI fallback, OCR
 * low-quality, local regex parser — exposes `_meta.fieldConfidence` so the UI
 * can flag low-confidence fields consistently.
 */
export function attachFieldConfidence(data: ResumeData): ResumeData {
  const itemConfidence = computeFieldLevelConfidence(data);
  data._meta = {
    ...(data._meta || {}),
    fieldConfidence: {
      ...(data._meta?.fieldConfidence || {}),
      ...itemConfidence,
    },
  };
  return data;
}

/**
 * Derive low-confidence field labels from parse meta. Handles both:
 *   - Section-level keys from the edge function (name, email, experience, ...)
 *   - Per-item keys from client-side heuristics
 *     (contact.fullName, experience[3].company, education[0].degree, ...)
 *
 * Fields with confidence below `threshold` (default 0.6) are returned as
 * human-readable labels for UI flagging.
 */
export function getLowConfidenceFields(
  meta: ParseMeta | undefined,
  threshold = 0.6
): string[] {
  if (!meta?.fieldConfidence) return [];
  const sectionLabels: Record<string, string> = {
    name: 'Full name',
    email: 'Email',
    phone: 'Phone',
    summary: 'Summary',
    experience: 'Work experience',
    education: 'Education',
    skills: 'Skills',
    certifications: 'Certifications',
    awards: 'Awards',
    volunteering: 'Volunteering',
    'contact.fullName': 'Full name',
    'contact.email': 'Email',
    'contact.phone': 'Phone',
  };
  const subFieldLabels: Record<string, string> = {
    company: 'company',
    position: 'job title',
    dates: 'dates',
    details: 'description',
    institution: 'school',
    degree: 'degree',
    endDate: 'end date',
    startDate: 'start date',
    graduationDate: 'graduation date',
    name: 'name',
    issuer: 'issuer',
    title: 'title',
    date: 'date',
    organization: 'organization',
    role: 'role',
    description: 'description',
    technologies: 'technologies',
    publisher: 'publisher',
    proficiency: 'proficiency',
    email: 'email',
    phone: 'phone',
    location: 'location',
    linkedin: 'LinkedIn',
    github: 'GitHub',
    portfolio: 'portfolio',
    fullName: 'full name',
  };

  const out: string[] = [];
  for (const [key, score] of Object.entries(meta.fieldConfidence)) {
    if (typeof score !== 'number' || score >= threshold) continue;

    if (sectionLabels[key]) {
      out.push(sectionLabels[key]);
      continue;
    }
    // Array-with-subfield keys: experience[0].company → "Experience #1 company"
    const subMatch = key.match(/^(\w+)\[(\d+)\]\.(\w+)$/);
    if (subMatch) {
      const [, section, idx, sub] = subMatch;
      const sectionName = section.charAt(0).toUpperCase() + section.slice(1);
      const subName = subFieldLabels[sub] || sub;
      out.push(`${sectionName} #${parseInt(idx, 10) + 1} ${subName}`);
      continue;
    }
    // Array-only keys: skills[0] → "Skills #1"
    const arrMatch = key.match(/^(\w+)\[(\d+)\]$/);
    if (arrMatch) {
      const [, section, idx] = arrMatch;
      const sectionName = section.charAt(0).toUpperCase() + section.slice(1);
      out.push(`${sectionName} #${parseInt(idx, 10) + 1}`);
      continue;
    }
    // Dotted keys without index: contact.location → "Location"
    const dotMatch = key.match(/^(\w+)\.(\w+)$/);
    if (dotMatch) {
      const [, , sub] = dotMatch;
      const subName = subFieldLabels[sub] || sub;
      out.push(subName.charAt(0).toUpperCase() + subName.slice(1));
      continue;
    }
    out.push(key);
  }
  // Cap + dedupe to keep the banner readable.
  return Array.from(new Set(out)).slice(0, 8);
}

/**
 * Parse a PDF file and extract structured resume data.
 * Returns a ParseResult indicating whether OCR is needed.
 */
export async function parseResumePDF(file: File): Promise<ParseResult> {
  // Extract text with layout preservation
  const extraction = await extractTextFromPDF(file);
  
  // Empty extraction can mean two very different things now:
  //  1. needsOCR=true with failureReason 'NO_ITEMS' → real scanned PDF, OCR is right
  //  2. needsOCR=false with failureReason 'EMPTY_STRINGS' / 'PAGE_ERRORS' /
  //     'TOO_FEW_WORDS' → text extraction broke (often iOS WebKit) and OCR
  //     on the same broken page is unlikely to help. Surface a clear failure
  //     instead of silently steering users into a doomed OCR path.
  if (extraction.needsOCR) {
    return {
      success: false,
      needsOCR: true,
      pageCount: extraction.pageCount,
      parseStatus: 'failed',
      parseWarnings: ['PDF contains no selectable text — OCR is required to read this file.'],
      failureReason: extraction.failureReason,
      isIOS: extraction.isIOS,
    };
  }

  if (extraction.failureReason) {
    // We have an empty result but OCR is NOT the right answer.
    const iosNote = extraction.isIOS
      ? ' This commonly happens on iPhone Safari with PDFs that use embedded fonts. ' +
        'Try uploading from a desktop browser, or convert your CV to Word/JSON first.'
      : '';
    const reasonNote =
      extraction.failureReason === 'EMPTY_STRINGS'
        ? "We could see text in your PDF but couldn't decode the font."
        : extraction.failureReason === 'PAGE_ERRORS'
          ? 'Every page in this PDF errored while we tried to read it.'
          : "We couldn't extract enough readable text from this PDF.";
    return {
      success: false,
      needsOCR: false,
      pageCount: extraction.pageCount,
      parseStatus: 'failed',
      parseWarnings: [reasonNote + iosNote],
      failureReason: extraction.failureReason,
      isIOS: extraction.isIOS,
    };
  }
  
  // Preprocess text to clean extraction artifacts
  let cleanedText: string;
  try {
    cleanedText = preprocessResumeText(extraction.text, extraction.pageTexts);
  } catch {
    console.warn('[pdfParser] preprocessResumeText failed, using raw text');
    cleanedText = extraction.text;
  }

  // Early exit: if extracted text is too short to be a real resume, don't waste
  // an AI call and instead surface a clear error to the user.
  const MIN_TEXT_LENGTH = 50;
  if (cleanedText.trim().length < MIN_TEXT_LENGTH) {
    return {
      success: false,
      needsOCR: false,
      pageCount: extraction.pageCount,
      parseStatus: 'failed',
      parseWarnings: [
        "We couldn't read your file. The document appears to have no readable text. " +
        'Try a different format or take a photo of your CV.',
      ],
    };
  }

  // Append contact info hints to help AI
  let textWithHints: string;
  try {
    const hints = extractContactHints(cleanedText);
    textWithHints = hints ? cleanedText + hints : cleanedText;
  } catch {
    console.warn('[pdfParser] extractContactHints failed, skipping hints');
    textWithHints = cleanedText;
  }
  
  // Parse into structured data using AI; fall back to local parser on any failure
  let data: ResumeData;
  try {
    data = await parseTextWithAI(textWithHints);
  } catch {
    console.warn('AI parsing failed in parseResumePDF — falling back to local parser');
    data = attachFieldConfidence(parseResumeText(textWithHints));
  }

  // Determine parse quality
  const extractionSummary = getExtractionSummary(data);
  const parseStatus: 'success' | 'partial' | 'failed' =
    extractionSummary.isEmpty ? 'failed' : extractionSummary.isPartial ? 'partial' : 'success';
  const parseWarnings: string[] = (parseStatus !== 'success') ? [extractionSummary.summary] : [];

  return {
    success: true,
    data,
    needsOCR: false,
    pageCount: extraction.pageCount,
    parseStatus,
    parseWarnings,
  };
}

/**
 * Parse a PDF file using OCR for scanned/image-based PDFs.
 * This is slower but works for PDFs without selectable text.
 * 
 * @param file - The PDF file to parse
 * @param onProgress - Optional callback for OCR progress updates
 * @returns Structured resume data with parse status
 */
export async function parseResumePDFWithOCR(
  file: File,
  onProgress?: OCRProgressCallback
): Promise<{ data: ResumeData; parseStatus: 'success' | 'partial' | 'failed'; parseWarnings: string[] }> {
  // Extract text using OCR
  const text = await extractTextWithOCR(file, onProgress);

  // Confidence gate: if OCR produced near-nothing, do not waste AI credits
  const { confidence } = computeTextConfidence(text);

  if (confidence < 0.25) {
    const emptyResume = attachFieldConfidence(parseResumeText('')); // empty skeleton with confidence map
    return {
      data: emptyResume,
      parseStatus: 'failed',
      parseWarnings: [
        `Image quality too low to extract text reliably (confidence: ${Math.round(confidence * 100)}%). ` +
        'Please upload a clearer scan or a PDF with selectable text.'
      ],
    };
  }

  // Parse into structured data using AI; fall back to local parser on any failure
  let data: ResumeData;
  try {
    data = await parseTextWithAI(text);
  } catch {
    console.warn('AI parsing failed in parseResumePDFWithOCR — falling back to local parser');
    data = attachFieldConfidence(parseResumeText(text));
  }
  const summary = getExtractionSummary(data);
  const parseStatus: 'success' | 'partial' | 'failed' =
    summary.isEmpty ? 'failed' : summary.isPartial ? 'partial' : 'success';
  const parseWarnings: string[] = (parseStatus !== 'success') ? [summary.summary] : [];

  return { data, parseStatus, parseWarnings };
}

/**
 * Compute extraction quality summary for user feedback.
 */
export function getExtractionSummary(data: ResumeData): {
  isEmpty: boolean;
  isPartial: boolean;
  summary: string;
  counts: {
    hasName: boolean;
    hasEmail: boolean;
    hasPhone: boolean;
    experienceCount: number;
    educationCount: number;
    skillsCount: number;
  };
} {
  // Defensive access — AI or fallback parser may return incomplete structures
  const contact = data?.contactInfo ?? {};
  const counts = {
    hasName: !!(contact as any).fullName,
    hasEmail: !!(contact as any).email,
    hasPhone: !!(contact as any).phone,
    experienceCount: (data?.experience ?? []).length,
    educationCount: (data?.education ?? []).length,
    skillsCount: (data?.skills ?? []).length,
  };

  const hasContact = counts.hasName || counts.hasEmail || counts.hasPhone;
  const hasContent = counts.experienceCount > 0 || counts.educationCount > 0 || counts.skillsCount > 0 || !!data.summary || (data.awards?.length || 0) > 0 || (data.projects?.length || 0) > 0;
  
  const isEmpty = !hasContact && !hasContent;
  const isPartial = hasContact && !hasContent || !hasContact && hasContent;

  // Build summary message
  const parts: string[] = [];
  
  if (counts.hasName) parts.push('name');
  if (counts.hasEmail) parts.push('email');
  if (counts.experienceCount > 0) parts.push(`${counts.experienceCount} job${counts.experienceCount > 1 ? 's' : ''}`);
  if (counts.educationCount > 0) parts.push(`${counts.educationCount} education`);
  if (counts.skillsCount > 0) parts.push(`${counts.skillsCount} skill${counts.skillsCount > 1 ? 's' : ''}`);

  const summary = parts.length > 0 
    ? `Found: ${parts.join(', ')}`
    : 'No content detected';

  return { isEmpty, isPartial, summary, counts };
}
