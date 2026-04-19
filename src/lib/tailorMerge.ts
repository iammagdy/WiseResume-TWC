import { ResumeData, SuperTailorResult, TailorSectionId } from '@/types/resume';

/**
 * Build a merged resume snapshot by overlaying the AI-tailored result onto the
 * original resume, respecting the user's enabled-section toggles and per-bullet
 * rejections. Used by both the "Apply Changes" flow (which persists a new
 * resume) and the "Preview" flow (which renders ephemerally without saving).
 */
export function buildMergedResume(
  currentResume: ResumeData,
  tailorResult: SuperTailorResult,
  enabledSections: TailorSectionId[],
  rejectedBullets: Set<string> = new Set(),
): ResumeData {
  const mergedResume: ResumeData = { ...currentResume };

  if (enabledSections.includes('summary')) {
    mergedResume.summary = tailorResult.summary;
  }
  if (enabledSections.includes('skills')) {
    mergedResume.skills = tailorResult.skills;
  }
  if (enabledSections.includes('experience')) {
    mergedResume.experience = currentResume.experience.map(orig => {
      const tailored = tailorResult.experience.find(e => e.id === orig.id);
      if (!tailored) return orig;
      const merged = { ...orig, ...tailored };
      if (tailorResult.bulletTransformations && orig.achievements) {
        const mergedAchievements = [...(tailored.achievements ?? orig.achievements)];
        tailorResult.bulletTransformations
          .filter(bt => bt.experienceId === orig.id && rejectedBullets.has(`${bt.experienceId}-${bt.bulletIndex}`))
          .forEach(bt => {
            mergedAchievements[bt.bulletIndex] = bt.originalBullet;
          });
        merged.achievements = mergedAchievements;
      }
      return merged;
    });
  }
  if (enabledSections.includes('education')) {
    mergedResume.education = currentResume.education.map(orig => {
      const tailored = tailorResult.education.find(e => e.id === orig.id);
      return tailored ? { ...orig, ...tailored } : orig;
    });
  }
  if (enabledSections.includes('projects') && tailorResult.projects) {
    mergedResume.projects = tailorResult.projects;
  }
  if (enabledSections.includes('certifications') && tailorResult.certifications) {
    mergedResume.certifications = tailorResult.certifications;
  }
  if (enabledSections.includes('awards') && tailorResult.awards) {
    mergedResume.awards = tailorResult.awards;
  }

  return mergedResume;
}
