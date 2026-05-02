import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireAuth, authErrorResponse } from '../_shared/authMiddleware.ts';
import { callAI, toUserError, parseAIJSON } from '../_shared/aiClient.ts';
import { selectProviderForTool } from "../_shared/modelRouter.ts";
const __ROUTE = selectProviderForTool('generate-question-bank');
import { checkRateLimit, recordUsage } from '../_shared/rateLimiter.ts';
import { checkUserRateLimit } from '../_shared/userRateLimiter.ts';
import { checkAndDeductCredit, refundCredit } from '../_shared/creditUtils.ts';
import { getServiceClient } from '../_shared/dbClient.ts';
import { checkPayloadSize } from '../_shared/requestUtils.ts';
import { logger } from '../_shared/logger.ts';
import { wrapHandler } from '../_shared/fnLogger.ts';
const log = logger('generate-question-bank');


serve(wrapHandler("generate-question-bank", async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const sizeError = checkPayloadSize(req, 500 * 1024);
  if (sizeError) return sizeError;

  try {
    const { userId } = await requireAuth(req);

    const { allowed } = await checkRateLimit(userId, { actionType: 'question_bank', maxRequests: 10, windowSeconds: 60 });
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please wait before generating more questions.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serverRateCheck = await checkUserRateLimit(userId, 'question_bank', 10, 60);
    if (!serverRateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${serverRateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { jobTitle, company, jobDescription, resumeSummary } = await req.json();

    if (!jobTitle) {
      return new Response(
        JSON.stringify({ error: 'Job title is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are an expert interview coach. Generate a targeted question bank for a specific role and company. Create questions that are realistic, challenging, and relevant.

Rules:
- Generate exactly 4 categories: company, technical, behavioral, curveball
- Each category should have 3-5 questions
- Each question must have: question text, context (why they ask this), and answerTip (framework/approach)
- For behavioral questions, suggest the STAR method framing
- For technical questions, focus on requirements from the job description
- For company questions, reference the company's likely values and culture
- For curveball questions, create thought-provoking unconventional questions
- Keep answer tips actionable and concise (2-3 sentences max)`;

    const userPrompt = `Generate an interview question bank for:
Job Title: ${jobTitle}
Company: ${company || 'Not specified'}
${jobDescription ? `Job Description: ${jobDescription.slice(0, 3000)}` : ''}
${resumeSummary ? `Candidate Summary: ${resumeSummary.slice(0, 1000)}` : ''}`;


    const creditCheck = await checkAndDeductCredit(userId);
    if (!creditCheck.hasCredits) {
      return new Response(
        JSON.stringify({ error: 'Daily AI credit limit reached. Upgrade your plan or add your own API key.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    let aiResponse;
    try {
      aiResponse = await callAI({
        model: __ROUTE.model, wiseresumeSubProvider: __ROUTE.provider,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [
        {
          type: 'function',
          function: {
            name: 'generate_questions',
            description: 'Return categorized interview questions',
            parameters: {
              type: 'object',
              properties: {
                categories: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', enum: ['company', 'technical', 'behavioral', 'curveball'] },
                      label: { type: 'string' },
                      questions: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            question: { type: 'string' },
                            context: { type: 'string', description: 'Why interviewers ask this' },
                            answerTip: { type: 'string', description: 'Brief framework for answering' },
                          },
                          required: ['question', 'context', 'answerTip'],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ['id', 'label', 'questions'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['categories'],
              additionalProperties: false,
            },
          },
        },
      ],
        toolChoice: { type: 'function', function: { name: 'generate_questions' } },
        userId,
      });
    } catch (aiErr) {
      await refundCredit(userId, creditCheck, 1);
      throw aiErr;
    }

    const toolCall = aiResponse.toolCalls?.[0];
    let result: any = null;
    if (toolCall?.function?.arguments) {
      try { result = JSON.parse(toolCall.function.arguments); } catch {}
    }
    if (!result && aiResponse.content) {
      result = parseAIJSON(aiResponse.content);
    }
    if (!result) {
      await refundCredit(userId, creditCheck, 1);
      throw new Error('No structured result returned from AI');
    }
    const providerUsed = aiResponse.providerUsed || 'unknown';

    await recordUsage(userId, 'question_bank', { provider: providerUsed });

    return new Response(JSON.stringify({
      ...result,
      _providerUsed: providerUsed,
      _fallbackUsed: aiResponse.fallbackUsed || false,
      _fallbackReason: aiResponse.fallbackReason || null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    if (typeof err === 'object' && err !== null && 'status' in err) {
      return authErrorResponse(err, origin);
    }
    log.error('Unhandled error', err);
    const userErr = toUserError(err);
    return new Response(
      JSON.stringify({ error: userErr.error, message: userErr.message }),
      { status: userErr.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
