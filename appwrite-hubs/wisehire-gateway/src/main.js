'use strict';

const axios = require('axios');
const sdk = require('node-appwrite');
const crypto = require('crypto');

const DB_ID = 'main';
const ENDPOINT = process.env.APPWRITE_FUNCTION_API_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';

const BASES = {
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  deepseek: 'https://api.deepseek.com/v1/chat/completions',
  nvidia: 'https://integrate.api.nvidia.com/v1/chat/completions',
};

function header(body, name) {
  const headers = body?.__headers || {};
  return headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()] || '';
}

function getClients(jwt) {
  const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY;
  const admin = new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(apiKey || '');
  const user = new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);
  if (jwt) user.setJWT(jwt);
  return {
    databases: new sdk.Databases(admin),
    account: new sdk.Account(user),
  };
}

function json(res, data, status = 200) {
  return res.json(data, status);
}

async function currentUser(account) {
  try { return await account.get(); } catch { return null; }
}

function parseJson(text) {
  if (typeof text !== 'string') return text;
  const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(cleaned); } catch (_) {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error('AI did not return JSON.');
  }
}

function providerPool() {
  const pool = [];
  if (process.env.OPENROUTER_KEY_1) pool.push({ provider: 'openrouter', key: process.env.OPENROUTER_KEY_1, model: 'meta-llama/llama-3.3-70b-instruct:free' });
  if (process.env.GROQ_KEY_1) pool.push({ provider: 'groq', key: process.env.GROQ_KEY_1, model: 'llama-3.3-70b-versatile' });
  if (process.env.DEEPSEEK_KEY) pool.push({ provider: 'deepseek', key: process.env.DEEPSEEK_KEY, model: 'deepseek-chat' });
  if (process.env.NVIDIA_KEY_1) pool.push({ provider: 'nvidia', key: process.env.NVIDIA_KEY_1, model: 'nvidia/llama-3.1-nemotron-70b-instruct' });
  return pool;
}

async function callAIJson(system, user, fallback) {
  const pool = providerPool();
  if (!pool.length) {
    if (fallback) return fallback;
    const err = new Error('No WiseHire AI provider keys are configured.');
    err.status = 503;
    throw err;
  }
  let lastErr;
  for (const candidate of pool) {
    try {
      const response = await axios.post(BASES[candidate.provider], {
        model: candidate.model,
        temperature: 0.2,
        max_tokens: 2500,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }, {
        headers: { Authorization: `Bearer ${candidate.key}`, 'Content-Type': 'application/json' },
        timeout: 30000,
      });
      return parseJson(response.data.choices[0].message.content);
    } catch (err) {
      lastErr = err;
    }
  }
  if (fallback) return fallback;
  throw lastErr || new Error('WiseHire AI request failed.');
}

async function safeList(databases, collectionId, queries = []) {
  try { return await databases.listDocuments(DB_ID, collectionId, queries); }
  catch (err) { return { documents: [], total: 0, error: err.message }; }
}

async function safeCreate(databases, collectionId, payload) {
  try { return await databases.createDocument(DB_ID, collectionId, sdk.ID.unique(), payload); }
  catch (_) { return null; }
}

function asString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function extractFileText(file) {
  if (!file) return '';
  if (/text|json|csv|markdown/i.test(file.type || '')) {
    try { return Buffer.from(file.base64 || '', 'base64').toString('utf8').slice(0, 20000); } catch { return ''; }
  }
  return '';
}

async function handleWriteJd(body) {
  const input = asString(body.input);
  if (input.length < 10) throw new Error('Role description is too short.');
  const fallback = {
    jd: {
      title: input.split(/[.,\n]/)[0].slice(0, 80) || 'Open Role',
      summary: input,
      responsibilities: ['Own the role outcomes described in the brief.', 'Collaborate with stakeholders and communicate progress clearly.', 'Improve processes and document key decisions.'],
      requirements: ['Relevant experience for the role.', 'Strong communication and problem-solving skills.', 'Ability to work independently and deliver measurable results.'],
      benefits: ['Competitive package.', 'Flexible working culture.', 'Growth opportunities.'],
    },
  };
  return callAIJson(
    'Return only JSON: {"jd":{"title":"","summary":"","responsibilities":[],"requirements":[],"benefits":[]}}.',
    `Write a complete job description from this input:\n${input}`,
    fallback,
  );
}

