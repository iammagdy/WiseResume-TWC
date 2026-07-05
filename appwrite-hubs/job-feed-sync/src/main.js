'use strict';

const sdk = require('node-appwrite');
const { Client, Databases, Query, ID, Permission, Role } = sdk;

const DB_ID = 'main';
const JOBS_COLLECTION_ID = 'job_feed_items';
const SYNC_RUNS_COLLECTION_ID = 'job_feed_sync_runs';

function getDbClient() {
  const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
  const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
  const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY;

  const client = new Client().setEndpoint(endpoint).setProject(projectId);
  if (apiKey) client.setKey(apiKey);
  return new Databases(client);
}

async function httpGetText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'WiseResumeBot/1.0 (+https://wiseresume.app)' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return await res.text();
}

function computeDedupeKey(source, sourceJobId, company, title, canonicalUrl) {
  const cleanId = sourceJobId ? String(sourceJobId).trim() : '';
  if (cleanId) return `${source}:${cleanId}`;
  return `${(company || '').toLowerCase().trim()}|${(title || '').toLowerCase().trim()}|${(canonicalUrl || '').toLowerCase().trim()}`;
}

function computeContentHash(title, company, canonicalUrl, publishedAt) {
  const raw = `${(title || '').trim()}|${(company || '').trim()}|${(canonicalUrl || '').trim()}|${publishedAt || ''}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(16)}`;
}

function createExcerpt(text, max = 280) {
  if (!text) return '';
  const clean = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : clean.slice(0, max) + '...';
}

