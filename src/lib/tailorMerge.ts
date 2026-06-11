import { ResumeData, SuperTailorResult, TailorSectionId, FixSuggestion } from '@/types/resume';
import { normalizeSkill } from '@/lib/diffUtils';
import { dedupeAchievements, mergeSkillsForTailor } from '@/lib/tailorSanitize';

export { normalizeSkill };

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

function findProjectMatch(
  original: NonNullable<ResumeData['projects']>[number],
  tailoredProjects: NonNullable<ResumeData['projects']>,
  index: number,
  originalLength: number,
): NonNullable<ResumeData['projects']>[number] | undefined {
  const byId = tailoredProjects.find((item) => item.id === original.id);
  if (byId) return byId;

  const name = normalizeMatchValue(original.name);
  const byName = tailoredProjects.find((item) => normalizeMatchValue(item.name) === name && name !== '');
  if (byName) return byName;

  if (tailoredProjects.length === originalLength) {
    return tailoredProjects[index];
  }

  return undefined;
}

function findCertificationMatch(
  original: NonNullable<ResumeData['certifications']>[number],
  tailored: NonNullable<ResumeData['certifications']>,
  index: number,
  originalLength: number,
): NonNullable<ResumeData['certifications']>[number] | undefined {
  const byId = tailored.find((item) => item.id === original.id);
  if (byId) return byId;
  const byName = tailored.find((item) =>
    normalizeMatchValue(item.name) === normalizeMatchValue(original.name) &&
    normalizeMatchValue(item.issuer) === normalizeMatchValue(original.issuer),
  );
  if (byName) return byName;
  if (tailored.length === originalLength) return tailored[index];
  return undefined;
}

function findAwardMatch(
  original: NonNullable<ResumeData['awards']>[number],
  tailored: NonNullable<ResumeData['awards']>,
  index: number,
  originalLength: number,
): NonNullable<ResumeData['awards']>[number] | undefined {
  const byId = tailored.find((item) => item.id === original.id);
  if (byId) return byId;
  const byTitle = tailored.find((item) =>
    normalizeMatchValue(item.title) === normalizeMatchValue(original.title) &&
    normalizeMatchValue(item.issuer) === normalizeMatchValue(original.issuer),
  );
  if (byTitle) return byTitle;
  if (tailored.length === originalLength) return tailored[index];
  return undefined;
}

function mergeListWithOriginals<T extends { id?: string }>(
  originals: T[],
  tailored: T[] | undefined,
  matcher: (original: T, tailoredList: T[], index: number, length: number) => T | undefined,
): T[] {
  if (!originals.length) return tailored ?? [];
  const tailoredList = tailored ?? [];
  const merged = originals.map((orig, index, list) => {
    const match = matcher(orig, tailoredList, index, list.length);
    return match ? { ...orig, ...match, id: match.id || orig.id } : orig;
  });

  for (const item of tailoredList) {
    const exists = merged.some((entry) => (
      (item.id && entry.id === item.id) ||
      JSON.stringify(entry) === JSON.stringify(item)
    ));
    if (!exists) merged.push(item);
  }

  return merged;
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
    mergedResume.skills = mergeSkillsForTailor(
      currentResume.skills ?? [],
      tailorResult.skills ?? [],
    );
  }
  if (enabledSections.includes('experience')) {
    mergedResume.experience = mergeListWithOriginals(
      currentResume.experience,
      tailorResult.experience,
      (orig, list, index, length) => findExperienceMatch(orig, list, index, length),
    ).map((entry) => {
      const orig = currentResume.experience.find((e) => e.id === entry.id)
        ?? currentResume.experience.find((e) =>
          normalizeMatchValue(e.company) === normalizeMatchValue(entry.company) &&
          normalizeMatchValue(e.position) === normalizeMatchValue(entry.position),
        );
      if (!orig) {
        return {
          ...entry,
          achievements: dedupeAchievements(entry.achievements),
        };
      }

      let achievements = dedupeAchievements(entry.achievements ?? orig.achievements);
      if (tailorResult.bulletTransformations?.length) {
        achievements = [...achievements];
        tailorResult.bulletTransformations
          .filter((bt) => bt.experienceId === orig.id)
          .forEach((bt) => {
            if (rejectedBullets.has(`${bt.experienceId}-${bt.bulletIndex}`)) {
              if (bt.bulletIndex >= 0 && bt.bulletIndex < achievements.length) {
                achievements[bt.bulletIndex] = bt.originalBullet;
              }
              return;
            }
            if (bt.bulletIndex >= 0 && bt.bulletIndex < achievements.length) {
              achievements[bt.bulletIndex] = bt.enhancedBullet;
            }
          });
        achievements = dedupeAchievements(achievements);
      }

      return {
        ...orig,
        ...entry,
        id: entry.id || orig.id,
        achievements,
      };
    });
  }
  if (enabledSections.includes('education')) {
    mergedResume.education = currentResume.education.map((orig, index, originalList) => {
      const tailored = findEducationMatch(orig, tailorResult.education, index, originalList.length);
      return tailored ? { ...orig, ...tailored, id: tailored.id || orig.id } : orig;
    });
  }
  if (enabledSections.includes('projects')) {
    mergedResume.projects = mergeListWithOriginals(
      currentResume.projects ?? [],
      tailorResult.projects,
      (orig, list, index, length) => findProjectMatch(orig, list, index, length),
    );
  }
  if (enabledSections.includes('certifications')) {
    mergedResume.certifications = mergeListWithOriginals(
      currentResume.certifications ?? [],
      tailorResult.certifications,
      (orig, list, index, length) => findCertificationMatch(orig, list, index, length),
    );
  }
  if (enabledSections.includes('awards')) {
    mergedResume.awards = mergeListWithOriginals(
      currentResume.awards ?? [],
      tailorResult.awards,
      (orig, list, index, length) => findAwardMatch(orig, list, index, length),
    );
  }

  return mergedResume;
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
