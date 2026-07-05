/**
 * Remote Jobs Feed — Core Normalization, Deduplication, Role Classification & Salary Parsing
 *
 * Single source of truth for remote job data structures, deduplication hash logic,
 * role group classification, salary parsing, and API/RSS source normalizers.
 */

export type JobSource = 'remotive' | 'weworkremotely' | 'jobicy' | 'remoteok' | 'arbeitnow' | 'himalayas' | 'greenhouse' | 'lever';

export type RoleGroup =
  | 'easy_entry_level'
  | 'customer_support'
  | 'data_entry'
  | 'virtual_assistant'
  | 'admin'
  | 'content_creator'
  | 'content_writer'
  | 'social_media'
  | 'marketing'
  | 'sales'
  | 'writing'
  | 'design'
  | 'operations'
  | 'hr_recruiting'
  | 'finance'
  | 'education'
  | 'healthcare'
  | 'tech_programming'
  | 'other';

export type SalaryPeriod = 'hourly' | 'monthly' | 'yearly' | 'unknown';

export type NormalizedRemoteJob = {
  $id?: string;
  source: JobSource;
  source_job_id: string;
  title: string;
  company: string;
  company_logo?: string;
  location?: string;
  remote_region?: string;
  category?: string;
  role_group: RoleGroup;
  job_type?: string;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_amount_min?: number | null;
  salary_amount_max?: number | null;
  salary_currency?: string | null;
  salary_period: SalaryPeriod;
  salary_display: string;
  salary_confidence?: 'high' | 'medium' | 'low' | 'unknown' | null;
  salary_source?: 'api' | 'structured_source' | 'rss_parsed' | 'text_heuristics' | 'unknown' | null;
  salary_quality?: 'trusted' | 'estimated' | 'untrusted' | null;
  seniority_level?: 'entry_level' | 'junior' | 'mid' | 'senior' | 'lead' | 'internship' | 'unknown' | null;
  easy_job_score?: number | null;
  region_fit?: string[] | null;
  freshness_status?: 'fresh' | 'recent' | 'older' | 'archived' | null;
  published_at?: string | null;
  description_excerpt?: string;
  description_html?: string;
  canonical_url: string;
  apply_url: string;
  tags?: string[];
  dedupe_key: string;
  content_hash: string;
  fetched_at: string;
  status: 'active' | 'expired' | 'unknown';
};

export type UserJobActionStatus = 'saved' | 'applied' | 'dismissed' | 'tailored' | 'ready_to_apply';

export type UserJobAction = {
  $id?: string;
  user_id: string;
  job_feed_item_id: string;
  canonical_url: string;
  status: UserJobActionStatus;
  applied_at?: string;
  saved_at?: string;
  dismissed_at?: string;
  notes?: string;
  source_resume_id?: string;
  tailored_resume_id?: string;
  generated_cover_letter_id?: string;
};

export const ROLE_GROUPS: { id: RoleGroup | 'all'; label: string }[] = [
  { id: 'all', label: 'All Jobs' },
  { id: 'easy_entry_level', label: 'Easy / Entry Level' },
  { id: 'customer_support', label: 'Customer Support' },
  { id: 'data_entry', label: 'Data Entry' },
  { id: 'virtual_assistant', label: 'Virtual Assistant' },
  { id: 'admin', label: 'Admin Assistant' },
  { id: 'content_creator', label: 'Content Creator' },
  { id: 'content_writer', label: 'Content Writer' },
  { id: 'social_media', label: 'Social Media' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'sales', label: 'Sales' },
  { id: 'writing', label: 'Writing & Content' },
  { id: 'design', label: 'Design & Creative' },
  { id: 'operations', label: 'Operations & Management' },
  { id: 'hr_recruiting', label: 'HR & Recruiting' },
  { id: 'finance', label: 'Finance & Accounting' },
  { id: 'education', label: 'Education & Tutoring' },
  { id: 'healthcare', label: 'Healthcare & Medical' },
  { id: 'tech_programming', label: 'Tech & Programming' },
  { id: 'other', label: 'Other Remote Roles' },
];

/**
 * Strong Deduplication Key Generator
 * Primary: source + ":" + source_job_id
 * Fallback: lower(company) + "|" + lower(title) + "|" + canonical_url
 */
export function computeDedupeKey(
  source: JobSource,
  sourceJobId?: string | number | null,
  company?: string | null,
  title?: string | null,
  canonicalUrl?: string | null,
): string {
  const cleanSourceJobId = sourceJobId ? String(sourceJobId).trim() : '';
  if (cleanSourceJobId) {
    return `${source}:${cleanSourceJobId}`;
  }

  const cleanCompany = (company || '').toLowerCase().trim();
  const cleanTitle = (title || '').toLowerCase().trim();
  const cleanUrl = (canonicalUrl || '').toLowerCase().trim();
  return `${cleanCompany}|${cleanTitle}|${cleanUrl}`;
}

/**
 * Generate string content hash to detect changes across syncs
 */
export function computeContentHash(
  title: string,
  company: string,
  canonicalUrl: string,
  publishedAt?: string | null,
): string {
  const raw = `${title.trim()}|${company.trim()}|${canonicalUrl.trim()}|${publishedAt || ''}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(16)}`;
}

/**
 * Sanitize raw text into a safe excerpt
 */
export function createExcerpt(htmlOrText: string, maxChars = 280): string {
  if (!htmlOrText) return '';
  const cleanText = htmlOrText
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleanText.length <= maxChars) return cleanText;
  return cleanText.slice(0, maxChars) + '...';
}

