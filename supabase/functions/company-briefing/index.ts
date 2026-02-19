import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { callAIWithRetry, sanitizeInputText, toUserError } from '../_shared/aiClient.ts';
import { checkRateLimit, recordUsage } from '../_shared/rateLimiter.ts';

const SYSTEM_PROMPT = `You are an expert career research analyst. Given a job description and optionally a candidate's resume data, generate a comprehensive company research briefing.

Your briefing must be practical, specific, and actionable. Infer company details from the job description when explicit information is unavailable. Focus on insights that would help a candidate prepare for an interview.

IMPORTANT: All information must be grounded in the job description content. Do not fabricate specific news events or people's names — instead provide role-based insights (e.g. "Engineering Manager for this team" rather than inventing a name).`;

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const cors = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  try {
    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    const userId = claimsData.claims.sub as string;

    // Rate limit
    const rl = await checkRateLimit(userId, { maxRequests: 10, windowSeconds: 60, actionType: 'company_briefing' });
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded', retryAfter: rl.retryAfterSeconds }), {
        status: 429, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const { jobDescription, resumeData } = await req.json();
    if (!jobDescription || typeof jobDescription !== 'string') {
      return new Response(JSON.stringify({ error: 'jobDescription is required' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const sanitizedJD = sanitizeInputText(jobDescription, 10000);
    let resumeContext = '';
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
      resumeContext = sanitizeInputText(parts.join('\n'), 3000);
    }

    const userPrompt = `Job Description:\n${sanitizedJD}${resumeContext ? `\n\nCandidate Resume:\n${resumeContext}` : ''}`;

    const aiResponse = await callAIWithRetry({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.6,
      maxTokens: 2048,
      userId,
      tools: [{
        type: 'function',
        function: {
          name: 'generate_company_briefing',
          description: 'Generate a structured company research briefing from a job description',
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
            },
            required: ['companySnapshot', 'recentHighlights', 'cultureSignals', 'keyPeople', 'talkingPoints', 'questionsToAsk'],
            additionalProperties: false,
          },
        },
      }],
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
      return new Response(JSON.stringify({ error: 'Failed to generate briefing' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // Record usage
    await recordUsage(userId, 'company_briefing');

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
