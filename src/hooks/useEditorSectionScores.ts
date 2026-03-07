import { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import {
  calcContactScore,
  calcSummaryScore,
  calcExperienceScore,
  calcEducationScore,
  calcSkillsScore,
  calcOverallScore,
} from '@/lib/resumeCompletionRules';
import type { ResumeData } from '@/types/resume';
import type { ResumeHealthScore } from '@/hooks/useResumeScore';

interface SectionScores {
  contact: number;
  summary: number;
  experience: number;
  education: number;
  skills: number;
}

interface EditorSectionScoresResult {
  sectionScores: SectionScores;
  overallScore: number;
  localHealthScore: ResumeHealthScore | null;
  sectionStatus: Record<string, boolean>;
  justCompletedStep: string | null;
}

/**
 * Computes per-section scores, overall score, local ATS health snapshot,
 * section completion status, and fires celebration toasts/confetti when a
 * section reaches 100%.
 *
 * All five granular memos are scoped to their own resume slice so editing
 * Summary does NOT recompute contactScore/experienceScore/etc.
 */
export function useEditorSectionScores(currentResume: ResumeData | null): EditorSectionScoresResult {
  // Granular section scores — each memo only re-runs when its own slice changes
  const contactScore = useMemo(
    () => (currentResume ? calcContactScore(currentResume.contactInfo) : 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentResume?.contactInfo],
  );
  const summaryScore = useMemo(
    () => (currentResume ? calcSummaryScore(currentResume.summary) : 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentResume?.summary],
  );
  const experienceScore = useMemo(
    () => (currentResume ? calcExperienceScore(currentResume.experience) : 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentResume?.experience],
  );
  const educationScore = useMemo(
    () => (currentResume ? calcEducationScore(currentResume.education) : 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentResume?.education],
  );
  const skillsScore = useMemo(
    () => (currentResume ? calcSkillsScore(currentResume.skills) : 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentResume?.skills],
  );

  const sectionScores = useMemo<SectionScores>(
    () => ({
      contact: contactScore,
      summary: summaryScore,
      experience: experienceScore,
      education: educationScore,
      skills: skillsScore,
    }),
    [contactScore, summaryScore, experienceScore, educationScore, skillsScore],
  );

  // Overall score for ATS badge (local, no API call)
  const overallScore = useMemo(
    () => (currentResume ? calcOverallScore(currentResume) : 0),
    [currentResume],
  );

  // Score improvement toast
  const prevScoreRef = useRef(overallScore);
  useEffect(() => {
    const prev = prevScoreRef.current;
    prevScoreRef.current = overallScore;
    if (overallScore - prev >= 5 && prev > 0) {
      toast.success(`Score improved to ${overallScore}%!`, { duration: 2000 });
    }
  }, [overallScore]);

  // Local health score object for the ATS breakdown widget
  const localHealthScore = useMemo((): ResumeHealthScore | null => {
    if (!currentResume) return null;
    return {
      overallScore,
      categories: {
        keywordOptimization: sectionScores.skills,
        contentQuality: sectionScores.experience,
        sectionStructure: Math.round(
          (sectionScores.contact + sectionScores.education + sectionScores.skills + sectionScores.experience) / 4,
        ),
        parsability: sectionScores.education,
        contactCompleteness: sectionScores.contact,
        lengthDensity: Math.round((sectionScores.experience + sectionScores.education) / 2),
        templateFriendliness: 60,
      },
      topStrength: '',
      topImprovement: overallScore < 70 ? 'Fill in more sections to improve your score' : '',
      scoredAt: new Date().toISOString(),
    };
  }, [overallScore, sectionScores, currentResume]);

  // Section completion status (includes optional sections)
  const sectionStatus = useMemo(() => {
    const status: Record<string, boolean> = {
      contact: sectionScores.contact >= 100,
      summary: sectionScores.summary >= 100,
      experience: sectionScores.experience >= 100,
      education: sectionScores.education >= 100,
      skills: sectionScores.skills >= 100,
    };
    if (currentResume) {
      const optionalIds = [
        'awards', 'projects', 'certifications', 'publications',
        'volunteering', 'languages', 'hobbies', 'references',
      ];
      for (const id of optionalIds) {
        const data = currentResume[id as keyof typeof currentResume];
        if (Array.isArray(data) && data.length > 0) {
          status[id] = true;
        }
      }
    }
    return status;
  }, [sectionScores, currentResume]);

  // Section completion celebrations
  const prevCompletedRef = useRef<Record<string, boolean>>({});
  const [justCompletedStep, setJustCompletedStep] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confettiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const CELEBRATION_MESSAGES: Record<string, string> = {
    contact: 'Excellent! Contact section complete 🎉',
    summary: 'Summary nailed! 🎉',
    experience: 'Work experience locked in! 🎉',
    education: 'Education section complete! 🎉',
    skills: 'Skills section complete! Your resume is looking great! 🎉',
  };

  const NEXT_STEP_MESSAGES: Record<string, string> = {
    contact: 'Next: Write your professional summary →',
    summary: 'Next: Add your work experience →',
    experience: 'Next: Add your education details →',
    education: 'Next: List your key skills →',
  };

  useEffect(() => {
    if (!currentResume) return;
    const prev = prevCompletedRef.current;
    const sectionIds = ['contact', 'summary', 'experience', 'education', 'skills'] as const;

    for (const id of sectionIds) {
      const nowComplete = sectionScores[id] >= 100;
      if (nowComplete && prev[id] === false) {
        toast.success(CELEBRATION_MESSAGES[id], { duration: 3000 });

        setJustCompletedStep(id);
        confettiTimeoutRef.current = setTimeout(() => setJustCompletedStep(null), 1500);

        const nextMsg = NEXT_STEP_MESSAGES[id];
        if (nextMsg) {
          toastTimeoutRef.current = setTimeout(() => {
            toast(nextMsg, { duration: 4000, icon: '→' });
          }, 2000);
        }
      }
      prev[id] = nowComplete;
    }
  }, [sectionScores, currentResume]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      if (confettiTimeoutRef.current) clearTimeout(confettiTimeoutRef.current);
    };
  }, []);

  return { sectionScores, overallScore, localHealthScore, sectionStatus, justCompletedStep };
}
