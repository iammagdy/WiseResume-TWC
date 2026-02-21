import type { ResumeData } from '@/types/resume';
import { calcContactScore, calcSkillsScore, calcEducationScore } from './resumeCompletionRules';

export interface ATSCheckResult {
  id: string;
  label: string;
  description: string;
  status: 'pass' | 'warn' | 'fail';
  tip?: string;
}

const ACTION_VERBS = new Set([
  'led', 'managed', 'developed', 'created', 'designed', 'implemented',
  'built', 'launched', 'delivered', 'achieved', 'improved', 'increased',
  'reduced', 'optimized', 'streamlined', 'established', 'coordinated',
  'directed', 'executed', 'generated', 'negotiated', 'orchestrated',
  'pioneered', 'spearheaded', 'transformed', 'accelerated', 'analyzed',
  'architected', 'automated', 'collaborated', 'consolidated', 'cultivated',
  'drove', 'elevated', 'engineered', 'expanded', 'facilitated',
  'formulated', 'initiated', 'integrated', 'mentored', 'modernized',
  'overhauled', 'produced', 'restructured', 'revamped', 'scaled',
  'supervised', 'trained', 'unified',
]);

const FIRST_PERSON = /\b(I|me|my|mine|myself)\b/i;

const SPECIAL_CHARS = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}★☆●○◆◇▪▫►◄♦♠♣♥♤♡✿❀✦✧⬤⬥§†‡※¶]/u;

const QUANTIFIED = /\d+(\.\d+)?(%|\+|x|k|m|bn?|million|billion|thousand|hundred)?/i;

function detectDateFormat(dateStr: string): string | null {
  if (!dateStr || dateStr.toLowerCase() === 'present' || dateStr.toLowerCase() === 'current') return 'present';
  if (/^\w{3}\s+\d{4}$/.test(dateStr)) return 'MMM YYYY';
  if (/^\w+\s+\d{4}$/.test(dateStr)) return 'MMMM YYYY';
  if (/^\d{2}\/\d{4}$/.test(dateStr)) return 'MM/YYYY';
  if (/^\d{4}-\d{2}$/.test(dateStr)) return 'YYYY-MM';
  if (/^\d{4}$/.test(dateStr)) return 'YYYY';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return 'MM/DD/YYYY';
  return 'other';
}

