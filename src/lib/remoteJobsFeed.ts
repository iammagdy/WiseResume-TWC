/**
 * Remote Jobs Feed — Core Normalization, Deduplication & Feed Types
 *
 * Single source of truth for remote job data structures, deduplication hash logic,
 * and API/RSS source parsing for Remotive, We Work Remotely, and Jobicy.
 */

export type JobSource = 'remotive' | 'weworkremotely' | 'jobicy';

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
  job_type?: string;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
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
 * Generate SHA-256 / simple string content hash to detect changes across syncs
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

// ─── SOURCE PARSERS ───────────────────────────────────────────────────────────

/**
 * Remotive API Normalizer
 * API endpoint: https://remotive.com/api/remote-jobs
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

  return {
    source: 'remotive',
    source_job_id: sourceJobId,
    title,
    company,
    company_logo: raw.company_logo || undefined,
    location: raw.candidate_required_location || 'Remote',
    remote_region: raw.candidate_required_location || 'Worldwide',
    category: raw.category || 'General',
    job_type: raw.job_type || 'Full-time',
    published_at: publishedAt,
    description_excerpt: createExcerpt(raw.description || ''),
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
 * API endpoint: https://jobicy.com/api/v2/remote-jobs?count=100
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

  return {
    source: 'jobicy',
    source_job_id: sourceJobId,
    title,
    company,
    company_logo: raw.companyLogo || undefined,
    location: raw.jobGeo || 'Remote',
    remote_region: raw.jobGeo || 'Worldwide',
    category: raw.jobCategory || 'General',
    job_type: raw.jobType || 'Full-time',
    salary_min: Number.isFinite(minSalary) ? minSalary : null,
    salary_max: Number.isFinite(maxSalary) ? maxSalary : null,
    salary_currency: raw.salaryCurrency || (minSalary || maxSalary ? 'USD' : null),
    published_at: publishedAt,
    description_excerpt: createExcerpt(raw.jobDescription || ''),
    description_html: raw.jobDescription || undefined,
    canonical_url: applyUrl,
    apply_url: applyUrl,
    tags: raw.jobCategory ? [raw.jobCategory] : [],
    dedupe_key: dedupeKey,
    content_hash: contentHash,
    fetched_at: new Date().toISOString(),
    status: 'active',
  };
}

/**
 * We Work Remotely RSS Normalizer
 * RSS feed: https://weworkremotely.com/remote-jobs.rss
 */
export function parseWwrRssItem(itemXmlOrObj: any): NormalizedRemoteJob | null {
  if (!itemXmlOrObj || typeof itemXmlOrObj !== 'object') return null;
  const guid = String(itemXmlOrObj.guid || itemXmlOrObj.link || '').trim();
  const rawTitle = String(itemXmlOrObj.title || '').trim();
  const applyUrl = String(itemXmlOrObj.link || '').trim();

  if (!rawTitle || !applyUrl) return null;

  // WWR RSS titles are formatted as "Company: Job Title"
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

  return {
    source: 'weworkremotely',
    source_job_id: sourceJobId,
    title,
    company,
    location: 'Remote',
    remote_region: 'Worldwide',
    category: itemXmlOrObj.category || 'Remote Jobs',
    job_type: 'Full-time',
    published_at: publishedAt,
    description_excerpt: createExcerpt(description),
    description_html: description,
    canonical_url: applyUrl,
    apply_url: applyUrl,
    tags: itemXmlOrObj.category ? [itemXmlOrObj.category] : [],
    dedupe_key: dedupeKey,
    content_hash: contentHash,
    fetched_at: new Date().toISOString(),
    status: 'active',
  };
}
