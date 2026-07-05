/**
 * Remote Jobs Feed — Core Normalization, Deduplication, Role Classification & Salary Parsing
 *
 * Single source of truth for remote job data structures, deduplication hash logic,
 * role group classification, salary parsing, and API/RSS source normalizers.
 */

export type JobSource = 'remotive' | 'weworkremotely' | 'jobicy' | 'remoteok' | 'arbeitnow';

export type RoleGroup =
  | 'easy_entry_level'
  | 'customer_support'
  | 'data_entry'
  | 'virtual_assistant'
  | 'admin'
  | 'sales'
  | 'marketing'
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

export type UserJobActionStatus = 'saved' | 'applied' | 'dismissed';

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
};

export const ROLE_GROUPS: { id: RoleGroup | 'all'; label: string }[] = [
  { id: 'all', label: 'All Jobs' },
  { id: 'easy_entry_level', label: 'Easy / Entry Level' },
  { id: 'customer_support', label: 'Customer Support' },
  { id: 'data_entry', label: 'Data Entry' },
  { id: 'virtual_assistant', label: 'Virtual Assistant' },
  { id: 'admin', label: 'Admin Assistant' },
  { id: 'sales', label: 'Sales' },
  { id: 'marketing', label: 'Marketing' },
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

  // 1. Specific Functional Groups (Data Entry & Virtual Assistant first)
  if (t.includes('data entry') || combined.includes('data entry') || combined.includes('data clerk') || combined.includes('spreadsheet') || combined.includes('transcriptionist')) {
    return 'data_entry';
  }

  if (t.includes('virtual assistant') || combined.includes('virtual assistant') || combined.includes('personal assistant') || combined.includes('executive assistant')) {
    return 'virtual_assistant';
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
    t.includes('copywriter') ||
    t.includes('editor') ||
    t.includes('proofreader') ||
    t.includes('journalist') ||
    t.includes('content creator') ||
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
    t.includes('social media') ||
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
 * Normalized Salary / Rate Parser
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
} {
  const text = (rawSalaryText || '').trim();
  let currency = currencyInput ? currencyInput.toUpperCase().slice(0, 4) : null;
  if (!currency) {
    if (text.includes('€') || text.includes('EUR')) currency = 'EUR';
    else if (text.includes('£') || text.includes('GBP')) currency = 'GBP';
    else if (text.includes('$') || text.includes('USD')) currency = 'USD';
  }

  let min = Number.isFinite(minSalaryInput) && minSalaryInput! > 0 ? minSalaryInput! : null;
  let max = Number.isFinite(maxSalaryInput) && maxSalaryInput! > 0 ? maxSalaryInput! : null;

  // Attempt to parse numbers from text if not provided
  if (!min && !max && text) {
    const symbolMatch = text.match(/[\$€£]\s*([\d,]+(?:\.\d+)?)\s*k?\b/gi);
    const numMatches = text.match(/\b\d{2,6}\b/g);

    if (symbolMatch && symbolMatch.length > 0) {
      const parsed = symbolMatch.map(s => {
        const isK = s.toLowerCase().includes('k');
        const digits = parseFloat(s.replace(/[\$€£,\s]/g, ''));
        return isK ? digits * 1000 : digits;
      }).filter(n => Number.isFinite(n) && n > 0);

      if (parsed.length >= 2) {
        min = Math.min(parsed[0], parsed[1]);
        max = Math.max(parsed[0], parsed[1]);
      } else if (parsed.length === 1) {
        min = parsed[0];
      }
    } else if (numMatches && numMatches.length > 0) {
      const parsed = numMatches.map(n => parseInt(n, 10)).filter(n => Number.isFinite(n) && n > 0);
      if (parsed.length >= 2) {
        min = Math.min(parsed[0], parsed[1]);
        max = Math.max(parsed[0], parsed[1]);
      } else if (parsed.length === 1) {
        min = parsed[0];
      }
    }
  }

  if (!min && !max) {
    return {
      amountMin: null,
      amountMax: null,
      currency: currency || null,
      period: 'unknown',
      display: 'Salary not listed',
    };
  }

  // Determine period
  const lowerText = text.toLowerCase();
  let period: SalaryPeriod = 'unknown';

  if (lowerText.includes('/hr') || lowerText.includes('hour') || lowerText.includes('hourly') || lowerText.includes('per hr')) {
    period = 'hourly';
  } else if (lowerText.includes('/mo') || lowerText.includes('month') || lowerText.includes('monthly')) {
    period = 'monthly';
  } else if (lowerText.includes('/yr') || lowerText.includes('year') || lowerText.includes('yearly') || lowerText.includes('annual') || lowerText.includes('/year')) {
    period = 'yearly';
  } else {
    // Value heuristic
    const sampleVal = max || min || 0;
    if (sampleVal < 500) period = 'hourly';
    else if (sampleVal >= 500 && sampleVal < 10000) period = 'monthly';
    else period = 'yearly';
  }

  // Format display string
  const currSymbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  const formatVal = (val: number, isYr: boolean) => {
    if (isYr && val >= 1000) {
      return `${Math.round(val / 1000)}k`;
    }
    return val.toLocaleString();
  };

  const isYearly = period === 'yearly';
  let periodLabel = isYearly ? '/year' : period === 'monthly' ? '/month' : period === 'hourly' ? '/hour' : '';

  let display = 'Salary not listed';
  if (min && max && min !== max) {
    display = `${currSymbol}${formatVal(min, isYearly)} - ${currSymbol}${formatVal(max, isYearly)}${periodLabel}`;
  } else if (min || max) {
    const val = min || max!;
    display = `${currSymbol}${formatVal(val, isYearly)}${periodLabel}`;
  }

  return {
    amountMin: min,
    amountMax: max,
    currency: currency || 'USD',
    period,
    display,
  };
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
  const roleGroup = classifyRoleGroup(title, raw.category || '', tags, descriptionExcerpt);
  const salaryInfo = parseSalaryInfo(raw.salary || '', raw.salary_min, raw.salary_max, raw.salary_currency);

  return {
    source: 'remotive',
    source_job_id: sourceJobId,
    title,
    company,
    company_logo: raw.company_logo || undefined,
    location: raw.candidate_required_location || 'Remote',
    remote_region: raw.candidate_required_location || 'Worldwide',
    category: raw.category || 'General',
    role_group: roleGroup,
    job_type: raw.job_type || 'Full-time',
    salary_min: raw.salary_min || null,
    salary_max: raw.salary_max || null,
    salary_amount_min: salaryInfo.amountMin,
    salary_amount_max: salaryInfo.amountMax,
    salary_currency: salaryInfo.currency,
    salary_period: salaryInfo.period,
    salary_display: salaryInfo.display,
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
  const roleGroup = classifyRoleGroup(title, raw.jobCategory || '', tags, descriptionExcerpt);
  const salaryInfo = parseSalaryInfo('', minSalary, maxSalary, raw.salaryCurrency);

  return {
    source: 'jobicy',
    source_job_id: sourceJobId,
    title,
    company,
    company_logo: raw.companyLogo || undefined,
    location: raw.jobGeo || 'Remote',
    remote_region: raw.jobGeo || 'Worldwide',
    category: raw.jobCategory || 'General',
    role_group: roleGroup,
    job_type: raw.jobType || 'Full-time',
    salary_min: Number.isFinite(minSalary) ? minSalary : null,
    salary_max: Number.isFinite(maxSalary) ? maxSalary : null,
    salary_amount_min: salaryInfo.amountMin,
    salary_amount_max: salaryInfo.amountMax,
    salary_currency: salaryInfo.currency,
    salary_period: salaryInfo.period,
    salary_display: salaryInfo.display,
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
  const roleGroup = classifyRoleGroup(title, category, tags, descriptionExcerpt);
  const salaryInfo = parseSalaryInfo(description);

  return {
    source: 'weworkremotely',
    source_job_id: sourceJobId,
    title,
    company,
    location: 'Remote',
    remote_region: 'Worldwide',
    category,
    role_group: roleGroup,
    job_type: 'Full-time',
    salary_amount_min: salaryInfo.amountMin,
    salary_amount_max: salaryInfo.amountMax,
    salary_currency: salaryInfo.currency,
    salary_period: salaryInfo.period,
    salary_display: salaryInfo.display,
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
 * API endpoint: https://remoteok.com/api
 * Note: Element 0 in RemoteOK JSON response is legal/meta notice string/object — skipped defensively.
 * Source attribution display string: "Remote OK" (do NOT use logo image).
 */
export function parseRemoteOkJob(raw: any): NormalizedRemoteJob | null {
  if (!raw || typeof raw !== 'object') return null;
  // Skip legal/meta entries
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
  const roleGroup = classifyRoleGroup(title, raw.category || '', tags, descriptionExcerpt);
  const salaryInfo = parseSalaryInfo(raw.salary || '', minSalary, maxSalary, 'USD');

  return {
    source: 'remoteok',
    source_job_id: sourceJobId,
    title,
    company,
    company_logo: undefined, // Per requirement: do not use RemoteOK logo
    location: raw.location || 'Remote',
    remote_region: raw.location || 'Worldwide',
    category: raw.category || 'Remote',
    role_group: roleGroup,
    job_type: 'Full-time',
    salary_min: minSalary,
    salary_max: maxSalary,
    salary_amount_min: salaryInfo.amountMin,
    salary_amount_max: salaryInfo.amountMax,
    salary_currency: salaryInfo.currency,
    salary_period: salaryInfo.period,
    salary_display: salaryInfo.display,
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
 * API endpoint: https://www.arbeitnow.com/api/job-board-api
 * Filter: remote === true
 */
export function parseArbeitnowJob(raw: any): NormalizedRemoteJob | null {
  if (!raw || typeof raw !== 'object') return null;
  // Filter for remote jobs only
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
  const roleGroup = classifyRoleGroup(title, '', tags, descriptionExcerpt);
  const salaryInfo = parseSalaryInfo(raw.description || '');

  return {
    source: 'arbeitnow',
    source_job_id: sourceJobId,
    title,
    company,
    location: raw.location || 'Remote',
    remote_region: 'Worldwide',
    category: 'Remote',
    role_group: roleGroup,
    job_type: Array.isArray(raw.job_types) ? raw.job_types[0] : 'Full-time',
    salary_amount_min: salaryInfo.amountMin,
    salary_amount_max: salaryInfo.amountMax,
    salary_currency: salaryInfo.currency,
    salary_period: salaryInfo.period,
    salary_display: salaryInfo.display,
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
