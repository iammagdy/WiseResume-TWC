import { ResumeData, Experience, Education, Certification } from '@/types/resume';
import { v4 as uuidv4 } from 'uuid';

// Section heading patterns - expanded for international CVs
const SECTION_PATTERNS = {
  summary: /^(summary|objective|profile|about\s*me|professional\s*summary|career\s*objective)$/i,
  experience: /^(experience|work\s*experience|employment|work\s*history|professional\s*experience|projects?)$/i,
  education: /^(education|academic|qualifications|academic\s*background|schooling)$/i,
  skills: /^(skills|technical\s*skills|core\s*competencies|technologies|expertise|proficiencies|languages?|soft\s*skills|hard\s*skills)$/i,
  certifications: /^(certifications?|certificates?|licenses?|credentials?|professional\s*certifications?|training|courses?)$/i,
};

// Pre-calculate entries to avoid repeated allocation in loop
const SECTION_ENTRIES = Object.entries(SECTION_PATTERNS);

interface SectionBlocks {
  summary: string[];
  experience: string[];
  education: string[];
  skills: string[];
  certifications: string[];
  header: string[];
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
  const summary = sections.summary.join(' ').trim();
  const experience = parseExperienceSection(sections.experience);
  const education = parseEducationSection(sections.education);
  const skills = parseSkillsSection(sections.skills);
  const certifications = parseCertificationsSection(sections.certifications);

  return {
    contactInfo,
    summary,
    experience,
    education,
    skills,
    certifications,
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
    header: [],
  };

  let currentSection: keyof SectionBlocks = 'header';
  
  for (const line of lines) {
    // Check if this line is a section heading
    const cleanLine = line.replace(/[:\-–—|•]/g, '').trim();
    
    let foundSection: keyof SectionBlocks | null = null;
    for (const [sectionName, pattern] of SECTION_ENTRIES) {
      if (pattern.test(cleanLine)) {
        foundSection = sectionName as keyof SectionBlocks;
        break;
      }
    }

    if (foundSection) {
      currentSection = foundSection;
      // Don't add the heading itself to content
    } else {
      sections[currentSection].push(line);
    }
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
  const phoneMatch = text.match(/(\+?\d{1,4}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);
  
  // LinkedIn URL
  const linkedinMatch = text.match(/(?:linkedin\.com\/in\/|linkedin:\s*)([a-zA-Z0-9-]+)/i);
  
  // Location (City, State or City, Country pattern)
  const locationMatch = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?,\s*(?:[A-Z]{2}|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*))/);

  // Name: usually first substantial line that's not contact info
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let fullName = '';
  
  for (const line of lines.slice(0, 5)) {
    // Skip lines that look like contact info
    if (
      !line.includes('@') && 
      !line.match(/^\+?[0-9(]/) &&
      !line.toLowerCase().includes('resume') &&
      !line.toLowerCase().includes('cv') &&
      !line.toLowerCase().includes('linkedin') &&
      !line.toLowerCase().includes('http') &&
      line.length > 2 &&
      line.length < 50
    ) {
      // Check if it looks like a name (mostly letters and spaces)
      if (/^[A-Za-z\s.-]+$/.test(line) && line.split(/\s+/).length <= 5) {
        fullName = line;
        break;
      }
    }
  }

  return {
    fullName: fullName || '',
    email: emailMatch ? emailMatch[0] : '',
    phone: phoneMatch ? phoneMatch[0] : '',
    location: locationMatch ? locationMatch[0] : '',
    linkedin: linkedinMatch ? `https://linkedin.com/in/${linkedinMatch[1]}` : '',
  };
}

/**
 * Parse experience section into structured entries.
 */
function parseExperienceSection(lines: string[]): Experience[] {
  if (lines.length === 0) return [];

  const experiences: Experience[] = [];
  const blocks = splitIntoBlocks(lines);

  for (const block of blocks.slice(0, 10)) {
    if (block.length === 0) continue;

    // Try to parse date range
    const dateInfo = extractDateRange(block.join(' '));
    
    // First line(s) usually contain company/position
    const headerLines = block.slice(0, 2);
    const descriptionLines = block.slice(2);

    // Try to identify company vs position
    let company = headerLines[0] || 'Company';
    let position = headerLines[1] || '';

    // If position looks more like a company, swap them
    if (position && !company.match(/developer|engineer|manager|director|analyst|specialist|lead|senior|junior/i) &&
        position.match(/developer|engineer|manager|director|analyst|specialist|lead|senior|junior/i)) {
      [company, position] = [position, company];
    }

    // If we only have one header line, try to split by common separators
    if (!position && company.includes(' at ')) {
      const parts = company.split(' at ');
      position = parts[0];
      company = parts[1];
    } else if (!position && company.includes(' - ')) {
      const parts = company.split(' - ');
      // The part with job title keywords is likely the position
      if (parts[0].match(/developer|engineer|manager|director|analyst/i)) {
        position = parts[0];
        company = parts[1];
      } else {
        company = parts[0];
        position = parts[1];
      }
    }

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
function parseSkillsSection(lines: string[]): string[] {
  const fullText = lines.join(' ');
  
  // Split by common delimiters
  const skills = fullText
    .split(/[,|•·\n;]/)
    .map(s => s.replace(/[:\-–—]/g, ' ').trim())
    .filter(s => {
      // Filter out junk
      return s.length > 1 && 
             s.length < 50 && 
             !s.match(/^\d+$/) &&
             !s.match(/^(and|or|the|a|an)$/i);
    })
    .slice(0, 30);

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
 * Split lines into blocks separated by blank lines or certain patterns.
 */
function splitIntoBlocks(lines: string[]): string[][] {
  const blocks: string[][] = [];
  let currentBlock: string[] = [];

  for (const line of lines) {
    // Start new block on empty line or line that looks like a new entry (starts with date or bullet)
    if (line === '' || line.match(/^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4}|•|►|▪)/i)) {
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

/**
 * Extract date range from text.
 */
function extractDateRange(text: string): { startDate: string; endDate: string; current: boolean } {
  const months = 'Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?';
  
  // Pattern: "Month Year - Month Year" or "Month Year - Present"
  const rangePattern = new RegExp(
    `((?:${months})\\s*\\d{4}|\\d{4})\\s*[-–—to]+\\s*((?:${months})\\s*\\d{4}|\\d{4}|Present|Current|Now)`,
    'i'
  );
  
  const match = text.match(rangePattern);
  
  if (match) {
    const endStr = match[2].toLowerCase();
    const isCurrent = ['present', 'current', 'now'].some(p => endStr.includes(p));
    
    return {
      startDate: match[1],
      endDate: isCurrent ? '' : match[2],
      current: isCurrent,
    };
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
