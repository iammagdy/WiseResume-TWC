'use strict';

const axios = require('axios');

// ─── Provider helpers ──────────────────────────────────────────────────────────

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GROQ_URL       = 'https://api.groq.com/openai/v1/chat/completions';

function buildPool() {
  const pool = [];
  for (let i = 1; i <= 3; i++) {
    const k = process.env[`GROQ_KEY_${i}`];
    if (k) pool.push({ provider: 'groq', key: k, url: GROQ_URL, model: 'llama-3.3-70b-versatile' });
  }
  for (let i = 1; i <= 3; i++) {
    const k = process.env[`OPENROUTER_KEY_${i}`];
    if (k) pool.push({ provider: 'openrouter', key: k, url: OPENROUTER_URL, model: 'meta-llama/llama-3.3-70b-instruct:free' });
  }
  if (process.env.DEEPSEEK_KEY) {
    pool.push({ provider: 'deepseek', key: process.env.DEEPSEEK_KEY, url: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat' });
  }
  return pool;
}

function getProviderAvailability() {
  return {
    groq:       [1, 2, 3].some(i => !!process.env[`GROQ_KEY_${i}`]),
    openrouter: [1, 2, 3].some(i => !!process.env[`OPENROUTER_KEY_${i}`]),
    deepseek:   !!process.env.DEEPSEEK_KEY,
  };
}

async function callLLM(messages, pool) {
  if (pool.length === 0) throw new Error('No AI provider keys configured');
  let lastError;
  for (const entry of pool) {
    try {
      const response = await axios.post(entry.url, {
        model:       entry.model,
        messages,
        temperature: 0.7,
        max_tokens:  1200,
      }, {
        headers: { 'Authorization': `Bearer ${entry.key}`, 'Content-Type': 'application/json' },
        timeout: 10000,
      });
      return response.data.choices[0].message.content;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

// ─── Action-specific prompt builders ─────────────────────────────────────────

const ACTION_INSTRUCTIONS = {
  improve:               'Improve this resume section to be more impactful, professional, and results-oriented.',
  ats_improve:           'Optimize this resume section for ATS compatibility by incorporating relevant keywords naturally.',
  ats_optimize:          'Rewrite this resume section to maximize ATS keyword matching while maintaining human readability.',
  shorten:               'Make this resume section more concise while preserving all key information and measurable achievements.',
  expand:                'Expand this resume section with more detail, specific achievements, and stronger action verbs.',
  add_metrics:           'Add quantifiable metrics and measurable outcomes to this resume section where possible.',
  generate_bullets:      'Convert this resume content into strong, action-verb-led bullet points with measurable outcomes.',
  generate:              'Generate professional, ATS-optimized content for this resume section based on the context provided.',
  tailor:                'Rewrite this resume section to closely match the target job description, using its exact keywords and terminology.',
  tailor_to_job:         'Rewrite this resume section to closely match the target job description, using its exact keywords and terminology. Preserve all facts — never fabricate experience, metrics, or skills.',
  find_skill_gaps:       'Analyse the job description and return ONLY the skills the candidate is missing that are strongly required for the role. Do not modify existing skills. CRITICAL: Return ONLY skills the candidate does NOT already have. Return an empty array if all required skills are present.',
  suggest_certifications:'Suggest the most relevant professional certifications for this candidate based on their background and the job description provided.',
  'fill-gap':            'Create a professional resume entry that honestly describes a career gap period. Make it positive and forward-looking.',
  'explain-gap':         'Write a brief, professional explanation for this career gap that frames the time constructively.',
};

function buildEnhanceMessages(section, action, currentContent, context) {
  const instruction = ACTION_INSTRUCTIONS[action] || ACTION_INSTRUCTIONS.improve;
  const jobDescription = context?.jobDescription || '';
  const currentContentDisplay = typeof currentContent === 'string'
    ? currentContent
    : JSON.stringify(currentContent, null, 2);

  const systemPrompt = `You are an expert resume writer specializing in ATS optimization and professional branding. ${instruction}

CRITICAL RULES:
- Never fabricate experience, metrics, skills, or facts not present in the original content
- Keep the same structural format as the input (if input is a string, return string; if array, return array of objects)
- Use strong action verbs and quantifiable achievements where possible
- Match terminology from the job description if provided
- Return ONLY valid JSON with no markdown fences or code blocks

Return this EXACT JSON structure:
{
  "rewrittenContent": <same type/structure as the input currentContent>,
  "changes": [
    { "description": "<specific change made>", "type": "<phrasing_improved|keyword_added|metric_added|bullet_transformed|reordered>", "impact": "<high|medium|low>" }
  ],
  "keywordsAdded": ["<keyword integrated>"],
  "improvementSummary": "<1-2 sentence summary of improvements made>"
}`;

  let userPrompt = `Rewrite this resume section:

SECTION TYPE: ${section}
ACTION: ${action}

CURRENT CONTENT:
${currentContentDisplay}`;

  if (jobDescription) {
    userPrompt += `\n\nTARGET JOB DESCRIPTION:\n${jobDescription.slice(0, 1800)}`;
  }

  if (context?.resume) {
    userPrompt += `\n\nCANDIDATE PROFILE:\n${buildResumeContextBlock(context.resume)}`;
  }

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}

// Shared system prompt for tech suggestions
const SUGGEST_TECH_SYSTEM = `You are an expert software engineer. Suggest the most relevant, specific technologies for THIS exact project based on all context provided.

Return ONLY a valid JSON array of strings — no markdown fences, no explanation, no extra text:
["Technology1", "Technology2", "Technology3"]

Rules:
- Return 5-10 highly specific suggestions for THIS project only
- Base suggestions strictly on the project name, role, description, and any extra context
- Do NOT suggest generic catch-all technologies unrelated to the project domain
- Do NOT include technologies already in the existing stack
- Prefer technologies that fit the user's known background when relevant
- Use standard names (e.g. "React" not "ReactJS", "Node.js" not "NodeJS", "PostgreSQL" not "Postgres")
- Focus on concrete tools and frameworks, not broad categories`;

/** Extract a deduplicated list of technologies the user knows from their resume */
function extractKnownStack(resumeContext) {
  if (!resumeContext) return [];
  const techs = new Set();
  const addList = (arr) => Array.isArray(arr) && arr.forEach(t => typeof t === 'string' && t && techs.add(t));
  // skills section
  if (Array.isArray(resumeContext.skills)) {
    resumeContext.skills.forEach(s => {
      if (typeof s === 'string') techs.add(s);
      else if (s && typeof s === 'object') {
        if (s.name) techs.add(s.name);
        addList(s.skills);
      }
    });
  }
  // experience section
  if (Array.isArray(resumeContext.experience)) {
    resumeContext.experience.forEach(exp => {
      addList(exp.skills);
      addList(exp.technologies);
    });
  }
  // other projects' technologies
  if (Array.isArray(resumeContext.projects)) {
    resumeContext.projects.forEach(p => addList(p.technologies));
  }
  return [...techs].slice(0, 25);
}

/**
 * Build a concise structured candidate profile from the resume object.
 * Replaces the old raw JSON.stringify().slice(0,1000) approach — gives the
 * LLM the key signal (name, title, recent role, skills, education) without
 * wasting tokens on low-value fields.
 */
function buildResumeContextBlock(resume) {
  if (!resume) return 'No resume context available.';
  const name      = resume.contactInfo?.name || resume.contactInfo?.fullName || '';
  const title     = resume.contactInfo?.title || resume.contactInfo?.headline || '';
  const recentExp = Array.isArray(resume.experience) && resume.experience.length > 0
    ? `${resume.experience[0].position || ''} at ${resume.experience[0].company || ''}`.trim()
    : '';
  const topSkills = Array.isArray(resume.skills)
    ? resume.skills
        .slice(0, 10)
        .map(s => (typeof s === 'string' ? s : (s && s.name) || ''))
        .filter(Boolean)
        .join(', ')
    : '';
  const edu = Array.isArray(resume.education) && resume.education.length > 0
    ? [
        resume.education[0].degree || '',
        resume.education[0].field  || '',
        resume.education[0].institution || resume.education[0].school || '',
      ].filter(Boolean).join(' — ')
    : '';
  return [
    name      && `Candidate: ${name}`,
    title     && `Current title: ${title}`,
    recentExp && `Most recent role: ${recentExp}`,
    topSkills && `Core skills: ${topSkills}`,
    edu       && `Education: ${edu}`,
  ].filter(Boolean).join('\n');
}

// ─── Tier 2: Clarifying-question response builders ────────────────────────────

function buildSummaryQuestionsResponse() {
  return {
    type: 'questions',
    questions: [
      'What is your current job title or the role you are targeting?',
      'What are your 2–3 most important professional strengths or achievements?',
      'Who is the audience for this resume — a specific industry, company, or role level?',
    ],
  };
}

function buildSkillsQuestionsResponse() {
  return {
    type: 'questions',
    questions: [
      'What is your primary field or domain? (e.g. front-end engineering, data science, product management)',
      'What level are you at — junior, mid, senior, or lead/director?',
      'Are there specific technologies or tools you want to highlight or avoid?',
    ],
  };
}

function buildAddMetricsQuestionsResponse() {
  return {
    type: 'questions',
    questions: [
      'What was the scale of the team, project, or budget you managed?',
      'Did this work lead to measurable outcomes — faster delivery, cost savings, revenue, user growth?',
      'Over what time period did these results occur?',
    ],
  };
}

/** Build the user-prompt block shared by both direct and with-answers paths */
function buildSuggestTechUserPrompt(currentContent, context, extraAnswers) {
  const name        = (currentContent && currentContent.name)        || '';
  const role        = (currentContent && currentContent.role)        || '';
  const description = (currentContent && currentContent.description) || '';
  const url         = (currentContent && currentContent.url)         || '';
  const githubUrl   = (currentContent && currentContent.githubUrl)   || '';
  const existing    = Array.isArray(currentContent && currentContent.technologies) ? currentContent.technologies : [];

  let prompt = `Project: ${name}`;
  if (role)        prompt += `\nRole: ${role}`;
  if (description) prompt += `\nDescription: ${description}`;
  if (url)         prompt += `\nProject URL: ${url}`;
  if (githubUrl)   prompt += `\nGitHub: ${githubUrl}`;
  if (existing.length > 0) prompt += `\nAlready using (exclude these): ${existing.join(', ')}`;

  const knownStack = extractKnownStack(context && context.resume);
  if (knownStack.length > 0) {
    prompt += `\nUser's known tech background (prefer these when relevant): ${knownStack.join(', ')}`;
  }

  if (extraAnswers) {
    prompt += `\n\nUser's answers to clarifying questions:\n${extraAnswers}`;
  }

  const jobDescription = context && context.jobDescription;
  if (jobDescription && !extraAnswers) {
    // only include JD when there are no Q&A answers (avoid duplicate context)
    prompt += `\nTarget job (for context): ${jobDescription.slice(0, 600)}`;
  }

  prompt += '\n\nSuggest technologies as a JSON array of strings:';
  return prompt;
}

function buildSuggestTechMessages(currentContent, context) {
  return [
    { role: 'system', content: SUGGEST_TECH_SYSTEM },
    { role: 'user',   content: buildSuggestTechUserPrompt(currentContent, context, null) },
  ];
}

function buildSuggestTechWithAnswersMessages(currentContent, context) {
  // answers are passed in context.jobDescription (reuses the jobDescription slot)
  const answers = (context && context.jobDescription) || '';
  return [
    { role: 'system', content: SUGGEST_TECH_SYSTEM },
    { role: 'user',   content: buildSuggestTechUserPrompt(currentContent, context, answers) },
  ];
}

/** Returns the fixed clarifying questions for sparse-context tech suggestions */
function buildSuggestTechQuestionsResponse() {
  return {
    type: 'questions',
    questions: [
      'What domain or type is this project? (e.g. web app, mobile app, ML model, data pipeline, DevOps tool, CLI)',
      'What is the main purpose or problem this project solves? (1–2 sentences)',
      'What is the target platform or deployment environment? (e.g. browser, iOS/Android, cloud/server, embedded)',
    ],
  };
}

function parseSuggestTechResponse(rawContent) {
  try {
    const trimmed = rawContent.trim();
    if (trimmed.startsWith('[')) {
      const arr = JSON.parse(trimmed);
      if (Array.isArray(arr)) {
        return { improved: arr.filter(t => typeof t === 'string'), changes: [], suggestions: [] };
      }
    }
    const match = rawContent.match(/\[[\s\S]*?\]/);
    if (match) {
      const arr = JSON.parse(match[0]);
      if (Array.isArray(arr)) {
        return { improved: arr.filter(t => typeof t === 'string'), changes: [], suggestions: [] };
      }
    }
  } catch (_) { /* fall through */ }
  return { improved: [], changes: [], suggestions: ['Could not parse technology suggestions'] };
}

function buildFillGapMessages(body) {
  const { gap, category, userDescription } = body;
  const systemPrompt = `You are a professional resume writer helping someone fill an employment gap on their resume.
Generate 3 honest, professional resume-entry suggestions for the gap period.
Return ONLY valid JSON array of exactly 3 objects, no markdown:
[
  {
    "title": "<role title>",
    "company": "<company/organization or descriptive label>",
    "description": "<1-2 sentence professional description>",
    "achievements": ["<specific accomplishment>", "<another accomplishment>"]
  }
]`;
  const userPrompt = `Career gap details:
Gap period: ${gap ? `${gap.start} – ${gap.end}` : 'unspecified'}
Category: ${category || 'general'}
User context: ${userDescription || 'none provided'}

Generate 3 professional resume entries for this period.`;
  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}

function buildExplainGapMessages(body) {
  const { gap, reason, targetRole, previousJob, nextJob, additionalContext } = body;
  const systemPrompt = `You are a career coach helping someone write a brief, professional explanation for a resume gap.
The explanation should be positive, honest, and forward-looking.
Return ONLY valid JSON, no markdown:
{
  "explanation": "<2-3 sentence professional gap explanation>",
  "talking_points": ["<interview tip 1>", "<interview tip 2>", "<interview tip 3>"]
}`;
  let userPrompt = `Career gap: ${gap ? JSON.stringify(gap) : 'unspecified'}
Gap reason: ${reason || 'unspecified'}`;
  if (previousJob) userPrompt += `\nPrevious role: ${previousJob.position} at ${previousJob.company}`;
  if (nextJob) userPrompt += `\nNext role: ${nextJob.position} at ${nextJob.company}`;
  if (targetRole) userPrompt += `\nTarget role: ${targetRole}`;
  if (additionalContext) userPrompt += `\nAdditional context: ${additionalContext}`;
  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}

// ─── Response parsers ─────────────────────────────────────────────────────────

function parseEnhanceResponse(rawContent, currentContent) {
  let parsed;
  try {
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawContent);
  } catch (_) {
    return {
      improved: rawContent || currentContent,
      changes:  ['Content enhanced'],
      suggestions: [],
    };
  }

  const changes = Array.isArray(parsed.changes)
    ? parsed.changes.map(c => (typeof c === 'string' ? c : (c.description || '')))
    : [];

  return {
    improved:     parsed.rewrittenContent ?? currentContent,
    changes,
    suggestions:  parsed.improvementSummary ? [parsed.improvementSummary] : [],
    keywordsAdded: parsed.keywordsAdded || [],
  };
}

// ─── Main handler ──────────────────────────────────────────────────────────────

module.exports = async ({ req, res, log, error }) => {

  // ── CORS pre-flight ──────────────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return res.send('', 204, {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-resume-section-ai-action',
    });
  }

  // ── Parse body ───────────────────────────────────────────────────────────────
  const body = typeof req.body === 'string'
    ? JSON.parse(req.body || '{}')
    : (req.body || {});

  // Smoke-test short-circuit (used by DevKit health checks)
  if (req.headers?.['x-smoke-test'] === 'true' || body['x-smoke-test'] === 'true') {
    log('Smoke test ping — returning OK');
    return res.json({ improved: body.currentContent || '', changes: [], suggestions: ['Smoke test OK'], _smokeTest: true, providers: getProviderAvailability() });
  }

  // Action is sent in the body (Appwrite SDK doesn't forward custom headers)
  const aiAction = body['x-resume-section-ai-action'] || 'enhance';
  const { section, action, currentContent, context } = body;

  log(`resume-section-ai: action=${aiAction}, section=${section}, enhance_action=${action}`);

  const pool = buildPool();
  if (pool.length === 0) {
    error('No AI provider keys found');
    return res.json({ error: true, code: 'no_keys', message: 'No AI provider keys configured on this function.' }, 503);
  }

  try {
    // ── Route to action handler ────────────────────────────────────────────────
    if (aiAction === 'enhance') {
      if (action === 'suggest_technologies') {
        // Ask clarifying questions when context is too sparse for good suggestions.
        // "Rich" = description ≥ 80 chars, OR (description ≥ 30 chars AND role is set).
        const desc = (currentContent && currentContent.description) || '';
        const role = (currentContent && currentContent.role) || '';
        const hasRichContext = desc.length >= 80 || (desc.length >= 30 && role.length >= 5);
        if (!hasRichContext) {
          return res.json(buildSuggestTechQuestionsResponse());
        }
        const messages = buildSuggestTechMessages(currentContent, context);
        const rawContent = await callLLM(messages, pool);
        const result = parseSuggestTechResponse(rawContent);
        return res.json(result);
      }

      if (action === 'suggest_technologies_with_answers') {
        const messages = buildSuggestTechWithAnswersMessages(currentContent, context);
        const rawContent = await callLLM(messages, pool);
        const result = parseSuggestTechResponse(rawContent);
        return res.json(result);
      }

      // ── Tier 2: sparse-context question checks ─────────────────────────────
      // summary → generate: ask questions if summary is very short
      if (section === 'summary' && action === 'generate') {
        const summaryText = typeof currentContent === 'string' ? currentContent : '';
        if (summaryText.trim().length < 50) {
          return res.json(buildSummaryQuestionsResponse());
        }
      }

      // skills → generate: ask questions if skill list has fewer than 3 items
      if (section === 'skills' && action === 'generate') {
        const skillCount = Array.isArray(currentContent) ? currentContent.length : 0;
        if (skillCount < 3) {
          return res.json(buildSkillsQuestionsResponse());
        }
      }

      // experience → add_metrics: ask questions if description is short
      if (section === 'experience' && action === 'add_metrics') {
        const desc = (currentContent && currentContent.description) || '';
        if (desc.trim().length < 60) {
          return res.json(buildAddMetricsQuestionsResponse());
        }
      }

      // ── Tier 2: *_with_answers variants ───────────────────────────────────
      // answers are passed through the context.jobDescription slot (same
      // pattern as suggest_technologies_with_answers)
      if (action === 'generate_with_answers') {
        const baseAction = section === 'summary' ? 'generate' : 'generate';
        const messages = buildEnhanceMessages(section, baseAction, currentContent, context);
        const rawContent = await callLLM(messages, pool);
        const result = parseEnhanceResponse(rawContent, currentContent);
        return res.json(result);
      }

      if (action === 'add_metrics_with_answers') {
        const messages = buildEnhanceMessages(section, 'add_metrics', currentContent, context);
        const rawContent = await callLLM(messages, pool);
        const result = parseEnhanceResponse(rawContent, currentContent);
        return res.json(result);
      }

      const messages = buildEnhanceMessages(section, action, currentContent, context);
      const rawContent = await callLLM(messages, pool);
      const result = parseEnhanceResponse(rawContent, currentContent);
      return res.json(result);
    }

    if (aiAction === 'tailor') {
      // Tailor a single section to match a job description
      const messages = buildEnhanceMessages(section, 'tailor', currentContent, context);
      const rawContent = await callLLM(messages, pool);
      const result = parseEnhanceResponse(rawContent, currentContent);
      return res.json(result);
    }

    if (aiAction === 'fill-gap') {
      const messages = buildFillGapMessages(body);
      const rawContent = await callLLM(messages, pool);
      let suggestions;
      try {
        const match = rawContent.match(/\[[\s\S]*\]/);
        suggestions = JSON.parse(match ? match[0] : rawContent);
      } catch (_) {
        suggestions = [];
      }
      return res.json({ suggestions, improved: null, changes: [] });
    }

    if (aiAction === 'explain-gap') {
      const messages = buildExplainGapMessages(body);
      const rawContent = await callLLM(messages, pool);
      let result;
      try {
        const match = rawContent.match(/\{[\s\S]*\}/);
        result = JSON.parse(match ? match[0] : rawContent);
      } catch (_) {
        result = { explanation: rawContent, talking_points: [] };
      }
      return res.json({ ...result, improved: null, changes: [] });
    }

    // Unknown action
    error(`Unknown action: ${aiAction}`);
    return res.json({ error: true, code: 'unknown_action', message: `Unknown action: ${aiAction}` }, 400);

  } catch (err) {
    error('resume-section-ai error: ' + err.message);
    return res.json({ error: true, code: 'internal', message: err.message }, 500);
  }
};
