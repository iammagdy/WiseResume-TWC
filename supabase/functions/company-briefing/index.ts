import { getCorsHeaders } from '../_shared/cors.ts';
import { callAIWithRetry, sanitizeInputText, toUserError, parseAIJSON } from '../_shared/aiClient.ts';
import { selectProviderForTool } from "../_shared/modelRouter.ts";
const __ROUTE = selectProviderForTool('company-briefing');
import { checkRateLimit, recordUsage } from '../_shared/rateLimiter.ts';
import { checkUserRateLimit } from '../_shared/userRateLimiter.ts';
import { requireAuth, tryAuth, authErrorResponse } from '../_shared/authMiddleware.ts';
import { checkAndDeductCredit, refundCredit } from '../_shared/creditUtils.ts';
import { getServiceClient } from '../_shared/dbClient.ts';
import { logger } from '../_shared/logger.ts';
import { wrapHandler } from '../_shared/fnLogger.ts';
const log = logger('company-briefing');


const JD_SYSTEM_PROMPT = `You are an expert career research analyst and personal career coach. Given a job description and a candidate's resume data, generate a comprehensive company research briefing that is tightly personalised to THIS specific candidate.

Your briefing must be practical, specific, and actionable. Infer company details from the job description when explicit information is unavailable. Focus on insights that would help THIS candidate prepare for an interview.

CANDIDATE PERSONALISATION RULES (apply to every section):
- Talking points: Each point MUST explicitly reference the candidate's own job titles, skills, or projects and explain why that background maps to the company's needs. Write as a career coach advising this specific person (e.g. "Your experience leading X directly aligns with their initiative Y — lead with that").
- Questions to ask: Calibrate each question to the candidate's seniority level and career trajectory inferred from their resume. A senior engineer's questions differ from a junior's; a career-switcher's questions differ from a specialist's.
- Culture signals: Where a culture signal is directly relevant to something in the candidate's background or stated preferences, call it out explicitly (e.g. "You have worked remotely — note they are hybrid, which may be an adjustment").
- Overall tone: Sound like a sharp personal career coach giving bespoke advice, NOT a generic company Wikipedia page. Every insight should feel written specifically for this person.

IMPORTANT: All information must be grounded in the job description content. Do not fabricate specific news events or people's names — instead provide role-based insights (e.g. "Engineering Manager for this team" rather than inventing a name).`;

const COMPANY_SYSTEM_PROMPT = `You are an elite corporate research analyst AND personal career coach. Given a company name and a candidate's resume data, produce a thorough, accurate, and deeply personalised company research briefing for THIS specific candidate.

Your research must include:
- Verified facts about the company (founding, HQ, size, mission, revenue if public)
- Real products/services the company offers
- Known technology stack or engineering practices
- Actual competitors in their market
- Workplace culture based on publicly available information (Glassdoor themes, employer brand)
- Key leadership roles and their strategic context
- Personalised talking points that explicitly reference the candidate's background
- Smart questions calibrated to the candidate's seniority and career goals

CANDIDATE PERSONALISATION RULES (apply to every section):
- Talking points: Each point MUST explicitly cite the candidate's own job titles, skills, or projects and explain why that background maps to the company. Write as a career coach advising this specific person (e.g. "Your background in X is directly relevant to their focus on Y — highlight this"). Do NOT write generic interview tips.
- Questions to ask: Calibrate every question to the candidate's seniority level and career stage inferred from their resume. A first-time manager asks different questions than a VP; a career-switcher asks different questions than a domain expert.
- Culture signals: When a culture signal has direct relevance to the candidate's background, preferences, or working style (as evidenced by their resume), note it explicitly.
- Overall tone: Sound like a sharp personal career coach giving bespoke, actionable advice — not a company Wikipedia page. Every insight should feel written specifically for this candidate.

CRITICAL RULES:
- Be specific and factual. Do NOT generate generic business advice.
- If you are uncertain about a fact, say "estimated" or "reported" — never fabricate.
- For Glassdoor insights, provide general sentiment themes, not fabricated ratings.
- Provide the company's real website URL if known.
- Your knowledge has a cutoff date — mention this if relevant to recent events.`;

