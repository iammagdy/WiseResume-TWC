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
  matchedKeywords: string[];
  missingKeywords: string[];
  score: number;
  issues: string[];
  formattingWarnings: string[];
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Common English stop words — filtered from keyword extraction
const STOP_WORDS = new Set([
  'the','a','an','and','or','of','in','to','for','with','on','at','by','as',
  'is','are','was','were','be','been','being','have','has','had','do','does',
  'did','will','would','could','should','may','might','shall','can','need',
  'must','that','this','these','those','it','its','i','me','my','we','our',
  'you','your','from','not','no','so','if','then','than','also','just','more',
  'very','about','up','out','all','into','over','after','any','only','other',
  'new','some','well','way','each','their','they','he','she','his','her',
]);

/** Extract all meaningful keywords from the full resume (all sections, not just skills) */
function extractAllResumeKeywords(resume: ResumeData): Set<string> {
  const allText = [
    resume.summary || '',
    resume.contactInfo?.fullName || '',
    ...(resume.experience || []).flatMap(e => [
      e.position || '',
      e.company || '',
      e.description || '',
      ...(e.achievements || []),
      ...(e.responsibilities || []),
    ]),
    ...(resume.education || []).flatMap(e => [
      e.degree || '',
      e.field || '',
      e.institution || '',
    ]),
    ...(resume.skills || []),
    ...(resume.certifications || []).map(c => c.name || ''),
    ...(resume.projects || []).flatMap(p => [p.name || '', p.description || '']),
    ...(resume.awards || []).map(a => a.title || ''),
    ...(resume.volunteering || []).flatMap(v => [v.role || '', v.organization || '']),
  ].join(' ');

  return new Set(
    allText
      .toLowerCase()
      .split(/[\s,.|•·;:()\[\]'"\/\\+\-]+/)
      .filter(w => w.length >= 3 && !STOP_WORDS.has(w))
  );
}

/** Extract unique keywords from a job description string */
function extractJDKeywords(jd: string): string[] {
  return [
    ...new Set(
      jd
        .toLowerCase()
        .split(/[\s,.|•·;:()\[\]'"\/\\+\-]+/)
        .filter((w: string) => w.length >= 3 && !STOP_WORDS.has(w))
    ),
  ];
}

export function simulateATSParsing(
  resume: ResumeData,
  jobDescription?: string,
  formattingSignals?: { isMultiColumn?: boolean; confidence?: number }
): ATSParsedResult {
  const sections: ATSParsedSection[] = [];
  const globalIssues: string[] = [];
  let totalWords = 0;

  // ── Formatting warnings ──
  const formattingWarnings: string[] = [];
  if (formattingSignals?.isMultiColumn) {
    formattingWarnings.push(
      'Two-column layout detected — some ATS systems read columns left-to-right across both columns, garbling your content. Consider a single-column layout when submitting to ATS portals.'
    );
  }
  if (formattingSignals?.confidence !== undefined && formattingSignals.confidence < 0.5) {
    formattingWarnings.push(
      'Low text extraction confidence — your resume may contain images, text boxes, or non-standard fonts that ATS systems cannot read reliably.'
    );
  }

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
  // Check for first-person pronouns used in sentence context (not just as part of a word/name)
  // Pattern 1: pronoun at start of sentence or after a period
  // Pattern 2: "I" directly followed by a verb (strong signal of narrative writing)
  if (
    /(?:^|\.\s+|\n)\s*(?:I|me|my|mine|myself)\b/i.test(summary) ||
    /\bI\s+(?:am|was|have|had|led|managed|built|developed|designed|created|worked|helped|grew|increased|reduced|achieved)\b/i.test(summary)
  ) {
    summaryIssues.push("Contains first-person pronouns (e.g., 'I', 'my') — rephrase in third person or remove the subject entirely");
  }

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

  // Keywords from all resume text (used for detectedKeywords regardless of JD)
  const allResumeKeywords = extractAllResumeKeywords(resume);
  const detectedKeywords = Array.from(allResumeKeywords);

  // Scoring and keyword matching
  let score = 0;
  let matchedKeywords: string[] = [];
  let missingKeywords: string[] = [];

  if (jobDescription && jobDescription.trim().length > 0) {
    // Job description provided: compute keyword match percentage
    const jdKws = extractJDKeywords(jobDescription);
    matchedKeywords = jdKws.filter(k => allResumeKeywords.has(k));
    missingKeywords = jdKws.filter(k => !allResumeKeywords.has(k)).slice(0, 20);
    score = jdKws.length > 0
      ? Math.min(100, Math.round((matchedKeywords.length / jdKws.length) * 100))
      : 0;
  } else {
    // No job description: compute structural completeness score
    const keyIds = ['contact', 'summary', 'experience', 'education', 'skills'];
    const detected = sections.filter(s => keyIds.includes(s.id) && s.status === 'detected').length;
    score = Math.round((detected / keyIds.length) * 100);
  }

  // Global issues
  if (totalWords < 200) globalIssues.push('Resume has fewer than 200 words — may appear incomplete to ATS');

  return {
    sections,
    totalWords,
    detectedKeywords,
    matchedKeywords,
    missingKeywords,
    score,
    issues: globalIssues,
    formattingWarnings,
  };
}
