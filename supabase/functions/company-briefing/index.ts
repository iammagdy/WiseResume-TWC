import { getCorsHeaders } from '../_shared/cors.ts';
import { callAIWithRetry, sanitizeInputText, toUserError } from '../_shared/aiClient.ts';
import { checkRateLimit, recordUsage } from '../_shared/rateLimiter.ts';
import { requireAuth, authErrorResponse } from '../_shared/authMiddleware.ts';

const JD_SYSTEM_PROMPT = `You are an expert career research analyst. Given a job description and optionally a candidate's resume data, generate a comprehensive company research briefing.

Your briefing must be practical, specific, and actionable. Infer company details from the job description when explicit information is unavailable. Focus on insights that would help a candidate prepare for an interview.

IMPORTANT: All information must be grounded in the job description content. Do not fabricate specific news events or people's names — instead provide role-based insights (e.g. "Engineering Manager for this team" rather than inventing a name).`;

const COMPANY_SYSTEM_PROMPT = `You are an elite corporate research analyst performing deep-dive company intelligence.
Given a company name, produce a thorough, accurate, and detailed company research briefing.

Your research must include:
- Verified facts about the company (founding, HQ, size, mission, revenue if public)
- Real products/services the company offers
- Known technology stack or engineering practices
- Actual competitors in their market
- Workplace culture based on publicly available information (Glassdoor themes, employer brand)
- Key leadership roles and their strategic context
- Actionable talking points for someone interviewing there
- Smart questions a candidate should ask

CRITICAL RULES:
- Be specific and factual. Do NOT generate generic business advice.
- If you are uncertain about a fact, say "estimated" or "reported" — never fabricate.
- For Glassdoor insights, provide general sentiment themes, not fabricated ratings.
- Provide the company's real website URL if known.
- Your knowledge has a cutoff date — mention this if relevant to recent events.`;

const TOOL_SCHEMA = {
  type: 'function',
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

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const cors = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  try {
    const { userId, client } = await requireAuth(req);

    const rl = await checkRateLimit(userId, { maxRequests: 10, windowSeconds: 60, actionType: 'company_briefing' });
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded', retryAfter: rl.retryAfterSeconds }), {
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
    const model = isCompanyNameMode ? 'google/gemini-2.5-pro' : 'google/gemini-2.5-flash';
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
      if (resumeData.summary) parts.push(`Summary: ${resumeData.summary}`);
      if (resumeData.experience?.length) {
        parts.push('Experience: ' + resumeData.experience.map((e: any) => `${e.position || ''} at ${e.company || ''}`).join('; '));
      }
      if (resumeData.skills?.length) {
        const skillNames = resumeData.skills.map((s: any) => typeof s === 'string' ? s : s.name || s.skill || '').filter(Boolean);
        parts.push('Skills: ' + skillNames.join(', '));
      }
      const resumeContext = sanitizeInputText(parts.join('\n'), 3000);
      if (resumeContext) {
        userPrompt += `\n\nCandidate Resume:\n${resumeContext}`;
      }
    }

    const aiResponse = await callAIWithRetry({
      model,
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

    let briefing: any = null;

    if (aiResponse.toolCalls?.length) {
      try {
        briefing = JSON.parse(aiResponse.toolCalls[0].function.arguments);
      } catch {
        console.error('Failed to parse tool call arguments');
      }
    }

    if (!briefing && aiResponse.content) {
      try {
        briefing = JSON.parse(aiResponse.content);
      } catch {
        console.error('Failed to parse content as JSON');
      }
    }

    if (!briefing) {
      return new Response(JSON.stringify({ error: 'Failed to generate briefing' }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    await recordUsage(userId, 'company_briefing', { provider: aiResponse.providerUsed || 'unknown', mode: isCompanyNameMode ? 'company_name' : 'job_description' });

    return new Response(JSON.stringify({ briefing }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Company briefing error:', error);
    const userError = toUserError(error);
    return new Response(JSON.stringify({ error: userError.message }), {
      status: userError.status, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
