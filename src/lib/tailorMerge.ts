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

type ProjectItem = NonNullable<ResumeData['projects']>[number];
type ProjectItemWithAliases = ProjectItem & {
  title?: string;
  isCurrent?: boolean;
  link?: string;
};

function nonBlankProjectText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function projectIdentityName(project: ProjectItem): string {
  const item = project as ProjectItemWithAliases;
  return normalizeMatchValue(item.name || item.title);
}

function projectIdentityRole(project: ProjectItem): string {
  return normalizeMatchValue(project.role);
}

function findUniqueProjectFallbackIndex(
  originalIndex: number,
  originals: ProjectItem[],
  tailoredProjects: ProjectItem[],
  matches: number[],
  usedTailoredIndexes: Set<number>,
): number {
  const original = originals[originalIndex];
  const name = projectIdentityName(original);
  if (!name) return -1;

  const unmatchedOriginalIndexes = originals
    .map((_, index) => index)
    .filter((index) => matches[index] === -1);
  const availableTailoredIndexes = tailoredProjects
    .map((_, index) => index)
    .filter((index) => !usedTailoredIndexes.has(index) && !tailoredProjects[index].id);
  const role = projectIdentityRole(original);

  if (role) {
    const sourceMatches = unmatchedOriginalIndexes.filter((index) => (
      projectIdentityName(originals[index]) === name &&
      projectIdentityRole(originals[index]) === role
    ));
    const tailoredMatches = availableTailoredIndexes.filter((index) => (
      projectIdentityName(tailoredProjects[index]) === name &&
      projectIdentityRole(tailoredProjects[index]) === role
    ));
    if (sourceMatches.length === 1 && tailoredMatches.length === 1) {
      return tailoredMatches[0];
    }
  }

  const sourceMatches = unmatchedOriginalIndexes.filter((index) => (
    projectIdentityName(originals[index]) === name
  ));
  const tailoredMatches = availableTailoredIndexes.filter((index) => (
    projectIdentityName(tailoredProjects[index]) === name
  ));
  return sourceMatches.length === 1 && tailoredMatches.length === 1
    ? tailoredMatches[0]
    : -1;
}

function sourceProject(project: ProjectItem): ProjectItem {
  const item = project as ProjectItemWithAliases;
  return {
    id: item.id || '',
    name: item.name || item.title || '',
    role: item.role || '',
    startDate: item.startDate || '',
    endDate: item.endDate || '',
    current: item.current ?? item.isCurrent,
    technologies: Array.isArray(item.technologies) ? item.technologies : [],
    description: item.description || '',
    url: item.url || item.link,
    githubUrl: item.githubUrl,
  };
}

function mergeTailoredProject(original: ProjectItem, tailored: ProjectItem): ProjectItem {
  const source = sourceProject(original);
  const tailoredItem = tailored as ProjectItemWithAliases;
  const tailoredTechnologies = Array.isArray(tailored.technologies)
    ? tailored.technologies.filter((technology) => typeof technology === 'string' && technology.trim())
    : [];
  return {
    id: source.id,
    name: nonBlankProjectText(tailoredItem.name || tailoredItem.title) || source.name,
    role: nonBlankProjectText(tailoredItem.role) || source.role,
    startDate: source.startDate,
    endDate: source.endDate,
    current: source.current,
    technologies: tailoredTechnologies.length ? tailoredTechnologies : source.technologies,
    description: nonBlankProjectText(tailoredItem.description) || source.description,
    url: source.url,
    githubUrl: source.githubUrl,
  };
}

