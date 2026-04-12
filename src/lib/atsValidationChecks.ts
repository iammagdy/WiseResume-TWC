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
  // Leadership & Management
  'led', 'managed', 'directed', 'supervised', 'coordinated', 'orchestrated',
  'oversaw', 'headed', 'chaired', 'governed', 'administered', 'mentored',
  'coached', 'guided', 'advised', 'championed', 'spearheaded', 'pioneered',
  'initiated', 'established', 'founded', 'launched', 'executed', 'delegated',

  // Engineering & Technical
  'developed', 'built', 'designed', 'implemented', 'architected', 'engineered',
  'programmed', 'coded', 'deployed', 'automated', 'integrated', 'migrated',
  'modernized', 'refactored', 'optimized', 'debugged', 'configured', 'maintained',
  'upgraded', 'installed', 'tested', 'validated', 'prototyped', 'scaled',
  'containerized', 'provisioned', 'monitored', 'secured', 'hardened',

  // Analysis & Strategy
  'analyzed', 'assessed', 'evaluated', 'identified', 'investigated', 'researched',
  'audited', 'diagnosed', 'measured', 'tracked', 'benchmarked', 'forecasted',
  'modeled', 'projected', 'reviewed', 'synthesized', 'interpreted', 'mapped',
  'formulated', 'devised', 'strategized', 'planned', 'prioritized',

  // Delivery & Results
  'delivered', 'achieved', 'improved', 'increased', 'reduced', 'accelerated',
  'generated', 'drove', 'boosted', 'maximized', 'minimized', 'exceeded',
  'surpassed', 'produced', 'completed', 'finalized', 'resolved', 'closed',
  'won', 'secured', 'captured', 'retained', 'recovered',

  // Finance & Accounting
  'budgeted', 'allocated', 'forecasted', 'audited', 'reconciled', 'reported',
  'calculated', 'projected', 'managed', 'controlled', 'reduced', 'saved',
  'financed', 'invested', 'underwrote', 'priced', 'valued', 'negotiated',

  // Marketing & Growth
  'marketed', 'promoted', 'advertised', 'branded', 'positioned', 'launched',
  'campaigned', 'targeted', 'segmented', 'engaged', 'converted', 'acquired',
  'retained', 'reactivated', 'grew', 'expanded', 'scaled', 'optimized',
  'tested', 'experimented', 'personalized', 'authored', 'published', 'wrote',

  // Operations & Process
  'streamlined', 'standardized', 'consolidated', 'restructured', 'revamped',
  'overhauled', 'transformed', 'unified', 'centralized', 'simplified',
  'documented', 'processed', 'operated', 'facilitated', 'supported',
  'scheduled', 'sourced', 'procured', 'negotiated', 'contracted', 'maintained',

  // Collaboration & Communication
  'collaborated', 'partnered', 'liaised', 'presented', 'communicated',
  'trained', 'educated', 'onboarded', 'facilitated', 'moderated',
  'advocated', 'influenced', 'persuaded', 'built', 'cultivated', 'engaged',

  // Sales & Business Development
  'sold', 'pitched', 'prospected', 'qualified', 'closed', 'upsold', 'renewed',
  'negotiated', 'acquired', 'developed', 'grew', 'expanded', 'penetrated',

  // Healthcare & Clinical
  'assessed', 'diagnosed', 'treated', 'administered', 'monitored', 'documented',
  'coordinated', 'collaborated', 'educated', 'counseled', 'referred', 'triaged',
  'performed', 'conducted', 'implemented', 'evaluated', 'reviewed',

  // Legal & Compliance
  'drafted', 'reviewed', 'negotiated', 'advised', 'represented', 'litigated',
  'arbitrated', 'mediated', 'researched', 'filed', 'complied', 'enforced',
  'interpreted', 'counseled', 'defended', 'prosecuted', 'argued',

  // Education & Academic
  'taught', 'instructed', 'lectured', 'facilitated', 'developed', 'designed',
  'assessed', 'evaluated', 'mentored', 'tutored', 'supervised', 'published',
  'presented', 'researched', 'collaborated', 'awarded', 'contributed',
]);