function classifyRoleGroup(title = '', category = '', tags = [], descriptionExcerpt = '') {
  const t = title.toLowerCase();
  const c = category.toLowerCase();
  const tagStr = tags.join(' ').toLowerCase();
  const desc = descriptionExcerpt.toLowerCase();
  const combined = `${t} ${c} ${tagStr} ${desc}`;

  if (t.includes('data entry') || combined.includes('data entry') || combined.includes('data clerk') || combined.includes('spreadsheet') || combined.includes('transcriptionist')) {
    return 'data_entry';
  }

  if (t.includes('virtual assistant') || combined.includes('virtual assistant') || combined.includes('personal assistant') || combined.includes('executive assistant')) {
    return 'virtual_assistant';
  }

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

function parseSalaryInfo(rawSalaryText = '', minSalaryInput = null, maxSalaryInput = null, currencyInput = null) {
  const text = (rawSalaryText || '').trim();
  let currency = currencyInput ? String(currencyInput).toUpperCase().slice(0, 4) : null;
  if (!currency) {
    if (text.includes('€') || text.includes('EUR')) currency = 'EUR';
    else if (text.includes('£') || text.includes('GBP')) currency = 'GBP';
    else if (text.includes('$') || text.includes('USD')) currency = 'USD';
  }

  let min = Number.isFinite(minSalaryInput) && minSalaryInput > 0 ? minSalaryInput : null;
  let max = Number.isFinite(maxSalaryInput) && maxSalaryInput > 0 ? maxSalaryInput : null;

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

  const lowerText = text.toLowerCase();
  let period = 'unknown';

  if (lowerText.includes('/hr') || lowerText.includes('hour') || lowerText.includes('hourly') || lowerText.includes('per hr')) {
    period = 'hourly';
  } else if (lowerText.includes('/mo') || lowerText.includes('month') || lowerText.includes('monthly')) {
    period = 'monthly';
  } else if (lowerText.includes('/yr') || lowerText.includes('year') || lowerText.includes('yearly') || lowerText.includes('annual') || lowerText.includes('/year')) {
    period = 'yearly';
  } else {
    const sampleVal = max || min || 0;
    if (sampleVal < 500) period = 'hourly';
    else if (sampleVal >= 500 && sampleVal < 10000) period = 'monthly';
    else period = 'yearly';
  }

  const currSymbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  const formatVal = (val, isYr) => {
    if (isYr && val >= 1000) {
      return `${Math.round(val / 1000)}k`;
    }
    return val.toLocaleString();
  };

  const isYearly = period === 'yearly';
  const periodLabel = isYearly ? '/year' : period === 'monthly' ? '/month' : period === 'hourly' ? '/hour' : '';

  let display = 'Salary not listed';
  if (min && max && min !== max) {
    display = `${currSymbol}${formatVal(min, isYearly)} - ${currSymbol}${formatVal(max, isYearly)}${periodLabel}`;
  } else if (min || max) {
    const val = min || max;
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

function cleanJobPayload(rawJob) {
  const clean = {};
  const str = (val, maxLen) => {
    if (val === undefined || val === null) return undefined;
    const s = String(val).trim();
    return s.length > maxLen ? s.slice(0, maxLen) : s;
  };
  const num = (val) => (typeof val === 'number' && Number.isFinite(val) ? Math.round(val) : undefined);

  if (rawJob.source) clean.source = str(rawJob.source, 32);
  if (rawJob.source_job_id) clean.source_job_id = str(rawJob.source_job_id, 128);
  if (rawJob.title) clean.title = str(rawJob.title, 256);
  if (rawJob.company) clean.company = str(rawJob.company, 128);
  if (rawJob.company_logo) clean.company_logo = str(rawJob.company_logo, 1024);
  if (rawJob.location) clean.location = str(rawJob.location, 128);
  if (rawJob.remote_region) clean.remote_region = str(rawJob.remote_region, 128);
  if (rawJob.category) clean.category = str(rawJob.category, 128);
  if (rawJob.role_group) clean.role_group = str(rawJob.role_group, 64);
  if (rawJob.job_type) clean.job_type = str(rawJob.job_type, 64);
  if (rawJob.salary_min !== undefined && rawJob.salary_min !== null) clean.salary_min = num(rawJob.salary_min);
  if (rawJob.salary_max !== undefined && rawJob.salary_max !== null) clean.salary_max = num(rawJob.salary_max);
  if (rawJob.salary_amount_min !== undefined && rawJob.salary_amount_min !== null) clean.salary_amount_min = num(rawJob.salary_amount_min);
  if (rawJob.salary_amount_max !== undefined && rawJob.salary_amount_max !== null) clean.salary_amount_max = num(rawJob.salary_amount_max);
  if (rawJob.salary_currency) clean.salary_currency = str(rawJob.salary_currency, 16);
  if (rawJob.salary_period) clean.salary_period = str(rawJob.salary_period, 32);
  if (rawJob.salary_display) clean.salary_display = str(rawJob.salary_display, 128);
  if (rawJob.published_at) clean.published_at = str(rawJob.published_at, 64);
  if (rawJob.description_excerpt) clean.description_excerpt = str(rawJob.description_excerpt, 2048);
  if (rawJob.description_html) clean.description_html = str(rawJob.description_html, 16000);
  if (rawJob.canonical_url) clean.canonical_url = str(rawJob.canonical_url, 2048);
  if (rawJob.apply_url) clean.apply_url = str(rawJob.apply_url, 2048);
  if (Array.isArray(rawJob.tags)) clean.tags = rawJob.tags.map(t => str(t, 64)).filter(Boolean);
  if (rawJob.dedupe_key) clean.dedupe_key = str(rawJob.dedupe_key, 256);
  if (rawJob.content_hash) clean.content_hash = str(rawJob.content_hash, 128);
  if (rawJob.fetched_at) clean.fetched_at = str(rawJob.fetched_at, 64);
  clean.status = str(rawJob.status || 'active', 32);

  return clean;
}

// ─── SOURCE PARSERS & FETCHERS ────────────────────────────────────────────────

async function fetchRemotiveJobs(log) {
  try {
    log('Fetching Remotive API...');
    const bodyText = await httpGetText('https://remotive.com/api/remote-jobs');
    const data = JSON.parse(bodyText);
    const rawJobs = data?.jobs || [];
    log(`Remotive API returned ${rawJobs.length} jobs`);

    return rawJobs.map(raw => {
      const sourceJobId = String(raw.id || '').trim();
      const title = String(raw.title || '').trim();
      const company = String(raw.company_name || '').trim();
      const applyUrl = String(raw.url || '').trim();
      if (!title || !company || !applyUrl) return null;

      const dedupeKey = computeDedupeKey('remotive', sourceJobId, company, title, applyUrl);
      const publishedAt = raw.publication_date ? new Date(raw.publication_date).toISOString() : null;
      const tags = Array.isArray(raw.tags) ? raw.tags.map(String).slice(0, 10) : [];
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
        description_html: (raw.description || '').slice(0, 16000),
        canonical_url: applyUrl,
        apply_url: applyUrl,
        tags,
        dedupe_key: dedupeKey,
        content_hash: computeContentHash(title, company, applyUrl, publishedAt),
        fetched_at: new Date().toISOString(),
        status: 'active',
      };
    }).filter(Boolean);
  } catch (err) {
    log(`[Error] Remotive fetch failed: ${err.message}`);
    return [];
  }
}

async function fetchJobicyJobs(log) {
  const endpoints = [
    'https://jobicy.com/api/v2/remote-jobs?count=100',
    'https://jobicy.com/api/v2/remote-jobs?count=50&industry=supporting',
    'https://jobicy.com/api/v2/remote-jobs?count=50&industry=marketing',
    'https://jobicy.com/api/v2/remote-jobs?count=50&industry=copywriting',
    'https://jobicy.com/api/v2/remote-jobs?count=50&industry=design',
    'https://jobicy.com/api/v2/remote-jobs?count=50&industry=business',
  ];

  const allParsed = [];

  for (const url of endpoints) {
    try {
      log(`Fetching Jobicy API (${url.split('?')[1] || 'default'})...`);
      const bodyText = await httpGetText(url);
      const data = JSON.parse(bodyText);
      const rawJobs = data?.jobs || [];

      for (const raw of rawJobs) {
        const sourceJobId = String(raw.id || '').trim();
        const title = String(raw.jobTitle || '').trim();
        const company = String(raw.companyName || '').trim();
        const applyUrl = String(raw.url || '').trim();
        if (!title || !company || !applyUrl) continue;

        const dedupeKey = computeDedupeKey('jobicy', sourceJobId, company, title, applyUrl);
        const publishedAt = raw.pubDate ? new Date(raw.pubDate).toISOString() : null;
        const minSalary = raw.annualSalaryMin ? Number(raw.annualSalaryMin) : null;
        const maxSalary = raw.annualSalaryMax ? Number(raw.annualSalaryMax) : null;
        const descriptionExcerpt = createExcerpt(raw.jobDescription || '');
        const tags = raw.jobCategory ? [raw.jobCategory] : [];
        const roleGroup = classifyRoleGroup(title, raw.jobCategory || '', tags, descriptionExcerpt);
        const salaryInfo = parseSalaryInfo('', minSalary, maxSalary, raw.salaryCurrency);

        allParsed.push({
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
          description_html: (raw.jobDescription || '').slice(0, 16000),
          canonical_url: applyUrl,
          apply_url: applyUrl,
          tags,
          dedupe_key: dedupeKey,
          content_hash: computeContentHash(title, company, applyUrl, publishedAt),
          fetched_at: new Date().toISOString(),
          status: 'active',
        });
      }
    } catch (err) {
      log(`[Notice] Jobicy fetch notice for ${url}: ${err.message}`);
    }
  }

  log(`Jobicy API total jobs aggregated: ${allParsed.length}`);
  return allParsed;
}

async function fetchWwrJobs(log) {
  const officialWwrFeeds = [
    'https://weworkremotely.com/remote-jobs.rss',
    'https://weworkremotely.com/categories/remote-customer-support-jobs.rss',
    'https://weworkremotely.com/categories/remote-sales-and-marketing-jobs.rss',
    'https://weworkremotely.com/categories/remote-product-jobs.rss',
    'https://weworkremotely.com/categories/remote-management-and-finance-jobs.rss',
    'https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss',
    'https://weworkremotely.com/categories/remote-back-end-programming-jobs.rss',
    'https://weworkremotely.com/categories/remote-front-end-programming-jobs.rss',
    'https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss',
  ];

  const allParsed = [];

  for (const url of officialWwrFeeds) {
    try {
      const feedName = url.split('/').pop();
      log(`Fetching WWR RSS (${feedName})...`);
      const xml = await httpGetText(url);
      const itemMatches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];

      const getTagContent = (itemXml, tag) => {
        const m = itemXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
        return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').trim() : '';
      };

      for (const match of itemMatches) {
        const itemXml = match[1];
        const rawTitle = getTagContent(itemXml, 'title');
        const applyUrl = getTagContent(itemXml, 'link');
        const guid = getTagContent(itemXml, 'guid') || applyUrl;
        const pubDate = getTagContent(itemXml, 'pubDate');
        const category = getTagContent(itemXml, 'category') || 'Remote';
        const description = getTagContent(itemXml, 'description');

        if (!rawTitle || !applyUrl) continue;

        let company = 'We Work Remotely';
        let title = rawTitle;
        if (rawTitle.includes(':')) {
          const parts = rawTitle.split(':');
          company = parts[0].trim();
          title = parts.slice(1).join(':').trim();
        }

        const sourceJobId = guid.split('/').pop() || guid;
        const dedupeKey = computeDedupeKey('weworkremotely', sourceJobId, company, title, applyUrl);
        const publishedAt = pubDate ? new Date(pubDate).toISOString() : null;
        const descriptionExcerpt = createExcerpt(description);
        const tags = category ? [category] : [];
        const roleGroup = classifyRoleGroup(title, category, tags, descriptionExcerpt);
        const salaryInfo = parseSalaryInfo(description);

        allParsed.push({
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
          description_html: description.slice(0, 16000),
          canonical_url: applyUrl,
          apply_url: applyUrl,
          tags,
          dedupe_key: dedupeKey,
          content_hash: computeContentHash(title, company, applyUrl, publishedAt),
          fetched_at: new Date().toISOString(),
          status: 'active',
        });
      }
    } catch (err) {
      log(`[Notice] WWR fetch notice for ${url}: ${err.message}`);
    }
  }

  log(`WWR RSS total jobs aggregated: ${allParsed.length}`);
  return allParsed;
}

async function fetchRemoteOkJobs(log) {
  try {
    log('Fetching RemoteOK API...');
    const bodyText = await httpGetText('https://remoteok.com/api');
    const data = JSON.parse(bodyText);
    if (!Array.isArray(data)) return [];

    const rawJobs = data.filter(item => item && typeof item === 'object' && !item.legal && item.position && item.company);
    log(`RemoteOK API returned ${rawJobs.length} jobs`);

    return rawJobs.map(raw => {
      const sourceJobId = String(raw.id || raw.slug || '').trim();
      const title = String(raw.position || '').trim();
      const company = String(raw.company || '').trim();
      const applyUrl = String(raw.url || (raw.id ? `https://remoteok.com/remote-jobs/${raw.id}` : '')).trim();
      if (!sourceJobId || !title || !company || !applyUrl) return null;

      const dedupeKey = computeDedupeKey('remoteok', sourceJobId, company, title, applyUrl);
      const publishedAt = raw.date ? new Date(raw.date).toISOString() : null;
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
        company_logo: undefined, // Do not use RemoteOK logo per rules
        location: raw.location || 'Remote',
        remote_region: raw.location || 'Worldwide',
        category: raw.category || 'Remote',
        role_group: roleGroup,
        job_type: 'Full-time',
        salary_min: Number.isFinite(minSalary) ? minSalary : null,
        salary_max: Number.isFinite(maxSalary) ? maxSalary : null,
        salary_amount_min: salaryInfo.amountMin,
        salary_amount_max: salaryInfo.amountMax,
        salary_currency: salaryInfo.currency,
        salary_period: salaryInfo.period,
        salary_display: salaryInfo.display,
        published_at: publishedAt,
        description_excerpt: descriptionExcerpt,
        description_html: (raw.description || '').slice(0, 16000),
        canonical_url: applyUrl,
        apply_url: applyUrl,
        tags,
        dedupe_key: dedupeKey,
        content_hash: computeContentHash(title, company, applyUrl, publishedAt),
        fetched_at: new Date().toISOString(),
        status: 'active',
      };
    }).filter(Boolean);
  } catch (err) {
    log(`[Notice] RemoteOK fetch notice: ${err.message}`);
    return [];
  }
}