/**
 * Role Group Keyword Classification Engine
 */
export function classifyRoleGroup(
  title: string = '',
  category: string = '',
  tags: string[] = [],
  descriptionExcerpt: string = '',
): RoleGroup {
  const t = title.toLowerCase();
  const c = category.toLowerCase();
  const tagStr = tags.join(' ').toLowerCase();
  const desc = descriptionExcerpt.toLowerCase();
  const combined = `${t} ${c} ${tagStr} ${desc}`;

  // 1. Specific Functional Groups (Data Entry, Virtual Assistant, Social Media, Content Creator, Content Writer first)
  if (t.includes('data entry') || combined.includes('data entry') || combined.includes('data clerk') || combined.includes('transcriptionist') || combined.includes('spreadsheet') || combined.includes('data processing')) {
    return 'data_entry';
  }

  if (t.includes('virtual assistant') || combined.includes('virtual assistant') || combined.includes('personal assistant') || combined.includes('executive assistant')) {
    return 'virtual_assistant';
  }

  if (t.includes('social media') || combined.includes('social media') || combined.includes('community manager') || combined.includes('instagram') || combined.includes('tiktok')) {
    return 'social_media';
  }

  if (t.includes('content creator') || combined.includes('content creator') || combined.includes('videographer') || combined.includes('video editor') || combined.includes('media creator')) {
    return 'content_creator';
  }

  if (t.includes('content writer') || t.includes('copywriter') || combined.includes('content writer') || combined.includes('blog writer') || combined.includes('creative writer')) {
    return 'content_writer';
  }

  // 2. Explicit Entry Level / Easy Roles
  if (
    t.includes('entry level') ||
    t.includes('junior') ||
    t.includes('no experience') ||
    t.includes('beginner') ||
    t.includes('intern') ||
    t.includes('content moderator')
  ) {
    return 'easy_entry_level';
  }

  if (
    t.includes('customer support') ||
    t.includes('customer service') ||
    t.includes('customer success') ||
    t.includes('support specialist') ||
    t.includes('chat support') ||
    t.includes('help desk') ||
    t.includes('support agent') ||
    c.includes('customer support') ||
    c.includes('customer service')
  ) {
    return 'customer_support';
  }

  if (
    t.includes('admin') ||
    t.includes('office assistant') ||
    t.includes('office coordinator') ||
    t.includes('administrative') ||
    t.includes('executive secretary') ||
    c.includes('admin')
  ) {
    return 'admin';
  }

  if (
    t.includes('writer') ||
    t.includes('editor') ||
    t.includes('proofreader') ||
    t.includes('journalist') ||
    c.includes('writing') ||
    c.includes('copywriting')
  ) {
    return 'writing';
  }

  if (
    t.includes('designer') ||
    t.includes('graphic') ||
    t.includes('product design') ||
    t.includes('ui/ux') ||
    t.includes('illustrator') ||
    t.includes('animator') ||
    t.includes('art director') ||
    c.includes('design')
  ) {
    return 'design';
  }

  if (
    t.includes('marketing') ||
    t.includes('growth') ||
    t.includes('seo') ||
    t.includes('sem') ||
    t.includes('brand') ||
    t.includes('email marketing') ||
    c.includes('marketing') ||
    c.includes('sales and marketing')
  ) {
    return 'marketing';
  }

  if (
    t.includes('sales') ||
    t.includes('account executive') ||
    t.includes('sdr') ||
    t.includes('bdr') ||
    t.includes('business development') ||
    t.includes('account manager') ||
    c.includes('sales')
  ) {
    return 'sales';
  }

  if (
    t.includes('recruiter') ||
    t.includes('talent acquisition') ||
    t.includes('human resources') ||
    t.includes('hr manager') ||
    t.includes('people operations') ||
    c.includes('human resources') ||
    c.includes('hr')
  ) {
    return 'hr_recruiting';
  }

  if (
    t.includes('accountant') ||
    t.includes('bookkeeper') ||
    t.includes('finance') ||
    t.includes('payroll') ||
    t.includes('financial analyst') ||
    t.includes('tax') ||
    t.includes('auditor') ||
    c.includes('finance') ||
    c.includes('management and finance')
  ) {
    return 'finance';
  }

  if (
    t.includes('tutor') ||
    t.includes('teacher') ||
    t.includes('instructor') ||
    t.includes('esl') ||
    t.includes('curriculum') ||
    t.includes('academic') ||
    c.includes('education')
  ) {
    return 'education';
  }

  if (
    t.includes('medical') ||
    t.includes('healthcare') ||
    t.includes('nurse') ||
    t.includes('therapist') ||
    t.includes('clinical') ||
    t.includes('physician') ||
    t.includes('billing specialist') ||
    c.includes('healthcare') ||
    c.includes('medical')
  ) {
    return 'healthcare';
  }

  if (
    t.includes('operations') ||
    t.includes('project coordinator') ||
    t.includes('project manager') ||
    t.includes('scrum master') ||
    t.includes('logistics') ||
    t.includes('general manager') ||
    c.includes('management') ||
    c.includes('operations')
  ) {
    return 'operations';
  }

  if (
    t.includes('engineer') ||
    t.includes('developer') ||
    t.includes('software') ||
    t.includes('full-stack') ||
    t.includes('fullstack') ||
    t.includes('backend') ||
    t.includes('frontend') ||
    t.includes('devops') ||
    t.includes('sysadmin') ||
    t.includes('data scientist') ||
    t.includes('programmer') ||
    t.includes('architect') ||
    t.includes('sdet') ||
    t.includes('qa') ||
    c.includes('programming') ||
    c.includes('software development') ||
    c.includes('devops')
  ) {
    return 'tech_programming';
  }

  return 'other';
}

