'use strict';

const crypto = require('crypto');
const sdk = require('node-appwrite');

const DB_ID = 'main';
const ENDPOINT = process.env.APPWRITE_FUNCTION_API_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || '';

const PROFILES_COLLECTION_ID = 'profiles';
const RESUMES_COLLECTION_ID = 'resumes';
const RESUME_SHARES_COLLECTION_ID = 'resume_shares';
const CHAT_SESSIONS_COLLECTION_ID = 'chat_sessions';

const SESSION_TOKEN_TTL_MS = 6 * 60 * 60 * 1000;
const INTERNAL_GATEWAY_TOKEN_TTL_MS = 2 * 60 * 1000;
const MAX_QUESTION_LENGTH = 500;
const MAX_HISTORY_ITEMS = 6;
const MAX_HISTORY_CONTENT_LENGTH = 500;

function getClient() {
  return new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
}

function getDatabases() {
  return new sdk.Databases(getClient());
}

function getFunctions() {
  return new sdk.Functions(getClient());
}

function parseBody(req) {
  if (typeof req.body !== 'string') {
    return req.body && typeof req.body === 'object' ? req.body : {};
  }
  const raw = req.body.trim();
  if (!raw) return {};
  const parsed = JSON.parse(raw);
  return parsed && typeof parsed === 'object' ? parsed : {};
}

function asString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function signToken(payload) {
  const encoded = base64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', API_KEY).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyToken(token, expectedPurpose) {
  if (!API_KEY || typeof token !== 'string' || !token.includes('.')) return null;
  const dotIndex = token.lastIndexOf('.');
  const encoded = token.slice(0, dotIndex);
  const sig = token.slice(dotIndex + 1);
  if (!encoded || !sig) return null;

  try {
    const expected = crypto.createHmac('sha256', API_KEY).update(encoded).digest('base64url');
    const sigBuf = Buffer.from(sig, 'base64url');
    const expectedBuf = Buffer.from(expected, 'base64url');
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;
  } catch {
    return null;
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (payload?.purpose !== expectedPurpose) return null;
  if (typeof payload.exp !== 'number' || Date.now() > payload.exp) return null;
  return payload;
}

function normalizeUsername(value) {
  const username = asString(value).toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/.test(username)) {
    return null;
  }
  return username;
}

async function getPortfolioProfile(db, username) {
  const profileRes = await db.listDocuments(DB_ID, PROFILES_COLLECTION_ID, [
    sdk.Query.equal('username', username),
    sdk.Query.limit(1),
  ]);
  const profile = profileRes.documents?.[0] || null;
  // Use snake_case field from Appwrite (portfolio_enabled)
  if (!profile || profile.portfolio_enabled !== true) return null;
  return profile;
}

async function getResumeForPortfolio(db, profile, userId) {
  // Use selected portfolio_resume_id if available, otherwise fallback to any resume by user
  const selectedResumeId = profile.portfolio_resume_id || profile.portfolioResumeId;
  if (selectedResumeId) {
    try {
      const resume = await db.getDocument(DB_ID, RESUMES_COLLECTION_ID, selectedResumeId);
      if (resume) return resume;
    } catch {
      // Fall through to user_id query if selected resume not found
    }
  }
  // Fallback: fetch any resume by user_id (legacy behavior)
  const resumeRes = await db.listDocuments(DB_ID, RESUMES_COLLECTION_ID, [
    sdk.Query.equal('user_id', userId),
    sdk.Query.limit(1),
  ]);
  return resumeRes.documents?.[0] || null;
}

function extractSkills(resume) {
  if (!Array.isArray(resume?.skills)) return [];
  return resume.skills
    .map((skill) => {
      if (typeof skill === 'string') return skill.trim();
      if (skill && typeof skill === 'object' && typeof skill.name === 'string') return skill.name.trim();
      return '';
    })
    .filter(Boolean)
    .slice(0, 20);
}

function extractRecentRole(resume) {
  if (!Array.isArray(resume?.experience) || resume.experience.length === 0) return undefined;
  const latest = resume.experience[0];
  if (!latest || typeof latest !== 'object') return undefined;
  const position = asString(latest.position);
  const company = asString(latest.company);
  return [position, company ? `at ${company}` : ''].filter(Boolean).join(' ').trim() || undefined;
}

function buildProfileContext(profile, resume) {
  // Parse portfolio_extras safely (stored as JSON string in Appwrite)
  let extras = {};
  try {
    const rawExtras = profile.portfolio_extras || profile.portfolioExtras;
    extras = typeof rawExtras === 'string' ? JSON.parse(rawExtras) : (rawExtras || {});
  } catch {
    extras = {};
  }
  const portfolioSummary = asString(extras.portfolioSummary);
  // Use snake_case fields from Appwrite raw documents
  return {
    fullName: asString(profile.full_name || profile.fullName) || 'this professional',
    title: asString(profile.job_title || profile.jobTitle) || undefined,
    location: asString(profile.location) || undefined,
    bio: asString(profile.portfolio_bio || profile.portfolioBio || portfolioSummary || resume?.summary || '').slice(0, 300) || undefined,
    skills: extractSkills(resume),
    recentRole: extractRecentRole(resume),
  };
}

