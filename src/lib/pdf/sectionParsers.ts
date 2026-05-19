import { ResumeData, Experience, Education, Certification } from '@/types/resume';
import { v4 as uuidv4 } from 'uuid';

// Section heading patterns - expanded for international CVs
const SECTION_PATTERNS: Record<string, RegExp> = {
  summary: /^(summary|objective|profile|about\s*me|professional\s*summary|career\s*objective|career\s*summary|executive\s*summary|personal\s*statement|professional\s*profile|highlights|at\s*a\s*glance|introduction|overview|bio)$/i,

  experience: /^(experience|work\s*experience|employment|work\s*history|professional\s*experience|career\s*history|employment\s*history|professional\s*background|career\s*background|relevant\s*experience|internship\s*experience|research\s*experience|consulting\s*experience|freelance\s*work|contract\s*work|work\s*(?:&|and)\s*experience|job\s*history)$/i,

  education: /^(education|academic|qualifications|academic\s*background|schooling|degrees?|educational\s*background|formal\s*education|academic\s*history|academic\s*qualifications|studies|training\s*(?:&|and)\s*education)$/i,

  skills: /^(skills|technical\s*skills|core\s*competencies|technologies|expertise|proficiencies|soft\s*skills|hard\s*skills|key\s*skills|core\s*skills|areas\s*of\s*expertise|competencies|technical\s*proficiencies|tools?\s*(?:&|and)\s*technologies|programming\s*languages?|it\s*skills|computer\s*skills|professional\s*skills|capabilities|strengths)$/i,

  certifications: /^(certifications?|certificates?|licenses?|credentials?|professional\s*certifications?|training|courses?|professional\s*development|continuing\s*education|accreditations?|qualifications?|professional\s*training|online\s*courses?)$/i,

  awards: /^(awards?|honors?|achievements?|accomplishments?|recognition|awards?\s*(?:&|and)\s*honors?|accolades?|distinctions?)$/i,

  projects: /^(projects?|personal\s*projects?|side\s*projects?|open\s*source|portfolio|key\s*projects?|notable\s*projects?|project\s*experience|academic\s*projects?|selected\s*projects?|featured\s*projects?|relevant\s*projects?)$/i,

  volunteering: /^(volunteer(?:ing)?|community\s*service|civic\s*engagement|community\s*involvement|social\s*work|extracurricular|activities|extra[\s-]curricular\s*activities?)$/i,

  languages: /^(languages?\s*(?:spoken)?|language\s*skills|spoken\s*languages?|linguistic\s*skills?|languages?\s*(?:&|and)\s*communication)$/i,
};

// Pre-calculate entries to avoid repeated allocation in loop
const SECTION_ENTRIES = Object.entries(SECTION_PATTERNS);

interface SectionBlocks {
  summary: string[];
  experience: string[];
  education: string[];
  skills: string[];
  certifications: string[];
  awards: string[];
  projects: string[];
  volunteering: string[];
  languages: string[];
  header: string[];
  unrecognized: string[];
}

/**
 * Parse extracted text into structured resume data.
 */
export function parseResumeText(text: string): ResumeData {
  // Normalize the text
  const normalizedText = normalizeText(text);
  const lines = normalizedText.split('\n').map(l => l.trim()).filter(Boolean);

  // Find section boundaries
  const sections = extractSections(lines);

  // Extract contact info from header (lines before first section)
  const contactInfo = extractContactInfo(sections.header.join('\n'));

  // Parse each section
  let summary = sections.summary.join(' ').trim();
  const experience = parseExperienceSection(sections.experience);
  const education = parseEducationSection(sections.education);
  const skills = parseSkillsSection(sections.skills);
  const certifications = parseCertificationsSection(sections.certifications);
  const awards = parseAwardsSection(sections.awards);
  const projects = parseProjectsSection(sections.projects);
  const volunteering = parseVolunteeringSection(sections.volunteering);
  const languages = parseLanguagesSection(sections.languages);

  // Append unrecognized content to summary to prevent data loss in local fallback
  if (sections.unrecognized.length > 0) {
    const unrecognizedText = sections.unrecognized.join('\n');
    summary += (summary ? '\n\n' : '') + '[Unrecognized Content]\n' + unrecognizedText;
  }

  return {
    contactInfo,
    summary,
    experience,
    education,
    skills,
    certifications,
    awards,
    projects,
    volunteering,
    languages,
    templateId: 'modern',
  };
}