/**
 * Explicit Salary / Rate Parser with Quality Controls
 */
export function parseSalaryInfo(
  rawSalaryText: string = '',
  minSalaryInput?: number | null,
  maxSalaryInput?: number | null,
  currencyInput?: string | null,
): {
  amountMin: number | null;
  amountMax: number | null;
  currency: string | null;
  period: SalaryPeriod;
  display: string;
  confidence: 'high' | 'medium' | 'low' | 'unknown';
  source: 'api' | 'structured_source' | 'rss_parsed' | 'text_heuristics' | 'unknown';
  quality: 'trusted' | 'estimated' | 'untrusted';
} {
  let min = typeof minSalaryInput === 'number' && minSalaryInput > 0 ? minSalaryInput : null;
  let max = typeof maxSalaryInput === 'number' && maxSalaryInput > 0 ? maxSalaryInput : null;
  let currency = currencyInput ? String(currencyInput).toUpperCase().slice(0, 4) : null;

  if (min !== null || max !== null) {
    if (!currency) currency = 'USD';
    const sample = max || min || 0;
    let period: SalaryPeriod = 'unknown';
    if (sample < 500) period = 'hourly';
    else if (sample >= 500 && sample < 15000) period = 'monthly';
    else period = 'yearly';

    const currSymbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
    const isYearly = period === 'yearly';
    const formatVal = (val: number) => {
      if (isYearly && val >= 1000) return `${Math.round(val / 1000)}k`;
      return val.toLocaleString();
    };
    const periodLabel = isYearly ? '/year' : period === 'monthly' ? '/month' : period === 'hourly' ? '/hour' : '';

    let display = 'Salary not listed';
    if (min !== null && max !== null && min !== max) {
      display = `${currSymbol}${formatVal(min)} - ${currSymbol}${formatVal(max)}${periodLabel}`;
    } else if (min !== null || max !== null) {
      display = `${currSymbol}${formatVal(min || max!)}${periodLabel}`;
    }

    return {
      amountMin: min,
      amountMax: max,
      currency,
      period,
      display,
      confidence: 'high',
      source: 'api',
      quality: 'trusted',
    };
  }

  const text = (rawSalaryText || '').trim();
  if (!text) {
    return {
      amountMin: null,
      amountMax: null,
      currency: null,
      period: 'unknown',
      display: 'Salary not listed',
      confidence: 'unknown',
      source: 'unknown',
      quality: 'untrusted',
    };
  }

  // Explicit patterns: Symbol/Code + Value + optional range + Period word together
  const regex = /(?:[\$€£]|USD|EUR|GBP)\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:[kK])?\s*(?:-\s*(?:[\$€£]|USD|EUR|GBP)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:[kK])?)?\s*(?:\/\s*|per\s+)?(hr|hour|hourly|mo|month|monthly|yr|year|yearly|annually|annual)\b/i;
  
  const match = text.match(regex);
  if (match) {
    const rawMin = match[1];
    const rawMax = match[2];
    const rawPeriod = match[3].toLowerCase();

    if (!currency) {
      if (text.includes('€') || text.includes('EUR')) currency = 'EUR';
      else if (text.includes('£') || text.includes('GBP')) currency = 'GBP';
      else currency = 'USD';
    }

    let valMin = parseFloat(rawMin.replace(/,/g, ''));
    if (text.toLowerCase().includes(rawMin.toLowerCase() + 'k')) {
      valMin *= 1000;
    }
    let valMax = rawMax ? parseFloat(rawMax.replace(/,/g, '')) : null;
    if (rawMax && valMax !== null && text.toLowerCase().includes(rawMax.toLowerCase() + 'k')) {
      valMax *= 1000;
    }

    let period: SalaryPeriod = 'unknown';
    if (['hr', 'hour', 'hourly'].includes(rawPeriod)) period = 'hourly';
    else if (['mo', 'month', 'monthly'].includes(rawPeriod)) period = 'monthly';
    else if (['yr', 'year', 'yearly', 'annually', 'annual'].includes(rawPeriod)) period = 'yearly';

    const currSymbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
    const isYearly = period === 'yearly';
    const formatVal = (val: number) => {
      if (isYearly && val >= 1000) return `${Math.round(val / 1000)}k`;
      return val.toLocaleString();
    };
    const periodLabel = isYearly ? '/year' : period === 'monthly' ? '/month' : period === 'hourly' ? '/hour' : '';

    let display = 'Salary not listed';
    if (valMin && valMax && valMin !== valMax) {
      display = `${currSymbol}${formatVal(valMin)} - ${currSymbol}${formatVal(valMax)}${periodLabel}`;
    } else if (valMin || valMax) {
      display = `${currSymbol}${formatVal(valMin || valMax!)}${periodLabel}`;
    }

    if (period === 'yearly' && valMin !== null && valMin < 12000) {
      return {
        amountMin: null,
        amountMax: null,
        currency: null,
        period: 'unknown',
        display: 'Salary not listed',
        confidence: 'low',
        source: 'unknown',
        quality: 'untrusted',
      };
    }

    return {
      amountMin: valMin,
      amountMax: valMax,
      currency,
      period,
      display,
      confidence: 'medium',
      source: 'text_heuristics',
      quality: 'estimated',
    };
  }

  return {
    amountMin: null,
    amountMax: null,
    currency: null,
    period: 'unknown',
    display: 'Salary not listed',
    confidence: 'low',
    source: 'unknown',
    quality: 'untrusted',
  };
}

