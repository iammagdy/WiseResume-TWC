import { Sparkles, Target, Wand2, Mic, Globe, BarChart3, PenTool } from 'lucide-react';
import { type FeatureSectionData } from '@/components/landing/FeatureSection';

export const features = [
  { icon: Sparkles, title: 'landing.featureTicker.resumeWriting', desc: 'landing.features.editor.desc', colorDark: 'text-rose-400', colorLight: 'text-rose-600', bgDark: 'bg-rose-500/10', bgLight: 'bg-rose-100' },
  { icon: Target, title: 'landing.featureTicker.atsScore', desc: 'landing.featureTicker.atsScoreDesc', colorDark: 'text-emerald-400', colorLight: 'text-emerald-600', bgDark: 'bg-emerald-500/10', bgLight: 'bg-emerald-100' },
  { icon: Wand2, title: 'landing.featureTicker.smartTailoring', desc: 'landing.features.tailoring.desc', colorDark: 'text-blue-400', colorLight: 'text-blue-600', bgDark: 'bg-blue-500/10', bgLight: 'bg-blue-100' },
  { icon: Mic, title: 'landing.featureTicker.interviewCoaching', desc: 'landing.features.interview.desc', colorDark: 'text-orange-400', colorLight: 'text-orange-600', bgDark: 'bg-orange-500/10', bgLight: 'bg-orange-100' },
  { icon: PenTool, title: 'landing.featureTicker.coverLetters', desc: 'landing.featureTicker.coverLettersDesc', colorDark: 'text-purple-400', colorLight: 'text-purple-600', bgDark: 'bg-purple-500/10', bgLight: 'bg-purple-100' },
  { icon: BarChart3, title: 'landing.featureTicker.applicationTracker', desc: 'landing.featureTicker.applicationTrackerDesc', colorDark: 'text-pink-400', colorLight: 'text-pink-600', bgDark: 'bg-pink-500/10', bgLight: 'bg-pink-100' },
];

export const featureSections: FeatureSectionData[] = [
  {
    id: 'editor',
    direction: 'ltr',
    badge: { icon: Sparkles, label: 'landing.features.editor.badge', color: '' },
    bigLabel: 'landing.features.editor.bigLabel',
    title: 'landing.features.editor.title',
    desc: 'landing.features.editor.desc',
    bullets: ['landing.features.editor.bullets.0', 'landing.features.editor.bullets.1', 'landing.features.editor.bullets.2'],
    demo: 'editor',
    bandColor: 'dark1',
  },
  {
    id: 'tailoring',
    direction: 'rtl',
    badge: { icon: Wand2, label: 'landing.features.tailoring.badge', color: '' },
    bigLabel: 'landing.features.tailoring.bigLabel',
    title: 'landing.features.tailoring.title',
    desc: 'landing.features.tailoring.desc',
    bullets: ['landing.features.tailoring.bullets.0', 'landing.features.tailoring.bullets.1', 'landing.features.tailoring.bullets.2'],
    demo: 'tailoring',
    bandColor: 'dark2',
  },
  {
    id: 'portfolio',
    direction: 'ltr',
    badge: { icon: Globe, label: 'landing.features.portfolio.badge', color: '' },
    bigLabel: 'landing.features.portfolio.bigLabel',
    title: 'landing.features.portfolio.title',
    desc: 'landing.features.portfolio.desc',
    bullets: ['landing.features.portfolio.bullets.0', 'landing.features.portfolio.bullets.1', 'landing.features.portfolio.bullets.2'],
    demo: 'portfolio',
    bandColor: 'dark3',
  },
  {
    id: 'interview',
    direction: 'rtl',
    badge: { icon: Mic, label: 'landing.features.interview.badge', color: '' },
    bigLabel: 'landing.features.interview.bigLabel',
    title: 'landing.features.interview.title',
    desc: 'landing.features.interview.desc',
    bullets: ['landing.features.interview.bullets.0', 'landing.features.interview.bullets.1', 'landing.features.interview.bullets.2'],
    demo: 'interview',
    bandColor: 'dark1',
  },
  {
    id: 'tracker',
    direction: 'ltr',
    badge: { icon: BarChart3, label: 'landing.features.tracker.badge', color: '' },
    bigLabel: 'landing.features.tracker.bigLabel',
    title: 'landing.features.tracker.title',
    desc: 'landing.features.tracker.desc',
    bullets: ['landing.features.tracker.bullets.0', 'landing.features.tracker.bullets.1', 'landing.features.tracker.bullets.2'],
    demo: 'tracker',
    bandColor: 'dark2',
  },
];

export const FEATURE_IDS = featureSections.map((s) => s.id);
export const FEATURE_NAV_LABELS = [
  'landing.featureNav.resumeBuilder',
  'landing.featureNav.aiTailoring',
  'landing.featureNav.portfolio',
  'landing.featureNav.interviewCoach',
  'landing.featureNav.jobTracker',
];