/**
 * Normalize text: clean whitespace, normalize line endings.
 */
function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/ +/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extract sections by detecting heading lines.
 */
function extractSections(lines: string[]): SectionBlocks {
  const sections: SectionBlocks = {
    summary: [],
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    awards: [],
    projects: [],
    volunteering: [],
    languages: [],
    header: [],
    unrecognized: [],
  };

  let currentSection: keyof SectionBlocks = 'header';

  for (const line of lines) {
    const trimmed = line.trim();
    // Strip common decorators (colons, dashes, bullets) for pattern matching
    const cleanLine = trimmed.replace(/[:\-–—|•]/g, '').trim();

    // --- Pass 1: exact-line match against known section patterns (case-insensitive) ---
    let foundSection: keyof SectionBlocks | null = null;
    for (const [sectionName, pattern] of SECTION_ENTRIES) {
      if (pattern.test(cleanLine)) {
        foundSection = sectionName as keyof SectionBlocks;
        break;
      }
    }

    if (foundSection) {
      currentSection = foundSection as keyof SectionBlocks;
      continue; // don't add the heading itself to content
    }

    sections[currentSection].push(trimmed);
  }

  return sections;
}

/**
 * Extract contact information from header text.
 */
function extractContactInfo(text: string): ResumeData['contactInfo'] {
  // Email
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

  // Phone (international formats - supports Egyptian, US, European, etc.)
  // Require at least some formatting (spaces, dashes, dots, parens) or a + prefix
  // to avoid matching random digit strings like IDs or zip codes
  const phonePatterns = [
    // +XX XXX XXX XXXX or +XX-XXX-XXX-XXXX
    /\+\d{1,4}[-.\s]?\d{2,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4}/,
    // (XXX) XXX-XXXX or XXX-XXX-XXXX
    /\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/,
    // XXX XXX XXXX (with spaces)
    /\d{3}\s\d{3}\s\d{4}/,
    // 0XX XXX XXXX (local format)
    /0\d{2}[-.\s]\d{3,4}[-.\s]\d{3,4}/,
  ];
  let phoneMatch: RegExpMatchArray | null = null;
  for (const pattern of phonePatterns) {
    phoneMatch = text.match(pattern);
    if (phoneMatch) break;
  }
  // Fallback: if no formatted phone found, try a less strict pattern
  if (!phoneMatch) {
    phoneMatch = text.match(/(\+?\d{1,4}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);
  }

  // LinkedIn URL
  const linkedinMatch = text.match(/(?:linkedin\.com\/in\/|linkedin:\s*)([a-zA-Z0-9-]+)/i);

  // Location (City, State or City, Country pattern)
  const locationMatch = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?,\s*(?:[A-Z]{2}|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*))/);

  // Name: usually first substantial line that's not contact info
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let fullName = '';

  for (const line of lines.slice(0, 8)) {
    // Skip lines that look like contact info or have separators (multi-column artifacts)
    if (
      !line.includes('@') &&
      !line.match(/^\+?[0-9(]/) &&
      !line.toLowerCase().includes('resume') &&
      !line.toLowerCase().includes('cv') &&
      !line.toLowerCase().includes('linkedin') &&
      !line.toLowerCase().includes('http') &&
      !line.includes('|') &&
      !line.includes('•') &&
      !line.includes('·') &&
      line.length > 1 &&
      line.length < 60
    ) {
      // Check if it looks like a name (various scripts, 1-5 words)
      if (/^[A-Za-z\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF\u0900-\u097F\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\s.\-']+$/.test(line) && line.split(/\s+/).length <= 5) {
        fullName = line;
        break;
      }
    }
  }

  // Clean up phone number if it's all digits without formatting
  let phone = phoneMatch ? phoneMatch[0] : '';
  if (phone) {
    const digitsOnly = phone.replace(/[^\d+]/g, '');
    if (digitsOnly.length > 12 && !/[\s\-()]/.test(phone)) {
      // Likely concatenated digits from PDF extraction — add basic formatting
      if (digitsOnly.startsWith('+')) {
        phone = digitsOnly.slice(0, 3) + ' ' + digitsOnly.slice(3).replace(/(\d{3,4})(?=\d)/g, '$1 ');
      } else {
        phone = digitsOnly.replace(/(\d{3,4})(?=\d)/g, '$1 ');
      }
    }
  }

  return {
    fullName: fullName || '',
    email: emailMatch ? emailMatch[0] : '',
    phone,
    location: locationMatch ? locationMatch[0] : '',
    linkedin: linkedinMatch ? `https://linkedin.com/in/${linkedinMatch[1]}` : '',
  };
}

/**
 * Parse experience section into structured entries.
 */
const JOB_TITLE_KEYWORDS = /\b(architect|attorney|accountant|auditor|administrator|analyst|associate|assistant|advisor|agent|attendant|cashier|clerk|consultant|coordinator|counselor|crew|designer|developer|director|driver|engineer|executive|handler|intern|lecturer|lead|manager|nurse|officer|operator|president|principal|professor|programmer|representative|researcher|scientist|specialist|supervisor|technician|therapist|trainer|teller|vp|vice\s*president|cto|ceo|coo|cfo|head\s*of|team\s*leader|team\s*lead|project\s*manager|product\s*manager|account\s*manager|customer\s*service|customer\s*support|customer\s*care|call\s*center|help\s*desk|data\s*entry|business\s*development|quality\s*assurance|quality\s*analyst|quality\s*control|flight\s*attendant|cabin\s*crew|sales\s*associate|sales\s*representative|sales\s*executive|marketing\s*specialist|hr\s*specialist|human\s*resources|software\s*engineer|software\s*developer|full[\s-]stack|front[\s-]end|back[\s-]end|senior|junior|mid[\s-]level)\b/i;

const COMPANY_SUFFIX = /\b(Inc\.?|Ltd\.?|LLC|Corp\.?|Co\.?|Group|Holdings|International|Solutions|Services|Technologies|Consulting|Associates|Partners|Foundation|Institute|University|College|Hospital|Medical|Agency|Bureau|Department|Ministry|Airways|Airlines|Telecom|Bank|Insurance|Trading|Enterprises|Industries|Systems|Networks|Logistics|Staffing|Outsourcing)\b/i;

const DATE_LINE = /^\d{4}|^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i;

function parseExperienceSection(lines: string[]): Experience[] {
  if (lines.length === 0) return [];

  const experiences: Experience[] = [];
  const blocks = splitIntoBlocks(lines);

  for (const block of blocks.slice(0, 10)) {
    if (block.length === 0) continue;

    // Try to parse date range from the full block text
    const dateInfo = extractDateRange(block.join(' '));

    // Strip date-only lines from the header candidates so they don't get
    // mistaken for company or position names.
    const nonDateLines = block.filter(l => !DATE_LINE.test(l) && !/^\d{1,2}\/\d{4}/.test(l));

    const headerLines = nonDateLines.slice(0, 2);
    const descriptionLines = nonDateLines.slice(2);

    let company = headerLines[0] || 'Company';
    let position = headerLines[1] || '';

    // Swap only when the first line is a job title (unusual CV order: title then company).
    // Normal order is company first, job title second — don't swap that.
    if (
      position &&
      JOB_TITLE_KEYWORDS.test(company) &&
      !JOB_TITLE_KEYWORDS.test(position)
    ) {
      [company, position] = [position, company];
    }

    // Secondary check: if the position line has a company suffix (LLC, Airways…) swap
    if (
      position &&
      COMPANY_SUFFIX.test(position) &&
      !COMPANY_SUFFIX.test(company)
    ) {
      [company, position] = [position, company];
    }

    // If position is still empty, scan remaining block lines for a job title keyword
    if (!position) {
      for (const line of nonDateLines.slice(1)) {
        if (JOB_TITLE_KEYWORDS.test(line) && !COMPANY_SUFFIX.test(line)) {
          position = line;
          break;
        }
      }
    }

    // If we only have one header line, try to split by inline separators
    if (!position && company.includes(' at ')) {
      const parts = company.split(' at ');
      position = parts[0];
      company = parts[1];
    } else if (!position && company.includes(' - ')) {
      const parts = company.split(' - ');
      if (JOB_TITLE_KEYWORDS.test(parts[0])) {
        position = parts[0];
        company = parts[1];
      } else {
        company = parts[0];
        position = parts[1];
      }
    }

    // Strip any trailing date fragment that leaked into the company name
    company = company.replace(/\s*\d{4}\s*[-–—].*$/, '').trim();

    experiences.push({
      id: uuidv4(),
      company: company.slice(0, 100),
      position: position.slice(0, 100),
      startDate: dateInfo.startDate,
      endDate: dateInfo.endDate,
      current: dateInfo.current,
      description: descriptionLines.join(' ').slice(0, 1000),
      achievements: extractAchievements(descriptionLines),
    });
  }

  return experiences;
}

/**
 * Parse education section into structured entries.
 */
function parseEducationSection(lines: string[]): Education[] {
  if (lines.length === 0) return [];

  const education: Education[] = [];
  const blocks = splitIntoBlocks(lines);

  for (const block of blocks.slice(0, 5)) {
    if (block.length === 0) continue;

    const fullText = block.join(' ');
    const dateInfo = extractDateRange(fullText);

    // Try to extract degree
    const degreeMatch = fullText.match(/(Bachelor|Master|Ph\.?D\.?|Associate|Diploma|B\.?S\.?|M\.?S\.?|B\.?A\.?|M\.?A\.?|MBA)[^,\n]*/i);

    // First line is usually institution or degree
    const institution = block[0] || '';
    const degree = degreeMatch ? degreeMatch[0] : '';

    // Try to extract field of study
    const fieldMatch = fullText.match(/(?:in|of)\s+([A-Za-z\s]+?)(?:,|\n|$)/i);
    const field = fieldMatch ? fieldMatch[1].trim() : '';

    education.push({
      id: uuidv4(),
      institution: institution.slice(0, 150),
      degree: degree.slice(0, 100),
      field: field.slice(0, 100),
      startDate: dateInfo.startDate,
      endDate: dateInfo.endDate,
    });
  }

  return education;
}

/**
 * Parse skills section into array of skills.
 */
export function parseSkillsSection(lines: string[]): string[] {
  // Strip category label patterns like "Frontend:", "Backend:", "Languages:"
  // These are common in formatted resumes: "Frontend: HTML | CSS | React"
  const cleanedLines = lines.map(l => l.replace(/^[A-Za-z\s/&]+:\s*/, ''));
  const fullText = cleanedLines.join(' ');

  // Split by common delimiters
  const skills = fullText
    .split(/[,|•·\n;]/)
    .map(s => s.replace(/[:\-–—]/g, ' ').trim())
    .filter(s => {
      // Filter out junk
      return s.length > 1 &&
        s.length < 80 &&           // raised from 50 to 80
        !s.match(/^\d+$/) &&
        !s.match(/^(and|or|the|a|an)$/i);
    })
    .slice(0, 60);

  // Deduplicate (case-insensitive)
  const seen = new Set<string>();
  return skills.filter(skill => {
    const lower = skill.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });
}

/**
 * Parse certifications section into structured entries.
 */
function parseCertificationsSection(lines: string[]): Certification[] {
  if (lines.length === 0) return [];

  const certifications: Certification[] = [];

  for (const line of lines.slice(0, 10)) {
    if (line.trim().length < 3) continue;

    const dateMatch = line.match(/\b(20\d{2}|19\d{2})\b/);

    certifications.push({
      id: uuidv4(),
      name: line.replace(/\b(20\d{2}|19\d{2})\b/g, '').trim().slice(0, 150),
      issuer: '',
      date: dateMatch ? dateMatch[0] : '',
    });
  }

  return certifications;
}

/**
 * Parse awards section into structured entries.
 */
function parseAwardsSection(lines: string[]): any[] {
  if (lines.length === 0) return [];
  return lines.slice(0, 8).map(line => ({
    id: uuidv4(),
    title: line.trim().slice(0, 150),
    issuer: '',
    date: line.match(/\b(20\d{2}|19\d{2})\b/)?.[0] || '',
  }));
}

/**
 * Parse projects section into structured entries.
 */
function parseProjectsSection(lines: string[]): any[] {
  if (lines.length === 0) return [];
  const blocks = splitIntoBlocks(lines);
  return blocks.slice(0, 5).map(block => ({
    id: uuidv4(),
    name: block[0] || 'Untitled Project',
    description: block.slice(1).join(' ').slice(0, 500),
    role: '',
    startDate: '',
    endDate: '',
    technologies: [],
  }));
}

/**
 * Parse volunteering section into structured entries.
 */
function parseVolunteeringSection(lines: string[]): any[] {
  if (lines.length === 0) return [];
  const blocks = splitIntoBlocks(lines);
  return blocks.slice(0, 5).map(block => ({
    id: uuidv4(),
    role: block[1] || 'Volunteer',
    organization: block[0] || 'Organization',
    startDate: '',
    endDate: '',
    description: block.slice(2).join(' ').slice(0, 500),
  }));
}

/**
 * Parse languages section into structured entries.
 */
function parseLanguagesSection(lines: string[]): any[] {
  // Strip any leaked contact-hints or email/phone lines before parsing
  const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const PHONE_RE = /\+?\d[\d\s\-().]{6,}/;
  const HINTS_RE = /potential\s*(emails?|phones?)|contact\s*info\s*hints/i;
  const cleanLines = lines.filter(l => !EMAIL_RE.test(l) && !PHONE_RE.test(l) && !HINTS_RE.test(l));

  const fullText = cleanLines.join(' ');
  const languageParts = fullText.split(/[,;|•]/).map(s => s.trim()).filter(s => s.length > 2 && s.length < 60);
  
  return languageParts.slice(0, 10).map(part => {
    const proficiencyMatch = part.match(/\((native|fluent|professional|basic|elementary|limited|full|bilingual|working|professional\s*working)\)/i);
    const proficiency = proficiencyMatch ? proficiencyMatch[1].toLowerCase() : 'professional';
    
    // Clean name
    const name = part.replace(/\(.*\)/, '').trim();
    
    return {
      id: uuidv4(),
      name: name.charAt(0).toUpperCase() + name.slice(1),
      proficiency: proficiency.includes('native') ? 'native' : 
                   proficiency.includes('fluent') ? 'fluent' : 
                   proficiency.includes('basic') || proficiency.includes('elementary') ? 'basic' : 'professional'
    };
  });
}

/** Only treat an ALL-CAPS line as a block boundary if a date appears within the next 3 lines.
 *  This prevents company names written in all-caps from splitting an experience entry in half. */
function looksLikeBlockHeader(line: string, nextLines: string[]): boolean {
  if (!/^[A-Z][A-Z0-9 &,./()-]{2,}$/.test(line)) return false;
  if (line.split(/\s+/).length > 5) return false;
  const nearby = nextLines.slice(0, 3).join(' ');
  return /\b(19|20)\d{2}\b/.test(nearby) ||
    /(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)/i.test(nearby);
}

/**
 * Split lines into blocks separated by blank lines or certain patterns.
 */
function splitIntoBlocks(lines: string[]): string[][] {
  const blocks: string[][] = [];
  let currentBlock: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Start new block on empty line or line that looks like a new entry (starts with date or bullet)
    // Block-start triggers: blank line, date prefixes (short + full month names), standalone year,
    // bullet glyphs (including em-dash, arrows, numbered items), or an ALL-CAPS short header line
    const isBlockStart = line === '' ||
      /^(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}/i.test(line) ||
      /^\d{4}\s*[-–—]/.test(line) ||
      /^(?:•|►|▪|▸|→|–|—|\*)\s/.test(line) ||
      /^\d+[.)]\s/.test(line) ||
      looksLikeBlockHeader(line, lines.slice(i + 1));

    if (isBlockStart) {
      if (currentBlock.length > 0) {
        blocks.push(currentBlock);
        currentBlock = [];
      }
      if (line !== '') {
        currentBlock.push(line);
      }
    } else {
      currentBlock.push(line);
    }
  }

  if (currentBlock.length > 0) {
    blocks.push(currentBlock);
  }

  return blocks;
}