const FIRST_PERSON = /\b(I|me|my|mine|myself)\b/i;

const SPECIAL_CHARS = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}★☆●○◆◇▪▫►◄♦♠♣♥♤♡✿❀✦✧⬤⬥§†‡※¶]/u;

const QUANTIFIED = /\d+(\.\d+)?(%|\+|x|k|m|bn?|million|billion|thousand|hundred)?/i;

const PHONE_REGEX = /(?:\+?\d[\d\s\-\(\)\.]{6,}\d|\(\d{3}\)\s*\d{3}[\s\-]\d{4}|\d{3}[\s\-\.]\d{3}[\s\-\.]\d{4})/;

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

  // 2. Phone number present
  const hasPhone = !!(resume.contactInfo.phone?.trim()) && PHONE_REGEX.test(resume.contactInfo.phone);
  results.push({
    id: 'phone',
    label: 'Phone number present',
    description: hasPhone
      ? 'Phone number is included in contact info'
      : 'No phone number found in contact info',
    status: hasPhone ? 'pass' : 'warn',
    tip: !hasPhone ? 'Add a phone number so recruiters can easily reach you. Many ATS systems require a phone to complete an application.' : undefined,
  });

  // 3. Professional summary
  const words = (resume.summary?.trim() || '').split(/\s+/).filter(Boolean);
  const hasFirstPerson = FIRST_PERSON.test(resume.summary || '');
  const summaryOk = words.length >= 50 && !hasFirstPerson;
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

  // 4. Section ordering: ATS-preferred order is Summary → Experience → Education.
  // Detectable violations using resume data signals:
  //  (a) Experience present but no summary → summary section is absent/out of order
  //  (b) Education-only resume with no experience → education before experience signal
  //  (c) Graduation year is more recent than any experience startDate → education
  //      entries appear to come before work history chronologically
  const hasSummary = !!(resume.summary?.trim());
  const hasExperience = resume.experience?.length > 0;
  const hasEducation = resume.education?.length > 0;

  const orderIssues: string[] = [];

  // (a) No summary but has experience
  if (hasExperience && !hasSummary) {
    orderIssues.push('no summary before experience');
  }

  // (b) Has education entries but no experience at all — education is the first section
  if (hasEducation && !hasExperience) {
    orderIssues.push('education present but no experience section');
  }

  // (c) Most recent education end year is newer than most recent experience start year
  // — signals that the resume would read Education → Experience rather than the preferred order
  if (hasExperience && hasEducation) {
    // Extract 4-digit year from date strings in various formats (YYYY-MM, Jan YYYY, YYYY, etc.)
    const extractYear = (d: string) => { const m = (d || '').match(/\b(19|20)\d{2}\b/); return m ? parseInt(m[0]) : NaN; };
    const expYears = resume.experience.map(e => extractYear(e.startDate || '')).filter(y => !isNaN(y));
    const eduYears = resume.education.map(e => extractYear(e.endDate || '')).filter(y => !isNaN(y));
    if (expYears.length > 0 && eduYears.length > 0) {
      const mostRecentExp = Math.max(...expYears);
      const mostRecentEdu = Math.max(...eduYears);
      if (mostRecentEdu > mostRecentExp) {
        orderIssues.push('most recent education year is after most recent experience start year');
      }
    }
  }

  const orderOk = orderIssues.length === 0;

  results.push({
    id: 'section_order',
    label: 'Section order (ATS standard)',
    description: orderOk
      ? 'Sections follow ATS-preferred order: Summary, Experience, Education'
      : `Section ordering issue detected: ${orderIssues[0]}`,
    status: orderOk ? 'pass' : 'warn',
    tip: !orderOk ? 'ATS systems expect: Summary first, then Experience, then Education. Ensure your summary is present and that work experience precedes educational history.' : undefined,
  });

  // 5. Experience has dates
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

  // 6. Bullet points present
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

  // 7. Action verbs used
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

  // 8. Quantified results
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

  // 9. Skills count
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

  // 10. Education complete
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

  // 11. No special characters
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

  // 12. Consistent date format
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
