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

async function callLLM(messages, pool) {
  if (pool.length === 0) throw new Error('No AI provider keys configured');
  const entry = pool[Math.floor(Math.random() * pool.length)];
  const response = await axios.post(entry.url, {
    model:       entry.model,
    messages,
    temperature: 0.7,
    max_tokens:  1200,
  }, {
    headers: { 'Authorization': `Bearer ${entry.key}`, 'Content-Type': 'application/json' },
    timeout: 55000,
  });
  return response.data.choices[0].message.content;
}

// ─── Action-specific prompt builders ─────────────────────────────────────────

const ACTION_INSTRUCTIONS = {
  improve:          'Improve this resume section to be more impactful, professional, and results-oriented.',
  ats_improve:      'Optimize this resume section for ATS compatibility by incorporating relevant keywords naturally.',
  ats_optimize:     'Rewrite this resume section to maximize ATS keyword matching while maintaining human readability.',
  shorten:          'Make this resume section more concise while preserving all key information and measurable achievements.',
  expand:           'Expand this resume section with more detail, specific achievements, and stronger action verbs.',
  add_metrics:      'Add quantifiable metrics and measurable outcomes to this resume section where possible.',
  generate_bullets: 'Convert this resume content into strong, action-verb-led bullet points with measurable outcomes.',
  generate:         'Generate professional, ATS-optimized content for this resume section based on the context provided.',
  tailor:           'Rewrite this resume section to closely match the target job description, using its exact keywords and terminology.',
  'fill-gap':       'Create a professional resume entry that honestly describes a career gap period. Make it positive and forward-looking.',
  'explain-gap':    'Write a brief, professional explanation for this career gap that frames the time constructively.',
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
    const resumeStr = JSON.stringify(context.resume);
    userPrompt += `\n\nRESUME CONTEXT (for coherence): ${resumeStr.slice(0, 1000)}`;
  }

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
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
  const { gap, experiences } = body;
  const systemPrompt = `You are a career coach helping someone write a brief, professional explanation for a resume gap.
The explanation should be positive, honest, and forward-looking.
Return ONLY valid JSON, no markdown:
{
  "explanation": "<2-3 sentence professional gap explanation>",
  "talking_points": ["<point 1>", "<point 2>", "<point 3>"]
}`;
  const userPrompt = `Career gap: ${gap ? JSON.stringify(gap) : 'unspecified'}
Surrounding experience context: ${experiences ? JSON.stringify(experiences).slice(0, 800) : 'none'}`;
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
    return res.json({ improved: body.currentContent || '', changes: [], suggestions: ['Smoke test OK'], _smokeTest: true });
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