const MONTHS_PATTERN = 'Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?';

// Branch 1 (original): "Month Year – Month Year/Present" or "YYYY – Month Year/Present"
const RANGE_FULL = new RegExp(
  `((?:${MONTHS_PATTERN})\\s*\\d{4}|\\d{4})\\s*[-–—to]+\\s*((?:${MONTHS_PATTERN})\\s*\\d{4}|\\d{4}|Present|Current|Now)`,
  'i'
);

// Branch 2: MM/YYYY – MM/YYYY or MM/YYYY – Present
const RANGE_SLASH = /(\d{1,2}\/\d{4})\s*[-–—to]+\s*(\d{1,2}\/\d{4}|Present|Current|Now)/i;

// Branch 3: YYYY–YYYY with no spaces (em-dash or en-dash directly touching digits)
const RANGE_YEAR_COMPACT = /\b(\d{4})\s*[-–—]\s*(\d{4}|Present|Current|Now)\b/i;

// Branch 4: Single 4-digit year (used for graduation years in education)
const SINGLE_YEAR = /\b((?:19|20)\d{2})\b/;

/**
 * Extract date range from text.
 * // Exported for testing purposes
 */
export function extractDateRange(text: string): { startDate: string; endDate: string; current: boolean } {
  // Try each pattern branch in priority order
  for (const pattern of [RANGE_FULL, RANGE_SLASH, RANGE_YEAR_COMPACT]) {
    const match = text.match(pattern);
    if (match) {
      const endStr = match[2].toLowerCase();
      const isCurrent = ['present', 'current', 'now'].some(p => endStr.includes(p));
      return {
        startDate: match[1],
        endDate: isCurrent ? '' : match[2],
        current: isCurrent,
      };
    }
  }

  // Single year fallback — used for graduation year on education entries
  const single = text.match(SINGLE_YEAR);
  if (single) {
    return { startDate: '', endDate: single[1], current: false };
  }

  return { startDate: '', endDate: '', current: false };
}

/**
 * Extract achievement bullets from description lines.
 */
function extractAchievements(lines: string[]): string[] {
  return lines
    .filter(line => line.match(/^[•►▪\-*]\s*/) || line.match(/^\d+[.)]\s*/))
    .map(line => line.replace(/^[•►▪\-*\d.)\s]+/, '').trim())
    .filter(a => a.length > 10)
    .slice(0, 8);
}
