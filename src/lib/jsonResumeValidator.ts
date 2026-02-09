/**
 * JSON Resume Validator
 * 
 * Validates and cleans imported JSON resume data.
 * Regenerates all IDs to prevent React key conflicts.
 */

import type { ResumeData, Experience, Education, Certification } from '@/types/resume';

/**
 * Regenerate all IDs in resume data to prevent React key conflicts.
 * Uses crypto.randomUUID() for unique identifiers.
 */
export function regenerateIds(data: ResumeData): ResumeData {
  return {
    ...data,
    id: undefined, // Clear old ID so a new one is assigned on save
    experience: data.experience.map(exp => ({
      ...exp,
      id: crypto.randomUUID(),
    })),
    education: data.education.map(edu => ({
      ...edu,
      id: crypto.randomUUID(),
    })),
    certifications: data.certifications.map(cert => ({
      ...cert,
      id: crypto.randomUUID(),
    })),
  };
}

/**
 * Validate and clean experience entry
 */
function validateExperience(exp: Partial<Experience>): Experience {
  return {
    id: exp.id || crypto.randomUUID(),
    company: typeof exp.company === 'string' ? exp.company : '',
    position: typeof exp.position === 'string' ? exp.position : '',
    startDate: typeof exp.startDate === 'string' ? exp.startDate : '',
    endDate: typeof exp.endDate === 'string' ? exp.endDate : '',
    current: typeof exp.current === 'boolean' ? exp.current : false,
    description: typeof exp.description === 'string' ? exp.description : '',
    achievements: Array.isArray(exp.achievements) 
      ? exp.achievements.filter(a => typeof a === 'string')
      : [],
    responsibilities: Array.isArray(exp.responsibilities)
      ? exp.responsibilities.filter(r => typeof r === 'string')
      : undefined,
    isProject: typeof exp.isProject === 'boolean' ? exp.isProject : undefined,
  };
}

/**
 * Validate and clean education entry
 */
function validateEducation(edu: Partial<Education>): Education {
  return {
    id: edu.id || crypto.randomUUID(),
    institution: typeof edu.institution === 'string' ? edu.institution : '',
    degree: typeof edu.degree === 'string' ? edu.degree : '',
    field: typeof edu.field === 'string' ? edu.field : '',
    startDate: typeof edu.startDate === 'string' ? edu.startDate : '',
    endDate: typeof edu.endDate === 'string' ? edu.endDate : '',
    gpa: typeof edu.gpa === 'string' ? edu.gpa : undefined,
  };
}

/**
 * Validate and clean certification entry
 */
function validateCertification(cert: Partial<Certification>): Certification {
  return {
    id: cert.id || crypto.randomUUID(),
    name: typeof cert.name === 'string' ? cert.name : '',
    issuer: typeof cert.issuer === 'string' ? cert.issuer : '',
    date: typeof cert.date === 'string' ? cert.date : '',
    expiryDate: typeof cert.expiryDate === 'string' ? cert.expiryDate : undefined,
    credentialId: typeof cert.credentialId === 'string' ? cert.credentialId : undefined,
  };
}

/**
 * Validate and clean imported JSON resume data.
 * Ensures all required fields exist with proper types.
 */
export function validateAndCleanResumeData(data: unknown): ResumeData {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid JSON: expected an object');
  }

  const obj = data as Record<string, unknown>;

  // Validate contact info
  const contactInfo = obj.contactInfo && typeof obj.contactInfo === 'object'
    ? obj.contactInfo as Record<string, unknown>
    : {};

  // Validate arrays
  const experience = Array.isArray(obj.experience) 
    ? obj.experience.map(exp => validateExperience(exp as Partial<Experience>))
    : [];

  const education = Array.isArray(obj.education)
    ? obj.education.map(edu => validateEducation(edu as Partial<Education>))
    : [];

  const certifications = Array.isArray(obj.certifications)
    ? obj.certifications.map(cert => validateCertification(cert as Partial<Certification>))
    : [];

  const skills = Array.isArray(obj.skills)
    ? obj.skills.filter(s => typeof s === 'string')
    : [];

  const cleaned: ResumeData = {
    contactInfo: {
      fullName: typeof contactInfo.fullName === 'string' ? contactInfo.fullName : '',
      email: typeof contactInfo.email === 'string' ? contactInfo.email : '',
      phone: typeof contactInfo.phone === 'string' ? contactInfo.phone : '',
      location: typeof contactInfo.location === 'string' ? contactInfo.location : '',
      linkedin: typeof contactInfo.linkedin === 'string' ? contactInfo.linkedin : undefined,
      portfolio: typeof contactInfo.portfolio === 'string' ? contactInfo.portfolio : undefined,
      photoUrl: typeof contactInfo.photoUrl === 'string' ? contactInfo.photoUrl : undefined,
    },
    summary: typeof obj.summary === 'string' ? obj.summary : '',
    experience,
    education,
    skills,
    certifications,
    templateId: typeof obj.templateId === 'string' ? obj.templateId : 'modern',
  };

  return cleaned;
}

/**
 * Parse HTML content and extract text for AI processing.
 * Uses DOMParser to extract readable text content.
 */
export function extractTextFromHTML(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Remove script and style elements
  const scripts = doc.querySelectorAll('script, style, noscript');
  scripts.forEach(el => el.remove());
  
  // Get text content with some structure preservation
  const body = doc.body;
  if (!body) return '';
  
  // Replace block elements with line breaks for structure
  const blockElements = body.querySelectorAll('p, div, li, h1, h2, h3, h4, h5, h6, br, tr');
  blockElements.forEach(el => {
    if (el.textContent) {
      el.insertAdjacentText('afterend', '\n');
    }
  });
  
  // Get text and clean up
  const text = body.textContent || '';
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
}