const TOOL_SCHEMA = {
  type: 'function' as const,
  function: {
    name: 'generate_company_briefing',
    description: 'Generate a structured company research briefing',
    parameters: {
      type: 'object',
      properties: {
        companySnapshot: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Company name' },
            industry: { type: 'string', description: 'Industry/sector' },
            size: { type: 'string', description: 'Estimated company size' },
            hq: { type: 'string', description: 'Headquarters location' },
            founded: { type: 'string', description: 'Founding year or era' },
            mission: { type: 'string', description: 'Mission statement or core purpose' },
            website: { type: 'string', description: 'Company website URL' },
            stockTicker: { type: 'string', description: 'Stock ticker symbol if publicly traded' },
            revenue: { type: 'string', description: 'Estimated annual revenue if known' },
          },
          required: ['name', 'industry', 'size', 'hq', 'founded', 'mission'],
          additionalProperties: false,
        },
        recentHighlights: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              summary: { type: 'string' },
              relevance: { type: 'string' },
            },
            required: ['title', 'summary', 'relevance'],
            additionalProperties: false,
          },
        },
        cultureSignals: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              signal: { type: 'string' },
              detail: { type: 'string' },
            },
            required: ['signal', 'detail'],
            additionalProperties: false,
          },
        },
        keyPeople: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              role: { type: 'string' },
              context: { type: 'string' },
            },
            required: ['role', 'context'],
            additionalProperties: false,
          },
        },
        talkingPoints: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              point: { type: 'string' },
              connection: { type: 'string' },
            },
            required: ['point', 'connection'],
            additionalProperties: false,
          },
        },
        questionsToAsk: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              question: { type: 'string' },
              why: { type: 'string' },
            },
            required: ['question', 'why'],
            additionalProperties: false,
          },
        },
        competitors: {
          type: 'array',
          items: { type: 'string' },
          description: 'Key competitors in the same market',
        },
        productsOrServices: {
          type: 'array',
          items: { type: 'string' },
          description: 'Main products or services offered',
        },
        techStack: {
          type: 'array',
          items: { type: 'string' },
          description: 'Known technologies used by the company',
        },
        glassdoorInsights: {
          type: 'object',
          properties: {
            rating: { type: 'string', description: 'Approximate Glassdoor rating or sentiment' },
            prosThemes: { type: 'array', items: { type: 'string' }, description: 'Common positive themes' },
            consThemes: { type: 'array', items: { type: 'string' }, description: 'Common negative themes' },
          },
          required: ['rating', 'prosThemes', 'consThemes'],
          additionalProperties: false,
        },
      },
      required: ['companySnapshot', 'recentHighlights', 'cultureSignals', 'keyPeople', 'talkingPoints', 'questionsToAsk'],
      additionalProperties: false,
    },
  },
};