/**
 * Classify Seniority Level and Easy Job Score
 */
export function classifySeniorityAndEasyScore(
  title: string = '',
  descriptionExcerpt: string = '',
  category: string = '',
  tags: string[] = [],
): {
  seniority: 'entry_level' | 'junior' | 'mid' | 'senior' | 'lead' | 'internship' | 'unknown';
  easyJobScore: number;
  roleGroup: RoleGroup;
} {
  const t = title.toLowerCase();
  const desc = descriptionExcerpt.toLowerCase();
  const c = category.toLowerCase();
  const tagStr = tags.join(' ').toLowerCase();
  const combined = `${t} ${desc} ${c} ${tagStr}`;

  let seniority: 'entry_level' | 'junior' | 'mid' | 'senior' | 'lead' | 'internship' | 'unknown' = 'unknown';
  if (t.includes('intern') || t.includes('co-op') || combined.includes('internship')) {
    seniority = 'internship';
  } else if (t.includes('junior') || t.includes('jr') || t.includes('entry level') || t.includes('entry-level') || t.includes('associate') || t.includes('no experience') || t.includes('fresh grad') || t.includes('graduate')) {
    seniority = 'entry_level';
  } else if (t.includes('senior') || t.includes('sr.') || t.includes('sr ') || t.includes('principal') || t.includes('staff') || t.includes('lead') || t.includes('manager') || t.includes('director') || t.includes('head') || t.includes('vp')) {
    if (t.includes('lead') || t.includes('head') || t.includes('vp') || t.includes('director') || t.includes('manager')) {
      seniority = 'lead';
    } else {
      seniority = 'senior';
    }
  } else {
    const yrsMatch = combined.match(/(\d+)\+?\s*years?\s*of?\s*(?:experience|exp)/i);
    if (yrsMatch) {
      const yrs = parseInt(yrsMatch[1], 10);
      if (yrs <= 2) seniority = 'entry_level';
      else if (yrs > 2 && yrs < 5) seniority = 'mid';
      else if (yrs >= 5 && yrs < 8) seniority = 'senior';
      else if (yrs >= 8) seniority = 'lead';
    } else {
      seniority = 'mid';
    }
  }

  let score = 30; // base score
  if (seniority === 'internship') score += 30;
  if (seniority === 'entry_level') score += 25;
  if (seniority === 'senior') score -= 20;
  if (seniority === 'lead') score -= 35;

  if (t.includes('no experience') || t.includes('no degree') || t.includes('training provided') || t.includes('entry level')) {
    score += 15;
  }
  if (t.includes('assistant') || t.includes('coordinator') || t.includes('clerk') || t.includes('support agent')) {
    score += 10;
  }

  const roleGroup = classifyRoleGroup(title, category, tags, descriptionExcerpt);
  if (['data_entry', 'virtual_assistant'].includes(roleGroup)) {
    score += 20;
  } else if (['customer_support', 'admin', 'writing'].includes(roleGroup)) {
    score += 10;
  } else if (['tech_programming', 'finance'].includes(roleGroup)) {
    score -= 10;
  }

  if (combined.includes('5+ years') || combined.includes('7+ years') || combined.includes('10+ years') || t.includes('expert') || combined.includes('phd')) {
    score -= 20;
  }

  return {
    seniority,
    easyJobScore: Math.max(0, Math.min(100, score)),
    roleGroup,
  };
}

/**
 * Classify Region Fit
 */
export function classifyRegionFit(
  location: string = '',
  remoteRegion: string = '',
  description: string = '',
): string[] {
  const loc = (location || '').toLowerCase();
  const reg = (remoteRegion || '').toLowerCase();
  const desc = (description || '').toLowerCase();
  const combined = `${loc} ${reg} ${desc}`;

  const fit: string[] = [];

  const isUsOnly = 
    loc === 'us' || loc === 'usa' || loc === 'united states' || 
    reg === 'us' || reg === 'usa' || reg === 'united states' ||
    ((combined.includes('us only') || combined.includes('usa only') || combined.includes('united states only')) && 
    !combined.includes('worldwide') && !combined.includes('global'));

  if (isUsOnly) {
    fit.push('us_only');
    return fit;
  }

  const isWorldwide = 
    loc === 'worldwide' || loc === 'anywhere' || loc === 'global' || 
    reg === 'worldwide' || reg === 'anywhere' || reg === 'global' ||
    combined.includes('work from anywhere') || combined.includes('anywhere in the world') || combined.includes('wfa');

  if (isWorldwide) {
    fit.push('worldwide', 'egypt_friendly', 'gulf_friendly', 'mena', 'emea', 'timezone_flexible');
    return fit;
  }

  if (combined.includes('egypt') || combined.includes('cairo') || combined.includes('alexandria') || combined.includes('/eg') || combined.includes(' eg') || combined.includes('egy')) {
    fit.push('egypt_friendly', 'mena', 'emea');
  }

  const hasGulf = 
    combined.includes('saudi') || combined.includes('ksa') || combined.includes('riyadh') || 
    combined.includes('uae') || combined.includes('dubai') || combined.includes('united arab emirates') || 
    combined.includes('qatar') || combined.includes('doha') || 
    combined.includes('kuwait') || 
    combined.includes('bahrain') || 
    combined.includes('oman') || 
    combined.includes('gulf');
  
  if (hasGulf) {
    fit.push('gulf_friendly', 'mena', 'emea');
  }

  if (combined.includes('middle east') || combined.includes('mena') || combined.includes('north africa') || combined.includes('arabian') || combined.includes('arab')) {
    if (!fit.includes('mena')) fit.push('mena');
    if (!fit.includes('egypt_friendly')) fit.push('egypt_friendly');
    if (!fit.includes('gulf_friendly')) fit.push('gulf_friendly');
    if (!fit.includes('emea')) fit.push('emea');
  }

  if (combined.includes('europe') || combined.includes('emea') || combined.includes('eu ') || combined.includes(' uk ') || combined.includes('united kingdom') || combined.includes('germany') || combined.includes('france')) {
    if (!fit.includes('emea')) fit.push('emea');
    if (!fit.includes('europe')) fit.push('europe');
  }

  if (combined.includes('flexible hours') || combined.includes('async') || combined.includes('asynchronous') || combined.includes('work when you want') || combined.includes('choose your own hours')) {
    fit.push('timezone_flexible');
  }

  if (fit.length === 0) {
    fit.push('unknown');
  }

  return fit;
}

