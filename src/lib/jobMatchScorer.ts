import { ResumeData } from '@/types/resume';
import { Job } from '@/hooks/useJobs';

export interface JobMatchResult {
  overall: number;
  skillMatch: number;
  experienceMatch: number;
  keywords: {
    found: string[];
    missing: string[];
  };
}

function extractKeywords(text: string): string[] {
  if (!text) return [];
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall', 'must', 'need', 'we', 'you', 'they', 'he', 'she', 'it', 'i', 'my', 'your', 'our', 'their', 'this', 'that', 'these', 'those', 'from', 'as', 'not', 'no', 'so', 'if', 'then', 'than', 'also', 'just', 'more', 'very', 'about', 'up', 'out', 'all', 'its', 'into', 'over', 'such', 'after', 'any', 'only', 'other', 'new', 'some', 'time', 'well', 'way']);

  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))
    .filter((w, i, arr) => arr.indexOf(w) === i);
}

function estimateYearsFromResume(resume: ResumeData): number {
  if (!resume.experience || resume.experience.length === 0) return 0;
  
  let totalMonths = 0;
  for (const exp of resume.experience) {
    const start = new Date(exp.startDate);
    const end = exp.current ? new Date() : new Date(exp.endDate);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      totalMonths += Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
    }
  }
  return Math.round(totalMonths / 12);
}

export function scoreJobMatch(resume: ResumeData, job: Job): JobMatchResult {
  const jobText = `${job.title} ${job.description} ${job.requirements}`;
  const jobKeywords = extractKeywords(jobText);

  // Build resume keyword pool
  const resumeSkills = (resume.skills || []).map(s => (typeof s === 'string' ? s : (s as any)?.name || '').toLowerCase()).filter(Boolean);
  const resumeText = [
    resume.summary,
    ...resume.experience.map(e => `${e.position} ${e.description} ${(e.achievements || []).join(' ')}`),
    ...resume.education.map(e => `${e.degree} ${e.field}`),
  ].join(' ').toLowerCase();

  const resumeKeywords = new Set([...resumeSkills, ...extractKeywords(resumeText)]);

  // Skill match
  const found: string[] = [];
  const missing: string[] = [];

  for (const keyword of jobKeywords) {
    if (resumeKeywords.has(keyword) || resumeSkills.some(s => s.includes(keyword) || keyword.includes(s))) {
      found.push(keyword);
    } else {
      missing.push(keyword);
    }
  }

  const skillMatch = jobKeywords.length > 0
    ? Math.round((found.length / jobKeywords.length) * 100)
    : 50;

  // Experience match (simple heuristic)
  const years = estimateYearsFromResume(resume);
  const jobTitleLower = job.title.toLowerCase();
  let experienceMatch = 50;
  if (jobTitleLower.includes('senior') || jobTitleLower.includes('lead')) {
    experienceMatch = years >= 5 ? 90 : years >= 3 ? 60 : 30;
  } else if (jobTitleLower.includes('junior') || jobTitleLower.includes('entry')) {
    experienceMatch = years <= 3 ? 90 : 70;
  } else {
    experienceMatch = years >= 2 ? 80 : 50;
  }

  const overall = Math.round(skillMatch * 0.7 + experienceMatch * 0.3);

  return {
    overall: Math.min(100, overall),
    skillMatch: Math.min(100, skillMatch),
    experienceMatch: Math.min(100, experienceMatch),
    keywords: {
      found: found.slice(0, 15),
      missing: missing.slice(0, 10),
    },
  };
}
