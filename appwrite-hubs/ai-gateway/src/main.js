'use strict';

const axios = require('axios');
const sdk = require('node-appwrite');
const extractedPrompts = require('./extracted_prompts.json');

// ─── Datadog LLM Observability ────────────────────────────────────────────────
// Initialise dd-trace at module level (once per cold start).
// Agentless mode is required — Appwrite Functions cannot run a Datadog agent sidecar.
// Observability is best-effort: when the API key is absent all AI calls continue normally.
const ddTrace = require('dd-trace');
const tracer = ddTrace.init({ logInjection: false });
const llmobs = tracer.llmobs;

let _llmobsEnabled = false;

function enableLLMObs() {
  if (_llmobsEnabled) return;
  // Accept DATADOG_API_KEY (Appwrite global variable) with fallback to DD_API_KEY.
  const ddApiKey = process.env.DATADOG_API_KEY || process.env.DD_API_KEY;
  const ddSite   = process.env.DD_SITE || 'datadoghq.com';
  if (!ddApiKey) return;
  try {
    llmobs.enable({ mlApp: 'wiseresumeai', agentlessEnabled: true, ddApiKey, site: ddSite });
    _llmobsEnabled = true;
  } catch (_) {
    // swallow — never block the AI route
  }
}

/**
 * Flush pending LLM spans before the short-lived Function container exits.
 * Always resolves — never throws.
 */
async function flushDD() {
  if (!_llmobsEnabled) return;
  try {
    llmobs.flush();
    await new Promise(resolve => tracer.flush(resolve));
  } catch (_) { /* best-effort */ }
}

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
const PARSE_RESUME_SYSTEM_PROMPT =
  extractedPrompts?.['parse-resume']?.system ||
  'You are an expert resume parser. Return only valid JSON.';

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

function normalizeExperienceItem(item) {
  if (!isRecord(item)) return null;
  return {
    id: '',
    company: asString(item.company),
    position: asString(item.position),
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
  if (featureName === 'company-briefing') return { briefing: parsed.briefing || parsed };
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
    'career-assessment': '{"summary":"","recommendedRoles":[],"strengths":[],"gaps":[],"milestones":[]}',
    'company-briefing': '{"briefing":{"overview":"","talkingPoints":[],"risks":[],"questions":[]}}',
    'suggest-template': '{"templateId":"modern","reason":""}',
    'generate-question-bank': '{"categories":[]}',
    'generate-resignation-letter': '{"letter":""}',
  };
  return schemas[featureName] || '{}';
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
          '- `company`: the EXACT employer/organization name as written.\n' +
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
        content: 'You are WiseResume AI Studio. Answer the requested tool task directly. If the user payload asks for JSON, return only JSON; otherwise return concise useful content.',
      },
      {
        role: 'user',
        content: JSON.stringify(opts).slice(0, 60000),
      },
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
  'company-briefing':           { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free' },
};

async function syncDynamicRoutes(db) {
  try {
    const res = await db.listDocuments(DB_ID, 'ai_routing_config');
    res.documents.forEach(doc => {
      FEATURE_ROUTES[doc.feature_id] = { provider: doc.provider, model: doc.model };
    });
  } catch (e) {
    // Silently fallback to static routes if collection doesn't exist yet
  }
}

function getDbClient() {
  const endpoint  = process.env.APPWRITE_FUNCTION_API_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
  const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const apiKey    = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY;
  const client    = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return new sdk.Databases(client);
}

// ─── Routing helpers ──────────────────────────────────────────────────────────

