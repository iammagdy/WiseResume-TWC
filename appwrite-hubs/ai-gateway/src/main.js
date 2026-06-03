'use strict';

const axios = require('axios');
const sdk = require('node-appwrite');
const extractedPrompts = require('./extracted_prompts.json');

function enableLLMObs() { /* Datadog removed — dd-trace has native Windows binaries incompatible with Linux Appwrite */ }
async function flushDD() { /* no-op */ }

// ─── Provider constants ───────────────────────────────────────────────────────

const OPENROUTER_FREE_MODEL  = 'meta-llama/llama-3.3-70b-instruct:free';
const GROQ_FREE_MODEL        = 'llama-3.3-70b-versatile';
const DEEPSEEK_MODEL         = 'deepseek-chat';
const NVIDIA_DEFAULT_MODEL   = 'nvidia/llama-3.1-nemotron-70b-instruct';

const BASES = {
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  groq:       'https://api.groq.com/openai/v1/chat/completions',
  deepseek:   'https://api.deepseek.com/v1/chat/completions',
  nvidia:     'https://integrate.api.nvidia.com/v1/chat/completions',
};

const DB_ID = 'main';
const AI_CREDITS_COLLECTION_ID = 'ai_credits';
const SUBSCRIPTIONS_COLLECTION_ID = 'subscriptions';
const SERVER_RATE_LIMIT_WINDOW_MS = 60_000;
const SERVER_RATE_LIMIT_MAX_REQUESTS = 20;
const PLAN_DAILY_LIMITS = {
  free: 5,
  pro: 50,
  premium: -1,
};
const FEATURE_CREDIT_COSTS = {
  'score-resume': 0,
  'analyze-resume': 2,
  'tailor-resume': 2,
  'generate-cover-letter': 2,
  'generate-question-bank': 1,
  'recruiter-simulation': 2,
  'agentic-chat': 1,
  'wise-ai-chat': 1,
  'resume-section-ai': 1,
  'editor-ai': 1,
  'detect-and-humanize': 1,
  'smart-fit-rewrite': 2,
  'career-assessment': 2,
  'generate-portfolio-bio': 1,
  'generate-resignation-letter': 1,
  'validate-tailor': 1,
  'suggest-template': 1,
  'generate-fix-suggestions': 1,
  'parse-resume': 1,
  'parse-job': 1,
  'optimize-for-linkedin': 1,
  'company-briefing': 1,
  'ask-portfolio': 1,
};
const PARSE_RESUME_SYSTEM_PROMPT =
  extractedPrompts?.['parse-resume']?.system ||
  'You are an expert resume parser. Return only valid JSON.';
const _serverRateLimits = new Map();
const _emailRateLimits  = new Map(); // ip → { count, resetAt }
const EMAIL_RATE_LIMIT_WINDOW_MS  = 60 * 60 * 1000; // 1 hour
const EMAIL_RATE_LIMIT_MAX        = 5;

function checkEmailRateLimit(ip) {
  if (!ip) return { ok: true }; // no IP header → allow (shouldn't happen in practice)
  const now     = Date.now();
  const current = _emailRateLimits.get(ip);
  if (!current || now > current.resetAt) {
    _emailRateLimits.set(ip, { count: 1, resetAt: now + EMAIL_RATE_LIMIT_WINDOW_MS });
    return { ok: true };
  }
  if (current.count >= EMAIL_RATE_LIMIT_MAX) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }
  current.count += 1;
  return { ok: true };
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function asOptionalString(value) {
  const str = asString(value);
  return str || undefined;
}

function asBoolean(value) {
  return value === true;
}

function toStringArray(value) {
  if (Array.isArray(value)) {
    return value
      .map(item => typeof item === 'string' ? item.trim() : '')
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/[,\n|]/)
      .map(item => item.trim())
      .filter(Boolean);
  }
  return [];
}

function parseRequestBody(req) {
  if (typeof req.body !== 'string') {
    return isRecord(req.body) ? req.body : {};
  }
  const raw = req.body.trim();
  if (!raw) return {};
  const parsed = JSON.parse(raw);
  return isRecord(parsed) ? parsed : {};
}

function getHeader(headers, name) {
  if (!isRecord(headers)) return '';
  const wanted = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (String(key).toLowerCase() === wanted) {
      return Array.isArray(value) ? asString(value[0]) : asString(value);
    }
  }
  return '';
}

function extractJwt(body, req) {
  const embeddedHeaders = isRecord(body.__headers) ? body.__headers : {};
  const fromEmbeddedJwt = getHeader(embeddedHeaders, 'X-Appwrite-JWT');
  const fromRequestJwt = getHeader(req.headers, 'X-Appwrite-JWT');
  const authHeader = getHeader(embeddedHeaders, 'Authorization') || getHeader(req.headers, 'Authorization');
  const bearer = authHeader.replace(/^Bearer\s+/i, '').trim();
  return fromEmbeddedJwt || fromRequestJwt || bearer;
}

function isSensitivePayloadKey(key) {
  const normalized = String(key || '').toLowerCase();
  return normalized === '__headers' ||
    normalized === 'headers' ||
    normalized === 'authorization' ||
    normalized === 'x-appwrite-jwt' ||
    normalized === 'jwt' ||
    normalized === 'token' ||
    normalized === 'session' ||
    normalized === 'password' ||
    normalized === 'apikey' ||
    normalized === 'api_key' ||
    normalized.endsWith('token') ||
    normalized.endsWith('jwt') ||
    normalized.includes('authorization') ||
    normalized.includes('password');
}

function sanitizeAiPayload(value, depth = 0) {
  if (depth > 8) return null;
  if (Array.isArray(value)) {
    return value.map(item => sanitizeAiPayload(item, depth + 1));
  }
  if (!isRecord(value)) {
    return value;
  }

  const safe = {};
  for (const [key, item] of Object.entries(value)) {
    if (isSensitivePayloadKey(key)) continue;
    safe[key] = sanitizeAiPayload(item, depth + 1);
  }
  return safe;
}

function getAppwriteEndpoint() {
  return process.env.APPWRITE_FUNCTION_API_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
}

function getAppwriteProjectId() {
  return process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
}

async function validateUserSession(body, req) {
  const jwt = extractJwt(body, req);
  if (!jwt) {
    return { ok: false, status: 401, message: 'Authentication required.' };
  }

  try {
    const client = new sdk.Client()
      .setEndpoint(getAppwriteEndpoint())
      .setProject(getAppwriteProjectId())
      .setJWT(jwt);
    const account = new sdk.Account(client);
    const user = await account.get();
    return { ok: true, user };
  } catch {
    return { ok: false, status: 401, message: 'Invalid or expired session.' };
  }
}

function getFeatureCreditCost(featureName) {
  return FEATURE_CREDIT_COSTS[featureName] ?? 1;
}

function isTrialActive(subscription) {
  const expiresAt = subscription?.trial_expires_at;
  return !!(subscription?.trial_plan && expiresAt && new Date(expiresAt).getTime() > Date.now());
}

async function getEffectivePlan(db, userId) {
  try {
    const res = await db.listDocuments(DB_ID, SUBSCRIPTIONS_COLLECTION_ID, [
      sdk.Query.equal('user_id', userId),
      sdk.Query.limit(1),
    ]);
    const subscription = res.documents?.[0];
    const rawPlan = subscription?.effective_plan ||
      (isTrialActive(subscription) ? subscription.trial_plan : subscription?.plan) ||
      'free';
    const plan = String(rawPlan).toLowerCase();
    return Object.prototype.hasOwnProperty.call(PLAN_DAILY_LIMITS, plan) ? plan : 'free';
  } catch {
    return 'free';
  }
}

function userCreditPermissions(userId) {
  return [
    sdk.Permission.read(sdk.Role.user(userId)),
  ];
}

