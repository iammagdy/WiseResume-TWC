// ── Action Verbs List (150+) ──────────────────────────────────────────

export const ACTION_VERBS = new Set([
  // Leadership & Management
  'led', 'managed', 'directed', 'oversaw', 'supervised', 'administered',
  'orchestrated', 'spearheaded', 'pioneered', 'established', 'chaired',
  'governed', 'headed', 'captained', 'mentored', 'coached', 'trained',
  'onboarded', 'cultivated', 'empowered', 'mobilized', 'unified',

  // Building & Creating
  'developed', 'created', 'designed', 'built', 'architected', 'engineered',
  'constructed', 'crafted', 'produced', 'fabricated', 'prototyped', 'coded',
  'programmed', 'authored', 'published', 'composed', 'illustrated', 'modeled',

  // Improvement & Optimization
  'implemented', 'improved', 'optimized', 'streamlined', 'accelerated',
  'enhanced', 'upgraded', 'modernized', 'revamped', 'refactored', 'restructured',
  'consolidated', 'standardized', 'simplified', 'transformed', 'overhauled',
  'refined', 'boosted', 'amplified',

  // Achievement & Results
  'achieved', 'increased', 'decreased', 'reduced', 'delivered', 'launched',
  'generated', 'secured', 'exceeded', 'surpassed', 'attained', 'drove',
  'captured', 'earned', 'won', 'saved', 'cut', 'doubled', 'tripled',
  'maximized', 'minimized', 'scaled',

  // Analysis & Strategy
  'analyzed', 'assessed', 'evaluated', 'researched', 'investigated',
  'identified', 'diagnosed', 'audited', 'benchmarked', 'forecasted',
  'projected', 'modeled', 'mapped', 'formulated', 'strategized', 'planned',
  'prioritized', 'recommended', 'advised',

  // Coordination & Collaboration
  'coordinated', 'collaborated', 'facilitated', 'negotiated', 'partnered',
  'liaised', 'aligned', 'interfaced', 'communicated', 'presented', 'pitched',
  'influenced', 'persuaded', 'advocated', 'championed',

  // Technical Operations
  'deployed', 'integrated', 'migrated', 'configured', 'automated',
  'troubleshot', 'debugged', 'monitored', 'maintained', 'administered',
  'provisioned', 'orchestrated', 'containerized', 'virtualized', 'secured',
  'patched', 'tested', 'validated', 'documented',

  // Finance & Business
  'budgeted', 'forecasted', 'audited', 'reconciled', 'allocated',
  'invested', 'funded', 'financed', 'procured', 'negotiated', 'contracted',
  'commercialized', 'monetized', 'diversified', 'acquired',

  // Healthcare & Service
  'diagnosed', 'treated', 'administered', 'rehabilitated', 'assessed',
  'counseled', 'supported', 'assisted', 'educated', 'screened', 'monitored',
  'documented', 'coordinated', 'advocated', 'consulted',

  // Operations & Process
  'executed', 'initiated', 'organized', 'resolved', 'processed',
  'tracked', 'reported', 'enforced', 'implemented', 'operationalized',
  'centralized', 'decentralized', 'allocated', 'scheduled', 'dispatched',

  // Creative & Marketing
  'conceptualized', 'curated', 'branded', 'marketed', 'promoted',
  'launched', 'campaigned', 'publicized', 'advertised', 'copyedited',
  'narrated', 'storytold', 'visualized', 'animated', 'directed',
]);

// ── Word-boundary keyword matcher ────────────────────────────────────

/**
 * Returns true if `skill` appears in `text` as a whole word/token,
 * avoiding false matches like "R" matching "React" or "Go" matching "Google".
 */
export function skillMatchesText(skill: string, text: string): boolean {
  // Escape regex special chars in the skill name
  const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Use word boundary — \b works for alphanumeric; for skills starting/ending
  // with special chars we additionally check surrounding whitespace/punctuation.
  const pattern = new RegExp(`(?<![\\w])${escaped}(?![\\w])`, 'i');
  return pattern.test(text);
}

