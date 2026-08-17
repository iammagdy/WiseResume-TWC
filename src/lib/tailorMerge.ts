import { ResumeData, SuperTailorResult, TailorSectionId, FixSuggestion } from '@/types/resume';
import { normalizeSkill } from '@/lib/diffUtils';

export { normalizeSkill };

function normalizeMatchValue(value: string | undefined): string {
  return (value || '').trim().toLowerCase();
}

function sourceIdentityKey(parts: Array<string | undefined>): string {
  const normalized = parts.map(normalizeMatchValue);
  return normalized.length > 0 && normalized.every(Boolean)
    ? normalized.join('\u0000')
    : '';
}

function findSourceFirstTailoredIndex<T extends { id: string }>(
  original: T,
  originals: T[],
  tailored: T[],
  usedTailoredIndexes: Set<number>,
  identityKey: (item: T) => string,
): number {
  if (original.id) {
    const sourceIdCount = originals.filter((item) => item.id === original.id).length;
    const exactMatches = tailored
      .map((item, index) => ({ item, index }))
      .filter(({ item, index }) => !usedTailoredIndexes.has(index) && item.id === original.id);
    if (sourceIdCount === 1 && exactMatches.length === 1) {
      return exactMatches[0].index;
    }
  }

  const key = identityKey(original);
  if (!key || originals.filter((item) => identityKey(item) === key).length !== 1) return -1;
  const fallbackMatches = tailored
    .map((item, index) => ({ item, index }))
    .filter(({ item, index }) => (
      !usedTailoredIndexes.has(index) &&
      !item.id &&
      identityKey(item) === key
    ));
  return fallbackMatches.length === 1 ? fallbackMatches[0].index : -1;
}

const TAILOR_METRIC_TOKEN_PATTERN = /(?:[$€£¥]\s*)?\d+(?:[.,]\d+)*\+?(?:\s*(?:%|percent(?:age)?|x|k|m|b|thousand|million|billion|hours?|days?|weeks?|months?|years?))?/gi;
const TAILOR_METRIC_WORD_PATTERN = /\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|trillion|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|double(?:d)?|triple(?:d)?|half|quarter|dozens?)\b/gi;

function extractMetricTokens(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  const numericTokens = (value.match(TAILOR_METRIC_TOKEN_PATTERN) ?? []).map((token) => token
    .toLowerCase()
    .replace(/percentage|percent/g, '%')
    .replace(/[\s,]/g, ''));
  const wordTokens = (value.match(TAILOR_METRIC_WORD_PATTERN) ?? []).map((token) => {
    const normalized = token.toLowerCase();
    if (normalized === 'doubled') return 'word:double';
    if (normalized === 'tripled') return 'word:triple';
    if (normalized === 'dozens') return 'word:dozen';
    return `word:${normalized}`;
  });
  return [...numericTokens, ...wordTokens];
}

function hasOnlySourceSupportedMetrics(candidate: string, sourceEvidence: string): boolean {
  const candidateMetrics = extractMetricTokens(candidate);
  if (candidateMetrics.length === 0) return true;
  const sourceMetrics = new Set(extractMetricTokens(sourceEvidence));
  return candidateMetrics.every((metric) => sourceMetrics.has(metric));
}

function safeTailoredText(candidate: unknown, sourceText: string | undefined, sourceEvidence: string): string {
  const source = typeof sourceText === 'string' ? sourceText : '';
  const rewritten = typeof candidate === 'string' ? candidate.trim() : '';
  if (!rewritten || !hasOnlySourceSupportedMetrics(rewritten, sourceEvidence)) return source;
  return rewritten;
}

function mergeSupportedSkills(original: string[], tailored: string[]): string[] {
  const sourceByNormalized = new Map<string, string>();
  for (const skill of original) {
    const normalized = normalizeSkill(skill);
    if (normalized) sourceByNormalized.set(normalized, skill);
  }

  const merged: string[] = [];
  const seen = new Set<string>();
  for (const skill of tailored) {
    const normalized = normalizeSkill(skill);
    const sourceSkill = sourceByNormalized.get(normalized);
    if (!normalized || !sourceSkill || seen.has(normalized)) continue;
    seen.add(normalized);
    merged.push(sourceSkill);
  }
  for (const skill of original) {
    const normalized = normalizeSkill(skill);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    merged.push(skill);
  }
  return merged;
}

