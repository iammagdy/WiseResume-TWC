'use strict';

const axios = require('axios');
const { URL } = require('url');

// ─── SSRF protection ───────────────────────────────────────────────────────────

const BLOCKED_RANGES = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^::1$/,
  /^fd/,
  /^localhost$/i,
];

function isSafeUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const host = parsed.hostname;
    return !BLOCKED_RANGES.some(re => re.test(host));
  } catch {
    return false;
  }
}

// ─── Provider pool ─────────────────────────────────────────────────────────────

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GROQ_URL       = 'https://api.groq.com/openai/v1/chat/completions';

function buildPool() {
  const pool = [];
  for (let i = 1; i <= 3; i++) {
    const k = process.env[`GROQ_KEY_${i}`];
    if (k) pool.push({ key: k, url: GROQ_URL, model: 'llama-3.3-70b-versatile' });
  }
  for (let i = 1; i <= 3; i++) {
    const k = process.env[`OPENROUTER_KEY_${i}`];
    if (k) pool.push({ key: k, url: OPENROUTER_URL, model: 'meta-llama/llama-3.3-70b-instruct:free' });
  }
  if (process.env.DEEPSEEK_KEY) {
    pool.push({ key: process.env.DEEPSEEK_KEY, url: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat' });
  }
  return pool;
}

async function callLLM(messages, pool) {
  if (pool.length === 0) throw new Error('No AI provider keys configured');
  let lastError;
  for (const entry of pool) {
    try {
      const response = await axios.post(entry.url, {
        model: entry.model,
        messages,
        temperature: 0.2,
        max_tokens: 800,
      }, {
        headers: { 'Authorization': `Bearer ${entry.key}`, 'Content-Type': 'application/json' },
        timeout: 8000,
      });
      return response.data.choices[0].message.content;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

// ─── HTML extraction ───────────────────────────────────────────────────────────

function extractOpenGraph(html) {
  const get = (prop) => {
    const m = html.match(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, 'i'))
      || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, 'i'));
    return m ? m[1].trim() : null;
  };
  return { title: get('title'), description: get('description'), siteName: get('site_name') };
}

function extractJsonLd(html) {
  const matches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of matches) {
    try {
      const data = JSON.parse(m[1]);
      const job = Array.isArray(data) ? data.find(d => d['@type'] === 'JobPosting') : (data['@type'] === 'JobPosting' ? data : null);
      if (job) return job;
    } catch { /* skip malformed */ }
  }
  return null;
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim() : null;
}

function extractBodyText(html, maxChars = 3000) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxChars);
}

// ─── Appwrite document creation ────────────────────────────────────────────────