// ─── SOURCE PARSERS ───────────────────────────────────────────────────────────

/**
 * Remotive API Normalizer
 */
export function parseRemotiveJob(raw: any): NormalizedRemoteJob | null {
  if (!raw || typeof raw !== 'object') return null;
  const sourceJobId = String(raw.id || '').trim();
  const title = String(raw.title || '').trim();
  const company = String(raw.company_name || '').trim();
  const applyUrl = String(raw.url || '').trim();

  if (!title || !company || !applyUrl) return null;

  const dedupeKey = computeDedupeKey('remotive', sourceJobId, company, title, applyUrl);
  const publishedAt = raw.publication_date ? new Date(raw.publication_date).toISOString() : null;
  const contentHash = computeContentHash(title, company, applyUrl, publishedAt);
  const tags = Array.isArray(raw.tags) ? raw.tags.map(String) : [];
  const descriptionExcerpt = createExcerpt(raw.description || '');

  const salaryInfo = parseSalaryInfo(raw.salary || '', raw.salary_min, raw.salary_max, raw.salary_currency);
  const classInfo = classifySeniorityAndEasyScore(title, descriptionExcerpt, raw.category || '', tags);
  const regionFit = classifyRegionFit(raw.candidate_required_location || 'Remote', raw.candidate_required_location || 'Worldwide', raw.description || '');

  return {
    source: 'remotive',
    source_job_id: sourceJobId,
    title,
    company,
    company_logo: raw.company_logo || undefined,
    location: raw.candidate_required_location || 'Remote',
    remote_region: raw.candidate_required_location || 'Worldwide',
    category: raw.category || 'General',
    role_group: classInfo.roleGroup,
    job_type: raw.job_type || 'Full-time',
    salary_min: raw.salary_min || null,
    salary_max: raw.salary_max || null,
    salary_amount_min: salaryInfo.amountMin,
    salary_amount_max: salaryInfo.amountMax,
    salary_currency: salaryInfo.currency,
    salary_period: salaryInfo.period,
    salary_display: salaryInfo.display,
    salary_confidence: salaryInfo.confidence,
    salary_source: salaryInfo.source,
    salary_quality: salaryInfo.quality,
    seniority_level: classInfo.seniority,
    easy_job_score: classInfo.easyJobScore,
    region_fit: regionFit,
    freshness_status: 'fresh',
    published_at: publishedAt,
    description_excerpt: descriptionExcerpt,
    description_html: raw.description || undefined,
    canonical_url: applyUrl,
    apply_url: applyUrl,
    tags,
    dedupe_key: dedupeKey,
    content_hash: contentHash,
    fetched_at: new Date().toISOString(),
    status: 'active',
  };
}

/**
 * Jobicy API Normalizer
 */
export function parseJobicyJob(raw: any): NormalizedRemoteJob | null {
  if (!raw || typeof raw !== 'object') return null;
  const sourceJobId = String(raw.id || '').trim();
  const title = String(raw.jobTitle || '').trim();
  const company = String(raw.companyName || '').trim();
  const applyUrl = String(raw.url || '').trim();

  if (!title || !company || !applyUrl) return null;

  const dedupeKey = computeDedupeKey('jobicy', sourceJobId, company, title, applyUrl);
  const publishedAt = raw.pubDate ? new Date(raw.pubDate).toISOString() : null;
  const contentHash = computeContentHash(title, company, applyUrl, publishedAt);

  const minSalary = raw.annualSalaryMin ? Number(raw.annualSalaryMin) : null;
  const maxSalary = raw.annualSalaryMax ? Number(raw.annualSalaryMax) : null;
  const descriptionExcerpt = createExcerpt(raw.jobDescription || '');
  const tags = raw.jobCategory ? [raw.jobCategory] : [];

  const salaryInfo = parseSalaryInfo('', minSalary, maxSalary, raw.salaryCurrency);
  const classInfo = classifySeniorityAndEasyScore(title, descriptionExcerpt, raw.jobCategory || '', tags);
  const regionFit = classifyRegionFit(raw.jobGeo || 'Remote', raw.jobGeo || 'Worldwide', raw.jobDescription || '');

  return {
    source: 'jobicy',
    source_job_id: sourceJobId,
    title,
    company,
    company_logo: raw.companyLogo || undefined,
    location: raw.jobGeo || 'Remote',
    remote_region: raw.jobGeo || 'Worldwide',
    category: raw.jobCategory || 'General',
    role_group: classInfo.roleGroup,
    job_type: raw.jobType || 'Full-time',
    salary_min: Number.isFinite(minSalary) ? minSalary : null,
    salary_max: Number.isFinite(maxSalary) ? maxSalary : null,
    salary_amount_min: salaryInfo.amountMin,
    salary_amount_max: salaryInfo.amountMax,
    salary_currency: salaryInfo.currency,
    salary_period: salaryInfo.period,
    salary_display: salaryInfo.display,
    salary_confidence: salaryInfo.confidence,
    salary_source: salaryInfo.source,
    salary_quality: salaryInfo.quality,
    seniority_level: classInfo.seniority,
    easy_job_score: classInfo.easyJobScore,
    region_fit: regionFit,
    freshness_status: 'fresh',
    published_at: publishedAt,
    description_excerpt: descriptionExcerpt,
    description_html: raw.jobDescription || undefined,
    canonical_url: applyUrl,
    apply_url: applyUrl,
    tags,
    dedupe_key: dedupeKey,
    content_hash: contentHash,
    fetched_at: new Date().toISOString(),
    status: 'active',
  };
}