/**
 * Build the full provider pool from environment variables.
 * Returns an array of { provider, key } entries for every configured key.
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
 * The list is tried in sequence by the call loop; the first successful
 * response wins. Order:
 *  1. Preferred provider from FEATURE_ROUTES (if configured and has keys).
 *  2. Remaining pool entries in buildPool() order (groq → openrouter →
 *     deepseek → nvidia), excluding any already used as primary.
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

  const route = FEATURE_ROUTES[featureName];
  if (route) {
    const preferred = pool.filter(e => e.provider === route.provider);
    if (preferred.length > 0) {
      const entry = preferred[Math.floor(Math.random() * preferred.length)];
      candidates.push({ provider: entry.provider, key: entry.key, model: route.model, routed: true });
      usedKeys.add(entry.key);
    }
  }

  for (const entry of pool) {
    if (usedKeys.has(entry.key)) continue;
    candidates.push({
      provider: entry.provider,
      key:      entry.key,
      model:    defaultModelFor(entry.provider),
      routed:   false,
    });
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
    const opts = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { featureName } = opts;
    const requestMessages = buildMessages(featureName, opts);

    log(`AI-Gateway Hub: Processing ${featureName || 'general'} request...`);

    // ── 0. SMOKE-TEST SHORT-CIRCUIT ──────────────────────────────────────────
    if (opts['x-smoke-test'] === 'true' || req.headers?.['x-smoke-test'] === 'true') {
      log('Smoke test ping — returning OK');
      await flushDD();
      return res.json({ status: 'ok', _smokeTest: true, providers: getProviderAvailability() });
    }

    // ── 1. EMAIL ROUTE (never traced as LLM span) ───────────────────────────
    if (featureName === 'send-email' || featureName === 'send-contact-email') {
      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey) {
        await flushDD();
        return res.json({ status: 'error', message: 'RESEND_API_KEY not found.' }, 500);
      }

      const emailResponse = await axios.post('https://api.resend.com/emails', {
        from:    opts.from    || 'WiseResume <notifications@thewise.cloud>',
        to:      opts.to      || ['contact@thewise.cloud'],
        subject: opts.subject || 'System Notification',
        html:    opts.html    || '<p>Default notification body</p>',
      }, {
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      });

      await flushDD();
      return res.json({ status: 'success', data: { id: emailResponse.data.id } });
    }

    // ── 2. AI ROUTE ─────────────────────────────────────────────────────────
    const pool       = buildPool();
    const candidates = buildCandidates(featureName, pool);

    if (candidates.length === 0) {
      error('No keys found in environment variables.');
      await flushDD();
      return res.json({ status: 'error', message: 'No AI keys found on server.' }, 503);
    }

    const temperature = featureName === 'parse-resume'
      ? (opts.temperature ?? 0.1)
      : (opts.temperature || 0.7);
    const maxTokens   = featureName === 'parse-resume'
      ? (opts.maxTokens ?? 4000)
      : (opts.maxTokens || 1000);

    /** Call a single provider candidate. */
    async function callCandidate(candidate) {
      const response = await axios.post(BASES[candidate.provider], {
        model:      opts.model || candidate.model,
        messages:   requestMessages,
        temperature,
        max_tokens: maxTokens,
      }, {
        headers: { 'Authorization': `Bearer ${candidate.key}`, 'Content-Type': 'application/json' },
        timeout: 30000,
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
      const isFirst   = i === 0;
      const label     = candidate.routed ? 'preferred' : 'fallback';
      log(`Trying ${label} provider: ${candidate.provider} (model: ${opts.model || candidate.model}) for ${featureName || 'general'}${isFirst ? '' : ` [attempt ${i + 1}]`}`);

      try {
        let result;

        if (isFirst && _llmobsEnabled) {
          // Only trace the primary attempt via LLMObs.
          let callbackExecuted = false;
          await llmobs.trace(
            {
              kind:          'llm',
              name:          featureName || 'ai-gateway',
              modelName:     opts.model || candidate.model,
              modelProvider: candidate.provider,
            },
            async (span) => {
              callbackExecuted = true;
              llmobs.annotate(span, {
                inputData: requestMessages,
                metadata: {
                  temperature,
                  max_tokens:        maxTokens,
                  feature_name:      featureName || 'general',
                  routed_by_feature: candidate.routed,
                },
                tags: {
                  feature_name:      featureName || 'general',
                  provider:          candidate.provider,
                  model:             opts.model || candidate.model,
                  routed_by_feature: String(candidate.routed),
                },
              });

              try {
                result = await callCandidate(candidate);
              } catch (providerErr) {
                span.setTag('error', providerErr);
                span.setTag('error.message', providerErr.message);
                throw providerErr;
              }

              llmobs.annotate(span, {
                outputData: [{ role: 'assistant', content: result.content }],
                metrics: {
                  input_tokens:  result.usage.prompt_tokens     || 0,
                  output_tokens: result.usage.completion_tokens || 0,
                  total_tokens:  result.usage.total_tokens      || 0,
                },
              });
            },
          ).catch(async traceErr => {
            if (!callbackExecuted) {
              // trace() setup itself failed (e.g. bad kind value) — fall back
              // to a direct untraced call for this same candidate rather than
              // skipping it entirely and moving to the next fallback.
              error('DD LLMObs trace setup error, retrying untraced: ' + traceErr.message);
              result = await callCandidate(candidate);
            } else {
              // Provider call inside the trace threw — re-throw so the outer
              // catch handles it and moves to the next candidate.
              throw traceErr;
            }
          });
        } else {
          result = await callCandidate(candidate);
        }

        content      = result.content;
        providerUsed = candidate.provider;
        modelUsed    = opts.model || candidate.model;
        routedBy     = candidate.routed;

        if (featureName === 'parse-resume') {
          try {
            const parsedResume = normalizeResumeData(result.content);
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
            const structuredData = normalizeStructuredFeatureData(featureName, result.content, opts);
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

        break;

      } catch (candidateErr) {
        error(`Provider ${candidate.provider} failed: ${candidateErr.message}`);
        if (i === candidates.length - 1) {
          // All candidates exhausted.
          await flushDD();
          return res.json({ status: 'error', message: candidateErr.message }, 500);
        }
        // Continue to next candidate.
      }
    }

    await flushDD();
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
