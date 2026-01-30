import * as pdfjsLib from 'pdfjs-dist';
import { ResumeData } from '@/types/resume';
import { v4 as uuidv4 } from 'uuid';

// Configure PDF.js worker using Vite's import.meta.url for reliable module resolution
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export async function parseResumePDF(file: File): Promise<ResumeData> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }

  // Parse the extracted text into structured resume data
  return parseResumeText(fullText);
}

function parseResumeText(text: string): ResumeData {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  
  // Extract contact info
  const contactInfo = extractContactInfo(text);
  
  // Extract sections
  const summary = extractSummary(text);
  const experience = extractExperience(text);
  const education = extractEducation(text);
  const skills = extractSkills(text);
  const certifications = extractCertifications(text);

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

function extractContactInfo(text: string): ResumeData['contactInfo'] {
  // Email regex
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  
  // Phone regex (various formats)
  const phoneMatch = text.match(/(\+?1?[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/);
  
  // LinkedIn URL
  const linkedinMatch = text.match(/linkedin\.com\/in\/[a-zA-Z0-9-]+/i);
  
  // Try to extract name (usually first line or after common headers)
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let fullName = '';
  for (const line of lines.slice(0, 5)) {
    // Skip lines that look like headers or contact info
    if (
      !line.includes('@') && 
      !line.match(/^\+?[0-9]/) &&
      !line.toLowerCase().includes('resume') &&
      !line.toLowerCase().includes('cv') &&
      line.length < 50 &&
      line.length > 2
    ) {
      fullName = line;
      break;
    }
  }

  // Try to extract location (city, state pattern)
  const locationMatch = text.match(/([A-Z][a-z]+,?\s+[A-Z]{2})/);

  return {
    fullName: fullName || '',
    email: emailMatch ? emailMatch[0] : '',
    phone: phoneMatch ? phoneMatch[0] : '',
    location: locationMatch ? locationMatch[0] : '',
    linkedin: linkedinMatch ? `https://${linkedinMatch[0]}` : '',
  };
}

function extractSummary(text: string): string {
  const summaryPatterns = [
    /(?:summary|objective|profile|about me)[\s:]*\n?([\s\S]*?)(?=\n(?:experience|education|skills|work|employment|professional|technical)|\n\n)/i,
  ];

  for (const pattern of summaryPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const summary = match[1].trim();
      if (summary.length > 20 && summary.length < 1000) {
        return summary;
      }
    }
  }

  return '';
}

function extractExperience(text: string): ResumeData['experience'] {
  const experiences: ResumeData['experience'] = [];
  
  // Look for experience section
  const expPattern = /(?:experience|employment|work history|professional experience)[\s:]*\n([\s\S]*?)(?=\n(?:education|skills|certifications|projects|references)|\n\n\n)/i;
  const match = text.match(expPattern);
  
  if (match && match[1]) {
    const expText = match[1];
    
    // Try to split by job entries (look for date patterns or company names)
    const datePattern = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|(?:\d{1,2}\/\d{4})/gi;
    const parts = expText.split(/\n(?=[A-Z][^a-z]*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4}))/);
    
    for (const part of parts.slice(0, 5)) {
      if (part.trim().length < 20) continue;
      
      const lines = part.trim().split('\n').filter(l => l.trim());
      if (lines.length < 1) continue;

      experiences.push({
        id: uuidv4(),
        company: lines[0]?.slice(0, 50) || 'Company',
        position: lines[1]?.slice(0, 50) || 'Position',
        startDate: '',
        endDate: '',
        current: false,
        description: lines.slice(2).join(' ').slice(0, 500),
        achievements: [],
      });
    }
  }

  return experiences;
}

function extractEducation(text: string): ResumeData['education'] {
  const education: ResumeData['education'] = [];
  
  const eduPattern = /(?:education|academic|qualifications)[\s:]*\n([\s\S]*?)(?=\n(?:experience|skills|certifications|projects|work)|\n\n\n|$)/i;
  const match = text.match(eduPattern);
  
  if (match && match[1]) {
    const eduText = match[1];
    const lines = eduText.split('\n').filter(l => l.trim());
    
    // Simple parsing: assume each school is on its own line
    for (let i = 0; i < lines.length && education.length < 3; i++) {
      const line = lines[i].trim();
      if (line.length < 5) continue;
      
      // Look for degree keywords
      const hasDegree = /bachelor|master|phd|associate|diploma|degree|b\.?s\.?|m\.?s\.?|b\.?a\.?|m\.?a\.?|mba/i.test(line);
      
      if (hasDegree || i === 0) {
        education.push({
          id: uuidv4(),
          institution: line.slice(0, 100),
          degree: '',
          field: '',
          startDate: '',
          endDate: '',
        });
      }
    }
  }

  return education;
}

function extractSkills(text: string): string[] {
  const skillsPattern = /(?:skills|technical skills|competencies|expertise)[\s:]*\n([\s\S]*?)(?=\n(?:experience|education|certifications|projects|work|employment)|\n\n\n|$)/i;
  const match = text.match(skillsPattern);
  
  if (match && match[1]) {
    const skillsText = match[1];
    
    // Try to split by common delimiters
    const skills = skillsText
      .split(/[,|•·\n]/)
      .map(s => s.trim())
      .filter(s => s.length > 1 && s.length < 50 && !s.includes(':'))
      .slice(0, 20);
    
    return skills;
  }

  return [];
}

function extractCertifications(text: string): ResumeData['certifications'] {
  const certs: ResumeData['certifications'] = [];
  
  const certPattern = /(?:certifications?|licenses?|credentials?)[\s:]*\n([\s\S]*?)(?=\n(?:experience|education|skills|projects|work)|\n\n\n|$)/i;
  const match = text.match(certPattern);
  
  if (match && match[1]) {
    const certText = match[1];
    const lines = certText.split('\n').filter(l => l.trim());
    
    for (const line of lines.slice(0, 5)) {
      if (line.trim().length < 5) continue;
      
      certs.push({
        id: uuidv4(),
        name: line.trim().slice(0, 100),
        issuer: '',
        date: '',
      });
    }
  }

  return certs;
}
