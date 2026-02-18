import { useState, useMemo, useCallback } from 'react';
import { ResumeData } from '@/types/resume';
import { useSettingsStore } from '@/store/settingsStore';

export type NudgeTrigger = 
  | 'empty_summary'
  | 'short_summary'
  | 'long_summary'
  | 'no_experience'
  | 'empty_description'
  | 'no_metrics'
  | 'weak_verbs'
  | 'no_action_verbs'
  | 'few_skills'
  | 'missing_job_skills'
  | 'generic_skills'
  | 'no_education'
  | 'incomplete_edu'
  | 'missing_contact'
  | 'no_linkedin';

export type NudgeAction = 'generate' | 'expand' | 'shorten' | 'improve' | 'add_metrics';

export interface NudgeState {
  section: 'summary' | 'experience' | 'skills' | 'education' | 'contact';
  trigger: NudgeTrigger;
  message: string;
  actionLabel: string;
  action: NudgeAction;
  priority: 'high' | 'medium' | 'low';
  /** For per-entry nudges */
  entryId?: string;
}

interface UseResumeNudgesOptions {
  resume: ResumeData | null;
  jobDescription?: string;
  hasMissingSkills?: boolean;
}

const PASSIVE_STARTERS = [
  'responsible for', 'managed', 'helped', 'assisted',
  'was responsible', 'duties included', 'tasked with',
];

const STRONG_ACTION_VERBS = [
  'led', 'developed', 'implemented', 'increased', 'decreased', 'reduced',
  'designed', 'built', 'launched', 'created', 'achieved', 'delivered',
  'improved', 'optimized', 'automated', 'streamlined', 'negotiated',
  'spearheaded', 'orchestrated', 'drove', 'established', 'transformed',
  'pioneered', 'generated', 'secured', 'accelerated', 'mentored',
  'architected', 'scaled', 'executed',
];

const GENERIC_SKILLS = [
  'microsoft office', 'communication', 'teamwork', 'problem solving',
  'problem-solving', 'time management', 'leadership', 'organization',
  'organizational skills', 'detail oriented', 'detail-oriented',
  'hard working', 'hard-working', 'motivated', 'self-motivated',
  'fast learner', 'quick learner',
];

function hasPassiveVerbs(description: string): boolean {
  const lower = description.toLowerCase().trim();
  return PASSIVE_STARTERS.some((p) => lower.startsWith(p));
}

function hasActionVerbs(description: string): boolean {
  const lines = description.split(/[\n•\-;]/).filter(Boolean);
  return lines.some((line) => {
    const firstWord = line.trim().split(/\s/)[0]?.toLowerCase();
    return firstWord && STRONG_ACTION_VERBS.includes(firstWord);
  });
}

function hasMetrics(description: string): boolean {
  return /\d+/.test(description);
}