async function handleGenerateBrief(databases, user, body) {
  const candidateId = asString(body.candidate_id);
  const jdText = asString(body.jd_text);
  if (!candidateId || jdText.length < 20) throw new Error('candidate_id and jd_text are required.');

  const candidate = await databases.getDocument(DB_ID, 'wisehire_candidates', candidateId).catch(() => null);
  const candidateText = [
    candidate?.name || candidate?.full_name || 'Candidate',
    candidate?.resume_text || candidate?.headline || '',
    Array.isArray(candidate?.skills) ? candidate.skills.join(', ') : '',
  ].join('\n');

  const fallbackBrief = {
    match_score: 60,
    strengths: ['Relevant background found in the candidate record.'],
    concerns: ['Manual review recommended because AI evidence was limited.'],
    interview_questions: ['Tell me about your most relevant experience for this role.'],
    employment_notes: 'Generated from available candidate data and job description.',
  };
  const aiBrief = await callAIJson(
    'Return only JSON: {"match_score":0,"strengths":[],"concerns":[],"interview_questions":[],"employment_notes":""}.',
    `Candidate:\n${candidateText}\n\nJob description:\n${jdText}`,
    fallbackBrief,
  );

  const doc = await safeCreate(databases, 'wisehire_candidate_briefs', {
    owner_id: user.$id,
    candidate_id: candidateId,
    role_id: candidate?.role_id || null,
    match_score: Number(aiBrief.match_score ?? 0),
    strengths: aiBrief.strengths || [],
    concerns: aiBrief.concerns || [],
    interview_questions: aiBrief.interview_questions || [],
    employment_notes: aiBrief.employment_notes || '',
    ai_model_used: 'wisehire-gateway',
    is_byok: false,
    share_token: crypto.randomUUID(),
    share_token_active: true,
    created_at: new Date().toISOString(),
  });

  return { brief: { id: doc?.$id || crypto.randomUUID(), owner_id: user.$id, candidate_id: candidateId, role_id: candidate?.role_id || null, ...aiBrief, ai_model_used: 'wisehire-gateway', is_byok: false, share_token: doc?.share_token || null, share_token_active: true, created_at: doc?.$createdAt || new Date().toISOString() } };
}

async function handleBulkScreen(databases, user, body) {
  const files = Array.isArray(body.__files) ? body.__files : [];
  const jdText = asString(body.jd_text);
  const results = files.map((file, index) => {
    const text = extractFileText(file);
    const hasKeyword = jdText && text ? jdText.toLowerCase().split(/\W+/).filter(w => w.length > 4).some(w => text.toLowerCase().includes(w)) : false;
    return {
      rank: index + 1,
      filename_name: file.name || `candidate-${index + 1}`,
      match_score: hasKeyword ? 72 : 55,
      strengths: text ? ['Readable text was extracted for review.'] : ['File received successfully.'],
      concerns: text ? [] : ['No text extraction was available inside this function execution.'],
      summary: text ? text.slice(0, 500) : `Candidate file ${file.name || index + 1} is queued for manual review.`,
    };
  });
  const doc = await safeCreate(databases, 'wisehire_bulk_screen_jobs', {
    owner_id: user.$id,
    role_id: body.role_id || null,
    status: 'done',
    results: JSON.stringify(results),
    resume_count: results.length,
    error_message: null,
    created_at: new Date().toISOString(),
  });
  return { jobId: doc?.$id || null, results };
}

async function handleMaskCvs(body) {
  const files = Array.isArray(body.__files) ? body.__files : [];
  const results = files.map((file, index) => {
    const text = extractFileText(file);
    const maskedText = (text || `File ${file.name || index + 1} received.`)
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
      .replace(/\+?\d[\d\s().-]{7,}\d/g, '[phone]');
    return {
      label: `Candidate ${index + 1}`,
      filename: file.name || `candidate-${index + 1}`,
      maskedText,
      redactedFields: ['email', 'phone'],
    };
  });
  return { results };
}

async function handleOutreach(databases, user, body) {
  if (body.ai_draft) {
    return {
      draft: `Hi ${body.candidate_name || 'there'},\n\nI came across your profile and thought your background could be a strong fit for ${body.role_title || 'an open role'}.\n\nWould you be open to a quick conversation this week?\n\nBest,\nWiseHire Team`,
    };
  }
  const doc = await safeCreate(databases, 'wisehire_outreach_emails', {
    candidate_id: body.candidate_id,
    to_email: body.to_email,
    subject: body.subject,
    body: body.body,
    status: 'saved',
    resend_message_id: null,
    created_at: new Date().toISOString(),
  });
  return { ok: true, status: 'saved', id: doc?.$id || crypto.randomUUID(), remaining: 0 };
}