function mergeSourceBulletRewrites(
  sourceBullets: string[] | undefined,
  tailoredBullets: string[] | undefined,
): string[] {
  const originals = Array.isArray(sourceBullets) ? sourceBullets : [];
  const tailored = Array.isArray(tailoredBullets) ? tailoredBullets : [];
  const usedRewrites = new Set<string>();

  return originals.map((original, index) => {
    const candidate = safeTailoredText(tailored[index], original, original);
    const normalized = normalizeText(candidate);
    if (!normalized || usedRewrites.has(normalized)) return original;
    usedRewrites.add(normalized);
    return candidate;
  });
}

type ExperienceItem = ResumeData['experience'][number];

function mergeTailorExperienceWithOriginals(
  originals: ExperienceItem[],
  tailoredExperience: ExperienceItem[] | undefined,
): ExperienceItem[] {
  const tailored = Array.isArray(tailoredExperience) ? tailoredExperience : [];
  const usedTailoredIndexes = new Set<number>();
  const identityKey = (item: ExperienceItem) => sourceIdentityKey([item.company, item.position]);

  return originals.map((original) => {
    const source: ExperienceItem = {
      ...original,
      achievements: [...(original.achievements ?? [])],
      ...(Array.isArray(original.responsibilities)
        ? { responsibilities: [...original.responsibilities] }
        : {}),
    };
    const tailoredIndex = findSourceFirstTailoredIndex(
      original,
      originals,
      tailored,
      usedTailoredIndexes,
      identityKey,
    );
    if (tailoredIndex === -1) return source;
    usedTailoredIndexes.add(tailoredIndex);
    const candidate = tailored[tailoredIndex];
    const evidence = [
      source.description,
      ...(source.achievements ?? []),
      ...(source.responsibilities ?? []),
    ].join('\n');
    return {
      ...source,
      description: safeTailoredText(candidate.description, source.description, evidence),
      achievements: mergeSourceBulletRewrites(source.achievements, candidate.achievements),
    };
  });
}

type ProjectItem = NonNullable<ResumeData['projects']>[number];
type ProjectItemWithAliases = ProjectItem & {
  title?: string;
  isCurrent?: boolean;
  link?: string;
};

function sourceProject(project: ProjectItem): ProjectItem {
  const item = project as ProjectItemWithAliases;
  const url = item.url || item.link;
  return {
    id: item.id || '',
    name: item.name || item.title || '',
    role: item.role || '',
    startDate: item.startDate || '',
    endDate: item.endDate || '',
    current: item.current ?? item.isCurrent,
    technologies: Array.isArray(item.technologies) ? item.technologies : [],
    description: item.description || '',
    ...(url ? { url } : {}),
    ...(item.githubUrl ? { githubUrl: item.githubUrl } : {}),
  };
}

function mergeTailoredProject(original: ProjectItem, tailored: ProjectItem): ProjectItem {
  const source = sourceProject(original);
  const tailoredTechnologies = Array.isArray(tailored.technologies)
    ? tailored.technologies.filter((technology) => typeof technology === 'string' && technology.trim())
    : [];
  return {
    ...source,
    technologies: mergeSupportedSkills(source.technologies, tailoredTechnologies),
    description: safeTailoredText(
      tailored.description,
      source.description,
      [source.description, ...source.technologies].join('\n'),
    ),
  };
}

function mergeTailorProjectsWithOriginals(
  originals: ProjectItem[],
  tailoredProjects: ProjectItem[] | undefined,
): ProjectItem[] {
  if (!originals.length) return [];

  const tailoredList = Array.isArray(tailoredProjects) ? tailoredProjects : [];
  const usedTailoredIndexes = new Set<number>();
  const identityKey = (item: ProjectItem) => {
    const aliased = item as ProjectItemWithAliases;
    return sourceIdentityKey([aliased.name || aliased.title, item.role]);
  };

  return originals.map((original) => {
    const tailoredIndex = findSourceFirstTailoredIndex(
      original,
      originals,
      tailoredList,
      usedTailoredIndexes,
      identityKey,
    );
    if (tailoredIndex === -1) return sourceProject(original);
    usedTailoredIndexes.add(tailoredIndex);
    return mergeTailoredProject(original, tailoredList[tailoredIndex]);
  });
}

type EducationItem = ResumeData['education'][number];