async function loadCreditState(db, userId, featureName) {
  const cost = getFeatureCreditCost(featureName);
  if (cost <= 0) {
    return { cost, chargeable: false };
  }

  const today = new Date().toISOString().slice(0, 10);
  const plan = await getEffectivePlan(db, userId);
  const planLimit = PLAN_DAILY_LIMITS[plan] ?? PLAN_DAILY_LIMITS.free;

  let res;
  try {
    res = await db.listDocuments(DB_ID, AI_CREDITS_COLLECTION_ID, [
      sdk.Query.equal('user_id', userId),
      sdk.Query.limit(1),
    ]);
  } catch (err) {
    return {
      cost,
      chargeable: true,
      blocked: true,
      status: 503,
      message: 'AI credit tracking is not available.',
      detail: err.message,
    };
  }

  let doc = res.documents?.[0];
  if (!doc) {
    doc = await db.createDocument(DB_ID, AI_CREDITS_COLLECTION_ID, sdk.ID.unique(), {
      user_id: userId,
      daily_usage: 0,
      daily_limit: planLimit,
      total_usage: 0,
      usage_date: today,
    }, userCreditPermissions(userId));
  }

  const dailyLimit = Number(doc.daily_limit ?? planLimit);
  const effectiveLimit = Number.isFinite(dailyLimit) ? dailyLimit : planLimit;
  const usageDate = doc.usage_date === today ? today : doc.usage_date;
  const currentUsage = usageDate === today ? Number(doc.daily_usage || 0) : 0;

  if (effectiveLimit !== -1 && currentUsage + cost > effectiveLimit) {
    return {
      cost,
      chargeable: true,
      blocked: true,
      status: 402,
      code: 'ai_credits_exhausted',
      message: 'Daily AI credit limit reached.',
      doc,
      dailyLimit: effectiveLimit,
      currentUsage,
      today,
    };
  }

  return {
    cost,
    chargeable: true,
    blocked: false,
    doc,
    dailyLimit: effectiveLimit,
    currentUsage,
    today,
  };
}

async function recordAiUsage(db, creditState) {
  if (!creditState?.chargeable || creditState.blocked || creditState.cost <= 0 || !creditState.doc) {
    return;
  }
  // TODO(race-condition): This read-then-write is NOT atomic. Two concurrent requests
  // for the same user can both pass the credit check before either increments the
  // counter, allowing up to (cost * concurrent_requests) over-spending.
  //
  // Risk level: LOW for typical usage (users rarely fire parallel AI requests).
  // Worst case: a user with limit=5 could consume 5+N credits if N requests are
  // in-flight simultaneously during the same daily window.
  //
  // Safe fix (requires Appwrite backend support): use Appwrite's atomic increment
  // operator when it becomes available, or add a per-user server-side mutex via a
  // short-lived Appwrite document lock checked before loadCreditState.
  //
  // Current mitigation: the warm-instance rate limiter (checkServerRateLimit) already
  // serialises rapid requests from the same user on the same function instance,
  // which covers the common case. Cross-instance races remain possible.
  await db.updateDocument(DB_ID, AI_CREDITS_COLLECTION_ID, creditState.doc.$id, {
    daily_usage: creditState.currentUsage + creditState.cost,
    daily_limit: creditState.dailyLimit,
    total_usage: Number(creditState.doc.total_usage || 0) + creditState.cost,
    usage_date: creditState.today,
  });
}

function checkServerRateLimit(userId, featureName) {
  const now = Date.now();
  const key = `${userId}:${featureName || 'general'}`;
  const current = _serverRateLimits.get(key);
  if (!current || now > current.resetAt) {
    _serverRateLimits.set(key, { count: 1, resetAt: now + SERVER_RATE_LIMIT_WINDOW_MS });
    return { ok: true };
  }
  if (current.count >= SERVER_RATE_LIMIT_MAX_REQUESTS) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }
  current.count += 1;
  return { ok: true };
}

function parseJsonObject(text) {
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('Resume parser returned an empty response.');
  }

  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (_) {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('Resume parser did not return JSON.');
    }
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