/**
 * We Work Remotely RSS Normalizer
 */
export function parseWwrRssItem(itemXmlOrObj: any): NormalizedRemoteJob | null {
  if (!itemXmlOrObj || typeof itemXmlOrObj !== 'object') return null;
  const guid = String(itemXmlOrObj.guid || itemXmlOrObj.link || '').trim();
  const rawTitle = String(itemXmlOrObj.title || '').trim();
  const applyUrl = String(itemXmlOrObj.link || '').trim();

  if (!rawTitle || !applyUrl) return null;

  let company = 'We Work Remotely';
  let title = rawTitle;

  if (rawTitle.includes(':')) {
    const parts = rawTitle.split(':');
    company = parts[0].trim();
    title = parts.slice(1).join(':').trim();
  }

  const sourceJobId = guid.split('/').pop() || guid;
  const dedupeKey = computeDedupeKey('weworkremotely', sourceJobId, company, title, applyUrl);
  const publishedAt = itemXmlOrObj.pubDate ? new Date(itemXmlOrObj.pubDate).toISOString() : null;
  const contentHash = computeContentHash(title, company, applyUrl, publishedAt);
  const description = String(itemXmlOrObj.description || '');
  const descriptionExcerpt = createExcerpt(description);
  const category = itemXmlOrObj.category || 'Remote Jobs';
  const tags = category ? [category] : [];

  const salaryInfo = parseSalaryInfo(description);
  const classInfo = classifySeniorityAndEasyScore(title, descriptionExcerpt, category, tags);
  const regionFit = classifyRegionFit('Remote', 'Worldwide', description);

  return {
    source: 'weworkremotely',
    source_job_id: sourceJobId,
    title,
    company,
    location: 'Remote',
    remote_region: 'Worldwide',
    category,
    role_group: classInfo.roleGroup,
    job_type: 'Full-time',
    salary_amount_min: salaryInfo.amountMin,
    salary_amount_max: salaryInfo.amountMax,
    salary_currency: salaryInfo.currency,
    salary_period: salaryInfo.period,
    salary_display: salaryInfo.display,
    salary_confidence: salaryInfo.confidence,
    salary_source: salaryInfo.source,
    salary_quality: salaryInfo.quality,
    seniority_level: classInfo.seniority,
    easy_job_score: classInfo.easyJobScore,
    region_fit: regionFit,
    freshness_status: 'fresh',
    published_at: publishedAt,
    description_excerpt: descriptionExcerpt,
    description_html: description,
    canonical_url: applyUrl,
    apply_url: applyUrl,
    tags,
    dedupe_key: dedupeKey,
    content_hash: contentHash,
    fetched_at: new Date().toISOString(),
    status: 'active',
  };
}

/**
 * RemoteOK API Normalizer
 */
export function parseRemoteOkJob(raw: any): NormalizedRemoteJob | null {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.legal || raw.slug === 'legal' || !raw.position) return null;

  const sourceJobId = String(raw.id || raw.slug || '').trim();
  const title = String(raw.position || '').trim();
  const company = String(raw.company || '').trim();
  const applyUrl = String(raw.url || (raw.id ? `https://remoteok.com/remote-jobs/${raw.id}` : '')).trim();

  if (!sourceJobId || !title || !company || !applyUrl) return null;

  const dedupeKey = computeDedupeKey('remoteok', sourceJobId, company, title, applyUrl);
  const publishedAt = raw.date ? new Date(raw.date).toISOString() : null;
  const contentHash = computeContentHash(title, company, applyUrl, publishedAt);
  const tags = Array.isArray(raw.tags) ? raw.tags.map(String) : [];
  const descriptionExcerpt = createExcerpt(raw.description || '');

  const minSalary = raw.salary_min ? Number(raw.salary_min) : null;
  const maxSalary = raw.salary_max ? Number(raw.salary_max) : null;

  const salaryInfo = parseSalaryInfo(raw.salary || '', minSalary, maxSalary, 'USD');
  const classInfo = classifySeniorityAndEasyScore(title, descriptionExcerpt, raw.category || '', tags);
  const regionFit = classifyRegionFit(raw.location || 'Remote', raw.location || 'Worldwide', raw.description || '');

  return {
    source: 'remoteok',
    source_job_id: sourceJobId,
    title,
    company,
    company_logo: undefined,
    location: raw.location || 'Remote',
    remote_region: raw.location || 'Worldwide',
    category: raw.category || 'Remote',
    role_group: classInfo.roleGroup,
    job_type: 'Full-time',
    salary_min: minSalary,
    salary_max: maxSalary,
    salary_amount_min: salaryInfo.amountMin,
    salary_amount_max: salaryInfo.amountMax,
    salary_currency: salaryInfo.currency,
    salary_period: salaryInfo.period,
    salary_display: salaryInfo.display,
    salary_confidence: salaryInfo.confidence,
    salary_source: salaryInfo.source,
    salary_quality: salaryInfo.quality,
    seniority_level: classInfo.seniority,
    easy_job_score: classInfo.easyJobScore,
    region_fit: regionFit,
    freshness_status: 'fresh',
    published_at: publishedAt,
    description_excerpt: descriptionExcerpt,
    description_html: raw.description || undefined,
    canonical_url: applyUrl,
    apply_url: applyUrl,
    tags,
    dedupe_key: dedupeKey,
    content_hash: contentHash,
    fetched_at: new Date().toISOString(),
    status: 'active',
  };
}