// ── Deterministic Scoring Functions ──────────────────────────────────

export function scoreContactCompleteness(contact: Record<string, string | undefined>): number {
  let score = 0;
  if (contact?.fullName?.trim()) score += 20;
  if (contact?.email?.trim()) score += 20;
  if (contact?.phone?.trim()) score += 20;
  if (contact?.location?.trim()) score += 20;
  if (contact?.linkedin?.trim() || contact?.portfolio?.trim() || contact?.website?.trim()) score += 20;
  return score;
}

export function scoreSectionStructure(resume: Record<string, unknown>): number {
  let score = 0;
  if (typeof resume.summary === 'string' && resume.summary.trim().length > 0) score += 20;
  if (Array.isArray(resume.experience) && resume.experience.length > 0) score += 25;
  if (Array.isArray(resume.education) && resume.education.length > 0) score += 20;
  if (Array.isArray(resume.skills) && resume.skills.length > 0) score += 20;

  const hasOptional =
    (Array.isArray(resume.certifications) && resume.certifications.length > 0) ||
    (Array.isArray(resume.projects) && resume.projects.length > 0) ||
    (Array.isArray(resume.awards) && resume.awards.length > 0) ||
    (Array.isArray(resume.volunteering) && resume.volunteering.length > 0) ||
    (Array.isArray(resume.languages) && resume.languages.length > 0);
  if (hasOptional) score += 15;

  return Math.min(score, 100);
}

// ── Template Friendliness ───────────────────────────────────────────

const TEMPLATE_ATS_RATINGS: Record<string, 'high' | 'medium' | 'low'> = {
  modern: 'high', classic: 'high', clean: 'high', minimal: 'high',
  executive: 'high', compact: 'high', ats: 'high',
  developer: 'medium', technical: 'medium', elegant: 'medium',
  professional: 'medium', timeline: 'medium', bold: 'medium',
  swiss: 'medium', nordic: 'medium', formal: 'medium',
  creative: 'low', designer: 'low', infographic: 'low',
  artistic: 'low', portfolio: 'low', magazine: 'low',
};

export function scoreTemplateFriendliness(templateId?: string, atsRating?: string): number {
  const rating = atsRating || TEMPLATE_ATS_RATINGS[templateId || ''] || 'medium';
  switch (rating) {
    case 'high': return 100;
    case 'medium': return 60;
    case 'low': return 20;
    default: return 60;
  }
}