function mergeTailorEducationWithOriginals(
  originals: EducationItem[],
  tailoredEducation: EducationItem[] | undefined,
): EducationItem[] {
  const tailored = Array.isArray(tailoredEducation) ? tailoredEducation : [];
  const usedTailoredIndexes = new Set<number>();
  const identityKey = (item: EducationItem) => sourceIdentityKey([
    item.institution,
    item.degree,
    item.field,
  ]);

  return originals.map((original) => {
    const source = { ...original };
    const tailoredIndex = findSourceFirstTailoredIndex(
      original,
      originals,
      tailored,
      usedTailoredIndexes,
      identityKey,
    );
    if (tailoredIndex === -1 || !source.description) return source;
    usedTailoredIndexes.add(tailoredIndex);
    return {
      ...source,
      description: safeTailoredText(
        tailored[tailoredIndex].description,
        source.description,
        source.description,
      ),
    };
  });
}

type AwardItem = NonNullable<ResumeData['awards']>[number];

function mergeTailorAwardsWithOriginals(
  originals: AwardItem[],
  tailoredAwards: AwardItem[] | undefined,
): AwardItem[] {
  const tailored = Array.isArray(tailoredAwards) ? tailoredAwards : [];
  const usedTailoredIndexes = new Set<number>();
  const identityKey = (item: AwardItem) => sourceIdentityKey([item.title, item.issuer]);

  return originals.map((original) => {
    const source = { ...original };
    const tailoredIndex = findSourceFirstTailoredIndex(
      original,
      originals,
      tailored,
      usedTailoredIndexes,
      identityKey,
    );
    if (tailoredIndex === -1 || !source.description) return source;
    usedTailoredIndexes.add(tailoredIndex);
    return {
      ...source,
      description: safeTailoredText(
        tailored[tailoredIndex].description,
        source.description,
        source.description,
      ),
    };
  });
}

function buildResumeNarrativeEvidence(resume: ResumeData): string {
  const values: string[] = [resume.summary, ...(resume.skills ?? [])];
  for (const item of resume.experience ?? []) {
    values.push(item.description, ...(item.achievements ?? []), ...(item.responsibilities ?? []));
  }
  for (const item of resume.education ?? []) values.push(item.description ?? '');
  for (const item of resume.projects ?? []) {
    values.push(item.description, ...(item.technologies ?? []));
  }
  for (const item of resume.awards ?? []) values.push(item.description ?? '');
  return values.filter(Boolean).join('\n');
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
    mergedResume.summary = safeTailoredText(
      tailorResult.summary,
      currentResume.summary,
      buildResumeNarrativeEvidence(currentResume),
    );
  }
  if (enabledSections.includes('skills')) {
    mergedResume.skills = mergeSupportedSkills(
      currentResume.skills ?? [],
      tailorResult.skills ?? [],
    );
  }
  if (enabledSections.includes('experience')) {
    mergedResume.experience = mergeTailorExperienceWithOriginals(
      currentResume.experience,
      tailorResult.experience,
    ).map((entry, experienceIndex) => {
      const source = currentResume.experience[experienceIndex];
      const achievements = [...(entry.achievements ?? [])];
      (source.achievements ?? []).forEach((sourceBullet, bulletIndex) => {
        if (rejectedBullets.has(`${source.id}-${bulletIndex}`)) {
          achievements[bulletIndex] = sourceBullet;
        }
      });
      return {
        ...entry,
        achievements,
      };
    });
  }
  if (enabledSections.includes('education')) {
    mergedResume.education = mergeTailorEducationWithOriginals(
      currentResume.education,
      tailorResult.education,
    );
  }
  if (enabledSections.includes('projects')) {
    mergedResume.projects = mergeTailorProjectsWithOriginals(
      currentResume.projects ?? [],
      tailorResult.projects,
    );
  }
  if (enabledSections.includes('certifications')) {
    mergedResume.certifications = (currentResume.certifications ?? []).map((certification) => ({
      ...certification,
    }));
  }
  if (enabledSections.includes('awards')) {
    mergedResume.awards = mergeTailorAwardsWithOriginals(
      currentResume.awards ?? [],
      tailorResult.awards,
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
      result = {
        ...result,
        summary: safeTailoredText(
          fix.after,
          result.summary,
          buildResumeNarrativeEvidence(result),
        ),
      };
    } else if (fix.type === 'add_skill') {
      // AI suggestions may prioritize an existing skill, but they cannot assert a
      // new skill as candidate fact. Users can still add verified skills manually.
      const norm = normalizeSkill(fix.after);
      if (!result.skills.some(s => normalizeSkill(s) === norm)) continue;
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
          const evidence = [
            exp.description,
            ...achievements,
            ...(exp.responsibilities ?? []),
          ].join('\n');
          achievements[bulletIndex] = safeTailoredText(
            fix.after,
            achievements[bulletIndex],
            evidence,
          );
          return { ...exp, achievements };
        }),
      };
    }
  }
  return result;
}