function isGenericPositionTitle(position) {
  const p = asString(position);
  if (!p) return true;
  if (/^position\s*#?\s*\d+$/i.test(p)) return true;
  if (/^job\s*#?\s*\d+$/i.test(p)) return true;
  if (/^role\s*#?\s*\d+$/i.test(p)) return true;
  if (/^title\s*#?\s*\d+$/i.test(p)) return true;
  if (/^(position|job|role|title|work experience|experience)$/i.test(p)) return true;
  return false;
}

function looksLikeJobTitleLine(line) {
  const t = asString(line);
  if (!t || t.length < 3 || t.length > 100) return false;
  if (/\b(?:19|20)\d{2}\b|present|current/i.test(t)) return false;
  if (/@/.test(t)) return false;
  return /\b(manager|engineer|developer|analyst|consultant|director|lead|senior|junior|specialist|coordinator|officer|representative|supervisor|administrator|architect|designer|intern|associate|executive|advisor|agent)\b/i.test(t);
}

function derivePositionFallback(item) {
  const alt = [
    asString(item.title),
    asString(item.role),
    asString(item.jobTitle),
    asString(item.job_title),
  ].find((v) => v && !isGenericPositionTitle(v));
  if (alt) return alt;

  const desc = asString(item.description);
  if (desc) {
    const firstLine = desc
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.length > 0 && line.length < 100 && !isGenericPositionTitle(line) && looksLikeJobTitleLine(line));
    if (firstLine) return firstLine;
  }

  const resp = toStringArray(item.responsibilities);
  const respTitle = resp.find((line) => looksLikeJobTitleLine(line) && !isGenericPositionTitle(line));
  if (respTitle) return respTitle;

  return '';
}

function normalizeExperienceItem(item) {
  if (!isRecord(item)) return null;
  let position =
    asString(item.position) ||
    asString(item.title) ||
    asString(item.role) ||
    asString(item.jobTitle) ||
    asString(item.job_title);
  let company =
    asString(item.company) ||
    asString(item.employer) ||
    asString(item.organization);

  if (!position && company.includes(' at ')) {
    const parts = company.split(/\s+at\s+/i);
    if (parts.length === 2 && looksLikeJobTitleLine(parts[0])) {
      position = parts[0].trim();
      company = parts[1].trim();
    }
  }

  if (isGenericPositionTitle(position)) {
    position = derivePositionFallback(item);
  }
  return {
    id: '',
    company,
    position,
    account: asOptionalString(item.account),
    startDate: asString(item.startDate),
    endDate: asString(item.endDate),
    current: asBoolean(item.current),
    description: asString(item.description),
    achievements: toStringArray(item.achievements),
    responsibilities: toStringArray(item.responsibilities),
    isProject: asBoolean(item.isProject),
  };
}

function normalizeEducationItem(item) {
  if (!isRecord(item)) return null;
  return {
    id: '',
    institution: asString(item.institution),
    degree: asString(item.degree),
    field: asString(item.field),
    startDate: asString(item.startDate),
    endDate: asString(item.endDate),
    gpa: asOptionalString(item.gpa),
    description: asOptionalString(item.description),
  };
}

function normalizeCertificationItem(item) {
  if (!isRecord(item)) return null;
  return {
    id: '',
    name: asString(item.name),
    issuer: asString(item.issuer),
    date: asString(item.date),
    expiryDate: asOptionalString(item.expiryDate),
    credentialId: asOptionalString(item.credentialId),
  };
}

function normalizeAwardItem(item) {
  if (!isRecord(item)) return null;
  return {
    id: '',
    title: asString(item.title),
    issuer: asString(item.issuer),
    date: asString(item.date),
    description: asOptionalString(item.description),
  };
}

function normalizeProjectItem(item) {
  if (!isRecord(item)) return null;
  return {
    id: '',
    name: asString(item.name),
    role: asString(item.role),
    startDate: asString(item.startDate),
    endDate: asString(item.endDate),
    technologies: toStringArray(item.technologies),
    description: asString(item.description),
    url: asOptionalString(item.url),
    githubUrl: asOptionalString(item.githubUrl),
  };
}

function normalizePublicationItem(item) {
  if (!isRecord(item)) return null;
  return {
    id: '',
    title: asString(item.title),
    publisher: asString(item.publisher),
    date: asString(item.date),
    coAuthors: asOptionalString(item.coAuthors),
    url: asOptionalString(item.url),
    description: asOptionalString(item.description),
  };
}

function normalizeVolunteeringItem(item) {
  if (!isRecord(item)) return null;
  return {
    id: '',
    organization: asString(item.organization),
    role: asString(item.role),
    startDate: asString(item.startDate),
    endDate: asString(item.endDate),
    description: asString(item.description),
    hours: asOptionalString(item.hours),
  };
}

function normalizeHobbyItem(item) {
  if (typeof item === 'string') {
    return { id: '', name: item.trim(), visible: true };
  }
  if (!isRecord(item)) return null;
  return {
    id: '',
    name: asString(item.name),
    description: asOptionalString(item.description),
    visible: item.visible !== false,
  };
}

function normalizeLanguageItem(item) {
  if (typeof item === 'string') {
    return { id: '', name: item.trim(), proficiency: 'professional' };
  }
  if (!isRecord(item)) return null;
  const proficiency = asString(item.proficiency).toLowerCase();
  const allowed = new Set(['native', 'fluent', 'professional', 'basic']);
  return {
    id: '',
    name: asString(item.name),
    proficiency: allowed.has(proficiency) ? proficiency : 'professional',
  };
}

function normalizeReferenceItem(item) {
  if (!isRecord(item)) return null;
  return {
    id: '',
    name: asString(item.name),
    title: asString(item.title),
    company: asString(item.company),
    email: asString(item.email),
    phone: asString(item.phone),
    relationship: asString(item.relationship),
    availableOnRequest: asBoolean(item.availableOnRequest),
  };
}

function normalizeArray(value, itemNormalizer) {
  if (!Array.isArray(value)) return [];
  return value
    .map(itemNormalizer)
    .filter(Boolean);
}

function hasMeaningfulResumeContent(data) {
  const contact = data.contactInfo || {};
  return Boolean(
    contact.fullName ||
    contact.email ||
    contact.phone ||
    data.summary ||
    data.skills.length ||
    data.experience.length ||
    data.education.length ||
    data.certifications.length ||
    data.awards.length ||
    data.projects.length ||
    data.publications.length ||
    data.volunteering.length ||
    data.hobbies.length ||
    data.references.length ||
    data.languages.length
  );
}

function normalizeResumeData(raw) {
  const parsed = isRecord(raw) ? raw : parseJsonObject(raw);
  if (!isRecord(parsed)) {
    throw new Error('Resume parser returned malformed JSON.');
  }

  const contact = isRecord(parsed.contactInfo) ? parsed.contactInfo : {};
  const data = {
    contactInfo: {
      fullName: asString(contact.fullName),
      email: asString(contact.email),
      email2: asOptionalString(contact.email2),
      phone: asString(contact.phone),
      location: asString(contact.location),
      linkedin: asOptionalString(contact.linkedin),
      github: asOptionalString(contact.github),
      portfolio: asOptionalString(contact.portfolio),
      photoUrl: asOptionalString(contact.photoUrl),
    },
    summary: asString(parsed.summary),
    experience: normalizeArray(parsed.experience, normalizeExperienceItem),
    education: normalizeArray(parsed.education, normalizeEducationItem),
    skills: toStringArray(parsed.skills),
    certifications: normalizeArray(parsed.certifications, normalizeCertificationItem),
    awards: normalizeArray(parsed.awards, normalizeAwardItem),
    projects: normalizeArray(parsed.projects, normalizeProjectItem),
    publications: normalizeArray(parsed.publications, normalizePublicationItem),
    volunteering: normalizeArray(parsed.volunteering, normalizeVolunteeringItem),
    hobbies: normalizeArray(parsed.hobbies, normalizeHobbyItem),
    references: normalizeArray(parsed.references, normalizeReferenceItem),
    languages: normalizeArray(parsed.languages, normalizeLanguageItem),
    templateId: 'modern',
    _meta: {
      aiCleaned: true,
      multiPass: false,
    },
  };

  if (!hasMeaningfulResumeContent(data)) {
    throw new Error('Resume parser returned an empty resume.');
  }

  return data;
}

const STRUCTURED_AI_FEATURES = new Set([
  'analyze-resume',
  'score-resume',
  'tailor-resume',
  'generate-cover-letter',
  'recruiter-simulation',
  'detect-and-humanize',
  'optimize-for-linkedin',
  'parse-job',
  'validate-tailor',
  'generate-fix-suggestions',
  'generate-portfolio-bio',
  'career-assessment',
  'company-briefing',
  'suggest-template',
  'generate-question-bank',
  'generate-resignation-letter',
]);

function clampScore(value, fallback = 70) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeStructuredFeatureData(featureName, raw, opts) {
  const parsed = isRecord(raw) ? raw : parseJsonObject(raw);
  if (!isRecord(parsed)) throw new Error(`${featureName} returned malformed JSON.`);

  if (featureName === 'score-resume') {
    return {
      overallScore: clampScore(parsed.overallScore ?? parsed.overall),
      skillsMatch: clampScore(parsed.skillsMatch ?? parsed.skills),
      experienceRelevance: clampScore(parsed.experienceRelevance ?? parsed.experience),
      keywordAlignment: clampScore(parsed.keywordAlignment ?? parsed.keywords),
      atsCompatibility: clampScore(parsed.atsCompatibility),
      strengths: toStringArray(parsed.strengths),
      improvements: toStringArray(parsed.improvements),
    };
  }

  if (featureName === 'analyze-resume') {
    const score = isRecord(parsed.score) ? parsed.score : parsed;
    return {
      score: {
        overallScore: clampScore(score.overallScore ?? score.overall),
        overall: clampScore(score.overall ?? score.overallScore),
        skillsMatch: clampScore(score.skillsMatch ?? score.skills),
        skills: clampScore(score.skills ?? score.skillsMatch),
        experienceRelevance: clampScore(score.experienceRelevance ?? score.experience),
        experience: clampScore(score.experience ?? score.experienceRelevance),
        keywordAlignment: clampScore(score.keywordAlignment ?? score.keywords),
        keywords: clampScore(score.keywords ?? score.keywordAlignment),
        atsCompatibility: clampScore(score.atsCompatibility),
        strengths: toStringArray(score.strengths),
        improvements: toStringArray(score.improvements),
      },
      gaps: isRecord(parsed.gaps) ? {
        missingKeywords: toStringArray(parsed.gaps.missingKeywords),
        missingSkills: toStringArray(parsed.gaps.missingSkills),
        suggestedSections: toStringArray(parsed.gaps.suggestedSections),
        recommendedPhrases: toStringArray(parsed.gaps.recommendedPhrases),
        priorityImprovements: Array.isArray(parsed.gaps.priorityImprovements) ? parsed.gaps.priorityImprovements : [],
      } : {
        missingKeywords: [],
        missingSkills: [],
        suggestedSections: [],
        recommendedPhrases: [],
        priorityImprovements: [],
      },
    };
  }

  if (featureName === 'tailor-resume') {
    const resume = isRecord(opts.resume) ? opts.resume : {};
    return {
      summary: asString(parsed.summary) || asString(resume.summary),
      skills: toStringArray(parsed.skills).length ? toStringArray(parsed.skills) : toStringArray(resume.skills),
      experience: Array.isArray(parsed.experience) ? parsed.experience : (Array.isArray(resume.experience) ? resume.experience : []),
      education: Array.isArray(parsed.education) ? parsed.education : (Array.isArray(resume.education) ? resume.education : []),
      projects: Array.isArray(parsed.projects) ? parsed.projects : (Array.isArray(resume.projects) ? resume.projects : []),
      certifications: Array.isArray(parsed.certifications) ? parsed.certifications : (Array.isArray(resume.certifications) ? resume.certifications : []),
      awards: Array.isArray(parsed.awards) ? parsed.awards : (Array.isArray(resume.awards) ? resume.awards : []),
      keyChanges: Array.isArray(parsed.keyChanges) ? parsed.keyChanges : toStringArray(parsed.keyChanges),
      sectionScores: parsed.sectionScores || null,
      overallScore: parsed.overallScore || { before: clampScore(parsed.beforeScore, 55), after: clampScore(parsed.afterScore, 78) },
      missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills : [],
      boostableSkills: Array.isArray(parsed.boostableSkills) ? parsed.boostableSkills : [],
      jobParsed: isRecord(parsed.jobParsed) ? parsed.jobParsed : { title: '', company: '', keywords: [] },
      jobIntelligence: parsed.jobIntelligence,
      interviewTalkingPoints: Array.isArray(parsed.interviewTalkingPoints) ? parsed.interviewTalkingPoints : [],
      atsAnalysis: parsed.atsAnalysis || { criticalKeywords: [], stuffingWarnings: [], originalKeywordDensity: 0, optimizedKeywordDensity: 0 },
      bulletTransformations: Array.isArray(parsed.bulletTransformations) ? parsed.bulletTransformations : [],
      strengthsAnalysis: Array.isArray(parsed.strengthsAnalysis) ? parsed.strengthsAnalysis : [],
    };
  }

  if (featureName === 'generate-cover-letter') return { coverLetter: asString(parsed.coverLetter || parsed.content || parsed.letter) };
  if (featureName === 'recruiter-simulation') return { success: true, persona: parsed.persona || { id: opts.persona || 'general' }, analysis: parsed.analysis || parsed };
  if (featureName === 'detect-and-humanize') {
    return opts.action === 'humanize'
      ? { success: true, humanized: parsed.humanized || parsed }
      : { success: true, detection: parsed.detection || parsed };
  }
  if (featureName === 'optimize-for-linkedin') return { success: true, ...parsed };
  if (featureName === 'parse-job') return parsed;
  if (featureName === 'validate-tailor') {
    return {
      score: clampScore(parsed.score),
      matched_keywords: toStringArray(parsed.matched_keywords || parsed.matchedKeywords),
      missing_keywords: toStringArray(parsed.missing_keywords || parsed.missingKeywords),
      issues: toStringArray(parsed.issues),
      strengths: toStringArray(parsed.strengths),
      verdict: parsed.verdict || null,
    };
  }
  if (featureName === 'generate-fix-suggestions') return Array.isArray(parsed) ? parsed : (Array.isArray(parsed.suggestions) ? parsed.suggestions : []);
  if (featureName === 'generate-portfolio-bio') return parsed;
  if (featureName === 'career-assessment') return parsed;
  if (featureName === 'company-briefing') {
    const briefing = isRecord(parsed.briefing) ? parsed.briefing : parsed;
    if (!isRecord(briefing.companySnapshot)) {
      throw new Error('company-briefing: AI response missing companySnapshot field. The model may have returned an unexpected format.');
    }
    return { briefing };
  }
  if (featureName === 'suggest-template') return parsed;
  if (featureName === 'generate-question-bank') return parsed;
  if (featureName === 'generate-resignation-letter') return parsed;
  return parsed;
}

function schemaPrompt(featureName, opts) {
  const schemas = {
    'score-resume': '{"overallScore":0,"skillsMatch":0,"experienceRelevance":0,"keywordAlignment":0,"atsCompatibility":0,"strengths":[],"improvements":[]}',
    'analyze-resume': '{"score":{"overallScore":0,"overall":0,"skillsMatch":0,"skills":0,"experienceRelevance":0,"experience":0,"keywordAlignment":0,"keywords":0,"atsCompatibility":0,"strengths":[],"improvements":[]},"gaps":{"missingKeywords":[],"missingSkills":[],"suggestedSections":[],"recommendedPhrases":[],"priorityImprovements":[]}}',
    'tailor-resume': '{"summary":"","skills":[],"experience":[],"education":[],"projects":[],"certifications":[],"awards":[],"keyChanges":[],"sectionScores":null,"overallScore":{"before":0,"after":0},"missingSkills":[],"boostableSkills":[],"jobParsed":{"title":"","company":"","keywords":[]},"atsAnalysis":{"criticalKeywords":[],"stuffingWarnings":[],"originalKeywordDensity":0,"optimizedKeywordDensity":0},"interviewTalkingPoints":[],"bulletTransformations":[],"strengthsAnalysis":[]}',
    'generate-cover-letter': '{"coverLetter":""}',
    'recruiter-simulation': '{"analysis":{"hireabilityScore":0,"scoreExplanation":"","firstImpression":"","redFlags":[],"questionsIdAsk":[],"callMeFactors":[],"overallVerdict":"maybe_call","verdictReasoning":"","topPriorityFix":""}}',
    'detect-and-humanize': opts.action === 'humanize' ? '{"humanized":{"original":"","humanized":"","changes":[]}}' : '{"detection":{"aiScore":0,"humanScore":0,"confidence":"medium","flags":[],"verdict":""}}',
    'optimize-for-linkedin': '{"headlines":[],"aboutSections":{"short":"","medium":"","long":""},"experienceRewrites":[],"suggestedSkills":[],"keywords":[],"tips":[]}',
    'parse-job': '{"title":"","company":"","description":"","experienceLevel":"unknown","salaryRange":null,"workMode":"unknown","mustHaveSkills":[],"niceToHaveSkills":[],"yearsExperience":null,"companyCultureSignals":[],"benefits":[],"applicationDeadline":null,"redFlags":[]}',
    'validate-tailor': '{"score":0,"matched_keywords":[],"missing_keywords":[],"issues":[],"strengths":[],"verdict":"average"}',
    'generate-fix-suggestions': '{"suggestions":[{"type":"add_skill","section":"skills","after":"","reason":""}]}',
    'generate-portfolio-bio': '{"bio":"","metaTitle":"","metaDescription":"","translations":{}}',
    'career-assessment': '{"currentLevel":"","yearsExperience":0,"primaryField":"","nextRoles":[{"title":"","matchScore":0,"requiredSkills":[],"existingSkills":[],"timeToReady":"","description":""}],"skillGaps":[{"skill":"","priority":"critical","forRoles":[],"suggestion":"","youtubeQuery":""}],"industryAlternatives":[{"industry":"","role":"","transferableSkills":[],"newSkillsNeeded":[],"salaryComparison":"similar"}],"actionPlan":[{"step":1,"action":"","timeframe":"","impact":"high"}],"strengthSummary":"","riskFactors":[]}',
    'company-briefing': '{"briefing":{"companySnapshot":{"name":"","industry":"","size":"","hq":"","founded":"","mission":"","website":"","revenue":""},"recentHighlights":[{"title":"","summary":"","relevance":""}],"cultureSignals":[{"signal":"","detail":""}],"keyPeople":[{"role":"","context":""}],"talkingPoints":[{"point":"","connection":""}],"questionsToAsk":[{"question":"","why":""}],"competitors":[],"productsOrServices":[],"techStack":[]}}',
    'suggest-template': '{"templateId":"modern","reason":""}',
    'generate-question-bank': '{"categories":[]}',
    'generate-resignation-letter': '{"letter":""}',
  };
  return schemas[featureName] || '{}';
}

/**
 * Parse raw LLM output from agentic-chat into a structured response.
 * Tries: direct JSON → markdown fence → brace-depth walker → text fallback.
 */
function parseAgenticChatResponse(rawContent) {
  if (typeof rawContent !== 'string' || !rawContent.trim()) {
    return { type: 'text', content: 'I could not generate a response. Please try again.' };
  }

  function isValidAgenticResponse(parsed) {
    return parsed && typeof parsed === 'object' && typeof parsed.type === 'string' &&
      ['text', 'function_call', 'suggestion'].includes(parsed.type);
  }

  // 1. Direct JSON parse
  try {
    const trimmed = rawContent.trim();
    if (trimmed.startsWith('{')) {
      const parsed = JSON.parse(trimmed);
      if (isValidAgenticResponse(parsed)) return parsed;
    }
  } catch (_) {}

  // 2. Markdown code fence
  const fenceMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      const inner = fenceMatch[1].trim();
      if (inner.startsWith('{')) {
        const parsed = JSON.parse(inner);
        if (isValidAgenticResponse(parsed)) return parsed;
      }
    } catch (_) {}
  }

  // 3. Brace-depth walker — find first valid JSON object anywhere in text
  let startIdx = 0;
  while (startIdx < rawContent.length) {
    const idx = rawContent.indexOf('{', startIdx);
    if (idx === -1) break;
    let depth = 0;
    let endIdx = -1;
    for (let i = idx; i < rawContent.length; i++) {
      if (rawContent[i] === '{') depth++;
      else if (rawContent[i] === '}') {
        depth--;
        if (depth === 0) { endIdx = i; break; }
      }
    }
    if (endIdx === -1) break;
    try {
      const candidate = rawContent.slice(idx, endIdx + 1);
      const parsed = JSON.parse(candidate);
      if (isValidAgenticResponse(parsed)) return parsed;
    } catch (_) {}
    startIdx = idx + 1;
  }

  // 4. Fallback — treat entire output as plain text
  return { type: 'text', content: rawContent };
}

function buildMessages(featureName, opts) {
  if (featureName === 'parse-resume') {
    const text = asString(opts.text);
    if (!text) {
      throw new Error('parse-resume requires extracted resume text.');
    }
    return [
      {
        role: 'system',
        content:
          `${PARSE_RESUME_SYSTEM_PROMPT}\n\n` +
          '=== EXPERIENCE FIELD RULES ===\n' +
          '- `position`: the EXACT job title as written in the resume (e.g. "Senior Software Engineer", "Marketing Manager"). NEVER use generic placeholders like "Position 1", "Job 1", "Role", or "Title". If the job title is unclear, use the closest title text you can find in that section.\n' +
          '- `company`: the EXACT employer/organization name as written — NOT the job title. When the CV shows the title on one line and the company on the next, put the title in `position` and the employer in `company`.\n' +
          '- Also accept `title` / `role` only if you cannot populate `position`; the server maps them to `position`.\n' +
          '- `startDate` / `endDate`: extract the date range exactly as written (e.g. "Jan 2021", "2019", "March 2020 – Present"). For current roles set endDate="Present" and current=true.\n' +
          '- `responsibilities`: copy each bullet point verbatim from the resume — do NOT summarize or combine.\n\n' +
          'Return ONLY valid JSON with this exact shape:\n' +
          '{\n' +
          '  "contactInfo": {"fullName":"","email":"","email2":"","phone":"","location":"","linkedin":"","github":"","portfolio":"","photoUrl":""},\n' +
          '  "summary": "",\n' +
          '  "experience": [\n' +
          '    {"company":"<employer name>","position":"<exact job title from resume>","startDate":"","endDate":"","current":false,"description":"","responsibilities":[],"achievements":[],"isProject":false}\n' +
          '  ],\n' +
          '  "education": [\n' +
          '    {"institution":"","degree":"","field":"","startDate":"","endDate":"","gpa":""}\n' +
          '  ],\n' +
          '  "skills": [],\n' +
          '  "certifications": [],\n' +
          '  "awards": [],\n' +
          '  "projects": [],\n' +
          '  "publications": [],\n' +
          '  "volunteering": [],\n' +
          '  "hobbies": [],\n' +
          '  "references": [],\n' +
          '  "languages": [],\n' +
          '  "templateId": "modern"\n' +
          '}',
      },
      {
        role: 'user',
        content:
          `File type: ${asString(opts.fileType) || 'text/plain'}\n\n` +
          'Extract the full resume into structured JSON. Copy all bullet points verbatim. ' +
          'For each work experience entry, "position" must be the exact job title text from the resume — never a generic label.\n\n' +
          `RESUME TEXT:\n${text.slice(0, 60000)}`,
      },
    ];
  }

  if (STRUCTURED_AI_FEATURES.has(featureName)) {
    return [
      {
        role: 'system',
        content: `You are the WiseResume AI backend. Return ONLY valid JSON matching this schema exactly, with no markdown:\n${schemaPrompt(featureName, opts)}`,
      },
      {
        role: 'user',
        content: JSON.stringify({ featureName, payload: opts }).slice(0, 60000),
      },
    ];
  }

  if (featureName === 'wise-ai-chat') {
    return [
      {
        role: 'system',
        content: 'You are WiseResume AI Studio. Complete the task described in the user payload. Return ONLY a valid JSON object — no markdown fences, no prose, no explanation outside the JSON. Output strictly the JSON object with the exact fields the task requires.',
      },
      {
        role: 'user',
        content: JSON.stringify(opts).slice(0, 60000),
      },
    ];
  }

  if (featureName === 'smart-fit-rewrite') {
    const candidates = Array.isArray(opts.candidates) ? opts.candidates : [];
    const jdSnippet = opts.jobDescription
      ? `\n\nJob description context (preserve relevant keywords): ${String(opts.jobDescription).slice(0, 500)}`
      : '';
    return [
      {
        role: 'system',
        content:
          `You are a professional resume editor. Rewrite each sentence to be shorter and more impactful while preserving all protected terms.${jdSnippet}\n\n` +
          'Return ONLY a JSON array — no markdown, no prose — with one object per input candidate:\n' +
          '[{"id":"<id>","text":"<rewritten>","valid":true,"reason":"","missingTokens":[]}]\n\n' +
          'Rules:\n' +
          '- "valid": true if you successfully shortened it; false if unable to meaningfully shorten\n' +
          '- Preserve every word listed in the "preserve" array exactly as written\n' +
          '- Target length is in "targetLength" (characters) — aim to be at or below this\n' +
          '- If already concise, set valid:false with reason "already concise"',
      },
      {
        role: 'user',
        content: JSON.stringify(
          candidates.map(c => ({
            id: c.id,
            text: c.text,
            preserve: Array.isArray(c.preserve)
              ? c.preserve.map(p => (typeof p === 'string' ? p : (p && p.text) || '')).filter(Boolean)
              : [],
            targetLength: c.targetLength,
          }))
        ).slice(0, 8000),
      },
    ];
  }

  if (featureName === 'ask-portfolio') {
    const question = asString(opts.question) || 'Hello';
    const history = Array.isArray(opts.conversationHistory) ? opts.conversationHistory.slice(-6) : [];
    const ctx = (opts.profileContext && typeof opts.profileContext === 'object') ? opts.profileContext : {};
    const ownerName = asString(ctx.fullName || ctx.name) || 'this professional';
    const profileLines = [
      ctx.fullName    && `Name: ${ctx.fullName}`,
      ctx.title       && `Title / headline: ${ctx.title}`,
      ctx.location    && `Location: ${ctx.location}`,
      ctx.recentRole  && `Most recent role: ${ctx.recentRole}`,
      Array.isArray(ctx.skills) && ctx.skills.length > 0 && `Skills: ${ctx.skills.slice(0, 20).join(', ')}`,
      ctx.bio         && `Bio: ${String(ctx.bio).slice(0, 300)}`,
    ].filter(Boolean).join('\n');
    return [
      {
        role: 'system',
        content:
          `You are a friendly AI assistant representing ${ownerName}'s professional portfolio. ` +
          'Answer visitor questions concisely and helpfully based only on the profile information below. ' +
          'Do not make up details not present in the profile.\n\n' +
          `=== PROFILE ===\n${profileLines || 'No profile information provided.'}\n=== END ===`,
      },
      ...history,
      { role: 'user', content: question },
    ];
  }

  if (featureName === 'agentic-chat') {
    const history = Array.isArray(opts.conversationHistory) ? opts.conversationHistory : [];
    const userMessage = opts.message || '';
    const functionResponse = opts.functionResponse || null;

    // Detect Arabic in the user's message for language-adaptive replies
    const hasArabic = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/.test(userMessage);
    const languageRule = hasArabic
      ? 'LANGUAGE: The user wrote in Arabic. All JSON "content" and "message" values MUST be in Arabic.'
      : 'LANGUAGE: Respond in the same language the user used. Arabic → Arabic, English → English.';

    // Build a concise, structured resume profile — NOT a raw JSON dump
    let resumeBlock = '';
    if (opts.currentResume) {
      const r = opts.currentResume;
      const name      = (r.contactInfo?.fullName || r.contactInfo?.name || '').trim();
      const title     = (r.contactInfo?.title || r.contactInfo?.headline || '').trim();
      const location  = (r.contactInfo?.location || '').trim();
      const recentExp = Array.isArray(r.experience) && r.experience.length > 0
        ? `${r.experience[0].position || r.experience[0].title || ''} at ${r.experience[0].company || ''}`.trim()
        : '';
      const expCount  = Array.isArray(r.experience) ? r.experience.length : 0;
      const topSkills = Array.isArray(r.skills)
        ? r.skills.slice(0, 15).map(s => (typeof s === 'string' ? s : (s && s.name) || '')).filter(Boolean).join(', ')
        : '';
      const edu       = Array.isArray(r.education) && r.education.length > 0
        ? [r.education[0].degree, r.education[0].field, r.education[0].institution || r.education[0].school]
            .filter(Boolean).join(' — ')
        : '';
      const summary   = typeof r.summary === 'string' ? r.summary.slice(0, 400) : '';
      const projCount = Array.isArray(r.projects) ? r.projects.length : 0;
      const certCount = Array.isArray(r.certifications) ? r.certifications.length : 0;

      const lines = [
        name      && `Candidate name: ${name}`,
        title     && `Current title / target role: ${title}`,
        location  && `Location: ${location}`,
        recentExp && `Most recent role: ${recentExp}`,
        expCount  && `Total experience entries: ${expCount}`,
        topSkills && `Core skills: ${topSkills}`,
        edu       && `Education: ${edu}`,
        projCount && `Projects: ${projCount} listed`,
        certCount && `Certifications: ${certCount} listed`,
        summary   && `Professional summary: ${summary}${r.summary.length > 400 ? '…' : ''}`,
      ].filter(Boolean);

      if (lines.length > 0) {
        resumeBlock = `\n\n=== CANDIDATE'S RESUME (active context) ===\n${lines.join('\n')}\n=== END RESUME ===`;
      }
    }

    const systemPrompt = `You are WiseAI, the AI career assistant built into WiseResume.

ROLE: Expert career coach, resume strategist, and job-search advisor. Concise, direct, always tied to the user's specific resume — never generic.

${languageRule}

RESPONSE FORMAT — MANDATORY:
You MUST always respond with a single valid JSON object. No text outside the JSON. Use EXACTLY ONE of these three formats:

1. Text reply (advice, questions, explanations, interview prep):
{"type":"text","content":"your response in ≤300 words"}

2. Apply a resume change immediately (non-destructive additions):
{"type":"function_call","functionName":"<name>","args":{<args>},"message":"brief confirmation shown to user"}

3. Propose edits for the user to review before applying (rewrites of existing content):
{"type":"suggestion","proposals":[{"section":"summary","original":"old text","suggested":"new improved text","explanation":"why this is better"}],"message":"intro sentence for the user"}

AVAILABLE FUNCTIONS — only call when user explicitly asks to update their resume:
- add_skills: {"skills":["Skill1","Skill2"]} — appends new skills (safe, use this freely)
- update_skills: {"skills":["Skill1","Skill2",...]} — replaces full skills list (requires full list)
- update_contact: {"fullName":"","email":"","phone":"","location":"","linkedin":"","github":"","portfolio":""} — include only the fields to update
- add_experience: {"company":"","position":"","startDate":"","endDate":"","current":false,"description":""}
- add_project: {"name":"","description":"","technologies":[],"role":"","url":""}
- proofread_and_fix: {"section":"summary","corrections":[{"original":"old","corrected":"new","reason":"why"}]}
- update_summary: {"summary":"full new summary text"} — only via suggestion type so user can review
- open_job_tracker: {} — opens the job tracker panel

DECISION RULES:
- "suggestion" type → rewriting existing summary, bullets, or skills (user must approve first)
- "function_call" type → adding new items, opening panels, updating contact info
- "text" type → advice, explanations, questions, anything that doesn't modify the resume
- Never call update_experience (entry IDs are not available)
- Never fabricate skills, companies, or achievements not present in the resume
- If the user's request is ambiguous, ask ONE focused clarifying question using "text" type${resumeBlock}`;

    // When this is a feedback call after a function was applied, inject result context
    let userContent = userMessage;
    if (functionResponse && typeof functionResponse === 'object') {
      const fr = functionResponse;
      const note = fr.result && fr.result.success
        ? `\n\n[SYSTEM NOTE: The function "${fr.name}" was just successfully applied to the resume.]`
        : `\n\n[SYSTEM NOTE: The function "${fr.name}" failed: ${(fr.result && fr.result.error) || 'unknown error'}]`;
      userContent = userMessage + note;
    }

    return [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userContent },
    ];
  }

  return opts.messages || [{ role: 'user', content: 'hello' }];
}

