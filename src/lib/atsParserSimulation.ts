import type { ResumeData } from '@/types/resume';

export interface ATSParsedSection {
  id: string;
  name: string;
  status: 'detected' | 'partial' | 'missing';
  lines: string[];
  wordCount: number;
  issues: string[];
}

export interface ATSParsedResult {
  sections: ATSParsedSection[];
  totalWords: number;
  detectedKeywords: string[];
  issues: string[];
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function extractKeywordsFromSkills(skills: string[]): string[] {
  return skills.map(s => s.trim()).filter(Boolean);
}

export function simulateATSParsing(resume: ResumeData): ATSParsedResult {
  const sections: ATSParsedSection[] = [];
  const globalIssues: string[] = [];
  let totalWords = 0;

  // ── Contact ──
  const ci = resume.contactInfo;
  const contactLines: string[] = [];
  if (ci?.fullName) contactLines.push(`Full Name: ${ci.fullName}`);
  if (ci?.email) contactLines.push(`Email: ${ci.email}`);
  if (ci?.phone) contactLines.push(`Phone: ${ci.phone}`);
  if (ci?.location) contactLines.push(`Location: ${ci.location}`);
  if (ci?.linkedin) contactLines.push(`LinkedIn: ${ci.linkedin}`);
  if ((ci as any)?.website) contactLines.push(`Website: ${(ci as any).website}`);

  const contactIssues: string[] = [];
  if (!ci?.email) contactIssues.push('Missing email address');
  if (!ci?.phone) contactIssues.push('Missing phone number');
  if (!ci?.fullName) contactIssues.push('Missing full name');

  sections.push({
    id: 'contact',
    name: 'CONTACT INFORMATION',
    status: contactLines.length >= 3 ? 'detected' : contactLines.length > 0 ? 'partial' : 'missing',
    lines: contactLines,
    wordCount: countWords(contactLines.join(' ')),
    issues: contactIssues,
  });

  // ── Summary ──
  const summary = resume.summary?.trim() || '';
  const summaryWords = countWords(summary);
  const summaryIssues: string[] = [];
  if (summaryWords < 20) summaryIssues.push('Summary too short — aim for 50+ words');
  if (/\b(I|me|my|mine|myself)\b/i.test(summary)) summaryIssues.push('Contains first-person pronouns');

  sections.push({
    id: 'summary',
    name: 'PROFESSIONAL SUMMARY',
    status: summaryWords >= 20 ? 'detected' : summaryWords > 0 ? 'partial' : 'missing',
    lines: summary ? [summary] : [],
    wordCount: summaryWords,
    issues: summaryIssues,
  });

  // ── Experience ──
  const expLines: string[] = [];
  const expIssues: string[] = [];
  if (resume.experience.length === 0) {
    expIssues.push('No work experience entries');
  }
  resume.experience.forEach((exp, i) => {
    const datePart = [exp.startDate, exp.endDate || (exp.current ? 'Present' : '')].filter(Boolean).join(' - ');
    expLines.push(`${exp.position || 'Untitled Role'} | ${exp.company || 'Unknown Company'} | ${datePart}`);
    if (!exp.startDate) expIssues.push(`Entry ${i + 1}: Missing start date`);
    const bullets = [...(exp.achievements || []), ...(exp.responsibilities || [])];
    bullets.forEach(b => expLines.push(`  - ${b}`));
    if (bullets.length === 0) expIssues.push(`Entry ${i + 1}: No bullet points`);
    if (i < resume.experience.length - 1) expLines.push('');
  });

  sections.push({
    id: 'experience',
    name: 'WORK EXPERIENCE',
    status: resume.experience.length > 0 ? (expIssues.length === 0 ? 'detected' : 'partial') : 'missing',
    lines: expLines,
    wordCount: countWords(expLines.join(' ')),
    issues: expIssues,
  });

  // ── Education ──
  const eduLines: string[] = [];
  const eduIssues: string[] = [];
  resume.education.forEach((edu, i) => {
    const datePart = [edu.startDate, edu.endDate].filter(Boolean).join(' - ');
    eduLines.push(`${edu.degree || 'Degree not specified'} | ${edu.institution || 'Institution not specified'} | ${datePart}`);
    if (!edu.degree) eduIssues.push(`Entry ${i + 1}: Missing degree`);
    if (!edu.institution) eduIssues.push(`Entry ${i + 1}: Missing institution`);
  });

  sections.push({
    id: 'education',
    name: 'EDUCATION',
    status: resume.education.length > 0 ? (eduIssues.length === 0 ? 'detected' : 'partial') : 'missing',
    lines: eduLines,
    wordCount: countWords(eduLines.join(' ')),
    issues: eduIssues,
  });

  // ── Skills ──
  const skillLines = resume.skills.length > 0 ? [resume.skills.join(', ')] : [];
  const skillIssues: string[] = [];
  if (resume.skills.length < 5) skillIssues.push('Fewer than 5 skills listed');

  sections.push({
    id: 'skills',
    name: 'SKILLS',
    status: resume.skills.length >= 5 ? 'detected' : resume.skills.length > 0 ? 'partial' : 'missing',
    lines: skillLines,
    wordCount: countWords(skillLines.join(' ')),
    issues: skillIssues,
  });

  // ── Optional sections ──
  const optionalSections: { id: string; name: string; items: any[] | undefined; format: (item: any) => string }[] = [
    { id: 'certifications', name: 'CERTIFICATIONS', items: resume.certifications, format: (c) => `${c.name || 'Untitled'} | ${c.organization || ''} | ${c.date || ''}` },
    { id: 'awards', name: 'AWARDS', items: resume.awards, format: (a) => `${a.title || 'Untitled'} | ${a.issuer || ''} | ${a.date || ''}` },
    { id: 'projects', name: 'PROJECTS', items: resume.projects, format: (p) => `${p.name || 'Untitled'}${p.description ? ' — ' + p.description : ''}` },
    { id: 'publications', name: 'PUBLICATIONS', items: resume.publications, format: (p) => `${p.title || 'Untitled'} | ${p.publisher || ''} | ${p.date || ''}` },
    { id: 'volunteering', name: 'VOLUNTEERING', items: resume.volunteering, format: (v) => `${v.role || 'Untitled'} | ${v.organization || ''}` },
    { id: 'languages', name: 'LANGUAGES', items: resume.languages, format: (l) => `${l.language || 'Untitled'} — ${l.proficiency || 'N/A'}` },
    { id: 'hobbies', name: 'HOBBIES & INTERESTS', items: resume.hobbies, format: (h) => typeof h === 'string' ? h : h.name || 'Untitled' },
  ];

  optionalSections.forEach(({ id, name, items, format }) => {
    if (!items || items.length === 0) return;
    const lines = items.map(format);
    sections.push({
      id,
      name,
      status: 'detected',
      lines,
      wordCount: countWords(lines.join(' ')),
      issues: [],
    });
  });

  // Totals
  totalWords = sections.reduce((sum, s) => sum + s.wordCount, 0);
  const detectedKeywords = extractKeywordsFromSkills(resume.skills);

  // Global issues
  if (totalWords < 200) globalIssues.push('Resume has fewer than 200 words — may appear incomplete to ATS');

  return { sections, totalWords, detectedKeywords, issues: globalIssues };
}