/**
 * Arbeitnow API Normalizer
 */
export function parseArbeitnowJob(raw: any): NormalizedRemoteJob | null {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.remote !== true) return null;

  const sourceJobId = String(raw.slug || raw.id || '').trim();
  const title = String(raw.title || '').trim();
  const company = String(raw.company_name || '').trim();
  const applyUrl = String(raw.url || '').trim();

  if (!sourceJobId || !title || !company || !applyUrl) return null;

  const dedupeKey = computeDedupeKey('arbeitnow', sourceJobId, company, title, applyUrl);
  const publishedAt = raw.created_at ? new Date(raw.created_at * 1000).toISOString() : null;
  const contentHash = computeContentHash(title, company, applyUrl, publishedAt);
  const tags = Array.isArray(raw.tags) ? raw.tags.map(String) : [];
  const descriptionExcerpt = createExcerpt(raw.description || '');

  const salaryInfo = parseSalaryInfo(raw.description || '');
  const classInfo = classifySeniorityAndEasyScore(title, descriptionExcerpt, '', tags);
  const regionFit = classifyRegionFit(raw.location || 'Remote', 'Worldwide', raw.description || '');

  return {
    source: 'arbeitnow',
    source_job_id: sourceJobId,
    title,
    company,
    location: raw.location || 'Remote',
    remote_region: 'Worldwide',
    category: 'Remote',
    role_group: classInfo.roleGroup,
    job_type: Array.isArray(raw.job_types) ? raw.job_types[0] : 'Full-time',
    salary_amount_min: salaryInfo.amountMin,
    salary_amount_max: salaryInfo.amountMax,
    salary_currency: salaryInfo.currency,
    salary_period: salaryInfo.period,
    salary_display: salaryInfo.display,
    salary_confidence: salaryInfo.confidence,
    salary_source: salaryInfo.source,
    salary_quality: salaryInfo.quality,
    seniority_level: classInfo.seniority,
    easy_job_score: classInfo.easyJobScore,
    region_fit: regionFit,
    freshness_status: 'fresh',
    published_at: publishedAt,
    description_excerpt: descriptionExcerpt,
    description_html: raw.description || undefined,
    canonical_url: applyUrl,
    apply_url: applyUrl,
    tags,
    dedupe_key: dedupeKey,
    content_hash: contentHash,
    fetched_at: new Date().toISOString(),
    status: 'active',
  };
}

/**
 * Himalayas RSS Normalizer
 */
export function parseHimalayasRssItem(itemXmlOrObj: any): NormalizedRemoteJob | null {
  if (!itemXmlOrObj || typeof itemXmlOrObj !== 'object') return null;
  const guid = String(itemXmlOrObj.guid || itemXmlOrObj.link || '').trim();
  const rawTitle = String(itemXmlOrObj.title || '').trim();
  const applyUrl = String(itemXmlOrObj.link || '').trim();

  if (!rawTitle || !applyUrl) return null;

  let company = 'Himalayas';
  let title = rawTitle;
  if (rawTitle.includes(' - ')) {
    const parts = rawTitle.split(' - ');
    title = parts[0].trim();
    company = parts.slice(1).join(' - ').trim();
  }

  const sourceJobId = guid.split('/').pop() || guid;
  const dedupeKey = computeDedupeKey('himalayas', sourceJobId, company, title, applyUrl);
  const publishedAt = itemXmlOrObj.pubDate ? new Date(itemXmlOrObj.pubDate).toISOString() : null;
  const contentHash = computeContentHash(title, company, applyUrl, publishedAt);
  const description = String(itemXmlOrObj.description || '');
  const descriptionExcerpt = createExcerpt(description);
  const category = itemXmlOrObj.category || 'Remote Jobs';
  const tags = category ? [category] : [];

  const salaryInfo = parseSalaryInfo(description);
  const classInfo = classifySeniorityAndEasyScore(title, descriptionExcerpt, category, tags);
  const regionFit = classifyRegionFit('Remote', 'Worldwide', description);

  return {
    source: 'himalayas',
    source_job_id: sourceJobId,
    title,
    company,
    location: 'Remote',
    remote_region: 'Worldwide',
    category,
    role_group: classInfo.roleGroup,
    job_type: 'Full-time',
    salary_amount_min: salaryInfo.amountMin,
    salary_amount_max: salaryInfo.amountMax,
    salary_currency: salaryInfo.currency,
    salary_period: salaryInfo.period,
    salary_display: salaryInfo.display,
    salary_confidence: salaryInfo.confidence,
    salary_source: salaryInfo.source,
    salary_quality: salaryInfo.quality,
    seniority_level: classInfo.seniority,
    easy_job_score: classInfo.easyJobScore,
    region_fit: regionFit,
    freshness_status: 'fresh',
    published_at: publishedAt,
    description_excerpt: descriptionExcerpt,
    description_html: description,
    canonical_url: applyUrl,
    apply_url: applyUrl,
    tags,
    dedupe_key: dedupeKey,
    content_hash: contentHash,
    fetched_at: new Date().toISOString(),
    status: 'active',
  };
}