/**
 * Per-feature routing config.
 *
 * Each entry maps a featureName (as sent by the frontend) to a preferred
 * { provider, model }. The gateway picks this pair when a matching key is
 * found AND at least one key for that provider is present in env. If the
 * preferred provider has no configured key, or the featureName is not in
 * this map, the gateway falls back to random selection from the full pool.
 *
 * Principles (from Project Atlas/Routing AI Providers/04-feature-routing-map.md):
 *  • Speed-critical / chat  → groq  (lowest latency)
 *  • Quality-critical / long generation → nvidia (Nemotron 70B excels here)
 *  • Long context / parsing → openrouter (broad free-tier model access)
 *  • Reasoning / analysis   → deepseek
 *  • Lightweight classifier  → groq (llama-3.1-8b-instant)
 */
let FEATURE_ROUTES = {
  'generate-cover-letter':      { provider: 'nvidia', model: 'nvidia/llama-3.1-nemotron-70b-instruct' },
  'tailor-resume':              { provider: 'nvidia', model: 'nvidia/llama-3.1-nemotron-70b-instruct' },
  'recruiter-simulation':       { provider: 'nvidia', model: 'nvidia/llama-3.1-nemotron-70b-instruct' },
  'agentic-chat':               { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  'wise-ai-chat':               { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  'resume-section-ai':          { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  'editor-ai':                  { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  'detect-and-humanize':        { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  'smart-fit-rewrite':          { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  'career-assessment':          { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  'generate-portfolio-bio':     { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  'generate-resignation-letter':{ provider: 'groq', model: 'llama-3.3-70b-versatile' },
  'validate-tailor':            { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  'suggest-template':           { provider: 'groq', model: 'llama-3.1-8b-instant' },
  'analyze-resume':             { provider: 'deepseek', model: 'deepseek-chat' },
  'generate-fix-suggestions':   { provider: 'deepseek', model: 'deepseek-chat' },
  'parse-resume':               { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free' },
  'parse-job':                  { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free' },
  'optimize-for-linkedin':      { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free' },
  'generate-question-bank':     { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free' },
  'company-briefing':           { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  'ask-portfolio':              { provider: 'groq', model: 'llama-3.3-70b-versatile' },
};

// ─── Route config cache (warm-instance TTL avoids per-request DB fetch) ──────
let _routeCache   = null;
let _routeCacheTs = 0;
const ROUTE_CACHE_TTL = 60_000; // 1 minute

async function syncDynamicRoutes(db) {
  if (_routeCache && Date.now() - _routeCacheTs < ROUTE_CACHE_TTL) {
    Object.assign(FEATURE_ROUTES, _routeCache);
    return;
  }
  try {
    const res = await db.listDocuments(DB_ID, 'ai_routing_config');
    _routeCache = {};
    res.documents.forEach(doc => {
      _routeCache[doc.feature_id] = { provider: doc.provider, model: doc.model };
      FEATURE_ROUTES[doc.feature_id] = { provider: doc.provider, model: doc.model };
    });
    _routeCacheTs = Date.now();
  } catch {
    // Silently fall back to static routes if collection doesn't exist yet
  }
}

function getDbClient() {
  const endpoint  = getAppwriteEndpoint();
  const projectId = getAppwriteProjectId();
  const apiKey    = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY;
  const client    = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return new sdk.Databases(client);
}

// ─── Key health tracking (in-memory, resets on cold start) ───────────────────
// Tracks per-key backoff expiry timestamps. Warm-instance reuse means a 429'd
// key stays skipped for the backoff window across multiple consecutive requests.
const _keyBackoff     = new Map(); // apiKey → backoffUntilMs
const _keyRoundRobin  = new Map(); // provider → next-index counter

function isKeyHealthy(key) {
  const until = _keyBackoff.get(key);
  return !until || Date.now() > until;
}

function markKeyFailed(key, ms) {
  _keyBackoff.set(key, Date.now() + ms);
}

/** Round-robin, health-aware key selection for a provider. */
function pickKey(pool, provider) {
  const keys = pool.filter(e => e.provider === provider);
  if (keys.length === 0) return null;
  const base = _keyRoundRobin.get(provider) || 0;
  for (let offset = 0; offset < keys.length; offset++) {
    const idx = (base + offset) % keys.length;
    if (isKeyHealthy(keys[idx].key)) {
      _keyRoundRobin.set(provider, (idx + 1) % keys.length);
      return keys[idx];
    }
  }
  // All keys backed off — use round-robin anyway (never fully stall)
  const idx = base % keys.length;
  _keyRoundRobin.set(provider, (idx + 1) % keys.length);
  return keys[idx];
}

/** Tiered per-attempt timeout: fail fast on first try, be patient on last resort. */
function candidateTimeout(i, total) {
  if (i === 0)         return 10_000; // primary: 10s — bail quickly if provider is slow
  if (i === total - 1) return 28_000; // last resort: give it as much time as possible
  return 15_000;                      // middle fallbacks: moderate
}

// ─── Routing helpers ──────────────────────────────────────────────────────────

/**
 * Build the full provider pool from environment variables.
 * Reads: GROQ_KEY_1-3, OPENROUTER_KEY_1-3, DEEPSEEK_KEY, NVIDIA_KEY_1-3.
 * Returns an array of { provider, key } entries for every configured key.
 * Key values are NEVER logged.
 */
function buildPool() {
  const pool = [];
  for (let i = 1; i <= 3; i++) {
    const key = process.env[`GROQ_KEY_${i}`];
    if (key) pool.push({ provider: 'groq', key });
  }
  for (let i = 1; i <= 3; i++) {
    const key = process.env[`OPENROUTER_KEY_${i}`];
    if (key) pool.push({ provider: 'openrouter', key });
  }
  if (process.env.DEEPSEEK_KEY) {
    pool.push({ provider: 'deepseek', key: process.env.DEEPSEEK_KEY });
  }
  for (let i = 1; i <= 3; i++) {
    const key = process.env[`NVIDIA_KEY_${i}`];
    if (key) pool.push({ provider: 'nvidia', key });
  }
  return pool;
}

/** Log pool composition — provider names and counts only, never key values. */
function logPoolSummary(pool, logFn) {
  const counts = {};
  for (const entry of pool) {
    counts[entry.provider] = (counts[entry.provider] || 0) + 1;
  }
  logFn(`[ai-gateway] Loaded AI key pool: total=${pool.length} providers=${JSON.stringify(counts)}`);
  if (pool.length < 10) {
    const expected = { GROQ_KEY_1:1,GROQ_KEY_2:1,GROQ_KEY_3:1,OPENROUTER_KEY_1:1,OPENROUTER_KEY_2:1,OPENROUTER_KEY_3:1,DEEPSEEK_KEY:1,NVIDIA_KEY_1:1,NVIDIA_KEY_2:1,NVIDIA_KEY_3:1 };
    const missing = Object.keys(expected).filter(k => !process.env[k]);
    if (missing.length) logFn(`[ai-gateway] Missing env vars (keys not loaded): ${missing.join(', ')}`);
  }
}

function getProviderAvailability() {
  return {
    groq:        [1, 2, 3].some(i => !!process.env[`GROQ_KEY_${i}`]),
    openrouter:  [1, 2, 3].some(i => !!process.env[`OPENROUTER_KEY_${i}`]),
    deepseek:    !!process.env.DEEPSEEK_KEY,
    nvidia:      [1, 2, 3].some(i => !!process.env[`NVIDIA_KEY_${i}`]),
  };
}

/**
 * Build an ordered candidate list for a given featureName.
 *
 * Tries in this order:
 *  1. Preferred provider (from FEATURE_ROUTES): primary key via round-robin +
 *     health-aware selection, then the remaining keys for that same provider
 *     (all using the route model so quality is preserved on same-provider retry).
 *  2. Cross-provider fallbacks in buildPool() order (groq → openrouter →
 *     deepseek → nvidia), each using that provider's default free model.
 *
 * Returns an array of { provider, key, model, routed } objects, or [] when
 * the pool is empty.
 */
function buildCandidates(featureName, pool) {
  if (pool.length === 0) return [];

  const defaultModelFor = p =>
    p === 'openrouter' ? OPENROUTER_FREE_MODEL :
    p === 'deepseek'   ? DEEPSEEK_MODEL :
    p === 'nvidia'     ? NVIDIA_DEFAULT_MODEL :
    GROQ_FREE_MODEL;

  const candidates = [];
  const usedKeys   = new Set();
  const route      = FEATURE_ROUTES[featureName];

  if (route) {
    const providerKeys = pool.filter(e => e.provider === route.provider);
    if (providerKeys.length > 0) {
      // Primary: round-robin + health-aware (skips rate-limited keys)
      const primary = pickKey(pool, route.provider);
      candidates.push({ provider: primary.provider, key: primary.key, model: route.model, routed: true });
      usedKeys.add(primary.key);

      // Same-provider fallbacks keep the route model — quality maintained on retry
      for (const entry of providerKeys) {
        if (usedKeys.has(entry.key)) continue;
        candidates.push({ provider: entry.provider, key: entry.key, model: route.model, routed: true });
        usedKeys.add(entry.key);
      }
    }
  }

  // Cross-provider fallbacks in pool order (groq → openrouter → deepseek → nvidia)
  for (const entry of pool) {
    if (usedKeys.has(entry.key)) continue;
    candidates.push({ provider: entry.provider, key: entry.key, model: defaultModelFor(entry.provider), routed: false });
    usedKeys.add(entry.key);
  }

  return candidates;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

module.exports = async ({ req, res, log, error }) => {
  enableLLMObs();
  const db = getDbClient();
  await syncDynamicRoutes(db);

  // Broad outer catch — preserves the JSON error contract on any unexpected failure.
  try {
    const opts = parseRequestBody(req);
    const { featureName } = opts;

    log(`AI-Gateway Hub: Processing ${featureName || 'general'} request...`);

    // ── 0. SMOKE-TEST SHORT-CIRCUIT ──────────────────────────────────────────
    if (opts['x-smoke-test'] === 'true' || req.headers?.['x-smoke-test'] === 'true') {
      log('Smoke test ping — returning OK');
      await flushDD();
      return res.json({ status: 'ok', _smokeTest: true, providers: getProviderAvailability() });
    }

    // ── 1. EMAIL ROUTE (never traced as LLM span) ───────────────────────────
    if (featureName === 'send-email' || featureName === 'send-contact-email') {
      const clientIp = req.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
        || req.headers?.['x-real-ip']
        || 'unknown';
      const ipLimit = checkEmailRateLimit(clientIp);
      if (!ipLimit.ok) {
        await flushDD();
        return res.json({
          status: 'error',
          message: `Too many messages sent from your address. Please wait ${Math.ceil(ipLimit.retryAfterSeconds / 60)} minute(s) before trying again.`,
        }, 429);
      }

      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey) {
        await flushDD();
        return res.json({ status: 'error', message: 'RESEND_API_KEY not found.' }, 500);
      }

      // Build HTML body from opts.message when the caller doesn't supply pre-rendered HTML
      // (sendFeedback sends plain text fields; portfolio contact form sends structured fields).
      const builtHtml = opts.html || (() => {
        const lines = [];
        if (opts.name)    lines.push(`<p><strong>From:</strong> ${opts.name} &lt;${opts.email || ''}&gt;</p>`);
        else if (opts.email) lines.push(`<p><strong>From:</strong> ${opts.email}</p>`);
        if (opts.type)    lines.push(`<p><strong>Type:</strong> ${opts.type}</p>`);
        if (opts.message) lines.push(`<p><strong>Message:</strong></p><pre style="white-space:pre-wrap">${opts.message}</pre>`);
        if (opts.metadata) lines.push(`<p><strong>Metadata:</strong></p><pre style="white-space:pre-wrap">${JSON.stringify(opts.metadata, null, 2)}</pre>`);
        return lines.length ? lines.join('\n') : '<p>No message content provided.</p>';
      })();

      // Lock destination — never forward to a caller-controlled address.
      const emailResponse = await axios.post('https://api.resend.com/emails', {
        from:    'WiseResume <notifications@thewise.cloud>',
        to:      ['contact@thewise.cloud'],
        subject: opts.subject || `[${opts.type || 'contact'}] New message`,
        html:    builtHtml,
      }, {
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      });

      await flushDD();
      return res.json({ status: 'success', data: { id: emailResponse.data.id, success: true } });
    }

    // ── 2. AI ROUTE ─────────────────────────────────────────────────────────
    const auth = await validateUserSession(opts, req);
    if (!auth.ok) {
      await flushDD();
      return res.json({ status: 'error', code: 'unauthorized', message: auth.message }, auth.status);
    }

    // When the admin acts as another user (DevKit impersonation), the Appwrite
    // JWT belongs to the admin account. The frontend attaches X-Impersonating-User-Id
    // so that rate-limiting and credit attribution apply to the impersonated user.
    // This override is only trusted when the validated Appwrite email matches the
    // configured ADMIN_EMAIL — non-admin callers cannot trigger this path.
    const ADMIN_EMAIL_ENV = process.env.ADMIN_EMAIL || 'magdy.saber@outlook.com';
    const impersonatingUserId = asString(opts?.__headers?.['X-Impersonating-User-Id'] || '').trim();
    const effectiveUserId = (
      impersonatingUserId &&
      typeof auth.user.email === 'string' &&
      auth.user.email.toLowerCase() === ADMIN_EMAIL_ENV.toLowerCase()
    ) ? impersonatingUserId : auth.user.$id;

    const rateLimit = checkServerRateLimit(effectiveUserId, featureName);
    if (!rateLimit.ok) {
      await flushDD();
      return res.json({
        status: 'error',
        code: 'rate_limited',
        message: 'Too many AI requests. Please wait and try again.',
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      }, 429);
    }

    const creditState = await loadCreditState(db, effectiveUserId, featureName);
    if (creditState.blocked) {
      await flushDD();
      return res.json({
        status: 'error',
        code: creditState.code || 'ai_credit_check_failed',
        message: creditState.message,
      }, creditState.status || 503);
    }

    log(`AI-Gateway Hub: authorized user=${effectiveUserId}${effectiveUserId !== auth.user.$id ? ` (impersonated by admin)` : ''} feature=${featureName || 'general'} cost=${creditState.cost || 0}`);

    const pool       = buildPool();
    logPoolSummary(pool, log);
    const candidates = buildCandidates(featureName, pool);
    const aiOpts = sanitizeAiPayload(opts);
    const requestMessages = buildMessages(featureName, aiOpts);

    if (candidates.length === 0) {
      error('No keys found in environment variables.');
      await flushDD();
      return res.json({ status: 'error', message: 'No AI keys found on server.' }, 503);
    }

    const temperature = featureName === 'parse-resume'
      ? (aiOpts.temperature ?? 0.1)
      : (aiOpts.temperature || 0.7);
    // agentic-chat needs more tokens for full rewrites; parse-resume needs 4k for full resumes
    const maxTokens   = featureName === 'parse-resume'
      ? (aiOpts.maxTokens ?? 4000)
      : featureName === 'agentic-chat'
        ? (aiOpts.maxTokens || 1500)
        : (aiOpts.maxTokens || 1000);

    async function recordSuccessUsage() {
      await recordAiUsage(db, creditState);
    }

    /** Call a single provider candidate with the given per-attempt timeout. */
    async function callCandidate(candidate, timeoutMs = 28000) {
      const response = await axios.post(BASES[candidate.provider], {
        model:      aiOpts.model || candidate.model,
        messages:   requestMessages,
        temperature,
        max_tokens: maxTokens,
      }, {
        headers: { 'Authorization': `Bearer ${candidate.key}`, 'Content-Type': 'application/json' },
        timeout: timeoutMs,
      });
      return {
        content: response.data.choices[0].message.content,
        usage:   response.data.usage || {},
      };
    }

    let content      = null;
    let providerUsed = null;
    let modelUsed    = null;
    let routedBy     = false;

    // Try each candidate in priority order; stop at first success.
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      const label     = candidate.routed ? 'preferred' : 'fallback';
      log(`Trying ${label} provider: ${candidate.provider} (model: ${aiOpts.model || candidate.model}) for ${featureName || 'general'}${i === 0 ? '' : ` [attempt ${i + 1}]`}`);

      try {
        let result;

        result = await callCandidate(candidate, candidateTimeout(i, candidates.length));

        content      = result.content;
        providerUsed = candidate.provider;
        modelUsed    = aiOpts.model || candidate.model;
        routedBy     = candidate.routed;

        if (featureName === 'parse-resume') {
          try {
            const parsedResume = normalizeResumeData(result.content);
            await recordSuccessUsage();
            await flushDD();
            return res.json({
              status: 'success',
              data: parsedResume,
            });
          } catch (parseErr) {
            error(`Provider ${candidate.provider} returned malformed resume JSON: ${parseErr.message}`);
            if (i === candidates.length - 1) {
              await flushDD();
              return res.json({
                status: 'error',
                message: 'AI resume parser returned malformed data.',
              }, 500);
            }
            continue;
          }
        }

        if (STRUCTURED_AI_FEATURES.has(featureName)) {
          try {
            const structuredData = normalizeStructuredFeatureData(featureName, result.content, aiOpts);
            await recordSuccessUsage();
            await flushDD();
            return res.json({
              status: 'success',
              data: structuredData,
            });
          } catch (parseErr) {
            error(`Provider ${candidate.provider} returned malformed ${featureName} JSON: ${parseErr.message}`);
            if (i === candidates.length - 1) {
              await flushDD();
              return res.json({
                status: 'error',
                message: `${featureName} returned malformed data.`,
              }, 500);
            }
            continue;
          }
        }

        if (featureName === 'agentic-chat') {
          const structuredResponse = parseAgenticChatResponse(result.content);
          await recordSuccessUsage();
          await flushDD();
          return res.json({ status: 'success', data: structuredResponse });
        }

        if (featureName === 'smart-fit-rewrite') {
          try {
            const parsed = parseJsonObject(result.content);
            const outcomes = Array.isArray(parsed)
              ? parsed
              : (Array.isArray(parsed.outcomes) ? parsed.outcomes : []);
            await recordSuccessUsage();
            await flushDD();
            return res.json({ status: 'success', data: { success: true, outcomes } });
          } catch (parseErr) {
            error(`smart-fit-rewrite: malformed JSON from ${candidate.provider}: ${parseErr.message}`);
            if (i === candidates.length - 1) {
              await flushDD();
              return res.json({ status: 'error', message: 'AI rewrite returned malformed data.' }, 500);
            }
            continue;
          }
        }

        if (featureName === 'ask-portfolio') {
          await recordSuccessUsage();
          await flushDD();
          return res.json({ status: 'success', data: { answer: result.content, isFallback: false, chatDisabled: false } });
        }

        break;

      } catch (candidateErr) {
        const httpStatus = candidateErr.response?.status;
        const isTimeout  = candidateErr.code === 'ECONNABORTED' || /timeout/i.test(candidateErr.message || '');
        // Classify error and set per-key backoff so the same dead key isn't hit again
        let backoffMs = 0;
        if (httpStatus === 429)                          backoffMs = 120_000; // rate limited — 2 min
        else if (httpStatus === 401 || httpStatus === 403) backoffMs = 300_000; // bad key — 5 min
        else if (httpStatus >= 500)                      backoffMs = 30_000;  // provider error — 30s
        // Timeout: no backoff — provider may recover; just try next candidate now
        if (backoffMs > 0) markKeyFailed(candidate.key, backoffMs);

        error(`Provider ${candidate.provider} failed [${httpStatus ?? (isTimeout ? 'timeout' : candidateErr.code) ?? 'err'}]: ${candidateErr.message}`);
        if (i === candidates.length - 1) {
          // All candidates exhausted.
          await flushDD();
          return res.json({ status: 'error', message: candidateErr.message }, 500);
        }
        // Continue to next candidate.
      }
    }

    await flushDD();
    await recordSuccessUsage();
    return res.json({
      status: 'success',
      data: {
        content,
        providerUsed,
        modelUsed,
        routedByFeature: routedBy,
      },
    });

  } catch (err) {
    // Catch-all — preserves stable JSON error contract on any unexpected failure
    error('AI-Gateway Error: ' + err.message);
    await flushDD();
    return res.json({ status: 'error', message: err.message }, 500);
  }
};