function sanitizeConversationHistory(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => ({
      role: entry.role === 'assistant' ? 'assistant' : entry.role === 'user' ? 'user' : '',
      content: typeof entry.content === 'string' ? entry.content.trim().slice(0, MAX_HISTORY_CONTENT_LENGTH) : '',
    }))
    .filter((entry) => (entry.role === 'assistant' || entry.role === 'user') && entry.content)
    .slice(-MAX_HISTORY_ITEMS);
}

async function executeAiGateway(payload) {
  const execution = await getFunctions().createExecution({
    functionId: 'ai-gateway',
    body: JSON.stringify(payload),
    async: false,
    path: '/',
    method: 'POST',
  });

  if (execution.status === 'failed') {
    throw new Error(execution.errors || 'AI gateway execution failed.');
  }

  let parsed;
  try {
    parsed = JSON.parse(execution.responseBody || '{}');
  } catch {
    parsed = { status: 'error', message: 'AI gateway returned malformed JSON.' };
  }

  return {
    parsed,
    statusCode: execution.responseStatusCode || 200,
  };
}

async function handleVerifySharePassword(db, body, res) {
  const token = asString(body.token);
  const password = String(body.password || '');
  if (!token || !password) {
    return res.json({ status: 'success', data: { authenticated: false } });
  }

  const shareRes = await db.listDocuments(DB_ID, RESUME_SHARES_COLLECTION_ID, [
    sdk.Query.equal('token', token),
    sdk.Query.limit(1),
  ]);
  const share = shareRes.documents?.[0];
  const active = !!share?.is_active && (!share.expires_at || new Date(share.expires_at).getTime() > Date.now());
  const authenticated = active && String(share?.password || '') === password;

  return res.json({ status: 'success', data: { authenticated } });
}

async function handleCreatePortfolioChatSession(db, body, res) {
  const username = normalizeUsername(body.username);
  if (!username) {
    return res.json({ status: 'error', message: 'Invalid portfolio username.' }, 400);
  }

  const profile = await getPortfolioProfile(db, username);
  if (!profile) {
    return res.json({ status: 'error', message: 'Portfolio chat is unavailable for this profile.' }, 404);
  }

  const chatSession = await db.createDocument(
    DB_ID,
    CHAT_SESSIONS_COLLECTION_ID,
    sdk.ID.unique(),
    { question_count: 0 },
  );

  const now = Date.now();
  const sessionToken = signToken({
    purpose: 'portfolio-chat-session',
    sid: chatSession.$id,
    username,
    ownerUserId: String(profile.user_id || ''),
    iat: now,
    exp: now + SESSION_TOKEN_TTL_MS,
  });

  return res.json({
    status: 'success',
    data: {
      sessionToken,
      maxQuestions: 10,
    },
  });
}

async function handleAskPortfolio(db, body, res) {
  const username = normalizeUsername(body.username);
  if (!username) {
    return res.json({ status: 'error', message: 'Invalid portfolio username.' }, 400);
  }

  const signedSession = asString(body.sessionToken);
  const sessionPayload = verifyToken(signedSession, 'portfolio-chat-session');
  if (!sessionPayload || sessionPayload.username !== username || typeof sessionPayload.sid !== 'string' || typeof sessionPayload.ownerUserId !== 'string') {
    return res.json({ status: 'error', code: 'session_not_found', message: 'Portfolio session not found or expired.' }, 403);
  }

  const question = asString(body.question).slice(0, MAX_QUESTION_LENGTH);
  if (!question) {
    return res.json({ status: 'error', message: 'Question is required.' }, 400);
  }

  const profile = await getPortfolioProfile(db, username);
  if (!profile || String(profile.user_id || '') !== sessionPayload.ownerUserId) {
    return res.json({ status: 'error', message: 'Portfolio chat is unavailable for this profile.' }, 404);
  }

  const resume = await getResumeForPortfolio(db, profile, sessionPayload.ownerUserId);
  const profileContext = buildProfileContext(profile, resume);
  const conversationHistory = sanitizeConversationHistory(body.conversationHistory);

  const now = Date.now();
  const internalToken = signToken({
    purpose: 'public-portfolio-chat',
    sid: sessionPayload.sid,
    username,
    ownerUserId: sessionPayload.ownerUserId,
    iat: now,
    exp: now + INTERNAL_GATEWAY_TOKEN_TTL_MS,
  });

  const { parsed, statusCode } = await executeAiGateway({
    featureName: 'ask-portfolio',
    username,
    question,
    sessionToken: sessionPayload.sid,
    conversationHistory,
    profileContext,
    __headers: {
      'X-Internal-Gateway-Token': internalToken,
    },
  });

  return res.json(parsed, statusCode);
}

module.exports = async ({ req, res, error }) => {
  try {
    if (!API_KEY) {
      return res.json({ status: 'error', message: 'Appwrite API key is not configured.' }, 500);
    }

    const body = parseBody(req);
    const action = asString(body.action);
    const databases = getDatabases();

    if (action === 'verify-share-password') {
      return await handleVerifySharePassword(databases, body, res);
    }
    if (action === 'create-portfolio-chat-session') {
      return await handleCreatePortfolioChatSession(databases, body, res);
    }
    if (action === 'ask-portfolio') {
      return await handleAskPortfolio(databases, body, res);
    }

    return res.json({ status: 'error', message: `Unknown public share action: ${action}` }, 400);
  } catch (err) {
    error(`Public share error: ${err.message}`);
    return res.json({ status: 'error', message: 'Public share request failed.' }, 500);
  }
};