/**
 * Greenhouse API Normalizer
 */
export function parseGreenhouseJob(
  raw: any,
  companyName: string,
  regionPolicy: string = 'worldwide',
  customTags: string[] = []
): NormalizedRemoteJob | null {
  if (!raw || typeof raw !== 'object') return null;
  const sourceJobId = String(raw.id || '').trim();
  const title = String(raw.title || '').trim();
  const applyUrl = String(raw.absolute_url || '').trim();

  if (!sourceJobId || !title || !applyUrl) return null;

  const dedupeKey = computeDedupeKey('greenhouse', sourceJobId, companyName, title, applyUrl);
  const publishedAt = raw.updated_at || new Date().toISOString();
  const contentHash = computeContentHash(title, companyName, applyUrl, publishedAt);
  const htmlContent = raw.content || '';
  const descriptionExcerpt = createExcerpt(htmlContent);

  const tags = [...customTags];
  if (raw.departments && raw.departments[0]) tags.push(raw.departments[0].name);

  const salaryInfo = parseSalaryInfo(htmlContent);
  const classInfo = classifySeniorityAndEasyScore(title, descriptionExcerpt, '', tags);
  
  const rawLoc = raw.location?.name || 'Remote';
  const regionFit = classifyRegionFit(rawLoc, regionPolicy, htmlContent);

  return {
    source: 'greenhouse',
    source_job_id: sourceJobId,
    title,
    company: companyName,
    location: rawLoc,
    remote_region: regionPolicy,
    category: 'Remote',
    role_group: classInfo.roleGroup,
    job_type: 'Full-time',
    salary_amount_min: salaryInfo.amountMin,
    salary_amount_max: salaryInfo.amountMax,
    salary_currency: salaryInfo.currency,
    salary_period: salaryInfo.period,
    salary_display: salaryInfo.display,
    salary_confidence: salaryInfo.confidence,
    salary_source: salaryInfo.source,
    salary_quality: salaryInfo.quality,
    seniority_level: classInfo.seniority,
    easy_job_score: classInfo.easyJobScore,
    region_fit: regionFit,
    freshness_status: 'fresh',
    published_at: publishedAt,
    description_excerpt: descriptionExcerpt,
    description_html: htmlContent,
    canonical_url: applyUrl,
    apply_url: applyUrl,
    tags,
    dedupe_key: dedupeKey,
    content_hash: contentHash,
    fetched_at: new Date().toISOString(),
    status: 'active',
  };
}

/**
 * Lever API Normalizer
 */
export function parseLeverJob(
  raw: any,
  companyName: string,
  regionPolicy: string = 'worldwide',
  customTags: string[] = []
): NormalizedRemoteJob | null {
  if (!raw || typeof raw !== 'object') return null;
  const sourceJobId = String(raw.id || '').trim();
  const title = String(raw.title || '').trim();
  const applyUrl = String(raw.hostedUrl || raw.applyUrl || '').trim();

  if (!sourceJobId || !title || !applyUrl) return null;

  const dedupeKey = computeDedupeKey('lever', sourceJobId, companyName, title, applyUrl);
  const publishedAt = raw.createdAt ? new Date(raw.createdAt).toISOString() : new Date().toISOString();
  const contentHash = computeContentHash(title, companyName, applyUrl, publishedAt);
  
  const description = [
    raw.description,
    raw.requirements,
    Array.isArray(raw.lists) ? raw.lists.map((l: any) => `${l.text}\n${l.content}`).join('\n') : ''
  ].filter(Boolean).join('\n\n');
  const descriptionExcerpt = createExcerpt(description);

  const tags = [...customTags];
  if (raw.categories?.department) tags.push(raw.categories.department);
  if (raw.categories?.team) tags.push(raw.categories.team);

  const salaryInfo = parseSalaryInfo(description);
  const classInfo = classifySeniorityAndEasyScore(title, descriptionExcerpt, '', tags);
  
  const rawLoc = raw.categories?.location || 'Remote';
  const regionFit = classifyRegionFit(rawLoc, regionPolicy, description);

  return {
    source: 'lever',
    source_job_id: sourceJobId,
    title,
    company: companyName,
    location: rawLoc,
    remote_region: regionPolicy,
    category: 'Remote',
    role_group: classInfo.roleGroup,
    job_type: raw.categories?.commitment || 'Full-time',
    salary_amount_min: salaryInfo.amountMin,
    salary_amount_max: salaryInfo.amountMax,
    salary_currency: salaryInfo.currency,
    salary_period: salaryInfo.period,
    salary_display: salaryInfo.display,
    salary_confidence: salaryInfo.confidence,
    salary_source: salaryInfo.source,
    salary_quality: salaryInfo.quality,
    seniority_level: classInfo.seniority,
    easy_job_score: classInfo.easyJobScore,
    region_fit: regionFit,
    freshness_status: 'fresh',
    published_at: publishedAt,
    description_excerpt: descriptionExcerpt,
    description_html: description,
    canonical_url: applyUrl,
    apply_url: applyUrl,
    tags,
    dedupe_key: dedupeKey,
    content_hash: contentHash,
    fetched_at: new Date().toISOString(),
    status: 'active',
  };
}
