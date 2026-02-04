import { useState, useMemo } from 'react';
import { ResumeData } from '@/types/resume';
import { useSettingsStore } from '@/store/settingsStore';

export type NudgeTrigger = 
  | 'empty_summary'
  | 'short_summary'
  | 'long_summary'
  | 'no_experience'
  | 'empty_description'
  | 'no_metrics'
  | 'few_skills'
  | 'missing_job_skills'
  | 'no_education'
  | 'incomplete_edu';

export type NudgeAction = 'generate' | 'expand' | 'shorten' | 'improve' | 'add_metrics';

export interface NudgeState {
  section: 'summary' | 'experience' | 'skills' | 'education' | 'contact';
  trigger: NudgeTrigger;
  message: string;
  actionLabel: string;
  action: NudgeAction;
  priority: 'high' | 'medium' | 'low';
}

interface UseResumeNudgesOptions {
  resume: ResumeData | null;
  jobDescription?: string;
  hasMissingSkills?: boolean;
}

export function useResumeNudges({ resume, jobDescription, hasMissingSkills }: UseResumeNudgesOptions) {
  const { showAIEnhancementTips } = useSettingsStore();
  const [dismissedNudges, setDismissedNudges] = useState<Set<NudgeTrigger>>(new Set());

  const nudges = useMemo<NudgeState[]>(() => {
    if (!resume || !showAIEnhancementTips) return [];

    const active: NudgeState[] = [];

    // Summary nudges
    if (resume.summary.length === 0) {
      active.push({
        section: 'summary',
        trigger: 'empty_summary',
        message: 'Add a professional summary to make a strong first impression.',
        actionLabel: 'Generate Summary',
        action: 'generate',
        priority: 'high',
      });
    } else if (resume.summary.length > 0 && resume.summary.length < 50) {
      active.push({
        section: 'summary',
        trigger: 'short_summary',
        message: 'Your summary is quite short. Let AI expand it with relevant details.',
        actionLabel: 'Expand',
        action: 'expand',
        priority: 'high',
      });
    } else if (resume.summary.length > 500) {
      active.push({
        section: 'summary',
        trigger: 'long_summary',
        message: 'Your summary is a bit long. Consider making it more concise.',
        actionLabel: 'Shorten',
        action: 'shorten',
        priority: 'medium',
      });
    }

    // Experience nudges
    if (resume.experience.length === 0) {
      active.push({
        section: 'experience',
        trigger: 'no_experience',
        message: 'Add work experience to showcase your professional background.',
        actionLabel: 'Add Experience',
        action: 'generate',
        priority: 'high',
      });
    } else {
      // Check for empty descriptions
      const hasEmptyDescription = resume.experience.some(
        (exp) => exp.description.length < 20
      );
      if (hasEmptyDescription) {
        active.push({
          section: 'experience',
          trigger: 'empty_description',
          message: 'Some positions are missing descriptions. AI can help write them.',
          actionLabel: 'Improve',
          action: 'improve',
          priority: 'high',
        });
      }

      // Check for no metrics (simple heuristic: no numbers in descriptions)
      const hasNoMetrics = resume.experience.every(
        (exp) => !/\d+/.test(exp.description)
      );
      if (hasNoMetrics && !hasEmptyDescription) {
        active.push({
          section: 'experience',
          trigger: 'no_metrics',
          message: 'Add quantifiable achievements to stand out. AI can help add metrics.',
          actionLabel: 'Add Metrics',
          action: 'add_metrics',
          priority: 'medium',
        });
      }
    }

    // Skills nudges
    if (resume.skills.length < 3) {
      active.push({
        section: 'skills',
        trigger: 'few_skills',
        message: 'Add more skills to improve your match score.',
        actionLabel: 'Suggest Skills',
        action: 'generate',
        priority: 'high',
      });
    } else if (jobDescription && hasMissingSkills) {
      active.push({
        section: 'skills',
        trigger: 'missing_job_skills',
        message: 'You\'re missing key skills for this role. Check the suggestions below.',
        actionLabel: 'View Suggestions',
        action: 'generate',
        priority: 'high',
      });
    }

    // Education nudges
    if (resume.education.length === 0) {
      active.push({
        section: 'education',
        trigger: 'no_education',
        message: 'Add your education background to complete your resume.',
        actionLabel: 'Add Education',
        action: 'generate',
        priority: 'medium',
      });
    } else {
      const hasIncomplete = resume.education.some(
        (edu) => !edu.institution || !edu.degree
      );
      if (hasIncomplete) {
        active.push({
          section: 'education',
          trigger: 'incomplete_edu',
          message: 'Complete your education details for a stronger resume.',
          actionLabel: 'Complete',
          action: 'improve',
          priority: 'medium',
        });
      }
    }

    // Filter out dismissed nudges and sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return active
      .filter((n) => !dismissedNudges.has(n.trigger))
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [resume, jobDescription, hasMissingSkills, showAIEnhancementTips, dismissedNudges]);

  const dismissNudge = (trigger: NudgeTrigger) => {
    setDismissedNudges((prev) => new Set([...prev, trigger]));
  };

  const getNudgeForSection = (section: NudgeState['section']): NudgeState | undefined => {
    return nudges.find((n) => n.section === section);
  };

  const resetDismissed = () => {
    setDismissedNudges(new Set());
  };

  return {
    nudges,
    getNudgeForSection,
    dismissNudge,
    resetDismissed,
  };
}