export function runATSValidation(resume: ResumeData): ATSCheckResult[] {
  const results: ATSCheckResult[] = [];

  // 1. Contact info complete
  const contactScore = calcContactScore(resume.contactInfo);
  results.push({
    id: 'contact',
    label: 'Contact info complete',
    description: contactScore >= 80
      ? 'Name, email, phone, and location are present'
      : 'Missing key contact fields that recruiters need',
    status: contactScore >= 80 ? 'pass' : 'fail',
    tip: contactScore < 80 ? 'Add your full name, email, phone number, and location so ATS systems and recruiters can reach you.' : undefined,
  });

  // 2. Professional summary
  const words = (resume.summary?.trim() || '').split(/\s+/).filter(Boolean);
  const hasFirstPerson = FIRST_PERSON.test(resume.summary || '');
  const summaryOk = words.length >= 50 && !hasFirstPerson;
  const summaryPartial = words.length >= 20;
  results.push({
    id: 'summary',
    label: 'Professional summary',
    description: summaryOk
      ? `${words.length} words, third-person voice`
      : hasFirstPerson
        ? 'Contains first-person pronouns (I, me, my)'
        : `${words.length} words — aim for 50+`,
    status: summaryOk ? 'pass' : 'warn',
    tip: !summaryOk
      ? 'Write a 50-100 word summary in third person. Avoid "I" or "my" — use phrases like "Results-driven engineer with 5+ years..."'
      : undefined,
  });

  // 3. Experience has dates
  const expWithDates = resume.experience.filter(e => e.startDate?.trim());
  const allHaveDates = resume.experience.length > 0 && expWithDates.length === resume.experience.length;
  results.push({
    id: 'dates',
    label: 'Experience has dates',
    description: resume.experience.length === 0
      ? 'No experience entries found'
      : allHaveDates
        ? 'All entries have start dates'
        : `${expWithDates.length}/${resume.experience.length} entries have dates`,
    status: resume.experience.length === 0 ? 'warn' : allHaveDates ? 'pass' : 'warn',
    tip: !allHaveDates ? 'Add start and end dates to every role. ATS systems use dates to calculate tenure and detect gaps.' : undefined,
  });

  // 4. Bullet points present
  const bulletsPerEntry = resume.experience.map(e =>
    (e.achievements?.length || 0) + (e.responsibilities?.length || 0)
  );
  const entriesWithBullets = bulletsPerEntry.filter(c => c >= 2).length;
  const bulletsOk = resume.experience.length > 0 && entriesWithBullets === resume.experience.length;
  results.push({
    id: 'bullets',
    label: 'Bullet points present',
    description: resume.experience.length === 0
      ? 'No experience to check'
      : bulletsOk
        ? '2+ bullets per role'
        : `${entriesWithBullets}/${resume.experience.length} roles have 2+ bullets`,
    status: resume.experience.length === 0 ? 'warn' : bulletsOk ? 'pass' : 'warn',
    tip: !bulletsOk ? 'Add at least 2 achievement bullets per role to highlight your impact.' : undefined,
  });

  // 5. Action verbs used
  const allBullets = resume.experience.flatMap(e => [
    ...(e.achievements || []),
    ...(e.responsibilities || []),
  ]);
  const bulletsWithVerbs = allBullets.filter(b => {
    const firstWord = b.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '');
    return ACTION_VERBS.has(firstWord);
  });
  const verbRatio = allBullets.length > 0 ? bulletsWithVerbs.length / allBullets.length : 0;
  results.push({
    id: 'verbs',
    label: 'Action verbs used',
    description: allBullets.length === 0
      ? 'No bullets to check'
      : verbRatio >= 0.5
        ? `${bulletsWithVerbs.length}/${allBullets.length} bullets start with action verbs`
        : `Only ${bulletsWithVerbs.length}/${allBullets.length} bullets use action verbs`,
    status: allBullets.length === 0 ? 'warn' : verbRatio >= 0.5 ? 'pass' : 'warn',
    tip: verbRatio < 0.5 ? 'Start bullets with strong verbs: Led, Built, Delivered, Increased, Optimized.' : undefined,
  });

  // 6. Quantified results
  const bulletsWithNumbers = allBullets.filter(b => QUANTIFIED.test(b));
  const hasQuantified = bulletsWithNumbers.length >= 1;
  results.push({
    id: 'quantified',
    label: 'Quantified results',
    description: allBullets.length === 0
      ? 'No bullets to check'
      : hasQuantified
        ? `${bulletsWithNumbers.length} bullet(s) include metrics`
        : 'No bullets contain numbers or percentages',
    status: allBullets.length === 0 ? 'warn' : hasQuantified ? 'pass' : 'warn',
    tip: !hasQuantified ? 'Add numbers: "Increased revenue by 25%" or "Managed team of 12" makes impact concrete.' : undefined,
  });

  // 7. Skills count
  const skillsScore = calcSkillsScore(resume.skills);
  results.push({
    id: 'skills',
    label: 'Skills count adequate',
    description: resume.skills.length === 0
      ? 'No skills listed'
      : `${resume.skills.length} skills listed`,
    status: skillsScore >= 70 ? 'pass' : 'warn',
    tip: skillsScore < 70 ? 'List at least 5-10 relevant technical and soft skills that match your target role.' : undefined,
  });

  // 8. Education complete
  const eduScore = calcEducationScore(resume.education);
  results.push({
    id: 'education',
    label: 'Education complete',
    description: resume.education.length === 0
      ? 'No education entries'
      : eduScore >= 100
        ? 'Institution, degree, and dates present'
        : 'Missing degree or dates',
    status: eduScore >= 100 ? 'pass' : 'warn',
    tip: eduScore < 100 ? 'Include institution name, degree/field, and graduation date for each entry.' : undefined,
  });

  // 9. No special characters
  const allText = [
    resume.summary || '',
    ...allBullets,
    ...resume.skills,
    ...(resume.education.map(e => `${e.institution} ${e.degree}`)),
  ].join(' ');
  const hasSpecial = SPECIAL_CHARS.test(allText);
  results.push({
    id: 'special_chars',
    label: 'No special characters',
    description: hasSpecial
      ? 'Contains emojis or symbols that may break ATS'
      : 'Clean text — no problematic symbols',
    status: hasSpecial ? 'warn' : 'pass',
    tip: hasSpecial ? 'Remove emojis, icons, and decorative symbols. ATS parsers may misread or drop them.' : undefined,
  });

  // 10. Consistent date format
  const allDates = resume.experience.flatMap(e =>
    [e.startDate, e.endDate].filter(Boolean).map(d => d!)
  );
  const formats = allDates.map(detectDateFormat).filter(f => f && f !== 'present');
  const uniqueFormats = new Set(formats);
  const datesConsistent = uniqueFormats.size <= 1;
  results.push({
    id: 'date_format',
    label: 'Consistent date format',
    description: allDates.length === 0
      ? 'No dates to check'
      : datesConsistent
        ? `All dates use ${[...uniqueFormats][0] || 'same'} format`
        : `Mixed formats found: ${[...uniqueFormats].join(', ')}`,
    status: allDates.length === 0 ? 'warn' : datesConsistent ? 'pass' : 'warn',
    tip: !datesConsistent ? 'Use one date format throughout (e.g., "Jan 2023" everywhere). Mixing formats confuses parsers.' : undefined,
  });

  return results;
}
