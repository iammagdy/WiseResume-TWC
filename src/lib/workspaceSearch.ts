import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Briefcase,
  FileText,
  GitCompareArrows,
  Home,
  Lightbulb,
  Linkedin,
  MessageSquare,
  Mic,
  Palette,
  PenTool,
  Settings,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
  UserCheck,
  Wand2,
} from 'lucide-react';
import type { DatabaseResume } from '@/hooks/useResumes';
import { isTailoredResume } from '@/lib/resumeLineage';

export type WorkspaceSearchGroup = 'actions' | 'ai' | 'navigation' | 'resumes';

export type WorkspaceSearchItem = {
  id: string;
  label: string;
  description?: string;
  keywords: string[];
  path: string;
  icon: LucideIcon;
  group: Exclude<WorkspaceSearchGroup, 'resumes'>;
};

export type ResumeSearchResult = {
  id: string;
  label: string;
  description: string;
  path: string;
  group: 'resumes';
  tailored: boolean;
};

const WORKSPACE_ITEMS: WorkspaceSearchItem[] = [
  { id: 'editor', label: 'Open Editor', keywords: ['editor', 'resume', 'cv', 'edit'], path: '/editor', icon: FileText, group: 'actions' },
  { id: 'import', label: 'Import Resume', keywords: ['upload', 'import', 'pdf', 'docx'], path: '/upload', icon: Upload, group: 'actions' },
  { id: 'cover-letter', label: 'New Cover Letter', keywords: ['cover', 'letter', 'application'], path: '/cover-letter/new', icon: PenTool, group: 'actions' },
  { id: 'interview', label: 'Practice Interview', keywords: ['interview', 'mock', 'prep'], path: '/interview', icon: Mic, group: 'actions' },
  { id: 'ai-chat', label: 'Wise AI Chat', keywords: ['chat', 'assistant', 'ai', 'wise'], path: '/ai-studio/chat', icon: MessageSquare, group: 'ai' },
  { id: 'tailor', label: 'Smart Tailor', keywords: ['tailor', 'job', 'match', 'ats'], path: '/tailoring-hub', icon: Wand2, group: 'ai' },
  { id: 'ab-compare', label: 'A/B Compare', keywords: ['compare', 'versions', 'ab'], path: '/ai-studio/ab-compare', icon: GitCompareArrows, group: 'ai' },
  { id: 'tailoring-hub', label: 'Tailoring Hub', keywords: ['tailoring', 'hub', 'job match'], path: '/tailoring-hub', icon: Target, group: 'ai' },
  { id: 'enhance', label: 'AI Enhance', keywords: ['enhance', 'improve', 'rewrite'], path: '/ai-studio/enhance', icon: Sparkles, group: 'ai' },
  { id: 'humanizer', label: 'AI Detector / Humanize', keywords: ['humanize', 'detector', 'ai score'], path: '/ai-studio/humanizer', icon: Shield, group: 'ai' },
  { id: 'linkedin', label: 'LinkedIn Optimizer', keywords: ['linkedin', 'profile', 'headline'], path: '/ai-studio/linkedin', icon: Linkedin, group: 'ai' },
  { id: 'onepage', label: 'One-Page Wizard', keywords: ['one page', 'condense', 'fit'], path: '/ai-studio/onepage', icon: FileText, group: 'ai' },
  { id: 'recruiter', label: 'Recruiter Simulation', keywords: ['recruiter', 'review', 'simulation'], path: '/ai-studio/recruiter', icon: UserCheck, group: 'ai' },
  { id: 'career', label: 'Career Path Advisor', keywords: ['career', 'path', 'advisor'], path: '/ai-studio/career', icon: TrendingUp, group: 'ai' },
  { id: 'ideas', label: 'Content Ideas', keywords: ['ideas', 'content', 'writing'], path: '/ai-studio/ideas', icon: Lightbulb, group: 'ai' },
  { id: 'customize', label: 'Customize Design', keywords: ['design', 'template', 'customize'], path: '/ai-studio/customize', icon: Palette, group: 'ai' },
  { id: 'dashboard', label: 'Dashboard', keywords: ['home', 'workspace', 'dashboard'], path: '/dashboard', icon: Home, group: 'navigation' },
  { id: 'applications', label: 'Job Applications', keywords: ['applications', 'jobs', 'tracker'], path: '/applications', icon: Briefcase, group: 'navigation' },
  { id: 'templates', label: 'Templates', keywords: ['templates', 'designs', 'layouts'], path: '/templates', icon: Palette, group: 'navigation' },
  { id: 'guides', label: 'Career Guides', keywords: ['guides', 'help', 'learn'], path: '/guides', icon: BookOpen, group: 'navigation' },
  { id: 'settings', label: 'Settings', keywords: ['settings', 'account', 'profile'], path: '/settings', icon: Settings, group: 'navigation' },
];

