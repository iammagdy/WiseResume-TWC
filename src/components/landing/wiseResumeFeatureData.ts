import { Sparkles, Target, Wand2, Mic, Globe, BarChart3, PenTool } from 'lucide-react';
import { type FeatureSectionData } from '@/components/landing/FeatureSection';

export const features = [
  { icon: Sparkles, title: 'AI Resume Writing', desc: 'AI rewrites vague bullets into quantified achievements that recruiters remember.', colorDark: 'text-rose-400', colorLight: 'text-rose-600', bgDark: 'bg-rose-500/10', bgLight: 'bg-rose-100' },
  { icon: Target, title: 'ATS Score Analysis', desc: 'Real-time ATS match percentage against any job posting — fix gaps instantly.', colorDark: 'text-emerald-400', colorLight: 'text-emerald-600', bgDark: 'bg-emerald-500/10', bgLight: 'bg-emerald-100' },
  { icon: Wand2, title: 'Smart Tailoring', desc: 'Paste a job description and AI rewrites your resume to match in 30 seconds.', colorDark: 'text-blue-400', colorLight: 'text-blue-600', bgDark: 'bg-blue-500/10', bgLight: 'bg-blue-100' },
  { icon: Mic, title: 'Interview Coaching', desc: 'Real voice interview practice with AI that listens, responds, and scores you live.', colorDark: 'text-orange-400', colorLight: 'text-orange-600', bgDark: 'bg-orange-500/10', bgLight: 'bg-orange-100' },
  { icon: PenTool, title: 'Cover Letters', desc: 'Generate tailored cover letters that match your resume and the job requirements.', colorDark: 'text-purple-400', colorLight: 'text-purple-600', bgDark: 'bg-purple-500/10', bgLight: 'bg-purple-100' },
  { icon: BarChart3, title: 'Application Tracker', desc: 'Track all your job applications in one place with status updates and analytics.', colorDark: 'text-pink-400', colorLight: 'text-pink-600', bgDark: 'bg-pink-500/10', bgLight: 'bg-pink-100' },
];

export const featureSections: FeatureSectionData[] = [
  {
    id: 'editor',
    direction: 'ltr',
    badge: { icon: Sparkles, label: 'AI Resume Editor', color: '' },
    categoryLabel: '01 — Resume Builder',
    bigLabel: 'Resume',
    title: 'AI-Powered Resume Writing',
    desc: 'Watch AI turn weak bullets into quantified achievements — with a live ATS score that updates as you write.',
    bullets: [
      'AI rewrites vague bullets into measurable, recruiter-ready results',
      'Live ATS score that updates with every edit',
      'One-click enhancement for any section of your resume',
    ],
    demo: 'editor',
    bandColor: 'dark1',
  },
  {
    id: 'tailoring',
    direction: 'rtl',
    badge: { icon: Wand2, label: 'Smart Tailoring', color: '' },
    categoryLabel: '02 — AI Tailoring',
    bigLabel: 'Tailoring',
    title: 'Precision Resume Tailoring',
    desc: 'Paste a job description and AI rewrites your resume to match in 30 seconds. See the before and after instantly.',
    bullets: [
      'Automatically matches keywords from any job description',
      'Before/after comparison shows exactly what changed',
      'Raises your ATS match score with precision',
    ],
    demo: 'tailoring',
    bandColor: 'dark2',
  },
  {
    id: 'portfolio',
    direction: 'ltr',
    badge: { icon: Globe, label: 'Live Portfolio', color: '' },
    categoryLabel: '03 — Portfolio',
    bigLabel: 'Portfolio',
    title: 'Public Portfolio Website',
    desc: 'Turn your resume into a beautiful personal site with themes, projects, and a shareable link — zero design skills needed.',
    bullets: [
      'Auto-synced from your resume — always up to date',
      'Shareable link with a custom slug',
      'Themed layouts that update with one click',
    ],
    demo: 'portfolio',
    bandColor: 'dark3',
  },
  {
    id: 'interview',
    direction: 'rtl',
    badge: { icon: Mic, label: 'Interview Coach', color: '' },
    categoryLabel: '04 — Interview Coach',
    bigLabel: 'Interview',
    title: 'AI Interview Practice',
    desc: 'Get scored on real interview questions with AI feedback on every answer. Practice any role, any industry.',
    bullets: [
      'Real-time voice recognition — just speak naturally',
      'AI scores each answer and gives specific tips',
      'Practice any industry, role, or question type',
    ],
    demo: 'interview',
    bandColor: 'dark1',
  },
  {
    id: 'tracker',
    direction: 'ltr',
    badge: { icon: BarChart3, label: 'Application Tracker', color: '' },
    categoryLabel: '05 — Job Tracker',
    bigLabel: 'Tracker',
    title: 'Kanban Job Tracker',
    desc: 'Visualize every application at a glance. Drag cards across your pipeline and never lose track of an opportunity.',
    bullets: [
      'Kanban board with drag-and-drop pipeline stages',
      'Status history so you always know where things stand',
      'Analytics show your application funnel at a glance',
    ],
    demo: 'tracker',
    bandColor: 'dark2',
  },
];

export const FEATURE_IDS = featureSections.map((s) => s.id);
export const FEATURE_NAV_LABELS = ['01  Resume Builder', '02  AI Tailoring', '03  Portfolio', '04  Interview Coach', '05  Job Tracker'];
