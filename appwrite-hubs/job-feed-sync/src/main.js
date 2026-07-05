'use strict';

const axios = require('axios');
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

// ─── SOURCE PARSERS ───────────────────────────────────────────────────────────

async function fetchRemotiveJobs(log) {
  try {
    log('Fetching Remotive API...');
    const res = await axios.get('https://remotive.com/api/remote-jobs', { timeout: 15000 });
    const rawJobs = res.data?.jobs || [];
    log(`Remotive API returned ${rawJobs.length} jobs`);

    return rawJobs.map(raw => {
      const sourceJobId = String(raw.id || '').trim();
      const title = String(raw.title || '').trim();
      const company = String(raw.company_name || '').trim();
      const applyUrl = String(raw.url || '').trim();
      if (!title || !company || !applyUrl) return null;

      const dedupeKey = computeDedupeKey('remotive', sourceJobId, company, title, applyUrl);
      const publishedAt = raw.publication_date ? new Date(raw.publication_date).toISOString() : null;

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
        description_html: (raw.description || '').slice(0, 16000),
        canonical_url: applyUrl,
        apply_url: applyUrl,
        tags: Array.isArray(raw.tags) ? raw.tags.map(String).slice(0, 10) : [],
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
  try {
    log('Fetching Jobicy API...');
    const res = await axios.get('https://jobicy.com/api/v2/remote-jobs?count=100', { timeout: 15000 });
    const rawJobs = res.data?.jobs || [];
    log(`Jobicy API returned ${rawJobs.length} jobs`);

    return rawJobs.map(raw => {
      const sourceJobId = String(raw.id || '').trim();
      const title = String(raw.jobTitle || '').trim();
      const company = String(raw.companyName || '').trim();
      const applyUrl = String(raw.url || '').trim();
      if (!title || !company || !applyUrl) return null;

      const dedupeKey = computeDedupeKey('jobicy', sourceJobId, company, title, applyUrl);
      const publishedAt = raw.pubDate ? new Date(raw.pubDate).toISOString() : null;
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
        description_html: (raw.jobDescription || '').slice(0, 16000),
        canonical_url: applyUrl,
        apply_url: applyUrl,
        tags: raw.jobCategory ? [raw.jobCategory] : [],
        dedupe_key: dedupeKey,
        content_hash: computeContentHash(title, company, applyUrl, publishedAt),
        fetched_at: new Date().toISOString(),
        status: 'active',
      };
    }).filter(Boolean);
  } catch (err) {
    log(`[Error] Jobicy fetch failed: ${err.message}`);
    return [];
  }
}

async function fetchWwrJobs(log) {
  try {
    log('Fetching We Work Remotely RSS...');
    const res = await axios.get('https://weworkremotely.com/remote-jobs.rss', { timeout: 15000 });
    const xml = typeof res.data === 'string' ? res.data : String(res.data);
    const itemMatches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
    log(`WWR RSS returned ${itemMatches.length} items`);

    const getTagContent = (itemXml, tag) => {
      const m = itemXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').trim() : '';
    };

    return itemMatches.map(match => {
      const itemXml = match[1];
      const rawTitle = getTagContent(itemXml, 'title');
      const applyUrl = getTagContent(itemXml, 'link');
      const guid = getTagContent(itemXml, 'guid') || applyUrl;
      const pubDate = getTagContent(itemXml, 'pubDate');
      const category = getTagContent(itemXml, 'category') || 'Remote';
      const description = getTagContent(itemXml, 'description');

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
      const publishedAt = pubDate ? new Date(pubDate).toISOString() : null;

      return {
        source: 'weworkremotely',
        source_job_id: sourceJobId,
        title,
        company,
        location: 'Remote',
        remote_region: 'Worldwide',
        category,
        job_type: 'Full-time',
        published_at: publishedAt,
        description_excerpt: createExcerpt(description),
        description_html: description.slice(0, 16000),
        canonical_url: applyUrl,
        apply_url: applyUrl,
        tags: category ? [category] : [],
        dedupe_key: dedupeKey,
        content_hash: computeContentHash(title, company, applyUrl, publishedAt),
        fetched_at: new Date().toISOString(),
        status: 'active',
      };
    }).filter(Boolean);
  } catch (err) {
    log(`[Error] WWR RSS fetch failed: ${err.message}`);
    return [];
  }
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────

module.exports = async ({ req, res, log, error }) => {
  log('Starting job-feed-sync task...');
  const startedAt = new Date().toISOString();
  const db = getDbClient();

  const remotiveJobs = await fetchRemotiveJobs(log);
  const jobicyJobs = await fetchJobicyJobs(log);
  const wwrJobs = await fetchWwrJobs(log);

  const allFetched = [...remotiveJobs, ...jobicyJobs, ...wwrJobs];
  log(`Total aggregated jobs: ${allFetched.length}`);

  let insertedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const job of allFetched) {
    try {
      const existingRes = await db.listDocuments(DB_ID, JOBS_COLLECTION_ID, [
        Query.equal('dedupe_key', job.dedupe_key),
        Query.limit(1),
      ]);

      const existingDoc = existingRes.documents?.[0];

      if (!existingDoc) {
        // Create new job item
        await db.createDocument(
          DB_ID,
          JOBS_COLLECTION_ID,
          ID.unique(),
          job,
          [Permission.read(Role.any())]
        );
        insertedCount++;
      } else if (existingDoc.content_hash !== job.content_hash) {
        // Update changed job item
        await db.updateDocument(
          DB_ID,
          JOBS_COLLECTION_ID,
          existingDoc.$id,
          {
            title: job.title,
            company: job.company,
            company_logo: job.company_logo,
            location: job.location,
            remote_region: job.remote_region,
            category: job.category,
            job_type: job.job_type,
            salary_min: job.salary_min,
            salary_max: job.salary_max,
            salary_currency: job.salary_currency,
            published_at: job.published_at,
            description_excerpt: job.description_excerpt,
            description_html: job.description_html,
            content_hash: job.content_hash,
            fetched_at: job.fetched_at,
          }
        );
        updatedCount++;
      } else {
        skippedCount++;
      }
    } catch (err) {
      errorCount++;
      error(`Error upserting job ${job.dedupe_key}: ${err.message}`);
    }
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