export function scoreParsability(resume: Record<string, unknown>): { score: number; tenseHint?: string } {
  let score = 100;

  const dateFormats: string[] = [];
  const dateRegexes = [
    { pattern: /^\d{4}-\d{2}(-\d{2})?$/, label: 'ISO' },
    { pattern: /^\d{2}\/\d{4}$/, label: 'MM/YYYY' },
    { pattern: /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4}$/i, label: 'Month YYYY' },
    { pattern: /^\d{4}$/, label: 'YYYY' },
  ];

  function classifyDate(d: string): string {
    if (!d) return 'special';
    const trimmed = d.trim().toLowerCase();
    // Treat all "present/current/now" variants as special (no format to compare)
    if (trimmed === 'present' || trimmed === 'current' || trimmed === 'now') return 'special';
    for (const r of dateRegexes) {
      if (r.pattern.test(d.trim())) return r.label;
    }
    return 'unknown';
  }

  const experiences = Array.isArray(resume.experience) ? resume.experience as Record<string, unknown>[] : [];
  const educations = Array.isArray(resume.education) ? resume.education as Record<string, unknown>[] : [];

  let missingDateCount = 0;
  let emptyDescCount = 0;

  for (const e of experiences) {
    const sd = classifyDate(String(e.startDate || ''));
    const ed = classifyDate(String(e.endDate || ''));
    if (sd !== 'special') dateFormats.push(sd);
    if (ed !== 'special') dateFormats.push(ed);

    if (!e.startDate || String(e.startDate).trim() === '') missingDateCount++;

    const desc = String(e.description || '').trim();
    const achievements = Array.isArray(e.achievements) ? e.achievements : [];
    const responsibilities = Array.isArray(e.responsibilities) ? e.responsibilities : [];
    if (desc === '' && achievements.length === 0 && responsibilities.length === 0) emptyDescCount++;
  }

  for (const e of educations) {
    const sd = classifyDate(String(e.startDate || ''));
    const ed = classifyDate(String(e.endDate || ''));
    if (sd !== 'special') dateFormats.push(sd);
    if (ed !== 'special') dateFormats.push(ed);
  }

  const uniqueFormats = new Set(dateFormats.filter(f => f !== 'unknown'));
  if (uniqueFormats.size > 1) score -= 15;
  score -= Math.min(missingDateCount * 10, 30);
  score -= Math.min(emptyDescCount * 15, 30);

  for (const e of experiences) {
    const desc = String(e.description || '');
    if (/[•●■◦▪➤►→]/.test(desc)) {
      score -= 10;
      break;
    }
  }

  // Penalties for image-hostile patterns that hurt real ATS parsing
  const contactInfo = resume.contactInfo as Record<string, unknown> | undefined;
  if (contactInfo?.photoUrl) score -= 5;

  const customization = resume.customization as Record<string, unknown> | undefined;
  if (customization) {
    const layout = String(customization.layout || 'single');
    if (layout !== 'single' && layout !== 'linear') score -= 10;
  }

  // ── Tense consistency check ──────────────────────────────────────
  // Past-tense markers: ended in -ed, or common past forms
  const pastTensePattern = /\b(led|managed|developed|created|implemented|designed|built|achieved|increased|decreased|reduced|improved|launched|delivered|coordinated|supervised|trained|mentored|analyzed|resolved|negotiated|streamlined|optimized|automated|spearheaded|pioneered|established|maintained|organized|executed|collaborated|facilitated|generated|secured|transformed|oversaw|directed|administered|initiated|consolidated|restructured|revamped|formulated|architected|engineered|deployed|integrated|migrated|monitored|evaluated|assessed|researched|presented|published|authored|documented|configured|debugged|accelerated|influenced|modernized|scaled|drove|reduced|built|wrote|ran|grew|cut|won|earned|saved|boosted)\b/i;
  // Present-tense markers: -ing forms or base form imperatives at bullet start
  const presentTensePattern = /\b(lead|manage|develop|create|implement|design|build|achieve|increase|decrease|reduce|improve|launch|deliver|coordinate|supervise|train|mentor|analyze|resolve|negotiate|streamline|optimize|automate|spearhead|pioneer|establish|maintain|organize|execute|collaborate|facilitate|generate|secure|transform|oversee|direct|administer|initiate|consolidate|restructure|revamp|formulate|architect|engineer|deploy|integrate|migrate|monitor|evaluate|assess|research|present|publish|author|document|configure|debug|accelerate|influence|modernize|scale|drive|grow|run|earn|save|boost)\b/i;

  let hasPast = false;
  let hasPresent = false;
  const allBullets: string[] = [];

  for (const e of experiences) {
    if (Array.isArray(e.achievements)) {
      for (const a of e.achievements) allBullets.push(String(a));
    }
    if (Array.isArray(e.responsibilities)) {
      for (const r of e.responsibilities) allBullets.push(String(r));
    }
  }

  for (const b of allBullets) {
    const firstWord = b.split(/\s+/)[0]?.replace(/[^a-zA-Z]/g, '').toLowerCase() || '';
    if (pastTensePattern.test(firstWord)) hasPast = true;
    if (presentTensePattern.test(firstWord)) hasPresent = true;
  }

  let tenseHint: string | undefined;
  if (hasPast && hasPresent) {
    score -= 10;
    tenseHint = 'Bullets mix past and present tense. Use past tense consistently for all roles.';
  }

  return { score: Math.max(score, 0), tenseHint };
}

