'use strict';

const sdk = require('node-appwrite');
const { Client, Databases, Query, ID, Permission, Role } = sdk;
const companySources = require('./remote_company_sources.json');

const DB_ID = 'main';
const JOBS_COLLECTION_ID = 'job_feed_items';
const SYNC_RUNS_COLLECTION_ID = 'job_feed_sync_runs';

// Retrieve credentials
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

function parseSalaryInfo(rawSalaryText = '', minSalaryInput = null, maxSalaryInput = null, currencyInput = null) {
  let min = typeof minSalaryInput === 'number' && minSalaryInput > 0 ? minSalaryInput : null;
  let max = typeof maxSalaryInput === 'number' && maxSalaryInput > 0 ? maxSalaryInput : null;
  let currency = currencyInput ? String(currencyInput).toUpperCase().slice(0, 4) : null;

  if (min !== null || max !== null) {
    if (!currency) currency = 'USD';
    const sample = max || min || 0;
    let period = 'unknown';
    if (sample < 500) period = 'hourly';
    else if (sample >= 500 && sample < 15000) period = 'monthly';
    else period = 'yearly';

    const currSymbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
    const isYearly = period === 'yearly';
    const formatVal = (val) => {
      if (isYearly && val >= 1000) return `${Math.round(val / 1000)}k`;
      return val.toLocaleString();
    };
    const periodLabel = isYearly ? '/year' : period === 'monthly' ? '/month' : period === 'hourly' ? '/hour' : '';

    let display = 'Salary not listed';
    if (min !== null && max !== null && min !== max) {
      display = `${currSymbol}${formatVal(min)} - ${currSymbol}${formatVal(max)}${periodLabel}`;
    } else if (min !== null || max !== null) {
      display = `${currSymbol}${formatVal(min || max)}${periodLabel}`;
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

    let period = 'unknown';
    if (['hr', 'hour', 'hourly'].includes(rawPeriod)) period = 'hourly';
    else if (['mo', 'month', 'monthly'].includes(rawPeriod)) period = 'monthly';
    else if (['yr', 'year', 'yearly', 'annually', 'annual'].includes(rawPeriod)) period = 'yearly';

    const currSymbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
    const isYearly = period === 'yearly';
    const formatVal = (val) => {
      if (isYearly && val >= 1000) return `${Math.round(val / 1000)}k`;
      return val.toLocaleString();
    };
    const periodLabel = isYearly ? '/year' : period === 'monthly' ? '/month' : period === 'hourly' ? '/hour' : '';

    let display = 'Salary not listed';
    if (valMin && valMax && valMin !== valMax) {
      display = `${currSymbol}${formatVal(valMin)} - ${currSymbol}${formatVal(valMax)}${periodLabel}`;
    } else if (valMin || valMax) {
      display = `${currSymbol}${formatVal(valMin || valMax)}${periodLabel}`;
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

function classifySeniorityAndEasyScore(title = '', descriptionExcerpt = '', category = '', tags = []) {
  const t = title.toLowerCase();
  const desc = descriptionExcerpt.toLowerCase();
  const c = category.toLowerCase();
  const tagStr = tags.join(' ').toLowerCase();
  const combined = `${t} ${desc} ${c} ${tagStr}`;

  let seniority = 'unknown';
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

function classifyRegionFit(location = '', remoteRegion = '', description = '') {
  const loc = (location || '').toLowerCase();
  const reg = (remoteRegion || '').toLowerCase();
  const desc = (description || '').toLowerCase();
  const combined = `${loc} ${reg} ${desc}`;

  const fit = [];

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
  
  if (rawJob.salary_confidence) clean.salary_confidence = str(rawJob.salary_confidence, 32);
  if (rawJob.salary_source) clean.salary_source = str(rawJob.salary_source, 32);
  if (rawJob.salary_quality) clean.salary_quality = str(rawJob.salary_quality, 32);
  if (rawJob.seniority_level) clean.seniority_level = str(rawJob.seniority_level, 32);
  if (rawJob.easy_job_score !== undefined && rawJob.easy_job_score !== null) clean.easy_job_score = num(rawJob.easy_job_score);
  if (Array.isArray(rawJob.region_fit)) clean.region_fit = rawJob.region_fit.map(r => str(r, 64)).filter(Boolean);
  if (rawJob.freshness_status) clean.freshness_status = str(rawJob.freshness_status, 32);

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

        const salaryInfo = parseSalaryInfo('', minSalary, maxSalary, raw.salaryCurrency);
        const classInfo = classifySeniorityAndEasyScore(title, descriptionExcerpt, raw.jobCategory || '', tags);
        const regionFit = classifyRegionFit(raw.jobGeo || 'Remote', raw.jobGeo || 'Worldwide', raw.jobDescription || '');

        allParsed.push({
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

        const salaryInfo = parseSalaryInfo(description);
        const classInfo = classifySeniorityAndEasyScore(title, descriptionExcerpt, category, tags);
        const regionFit = classifyRegionFit('Remote', 'Worldwide', description);

        allParsed.push({
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

      const salaryInfo = parseSalaryInfo(raw.salary || '', minSalary, maxSalary, 'USD');
      const classInfo = classifySeniorityAndEasyScore(title, descriptionExcerpt, raw.category || '', tags);
      const regionFit = classifyRegionFit(raw.location || 'Remote', raw.location || 'Worldwide', raw.description || '');

      return {
        source: 'remoteok',
        source_job_id: sourceJobId,
        title,
        company,
        company_logo: undefined, // Do not use RemoteOK logo per rules
        location: raw.location || 'Remote',
        remote_region: raw.location || 'Worldwide',
        category: raw.category || 'Remote',
        role_group: classInfo.roleGroup,
        job_type: 'Full-time',
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
        job_type: Array.isArray(raw.job_types) && raw.job_types[0] ? raw.job_types[0] : 'Full-time',
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

async function fetchHimalayasJobs(log) {
  try {
    log('Fetching Himalayas RSS...');
    const xml = await httpGetText('https://himalayas.app/jobs.rss');
    const itemMatches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
    log(`Himalayas RSS returned ${itemMatches.length} items`);

    const getTagContent = (itemXml, tag) => {
      const m = itemXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').trim() : '';
    };

    const allParsed = [];
    for (const match of itemMatches) {
      const itemXml = match[1];
      const rawTitle = getTagContent(itemXml, 'title');
      const applyUrl = getTagContent(itemXml, 'link');
      const guid = getTagContent(itemXml, 'guid') || applyUrl;
      const pubDate = getTagContent(itemXml, 'pubDate');
      const category = getTagContent(itemXml, 'category') || 'Remote';
      const description = getTagContent(itemXml, 'description');

      if (!rawTitle || !applyUrl) continue;

      let company = 'Himalayas';
      let title = rawTitle;
      if (rawTitle.includes(' - ')) {
        const parts = rawTitle.split(' - ');
        title = parts[0].trim();
        company = parts.slice(1).join(' - ').trim();
      }

      const sourceJobId = guid.split('/').pop() || guid;
      const dedupeKey = computeDedupeKey('himalayas', sourceJobId, company, title, applyUrl);
      const publishedAt = pubDate ? new Date(pubDate).toISOString() : null;
      const descriptionExcerpt = createExcerpt(description);
      const tags = category ? [category] : [];

      const salaryInfo = parseSalaryInfo(description);
      const classInfo = classifySeniorityAndEasyScore(title, descriptionExcerpt, category, tags);
      const regionFit = classifyRegionFit('Remote', 'Worldwide', description);

      allParsed.push({
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
    return allParsed;
  } catch (err) {
    log(`[Notice] Himalayas fetch notice: ${err.message}`);
    return [];
  }
}

async function fetchGreenhouseJobs(log) {
  const allParsed = [];
  for (const source of companySources) {
    if (source.ats_type !== 'greenhouse') continue;
    try {
      log(`Fetching Greenhouse API for ${source.company}...`);
      const url = `https://board-api.greenhouse.io/v1/boards/${source.board_slug}/jobs?content=true`;
      const bodyText = await httpGetText(url);
      const data = JSON.parse(bodyText);
      const rawJobs = data?.jobs || [];
      log(`Greenhouse API for ${source.company} returned ${rawJobs.length} jobs`);

      for (const raw of rawJobs) {
        const sourceJobId = String(raw.id || '').trim();
        const title = String(raw.title || '').trim();
        const applyUrl = String(raw.absolute_url || '').trim();
        if (!sourceJobId || !title || !applyUrl) continue;

        const dedupeKey = computeDedupeKey('greenhouse', sourceJobId, source.company, title, applyUrl);
        const publishedAt = raw.updated_at || new Date().toISOString();
        const htmlContent = raw.content || '';
        const descriptionExcerpt = createExcerpt(htmlContent);

        const tags = [...(source.tags || [])];
        if (raw.departments && raw.departments[0]) tags.push(raw.departments[0].name);

        const salaryInfo = parseSalaryInfo(htmlContent);
        const classInfo = classifySeniorityAndEasyScore(title, descriptionExcerpt, '', tags);
        const rawLoc = raw.location?.name || 'Remote';
        const regionFit = classifyRegionFit(rawLoc, source.region_policy, htmlContent);

        allParsed.push({
          source: 'greenhouse',
          source_job_id: sourceJobId,
          title,
          company: source.company,
          location: rawLoc,
          remote_region: source.region_policy,
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
          description_html: htmlContent.slice(0, 16000),
          canonical_url: applyUrl,
          apply_url: applyUrl,
          tags,
          dedupe_key: dedupeKey,
          content_hash: computeContentHash(title, source.company, applyUrl, publishedAt),
          fetched_at: new Date().toISOString(),
          status: 'active',
        });
      }
    } catch (err) {
      log(`[Notice] Greenhouse fetch skipped for ${source.company}: ${err.message}`);
    }
  }
  return allParsed;
}

async function fetchLeverJobs(log) {
  const allParsed = [];
  for (const source of companySources) {
    if (source.ats_type !== 'lever') continue;
    try {
      log(`Fetching Lever API for ${source.company}...`);
      const url = `https://api.lever.co/v0/postings/${source.board_slug}?mode=json`;
      const bodyText = await httpGetText(url);
      const data = JSON.parse(bodyText);
      if (!Array.isArray(data)) continue;
      log(`Lever API for ${source.company} returned ${data.length} jobs`);

      for (const raw of data) {
        const sourceJobId = String(raw.id || '').trim();
        const title = String(raw.title || '').trim();
        const applyUrl = String(raw.hostedUrl || raw.applyUrl || '').trim();
        if (!sourceJobId || !title || !applyUrl) continue;

        const dedupeKey = computeDedupeKey('lever', sourceJobId, source.company, title, applyUrl);
        const publishedAt = raw.createdAt ? new Date(raw.createdAt).toISOString() : new Date().toISOString();
        
        const description = [
          raw.description,
          raw.requirements,
          Array.isArray(raw.lists) ? raw.lists.map(l => `${l.text}\n${l.content}`).join('\n') : ''
        ].filter(Boolean).join('\n\n');
        const descriptionExcerpt = createExcerpt(description);

        const tags = [...(source.tags || [])];
        if (raw.categories?.department) tags.push(raw.categories.department);
        if (raw.categories?.team) tags.push(raw.categories.team);

        const salaryInfo = parseSalaryInfo(description);
        const classInfo = classifySeniorityAndEasyScore(title, descriptionExcerpt, '', tags);
        const rawLoc = raw.categories?.location || 'Remote';
        const regionFit = classifyRegionFit(rawLoc, source.region_policy, description);

        allParsed.push({
          source: 'lever',
          source_job_id: sourceJobId,
          title,
          company: source.company,
          location: rawLoc,
          remote_region: source.region_policy,
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
          description_html: description.slice(0, 16000),
          canonical_url: applyUrl,
          apply_url: applyUrl,
          tags,
          dedupe_key: dedupeKey,
          content_hash: computeContentHash(title, source.company, applyUrl, publishedAt),
          fetched_at: new Date().toISOString(),
          status: 'active',
        });
      }
    } catch (err) {
      log(`[Notice] Lever fetch skipped for ${source.company}: ${err.message}`);
    }
  }
  return allParsed;
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
  const himalayasJobs = await fetchHimalayasJobs(log);
  const greenhouseJobs = await fetchGreenhouseJobs(log);
  const leverJobs = await fetchLeverJobs(log);

  const allFetched = [
    ...remotiveJobs,
    ...jobicyJobs,
    ...wwrJobs,
    ...remoteOkJobs,
    ...arbeitnowJobs,
    ...himalayasJobs,
    ...greenhouseJobs,
    ...leverJobs,
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
        // Update existing document if content changed OR to backfill role_group / salary / seniority / region fields
        const needsBackfill = !existingDoc.role_group ||
          existingDoc.role_group === 'other' ||
          !existingDoc.salary_display ||
          existingDoc.salary_display === 'Salary not listed' ||
          !existingDoc.seniority_level ||
          !existingDoc.region_fit ||
          existingDoc.region_fit.length === 0;

        if (existingDoc.content_hash !== jobPayload.content_hash || needsBackfill || existingDoc.salary_display !== jobPayload.salary_display) {
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
              
              salary_confidence: jobPayload.salary_confidence,
              salary_source: jobPayload.salary_source,
              salary_quality: jobPayload.salary_quality,
              seniority_level: jobPayload.seniority_level,
              easy_job_score: jobPayload.easy_job_score,
              region_fit: jobPayload.region_fit,
              freshness_status: jobPayload.freshness_status,

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
    await new Promise(resolve => setTimeout(resolve, 100));
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