Deno.serve(wrapHandler("company-briefing", async (req) => {
  const origin = req.headers.get('origin');
  const cors = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  const auth = await tryAuth(req, cors);
  if (auth instanceof Response) return auth;

  try {
    const { userId, client } = auth;

    const rl = await checkRateLimit(userId, { maxRequests: 10, windowSeconds: 60, actionType: 'company_briefing' });
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded', retryAfter: rl.retryAfterSeconds }), {
        status: 429, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const serverRateCheck = await checkUserRateLimit(userId, 'company_briefing', 10, 60);
    if (!serverRateCheck.allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded', retryAfter: serverRateCheck.retryAfterSeconds }), {
        status: 429, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const { companyName, jobDescription, resumeData } = await req.json();

    if (!companyName && !jobDescription) {
      return new Response(JSON.stringify({ error: 'companyName or jobDescription is required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const isCompanyNameMode = !!companyName && !jobDescription;
    const model = __ROUTE.model;
    void isCompanyNameMode;
    const systemPrompt = isCompanyNameMode ? COMPANY_SYSTEM_PROMPT : JD_SYSTEM_PROMPT;

    let userPrompt = '';
    if (isCompanyNameMode) {
      userPrompt = `Research this company in depth: ${sanitizeInputText(companyName, 200)}`;
    } else {
      const sanitizedJD = sanitizeInputText(jobDescription, 10000);
      userPrompt = `Job Description:\n${sanitizedJD}`;
      if (companyName) {
        userPrompt = `Company: ${sanitizeInputText(companyName, 200)}\n\n${userPrompt}`;
      }
    }

    if (resumeData) {
      const parts: string[] = [];
      if (resumeData.summary) parts.push(`Professional Summary: ${resumeData.summary}`);
      if (resumeData.experience?.length) {
        const expLines = resumeData.experience.map((e: any) => {
          const parts: string[] = [];
          if (e.position) parts.push(e.position);
          if (e.company) parts.push(`at ${e.company}`);
          if (e.startDate || e.endDate) parts.push(`(${[e.startDate, e.endDate].filter(Boolean).join(' – ')})`);
          return parts.join(' ');
        }).filter(Boolean);
        if (expLines.length) parts.push('Work Experience:\n' + expLines.map((l: string) => `  - ${l}`).join('\n'));
      }
      if (resumeData.skills?.length) {
        const skillNames = resumeData.skills.map((s: any) => typeof s === 'string' ? s : s.name || s.skill || '').filter(Boolean);
        if (skillNames.length) parts.push('Skills: ' + skillNames.join(', '));
      }
      if (resumeData.education?.length) {
        const eduLines = resumeData.education.map((ed: any) => {
          const parts: string[] = [];
          if (ed.degree) parts.push(ed.degree);
          if (ed.institution || ed.school) parts.push(`from ${ed.institution || ed.school}`);
          return parts.join(' ');
        }).filter(Boolean);
        if (eduLines.length) parts.push('Education:\n' + eduLines.map((l: string) => `  - ${l}`).join('\n'));
      }
      const resumeContext = sanitizeInputText(parts.join('\n'), 3000);
      if (resumeContext) {
        userPrompt += `\n\nCANDIDATE BACKGROUND (use this to personalise every section of the briefing):\n${resumeContext}`;
      }
    } else {
      userPrompt += '\n\n(No candidate resume provided — generate general insights without personalisation.)';
    }


    const creditCheck = await checkAndDeductCredit(userId);
    if (!creditCheck.hasCredits) {
      return new Response(
        JSON.stringify({ error: 'Insufficient AI credits. Add your own Gemini API key for unlimited access.' }),
        { status: 402, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }
    let aiResponse;
    try {
      aiResponse = await callAIWithRetry({
        model,
        wiseresumeSubProvider: __ROUTE.provider,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.6,
        maxTokens: 4096,
        userId,
        tools: [TOOL_SCHEMA],
        toolChoice: { type: 'function', function: { name: 'generate_company_briefing' } },
      });
    } catch (aiErr) {
      await refundCredit(userId, creditCheck, 1);
      throw aiErr;
    }

    let briefing: any = null;

    if (aiResponse.toolCalls?.length) {
      try {
        briefing = JSON.parse(aiResponse.toolCalls[0].function.arguments);
      } catch {
        console.error('Failed to parse tool call arguments');
      }
    }

    if (!briefing && aiResponse.content) {
      briefing = parseAIJSON(aiResponse.content);
      if (!briefing) console.error('Failed to parse content as JSON');
    }

    if (!briefing) {
      await refundCredit(userId, creditCheck, 1);
      return new Response(JSON.stringify({ error: 'Failed to generate briefing' }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    await recordUsage(userId, 'company_briefing', { provider: aiResponse.providerUsed || 'unknown', mode: isCompanyNameMode ? 'company_name' : 'job_description' });


    return new Response(JSON.stringify({ briefing }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    log.error('Unhandled error', error);
    const userError = toUserError(error);
    return new Response(JSON.stringify({ error: userError.message }), {
      status: userError.status, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}));