export function scoreLengthDensity(resume: Record<string, unknown>): number {
  const experiences = Array.isArray(resume.experience) ? resume.experience as Record<string, unknown>[] : [];
  const skills = Array.isArray(resume.skills) ? resume.skills : [];

  let totalBullets = 0;
  let totalDescWords = 0;

  for (const e of experiences) {
    const achievements = Array.isArray(e.achievements) ? e.achievements.length : 0;
    const responsibilities = Array.isArray(e.responsibilities) ? e.responsibilities.length : 0;
    totalBullets += achievements + responsibilities;

    // Count words in prose description paragraphs as equivalent content
    const desc = String(e.description || '').trim();
    if (desc.length > 0) {
      const wordCount = desc.split(/\s+/).filter(Boolean).length;
      // ~15 words ≈ 1 bullet in density terms
      totalDescWords += wordCount;
    }
  }

  // Convert description words to equivalent bullet count (15 words ≈ 1 bullet)
  const descEquivalentBullets = Math.floor(totalDescWords / 15);
  const effectiveBullets = totalBullets + descEquivalentBullets;

  let score: number;
  if (effectiveBullets === 0) score = 10;
  else if (effectiveBullets <= 3) score = 30;
  else if (effectiveBullets <= 8) score = 50;
  else if (effectiveBullets <= 15) score = 75;
  else score = 100;

  if (skills.length < 3) score -= 20;
  if (experiences.length < 1) score -= 30;

  return Math.max(Math.min(score, 100), 0);
}

export function scoreKeywordOptimization(resume: Record<string, unknown>): { score: number; keywordGaps: string[] } {
  const skillsArr = Array.isArray(resume.skills) ? resume.skills : [];

  const skillNames: string[] = skillsArr.map((s: unknown) => {
    if (typeof s === 'string') return s.toLowerCase().trim();
    if (s && typeof s === 'object' && 'name' in (s as Record<string, unknown>)) {
      return String((s as Record<string, string>).name || '').toLowerCase().trim();
    }
    return String(s).toLowerCase().trim();
  }).filter(Boolean);

  if (skillNames.length === 0) return { score: 0, keywordGaps: [] };

  const textParts: string[] = [];
  if (typeof resume.summary === 'string') textParts.push(resume.summary);

  const experiences = Array.isArray(resume.experience) ? resume.experience as Record<string, unknown>[] : [];
  for (const e of experiences) {
    if (e.description) textParts.push(String(e.description));
    if (e.position) textParts.push(String(e.position));
    if (Array.isArray(e.achievements)) {
      for (const a of e.achievements) textParts.push(String(a));
    }
    if (Array.isArray(e.responsibilities)) {
      for (const r of e.responsibilities) textParts.push(String(r));
    }
  }

  const textBlob = textParts.join(' ');

  let echoedCount = 0;
  const keywordGaps: string[] = [];

  for (const skill of skillNames) {
    if (skill.length >= 1 && skillMatchesText(skill, textBlob)) {
      echoedCount++;
    } else if (skill.length >= 1) {
      // Preserve original casing for display
      const original = skillsArr.find((s: unknown) => {
        if (typeof s === 'string') return s.toLowerCase().trim() === skill;
        if (s && typeof s === 'object' && 'name' in (s as Record<string, unknown>)) {
          return String((s as Record<string, string>).name || '').toLowerCase().trim() === skill;
        }
        return false;
      });
      if (original) {
        const displayName = typeof original === 'string'
          ? original.trim()
          : String((original as Record<string, string>).name || '').trim();
        keywordGaps.push(displayName);
      } else {
        keywordGaps.push(skill);
      }
    }
  }

  const echoRatio = echoedCount / skillNames.length;

  let score: number;
  if (echoRatio === 0) score = 25;
  else if (echoRatio <= 0.3) score = 40;
  else if (echoRatio <= 0.6) score = 60;
  else if (echoRatio <= 0.8) score = 80;
  else score = 95;

  if (skillNames.length >= 8) score = Math.min(score + 5, 100);

  return { score, keywordGaps };
}

