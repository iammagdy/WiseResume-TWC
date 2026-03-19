// Minimal ResumeData shape — mirrors src/types/resume.ts
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
  templateId: string;
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
  };

  const buckets: Record<string, string[]> = {
    summary: [], experience: [], education: [], skills: [], certifications: [], header: [],
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

  // Parse experience (simple — one entry per non-empty block)
  const expLines = buckets.experience;
  const experience = expLines.length > 0
    ? [{
        id: crypto.randomUUID(),
        company: expLines[0] || '',
        position: expLines[1] || '',
        startDate: '',
        endDate: '',
        current: false,
        description: expLines.slice(2).join(' ').slice(0, 500),
        achievements: [],
      }]
    : [];

  // Parse education
  const eduLines = buckets.education;
  const education = eduLines.length > 0
    ? [{
        id: crypto.randomUUID(),
        institution: eduLines[0] || '',
        degree: eduLines[1] || '',
        field: '',
        startDate: '',
        endDate: '',
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
      date: '',
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
    templateId: 'modern',
  };
}