async function fetchArbeitnowJobs(log) {
  try {
    log('Fetching Arbeitnow API...');
    const bodyText = await httpGetText('https://www.arbeitnow.com/api/job-board-api');
    const data = JSON.parse(bodyText);
    const rawJobs = Array.isArray(data?.data) ? data.data : [];
    const remoteJobs = rawJobs.filter(j => j && j.remote === true);
    log(`Arbeitnow API returned ${remoteJobs.length} remote jobs`);

    return remoteJobs.map(raw => {
      const sourceJobId = String(raw.slug || raw.id || '').trim();
      const title = String(raw.title || '').trim();
      const company = String(raw.company_name || '').trim();
      const applyUrl = String(raw.url || '').trim();
      if (!sourceJobId || !title || !company || !applyUrl) return null;

      const dedupeKey = computeDedupeKey('arbeitnow', sourceJobId, company, title, applyUrl);
      const publishedAt = raw.created_at ? new Date(raw.created_at * 1000).toISOString() : null;
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
        job_type: Array.isArray(raw.job_types) && raw.job_types[0] ? raw.job_types[0] : 'Full-time',
        salary_amount_min: salaryInfo.amountMin,
        salary_amount_max: salaryInfo.amountMax,
        salary_currency: salaryInfo.currency,
        salary_period: salaryInfo.period,
        salary_display: salaryInfo.display,
        published_at: publishedAt,
        description_excerpt: descriptionExcerpt,
        description_html: (raw.description || '').slice(0, 16000),
        canonical_url: applyUrl,
        apply_url: applyUrl,
        tags,
        dedupe_key: dedupeKey,
        content_hash: computeContentHash(title, company, applyUrl, publishedAt),
        fetched_at: new Date().toISOString(),
        status: 'active',
      };
    }).filter(Boolean);
  } catch (err) {
    log(`[Notice] Arbeitnow fetch notice: ${err.message}`);
    return [];
  }
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────