async function createJobDocument(userId, job, sourceUrl) {
  const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
  const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;
  if (!projectId || !apiKey || !userId) return null;

  const { randomUUID } = require('crypto');
  const docId = randomUUID();

  try {
    const response = await axios.post(
      `${endpoint}/databases/main/collections/jobs/documents`,
      {
        documentId: docId,
        data: {
          user_id: userId,
          title: job.title,
          company: job.company,
          company_logo: null,
          location: job.location || '',
          salary_range: job.salary_range || null,
          job_type: job.job_type || 'full-time',
          remote: job.remote,
          skills: job.skills,
          description: job.description || '',
          requirements: job.requirements || '',
          posted_date: new Date().toISOString(),
          source_url: sourceUrl,
          is_saved: true,
        },
        permissions: [
          `read("user:${userId}")`,
          `update("user:${userId}")`,
          `delete("user:${userId}")`,
        ],
      },
      {
        headers: {
          'X-Appwrite-Project': projectId,
          'X-Appwrite-Key': apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      }
    );
    return response.data;
  } catch (err) {
    return null;
  }
}

// ─── Main handler ──────────────────────────────────────────────────────────────

module.exports = async ({ req, res, log, error }) => {
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.json({ ok: false, error: 'Invalid request body' }, 400);
  }

  const { url, userId } = body || {};

  if (!url || typeof url !== 'string') {
    return res.json({ ok: false, error: 'url is required' }, 400);
  }

  if (!isSafeUrl(url)) {
    return res.json({ ok: false, error: 'Invalid or blocked URL' }, 400);
  }

  // Fetch raw HTML
  let html;
  try {
    const response = await axios.get(url, {
      timeout: 8000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WiseResume/1.0; +https://thewise.cloud)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      maxContentLength: 2 * 1024 * 1024, // 2MB cap
    });
    html = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
  } catch (err) {
    error(`Fetch failed for ${url}: ${err.message}`);
    return res.json({ ok: false, error: 'Could not fetch job page. The site may block automated access.' }, 422);
  }

  // Extract structured data
  const og = extractOpenGraph(html);
  const jsonLd = extractJsonLd(html);
  const pageTitle = extractTitle(html);
  const bodyText = extractBodyText(html);

  // Build context for AI
  const contextParts = [];
  if (jsonLd) contextParts.push(`JSON-LD JobPosting:\n${JSON.stringify(jsonLd, null, 2).slice(0, 2000)}`);
  if (og.title || og.description) contextParts.push(`OpenGraph: title="${og.title}" description="${og.description}" site="${og.siteName}"`);
  if (pageTitle) contextParts.push(`Page title: ${pageTitle}`);
  contextParts.push(`Page text excerpt:\n${bodyText}`);

  const context = contextParts.join('\n\n');

  // AI parse
  const pool = buildPool();
  let rawAI;
  try {
    rawAI = await callLLM([
      {
        role: 'system',
        content: 'You are a job posting parser. Extract structured information from job posting content and return ONLY valid JSON with no explanation.',
      },
      {
        role: 'user',
        content: `Extract the job details from this content and return JSON with these exact fields (use null for unknown values):
{
  "title": "Job title",
  "company": "Company name",
  "location": "City, Country or Remote",
  "salary_range": "e.g. $80k-$100k or null",
  "job_type": "full-time|part-time|contract|internship|freelance",
  "remote": true or false,
  "skills": ["skill1", "skill2"],
  "description": "2-3 sentence summary of the role",
  "requirements": "Key requirements as a comma-separated list"
}

Content:
${context}`,
      },
    ], pool);
  } catch (err) {
    error(`LLM call failed: ${err.message}`);
    return res.json({ ok: false, error: 'AI parsing failed. Please try again.' }, 500);
  }

  // Parse AI JSON response
  let parsed;
  try {
    const jsonMatch = rawAI.match(/\{[\s\S]*\}/);
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch {
    parsed = null;
  }

  if (!parsed || !parsed.title) {
    return res.json({ ok: false, error: 'Could not extract job details from this page.' }, 422);
  }

  const parsedJob = {
    title: parsed.title || 'Unknown Position',
    company: parsed.company || 'Unknown Company',
    location: parsed.location || '',
    salary_range: parsed.salary_range || null,
    job_type: parsed.job_type || 'full-time',
    remote: Boolean(parsed.remote),
    skills: Array.isArray(parsed.skills) ? parsed.skills : [],
    description: parsed.description || '',
    requirements: Array.isArray(parsed.requirements)
      ? parsed.requirements.join(', ')
      : (parsed.requirements || ''),
  };

  log(`Parsed job: ${parsedJob.title} at ${parsedJob.company}`);

  // Create document server-side (bypasses collection permission issues)
  let savedDoc = null;
  try {
    savedDoc = await createJobDocument(userId, parsedJob, url);
    if (savedDoc) log(`Job document created: ${savedDoc.$id}`);
  } catch (err) {
    error(`DB write failed: ${err.message}`);
    // Still return ok:true with the parsed data — frontend will attempt its own write
  }

  return res.json({
    ok: true,
    jobId: savedDoc?.$id || null,
    job: parsedJob,
  });
};