const GROUP_LABELS: Record<WorkspaceSearchGroup, string> = {
  resumes: 'Your Resumes',
  actions: 'Quick Actions',
  ai: 'AI Tools',
  navigation: 'Navigation',
};

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

function matchesQuery(query: string, parts: string[]): boolean {
  const q = normalize(query);
  if (!q) return true;
  return parts.some((part) => normalize(part).includes(q));
}

function scoreQuery(query: string, parts: string[]): number {
  const q = normalize(query);
  if (!q) return 0;
  let best = -1;
  for (const part of parts) {
    const normalized = normalize(part);
    const idx = normalized.indexOf(q);
    if (idx === -1) continue;
    const score = idx === 0 ? 100 - part.length * 0.01 : 50 - idx * 0.1 - part.length * 0.01;
    best = Math.max(best, score);
  }
  return best;
}

function parseJsonList(value?: string): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => (typeof item === 'string' ? item : JSON.stringify(item))).filter(Boolean);
    }
  } catch {
    return value.split(/[,;|]/).map((part) => part.trim()).filter(Boolean);
  }
  return [];
}

export function getResumeSearchParts(resume: DatabaseResume): string[] {
  const parts = [
    resume.title,
    resume.target_job_title,
    resume.target_company,
    resume.summary,
    ...parseJsonList(resume.skills),
  ];
  return parts.filter(Boolean) as string[];
}

export function getResumeSearchDescription(resume: DatabaseResume, tailored: boolean): string {
  const target = [resume.target_job_title, resume.target_company].filter(Boolean).join(' @ ');
  if (target) return target;
  if (tailored) return 'Tailored resume';
  if (resume.summary) return resume.summary.slice(0, 96);
  return 'Resume';
}

export function searchWorkspaceItems(query: string): WorkspaceSearchItem[] {
  return WORKSPACE_ITEMS
    .map((item) => ({
      item,
      score: scoreQuery(query, [item.label, item.description ?? '', ...item.keywords]),
    }))
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}

export function searchResumes(
  resumes: DatabaseResume[],
  query: string,
  tailoredIds?: Set<string>,
): ResumeSearchResult[] {
  return resumes
    .map((resume) => {
      const parts = getResumeSearchParts(resume);
      const tailored = isTailoredResume(resume, tailoredIds);
      const score = scoreQuery(query, parts);
      return {
        resume,
        tailored,
        score,
      };
    })
    .filter(({ score }) => score >= 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (
        new Date(b.resume.$updatedAt || b.resume.$createdAt || 0).getTime() -
        new Date(a.resume.$updatedAt || a.resume.$createdAt || 0).getTime()
      );
    })
    .slice(0, 12)
    .map(({ resume, tailored }) => ({
      id: resume.$id,
      label: resume.title || 'Untitled resume',
      description: getResumeSearchDescription(resume, tailored),
      path: tailored ? `/tailoring-hub/result/${resume.$id}` : `/editor?id=${resume.$id}`,
      group: 'resumes' as const,
      tailored,
    }));
}

export function getWorkspaceGroupLabel(group: WorkspaceSearchGroup): string {
  return GROUP_LABELS[group];
}

export function itemMatchesQuery(query: string, parts: string[]): boolean {
  return matchesQuery(query, parts);
}