module.exports = async ({ req, res, log, error }) => {
  log('Starting expanded job-feed-sync task...');
  const startedAt = new Date().toISOString();
  const db = getDbClient();

  const remotiveJobs = await fetchRemotiveJobs(log);
  const jobicyJobs = await fetchJobicyJobs(log);
  const wwrJobs = await fetchWwrJobs(log);
  const remoteOkJobs = await fetchRemoteOkJobs(log);
  const arbeitnowJobs = await fetchArbeitnowJobs(log);

  const allFetched = [
    ...remotiveJobs,
    ...jobicyJobs,
    ...wwrJobs,
    ...remoteOkJobs,
    ...arbeitnowJobs,
  ];
  log(`Total aggregated jobs across all sources: ${allFetched.length}`);

  let insertedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const rawJob of allFetched) {
    const jobPayload = cleanJobPayload(rawJob);
    if (!jobPayload.dedupe_key || !jobPayload.title || !jobPayload.company) {
      skippedCount++;
      continue;
    }

    try {
      let existingDoc = null;
      try {
        const existingRes = await db.listDocuments(DB_ID, JOBS_COLLECTION_ID, [
          Query.equal('dedupe_key', jobPayload.dedupe_key),
          Query.limit(1),
        ]);
        existingDoc = existingRes.documents?.[0];
      } catch {
        // Fallback if index is building
      }

      if (!existingDoc) {
        await db.createDocument(
          DB_ID,
          JOBS_COLLECTION_ID,
          ID.unique(),
          jobPayload,
          [Permission.read(Role.any())]
        );
        insertedCount++;
      } else {
        // Update existing document if content changed OR to backfill role_group / salary fields
        const needsBackfill = !existingDoc.role_group ||
          existingDoc.role_group === 'other' ||
          !existingDoc.salary_display ||
          existingDoc.salary_display === 'Salary not listed';

        if (existingDoc.content_hash !== jobPayload.content_hash || needsBackfill) {
          await db.updateDocument(
            DB_ID,
            JOBS_COLLECTION_ID,
            existingDoc.$id,
            {
              title: jobPayload.title,
              company: jobPayload.company,
              company_logo: jobPayload.company_logo,
              location: jobPayload.location,
              remote_region: jobPayload.remote_region,
              category: jobPayload.category,
              role_group: jobPayload.role_group,
              job_type: jobPayload.job_type,
              salary_min: jobPayload.salary_min,
              salary_max: jobPayload.salary_max,
              salary_amount_min: jobPayload.salary_amount_min,
              salary_amount_max: jobPayload.salary_amount_max,
              salary_currency: jobPayload.salary_currency,
              salary_period: jobPayload.salary_period,
              salary_display: jobPayload.salary_display,
              published_at: jobPayload.published_at,
              description_excerpt: jobPayload.description_excerpt,
              description_html: jobPayload.description_html,
              content_hash: jobPayload.content_hash,
              fetched_at: jobPayload.fetched_at,
            }
          );
          updatedCount++;
        } else {
          skippedCount++;
        }
      }
    } catch (err) {
      errorCount++;
      error(`Error upserting job ${jobPayload.dedupe_key}: ${err.message}`);
    }

    // Small throttle sleep to prevent Appwrite Cloud API rate limits
    await new Promise(resolve => setTimeout(resolve, 30));
  }

  const finishedAt = new Date().toISOString();
  const summary = {
    source: 'all_sources',
    started_at: startedAt,
    finished_at: finishedAt,
    fetched_count: allFetched.length,
    inserted_count: insertedCount,
    updated_count: updatedCount,
    skipped_count: skippedCount,
    error_count: errorCount,
    status: errorCount === 0 ? 'success' : 'partial_success',
  };

  try {
    await db.createDocument(DB_ID, SYNC_RUNS_COLLECTION_ID, ID.unique(), summary);
  } catch (err) {
    log(`Notice: could not record sync run summary: ${err.message}`);
  }

  log(`Sync complete! Inserted: ${insertedCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`);
  return res.json({ ok: true, summary });
};