export function useResumeNudges({ resume, jobDescription, hasMissingSkills }: UseResumeNudgesOptions) {
  const { showAIEnhancementTips } = useSettingsStore();
  const [dismissedNudges, setDismissedNudges] = useState<Set<string>>(new Set());

  const nudges = useMemo<NudgeState[]>(() => {
    if (!resume || !showAIEnhancementTips) return [];

    const active: NudgeState[] = [];

    // Summary nudges
    if (resume.summary.length === 0) {
      active.push({
        section: 'summary', trigger: 'empty_summary',
        message: 'Add a professional summary to make a strong first impression.',
        actionLabel: 'Generate Summary', action: 'generate', priority: 'high',
      });
    } else if (resume.summary.length > 0 && resume.summary.length < 50) {
      active.push({
        section: 'summary', trigger: 'short_summary',
        message: 'Your summary is quite short. Let AI expand it.',
        actionLabel: 'Expand', action: 'expand', priority: 'high',
      });
    } else if (resume.summary.length > 500) {
      active.push({
        section: 'summary', trigger: 'long_summary',
        message: 'Your summary is a bit long. Consider making it concise.',
        actionLabel: 'Shorten', action: 'shorten', priority: 'medium',
      });
    }

    // Experience nudges (section-level)
    if (resume.experience.length === 0) {
      active.push({
        section: 'experience', trigger: 'no_experience',
        message: 'Add work experience to showcase your background.',
        actionLabel: 'Add Experience', action: 'generate', priority: 'high',
      });
    } else {
      const hasEmptyDescription = resume.experience.some((exp) => exp.description.length < 20);
      if (hasEmptyDescription) {
        active.push({
          section: 'experience', trigger: 'empty_description',
          message: 'Some positions are missing descriptions.',
          actionLabel: 'Improve', action: 'improve', priority: 'high',
        });
      }

      // Weak verbs (section-level)
      const hasWeakVerbs = resume.experience.some((exp) => hasPassiveVerbs(exp.description));
      if (hasWeakVerbs && !hasEmptyDescription) {
        active.push({
          section: 'experience', trigger: 'weak_verbs',
          message: 'AI can strengthen your bullet points',
          actionLabel: 'Fix', action: 'improve', priority: 'medium',
        });
      }

      // No action verbs at all
      const noActionVerbs = resume.experience.every((exp) => !hasActionVerbs(exp.description));
      if (noActionVerbs && !hasEmptyDescription && !hasWeakVerbs) {
        active.push({
          section: 'experience', trigger: 'no_action_verbs',
          message: 'Add impactful action verbs',
          actionLabel: 'Improve', action: 'improve', priority: 'medium',
        });
      }

      // No metrics (section-level, kept for backward compat)
      const hasNoMetrics = resume.experience.every((exp) => !hasMetrics(exp.description));
      if (hasNoMetrics && !hasEmptyDescription) {
        active.push({
          section: 'experience', trigger: 'no_metrics',
          message: 'AI can help add quantifiable metrics',
          actionLabel: 'Add Metrics', action: 'add_metrics', priority: 'medium',
        });
      }
    }

    // Skills nudges
    if (resume.skills.length < 3) {
      active.push({
        section: 'skills', trigger: 'few_skills',
        message: 'Add more skills to improve your match score.',
        actionLabel: 'Suggest Skills', action: 'generate', priority: 'high',
      });
    } else if (jobDescription && hasMissingSkills) {
      active.push({
        section: 'skills', trigger: 'missing_job_skills',
        message: 'You\'re missing key skills for this role.',
        actionLabel: 'View Suggestions', action: 'generate', priority: 'high',
      });
    } else {
      // Generic skills check
      const genericCount = resume.skills.filter((s) =>
        GENERIC_SKILLS.includes(s.toLowerCase())
      ).length;
      if (genericCount >= 3) {
        active.push({
          section: 'skills', trigger: 'generic_skills',
          message: 'AI can suggest role-specific skills',
          actionLabel: 'Suggest', action: 'generate', priority: 'medium',
        });
      }
    }

    // Education nudges
    if (resume.education.length === 0) {
      active.push({
        section: 'education', trigger: 'no_education',
        message: 'Add your education background.',
        actionLabel: 'Add Education', action: 'generate', priority: 'medium',
      });
    } else {
      const hasIncomplete = resume.education.some((edu) => !edu.institution || !edu.degree);
      if (hasIncomplete) {
        active.push({
          section: 'education', trigger: 'incomplete_edu',
          message: 'Complete your education details.',
          actionLabel: 'Complete', action: 'improve', priority: 'medium',
        });
      }
    }

    // Contact nudges
    const contact = resume.contactInfo;
    if (!contact.email || !contact.phone) {
      active.push({
        section: 'contact', trigger: 'missing_contact',
        message: 'Complete your contact info',
        actionLabel: 'Complete', action: 'improve', priority: 'high',
      });
    } else if (!contact.linkedin) {
      active.push({
        section: 'contact', trigger: 'no_linkedin',
        message: 'Add LinkedIn to boost visibility',
        actionLabel: 'Add', action: 'generate', priority: 'low',
      });
    }

    // Filter out dismissed nudges and sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return active
      .filter((n) => !dismissedNudges.has(n.trigger))
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [resume, jobDescription, hasMissingSkills, showAIEnhancementTips, dismissedNudges]);

  // Per-entry experience nudges
  const getNudgesForExperience = useCallback((expId: string): NudgeState[] => {
    if (!resume || !showAIEnhancementTips) return [];
    const exp = resume.experience.find((e) => e.id === expId);
    if (!exp || exp.description.length < 20) return [];

    const entryNudges: NudgeState[] = [];
    const noMetricsKey = `no_metrics_${expId}`;
    const weakVerbsKey = `weak_verbs_${expId}`;

    if (!hasMetrics(exp.description) && !dismissedNudges.has(noMetricsKey)) {
      entryNudges.push({
        section: 'experience', trigger: 'no_metrics', entryId: expId,
        message: 'AI can add metrics', actionLabel: 'Fix', action: 'add_metrics', priority: 'medium',
      });
    }

    if (hasPassiveVerbs(exp.description) && !dismissedNudges.has(weakVerbsKey)) {
      entryNudges.push({
        section: 'experience', trigger: 'weak_verbs', entryId: expId,
        message: 'Strengthen with action verbs', actionLabel: 'Fix', action: 'improve', priority: 'medium',
      });
    }

    return entryNudges;
  }, [resume, showAIEnhancementTips, dismissedNudges]);

  const dismissNudge = useCallback((trigger: NudgeTrigger | string) => {
    setDismissedNudges((prev) => new Set([...prev, trigger]));
  }, []);

  const getNudgeForSection = useCallback((section: NudgeState['section']): NudgeState | undefined => {
    return nudges.find((n) => n.section === section);
  }, [nudges]);

  const resetDismissed = useCallback(() => {
    setDismissedNudges(new Set());
  }, []);

  return {
    nudges,
    getNudgeForSection,
    getNudgesForExperience,
    dismissNudge,
    resetDismissed,
  };
}
