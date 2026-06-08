import { ResumeData, SuperTailorResult, TailorSectionId, FixSuggestion } from '@/types/resume';

function normalizeMatchValue(value: string | undefined): string {
  return (value || '').trim().toLowerCase();
}

function findExperienceMatch(
  original: ResumeData['experience'][number],
  tailoredExperience: ResumeData['experience'],
  index: number,
  originalLength: number,
): ResumeData['experience'][number] | undefined {
  const byId = tailoredExperience.find((item) => item.id === original.id);
  if (byId) return byId;

  const company = normalizeMatchValue(original.company);
  const position = normalizeMatchValue(original.position);
  const byRole = tailoredExperience.find((item) =>
    normalizeMatchValue(item.company) === company &&
    normalizeMatchValue(item.position) === position,
  );
  if (byRole) return byRole;

  if (tailoredExperience.length === originalLength) {
    return tailoredExperience[index];
  }

  return undefined;
}

function findEducationMatch(
  original: ResumeData['education'][number],
  tailoredEducation: ResumeData['education'],
  index: number,
  originalLength: number,
): ResumeData['education'][number] | undefined {
  const byId = tailoredEducation.find((item) => item.id === original.id);
  if (byId) return byId;

  const institution = normalizeMatchValue(original.institution);
  const degree = normalizeMatchValue(original.degree);
  const bySchool = tailoredEducation.find((item) =>
    normalizeMatchValue(item.institution) === institution &&
    normalizeMatchValue(item.degree) === degree,
  );
  if (bySchool) return bySchool;

  if (tailoredEducation.length === originalLength) {
    return tailoredEducation[index];
  }

  return undefined;
}

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
    mergedResume.experience = currentResume.experience.map((orig, index, originalList) => {
      const tailored = findExperienceMatch(orig, tailorResult.experience, index, originalList.length);
      if (!tailored) return orig;
      const merged = { ...orig, ...tailored, id: tailored.id || orig.id };
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
    mergedResume.education = currentResume.education.map((orig, index, originalList) => {
      const tailored = findEducationMatch(orig, tailorResult.education, index, originalList.length);
      return tailored ? { ...orig, ...tailored, id: tailored.id || orig.id } : orig;
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

export function normalizeSkill(skill: string): string {
  return skill.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function applyFixesOnTop(
  merged: ResumeData,
  fixes: FixSuggestion[],
  enabledSections: TailorSectionId[],
): ResumeData {
  if (fixes.length === 0) return merged;
  let result: ResumeData = {
    ...merged,
    skills: [...merged.skills],
    experience: merged.experience.map(exp => ({
      ...exp,
      achievements: [...(exp.achievements ?? [])],
    })),
  };
  for (const fix of fixes) {
    if (!enabledSections.includes(fix.section as TailorSectionId)) continue;
    if (fix.type === 'enhance_summary') {
      result = { ...result, summary: fix.after };
    } else if (fix.type === 'add_skill') {
      const norm = normalizeSkill(fix.after);
      if (!result.skills.some(s => normalizeSkill(s) === norm)) {
        result = { ...result, skills: [...result.skills, fix.after] };
      }
    } else if (fix.type === 'improve_bullet' && fix.target_id) {
      const dashIdx = fix.target_id.lastIndexOf('-');
      if (dashIdx === -1) continue;
      const experienceId = fix.target_id.slice(0, dashIdx);
      const bulletIndex = parseInt(fix.target_id.slice(dashIdx + 1), 10);
      if (!experienceId || isNaN(bulletIndex)) continue;
      result = {
        ...result,
        experience: result.experience.map(exp => {
          if (exp.id !== experienceId) return exp;
          const achievements = [...(exp.achievements ?? [])];
          if (bulletIndex < 0 || bulletIndex >= achievements.length) {
            return exp;
          }
          achievements[bulletIndex] = fix.after;
          return { ...exp, achievements };
        }),
      };
    }
  }
  return result;
}