async function handleTalentSearch(databases, body) {
  const queries = [sdk.Query.limit(Math.min(Number(body.limit) || 25, 50)), sdk.Query.offset(Number(body.offset) || 0)];
  if (body.experience_level) queries.push(sdk.Query.equal('experience_level', body.experience_level));
  if (typeof body.remote_ok === 'boolean') queries.push(sdk.Query.equal('remote_ok', body.remote_ok));
  const res = await safeList(databases, 'talent_pool_profiles', queries);
  const q = asString(body.query).toLowerCase();
  const docs = q
    ? res.documents.filter(d => `${d.full_name || ''} ${d.headline || ''} ${(d.skills || []).join(' ')}`.toLowerCase().includes(q))
    : res.documents;
  return {
    results: docs.map(d => ({
      id: d.$id,
      full_name: d.full_name || null,
      headline: d.headline || null,
      skills: d.skills || [],
      experience_level: d.experience_level || null,
      availability: d.availability || null,
      location: d.location || null,
      remote_ok: !!d.remote_ok,
      profile_slug: d.profile_slug || null,
      view_count: d.view_count || 0,
      opted_in_at: d.opted_in_at || null,
    })),
    total: q ? docs.length : res.total,
  };
}

async function handleTalentView(databases, user, body) {
  const profileId = asString(body.profile_id);
  if (!profileId) return { ok: false };
  await safeCreate(databases, 'talent_pool_views', {
    profile_id: profileId,
    viewer_id: user.$id,
    viewed_at: new Date().toISOString(),
  });
  return { ok: true };
}

async function handleWisehireAccess(databases, user, body) {
  const accessAction = body.action_name || body.wisehire_action || body.action;
  const email = asString(body.email).toLowerCase();
  if (accessAction === 'waitlist-check-email') {
    const res = email ? await safeList(databases, 'wisehire_waitlist', [sdk.Query.equal('email', email), sdk.Query.limit(1)]) : { total: 0 };
    return { success: true, already_registered: (res.total || 0) > 0 };
  }
  if (accessAction === 'waitlist-join') {
    if (!email) throw new Error('Email is required.');
    const exists = await safeList(databases, 'wisehire_waitlist', [sdk.Query.equal('email', email), sdk.Query.limit(1)]);
    if ((exists.total || 0) > 0) return { success: true, already_registered: true, message: 'You are already on the WiseHire waitlist.' };
    await safeCreate(databases, 'wisehire_waitlist', {
      email,
      name: body.name || body.full_name || '',
      company_name: body.company_name || '',
      company_size: body.company_size || '',
    });
    return { success: true, message: 'WiseHire waitlist request received.' };
  }
  if (accessAction === 'complete-signup') {
    if (!user) return { success: false, error: 'Please sign in to complete WiseHire setup.' };
    await safeCreate(databases, 'wisehire_companies', {
      owner_id: user.$id,
      name: body.company_name || 'WiseHire Company',
      size: body.company_size || '',
      onboarding_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    return { success: true };
  }
  return { success: false, valid: false, error: 'WiseHire access action is not available.' };
}

module.exports = async ({ req, res, error }) => {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const action = body.action;
    const jwt = header(body, 'X-Appwrite-JWT');
    const { databases, account } = getClients(jwt);
    const user = await currentUser(account);

    const anonymousAllowed = action === 'wisehire-access';
    if (!user && !anonymousAllowed) {
      return json(res, { status: 'error', message: 'Please sign in to use WiseHire.' }, 401);
    }

    let data;
    if (action === 'wisehire-write-jd') data = await handleWriteJd(body);
    else if (action === 'wisehire-generate-brief') data = await handleGenerateBrief(databases, user, body);
    else if (action === 'wisehire-bulk-screen') data = await handleBulkScreen(databases, user, body);
    else if (action === 'wisehire-mask-cvs') data = await handleMaskCvs(body);
    else if (action === 'wisehire-send-outreach') data = await handleOutreach(databases, user, body);
    else if (action === 'wisehire-talent-search') data = await handleTalentSearch(databases, body);
    else if (action === 'wisehire-talent-view') data = await handleTalentView(databases, user, body);
    else if (action === 'wisehire-access') data = await handleWisehireAccess(databases, user, { ...body, action: body.wisehire_action || body.action_name || body.action });
    else return json(res, { status: 'error', message: `Unknown WiseHire action: ${action}` }, 400);

    return json(res, { status: 'success', data });
  } catch (err) {
    error(`WiseHire Gateway Error: ${err.message}`);
    return json(res, { status: 'error', message: err.message || 'WiseHire request failed.' }, err.status || 500);
  }
};