export interface WeakBullet {
  text: string;
  reason: 'no_action_verb' | 'no_metric' | 'both';
}

export function scoreContentQuality(resume: Record<string, unknown>): { score: number; weakBullets: WeakBullet[] } {
  const experiences = Array.isArray(resume.experience) ? resume.experience as Record<string, unknown>[] : [];

  const bullets: string[] = [];
  let hasOnlyParagraphs = true;

  for (const e of experiences) {
    if (Array.isArray(e.achievements)) {
      for (const a of e.achievements) {
        bullets.push(String(a).trim());
        hasOnlyParagraphs = false;
      }
    }
    if (Array.isArray(e.responsibilities)) {
      for (const r of e.responsibilities) {
        bullets.push(String(r).trim());
        hasOnlyParagraphs = false;
      }
    }
  }

  if (bullets.length === 0) {
    let hasDesc = false;
    for (const e of experiences) {
      if (e.description && String(e.description).trim().length > 0) hasDesc = true;
    }
    return { score: hasDesc ? 15 : 5, weakBullets: [] };
  }

  let actionVerbCount = 0;
  let quantifiedCount = 0;
  const weakBullets: WeakBullet[] = [];

  for (const bullet of bullets) {
    const firstWord = bullet.split(/\s+/)[0]?.replace(/[^a-zA-Z]/g, '').toLowerCase();
    const hasActionVerb = !!(firstWord && ACTION_VERBS.has(firstWord));
    if (hasActionVerb) actionVerbCount++;

    // Quantification: has a number that is NOT a standalone 4-digit year and NOT a version number
    const hasMetric = hasQuantifiableMetric(bullet);
    if (hasMetric) quantifiedCount++;

    const lacksVerb = !hasActionVerb;
    const lacksMetric = !hasMetric;

    if (lacksVerb && lacksMetric) {
      weakBullets.push({ text: bullet, reason: 'both' });
    } else if (lacksVerb) {
      weakBullets.push({ text: bullet, reason: 'no_action_verb' });
    } else if (lacksMetric) {
      weakBullets.push({ text: bullet, reason: 'no_metric' });
    }
  }

  const actionVerbRatio = actionVerbCount / bullets.length;
  const quantifiedRatio = quantifiedCount / bullets.length;

  let score = Math.round(actionVerbRatio * 50 + quantifiedRatio * 50);

  if (hasOnlyParagraphs) {
    score = Math.min(score, 40);
  }

  return { score: Math.max(Math.min(score, 100), 0), weakBullets };
}

/**
 * Returns true if a bullet contains a meaningful quantifiable metric.
 * Excludes: standalone 4-digit years (e.g. "2019"), version numbers (e.g. "v2.0", "2.0.1"),
 * and currency-less bare years in date ranges.
 */
function hasQuantifiableMetric(text: string): boolean {
  // Must have at least one digit
  if (!/\d/.test(text) && !/[%$€£]/.test(text)) return false;

  // Currency symbols always count
  if (/[%$€£]/.test(text)) return true;

  // Remove version numbers: v1.2, 2.0.1, v10.3.2, etc.
  const withoutVersions = text.replace(/\bv?\d+\.\d+(\.\d+)*\b/gi, '');

  // Remove standalone 4-digit years (1900–2099)
  const withoutYears = withoutVersions.replace(/\b(19|20)\d{2}\b/g, '');

  // After removals, check if meaningful digits remain
  return /\d+/.test(withoutYears);
}

// ── Deterministic Feedback Generation ────────────────────────────────