function mergeTailorProjectsWithOriginals(
  originals: ProjectItem[],
  tailoredProjects: ProjectItem[] | undefined,
): ProjectItem[] {
  if (!originals.length) return [];

  const tailoredList = Array.isArray(tailoredProjects) ? tailoredProjects : [];
  const matches = originals.map(() => -1);
  const usedTailoredIndexes = new Set<number>();

  originals.forEach((original, originalIndex) => {
    if (!original.id) return;
    const tailoredIndex = tailoredList.findIndex((item, index) => (
      !usedTailoredIndexes.has(index) && item.id === original.id
    ));
    if (tailoredIndex === -1) return;
    matches[originalIndex] = tailoredIndex;
    usedTailoredIndexes.add(tailoredIndex);
  });

  originals.forEach((_, originalIndex) => {
    if (matches[originalIndex] !== -1) return;
    const tailoredIndex = findUniqueProjectFallbackIndex(
      originalIndex,
      originals,
      tailoredList,
      matches,
      usedTailoredIndexes,
    );
    if (tailoredIndex === -1) return;
    matches[originalIndex] = tailoredIndex;
    usedTailoredIndexes.add(tailoredIndex);
  });

  return originals.map((original, index) => (
    matches[index] === -1
      ? sourceProject(original)
      : mergeTailoredProject(original, tailoredList[matches[index]])
  ));
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
 * Normalize text for meaningful comparison.
 * - Trims whitespace
 * - Collapses repeated spaces/newlines
 * - Lowercases for case-insensitive comparison
 * - Removes purely cosmetic punctuation-only variations
 */
export function normalizeText(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ') // collapse whitespace
    .replace(/[\p{P}]+/gu, ' ') // replace punctuation with space (normalizes "word!" vs "word")
    .replace(/\s+/g, ' ') // collapse again after punctuation removal
    .trim();
}

/**
 * Compare two arrays of strings for meaningful differences.
 * Returns true if arrays differ in content (ignoring order, case, whitespace).
 */
function arraysDifferMeaningfully(a: string[], b: string[]): boolean {
  const normA = a.map(normalizeText).filter(Boolean).sort();
  const normB = b.map(normalizeText).filter(Boolean).sort();
  if (normA.length !== normB.length) return true;
  for (let i = 0; i < normA.length; i++) {
    if (normA[i] !== normB[i]) return true;
  }
  return false;
}

export interface ChangeSummary {
  hasChanges: boolean;
  summaryChanged: boolean;
  skillsChanged: boolean;
  experienceChanged: boolean;
  educationChanged: boolean;
  projectsChanged: boolean;
  certificationsChanged: boolean;
  awardsChanged: boolean;
  changedSections: TailorSectionId[];
  /** Human-readable description of what changed */
  description: string;
}

/**
 * Detect whether the tailored resume has meaningful changes compared to the original.
 * Compares normalized content across enabled sections.
 * Does NOT count whitespace, casing, or punctuation-only changes as meaningful.
 */
export function hasMeaningfulChanges(
  original: ResumeData,
  tailored: ResumeData,
  enabledSections: TailorSectionId[]
): ChangeSummary {
  const summary: ChangeSummary = {
    hasChanges: false,
    summaryChanged: false,
    skillsChanged: false,
    experienceChanged: false,
    educationChanged: false,
    projectsChanged: false,
    certificationsChanged: false,
    awardsChanged: false,
    changedSections: [],
    description: '',
  };

  // Check summary
  if (enabledSections.includes('summary')) {
    const origSummary = normalizeText(original.summary);
    const tailoredSummary = normalizeText(tailored.summary);
    if (origSummary !== tailoredSummary && (origSummary || tailoredSummary)) {
      summary.summaryChanged = true;
      summary.hasChanges = true;
      summary.changedSections.push('summary');
    }
  }

  // Check skills
  if (enabledSections.includes('skills')) {
    const origSkills = original.skills || [];
    const tailoredSkills = tailored.skills || [];
    if (arraysDifferMeaningfully(origSkills, tailoredSkills)) {
      summary.skillsChanged = true;
      summary.hasChanges = true;
      summary.changedSections.push('skills');
    }
  }

  // Check experience (position, company, description, achievements)
  if (enabledSections.includes('experience')) {
    const origExp = original.experience || [];
    const tailoredExp = tailored.experience || [];
    if (origExp.length !== tailoredExp.length) {
      summary.experienceChanged = true;
      summary.hasChanges = true;
      summary.changedSections.push('experience');
    } else {
      for (let i = 0; i < origExp.length; i++) {
        const o = origExp[i];
        const t = tailoredExp[i];
        if (
          normalizeText(o.position) !== normalizeText(t.position) ||
          normalizeText(o.company) !== normalizeText(t.company) ||
          normalizeText(o.description) !== normalizeText(t.description) ||
          arraysDifferMeaningfully(o.achievements || [], t.achievements || [])
        ) {
          summary.experienceChanged = true;
          summary.hasChanges = true;
          summary.changedSections.push('experience');
          break;
        }
      }
    }
  }

  // Check education
  if (enabledSections.includes('education')) {
    const origEd = original.education || [];
    const tailoredEd = tailored.education || [];
    if (origEd.length !== tailoredEd.length) {
      summary.educationChanged = true;
      summary.hasChanges = true;
      summary.changedSections.push('education');
    } else {
      for (let i = 0; i < origEd.length; i++) {
        const o = origEd[i];
        const t = tailoredEd[i];
        if (
          normalizeText(o.institution) !== normalizeText(t.institution) ||
          normalizeText(o.degree) !== normalizeText(t.degree) ||
          normalizeText(o.field) !== normalizeText(t.field)
        ) {
          summary.educationChanged = true;
          summary.hasChanges = true;
          summary.changedSections.push('education');
          break;
        }
      }
    }
  }

  // Check projects
  if (enabledSections.includes('projects')) {
    const origProj = original.projects || [];
    const tailoredProj = tailored.projects || [];
    if (origProj.length !== tailoredProj.length) {
      summary.projectsChanged = true;
      summary.hasChanges = true;
      summary.changedSections.push('projects');
    } else if (arraysDifferMeaningfully(
      origProj.map(p => `${p.name} ${p.description}`),
      tailoredProj.map(p => `${p.name} ${p.description}`)
    )) {
      summary.projectsChanged = true;
      summary.hasChanges = true;
      summary.changedSections.push('projects');
    }
  }

  // Check certifications
  if (enabledSections.includes('certifications')) {
    const origCert = original.certifications || [];
    const tailoredCert = tailored.certifications || [];
    if (arraysDifferMeaningfully(
      origCert.map(c => `${c.name} ${c.issuer}`),
      tailoredCert.map(c => `${c.name} ${c.issuer}`)
    )) {
      summary.certificationsChanged = true;
      summary.hasChanges = true;
      summary.changedSections.push('certifications');
    }
  }

  // Check awards
  if (enabledSections.includes('awards')) {
    const origAwards = original.awards || [];
    const tailoredAwards = tailored.awards || [];
    if (arraysDifferMeaningfully(
      origAwards.map(a => `${a.title} ${a.issuer}`),
      tailoredAwards.map(a => `${a.title} ${a.issuer}`)
    )) {
      summary.awardsChanged = true;
      summary.hasChanges = true;
      summary.changedSections.push('awards');
    }
  }

  // Generate human-readable description
  if (summary.hasChanges) {
    const parts: string[] = [];
    if (summary.summaryChanged) parts.push('professional summary updated');
    if (summary.skillsChanged) parts.push('skills optimized');
    if (summary.experienceChanged) parts.push('experience enhanced');
    if (summary.educationChanged) parts.push('education refined');
    if (summary.projectsChanged) parts.push('projects highlighted');
    if (summary.certificationsChanged) parts.push('certifications added');
    if (summary.awardsChanged) parts.push('awards showcased');
    summary.description = parts.join(', ');
  } else {
    summary.description = 'No meaningful changes detected';
  }

  return summary;
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
    mergedResume.projects = mergeTailorProjectsWithOriginals(
      currentResume.projects ?? [],
      tailorResult.projects,
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