type Severity = 'critical' | 'warning' | 'good';

interface SeverityMessages {
  critical: string;
  warning: string;
  good: string;
}

const FEEDBACK_MAP: Record<string, { strength: string; improvement: SeverityMessages }> = {
  keywordOptimization: {
    strength: 'Skills are well-echoed throughout experience descriptions.',
    improvement: {
      critical: 'Critical: Very few skills appear in your experience. Weave your listed skills into bullet points immediately.',
      warning: 'Mention your listed skills within your experience bullets to improve keyword matching.',
      good: 'Consider echoing a few more skills in your experience to maximize keyword coverage.',
    },
  },
  contentQuality: {
    strength: 'Strong use of action verbs and quantified achievements.',
    improvement: {
      critical: 'Critical: Bullets lack action verbs and numbers. Rewrite each bullet to start with a verb and include a measurable result.',
      warning: 'Start bullets with action verbs and add numbers/metrics to quantify your impact.',
      good: 'Try adding metrics to a few more bullets to strengthen your impact statements.',
    },
  },
  sectionStructure: {
    strength: 'Resume includes all essential sections.',
    improvement: {
      critical: 'Critical: Key sections are missing. Add Summary, Skills, and Education at minimum.',
      warning: 'Add missing sections like Summary, Skills, or Education to strengthen structure.',
      good: 'Consider adding optional sections like Projects or Certifications for extra depth.',
    },
  },
  parsability: {
    strength: 'Dates and formatting are consistent and ATS-friendly.',
    improvement: {
      critical: 'Critical: Formatting issues will cause ATS systems to misread your resume. Fix date consistency and remove special characters.',
      warning: 'Use consistent date formats and ensure all experience entries have descriptions.',
      good: 'Minor formatting inconsistencies detected. Standardize your date format across all entries.',
    },
  },
  contactCompleteness: {
    strength: 'Contact information is complete with all key details.',
    improvement: {
      critical: 'Critical: Contact information is largely missing. Add name, email, phone, and LinkedIn immediately.',
      warning: 'Add missing contact details like phone, email, or LinkedIn profile.',
      good: 'Consider adding a LinkedIn or portfolio link for a complete contact section.',
    },
  },
  lengthDensity: {
    strength: 'Good density of bullet points across experience entries.',
    improvement: {
      critical: 'Critical: Resume is very thin on content. Add detailed bullet points to each experience entry.',
      warning: 'Add more achievement bullets to your experience entries for better depth.',
      good: 'A few more bullets in your recent roles would improve overall density.',
    },
  },
  templateFriendliness: {
    strength: 'Using an ATS-friendly template layout.',
    improvement: {
      critical: 'Critical: Your template uses a layout that ATS systems struggle to parse. Switch to a single-column text-focused template.',
      warning: 'Switch to a single-column, text-focused template for better ATS parsing.',
      good: 'Your template is mostly ATS-friendly. Consider switching to a single-column layout for best results.',
    },
  },
};

function getSeverity(score: number): Severity {
  if (score < 30) return 'critical';
  if (score < 60) return 'warning';
  return 'good';
}

export function generateFeedback(categories: Record<string, number>): { topStrength: string; topImprovement: string } {
  let bestKey = 'sectionStructure';
  let worstKey = 'sectionStructure';
  let bestScore = -1;
  let worstScore = 101;

  for (const [key, val] of Object.entries(categories)) {
    if (val > bestScore) { bestScore = val; bestKey = key; }
    if (val < worstScore) { worstScore = val; worstKey = key; }
  }

  const strengthMsg = FEEDBACK_MAP[bestKey]?.strength || 'Resume has been evaluated.';
  const severity = getSeverity(worstScore);
  const improvementMsg = FEEDBACK_MAP[worstKey]?.improvement[severity]
    || 'Consider adding more quantified achievements.';

  return {
    topStrength: strengthMsg,
    topImprovement: improvementMsg,
  };
}
