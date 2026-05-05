import { getCorsHeaders } from "../_shared/cors.ts";
import { callAI, isAIError, toUserError } from "../_shared/aiClient.ts";
import { selectProviderForTool } from "../_shared/modelRouter.ts";
const __ROUTE = selectProviderForTool('generate-resignation-letter');
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";
import { checkUserRateLimit } from "../_shared/userRateLimiter.ts";
import { checkAndDeductCredit, refundCredit } from "../_shared/creditUtils.ts";
import { getServiceClient } from "../_shared/dbClient.ts";
import { requireAuth, tryAuth, authErrorResponse } from "../_shared/authMiddleware.ts";
import { insertResignationLetter } from "../_shared/letterPersistence.ts";
import { logger } from "../_shared/logger.ts";
import { wrapHandler } from '../_shared/fnLogger.ts';
const log = logger('generate-resignation-letter');


const MAX_TEXT_SIZE = 10 * 1024;

const VALID_TONES = ['formal', 'professional', 'balanced', 'friendly', 'grateful', 'direct'];
const VALID_TEMPLATES = ['standard', 'short', 'grateful', 'career_growth', 'immediate', 'retirement'];
const VALID_REASONS = ['new_opportunity', 'career_growth', 'relocation', 'personal_reasons', 'back_to_school', 'health_reasons', 'retirement', 'prefer_not_to_say'];
const VALID_NOTICE_PERIODS = ['2_weeks', '1_month', 'immediate', 'custom'];

Deno.serve(wrapHandler("generate-resignation-letter", async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await tryAuth(req, corsHeaders);
  if (auth instanceof Response) return auth;

  try {
    const { userId, client } = auth;

    const rateCheck = await checkRateLimit(userId, { maxRequests: 10, windowSeconds: 60, actionType: 'resignation' });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serverRateCheck = await checkUserRateLimit(userId, 'resignation', 10, 60);
    if (!serverRateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${serverRateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { recipientName, company, position, lastWorkingDay, noticePeriod, reason, tone, templateStyle, additions, userName } = body;
    const effectiveDate: string | undefined = body.effectiveDate;
    const additionIds: string[] | undefined = Array.isArray(body.additionIds) ? body.additionIds : undefined;
    const titleOverride: string | undefined = body.title;

    if (!company || typeof company !== 'string' || company.length > MAX_TEXT_SIZE) {
      return new Response(
        JSON.stringify({ error: 'Company name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validTone = VALID_TONES.includes(tone) ? tone : 'professional';
    const validTemplate = VALID_TEMPLATES.includes(templateStyle) ? templateStyle : 'standard';
    const validReason = VALID_REASONS.includes(reason) ? reason : 'prefer_not_to_say';
    const validNoticePeriod = VALID_NOTICE_PERIODS.includes(noticePeriod) ? noticePeriod : '2_weeks';

    const toneDescriptions: Record<string, string> = {
      formal: 'highly formal and professional with traditional business language',
      professional: 'professional, polished, and respectful',
      balanced: 'balanced between professional and warm',
      friendly: 'warm, personable, and appreciative while maintaining professionalism',
      grateful: 'deeply appreciative and focused on positive experiences',
      direct: 'clear, concise, and straightforward',
    };

    const templateDescriptions: Record<string, string> = {
      standard: 'traditional professional resignation letter format',
      short: 'brief and to the point, 3-4 paragraphs maximum',
      grateful: 'emphasizing gratitude, positive memories, and appreciation for growth',
      career_growth: 'focusing on exciting new opportunity and career progression',
      immediate: 'urgent tone explaining immediate departure with professionalism',
      retirement: 'warm, reflective tone celebrating career accomplishments and transitions',
    };

    const reasonDescriptions: Record<string, string> = {
      new_opportunity: 'pursuing a new career opportunity',
      career_growth: 'seeking career growth and professional development',
      relocation: 'relocating to a different area',
      personal_reasons: 'personal reasons (keep it vague and professional)',
      back_to_school: 'returning to school for further education',
      health_reasons: 'health-related reasons (keep it brief and private)',
      retirement: 'retiring from professional career',
      prefer_not_to_say: 'do not specify a reason, keep it general',
    };

    const additionsText = Array.isArray(additions) && additions.length > 0
      ? `\n\nInclude the following elements naturally in the letter:\n${additions.map((a: string) => `- ${a}`).join('\n')}`
      : '';

    const systemPrompt = `You are an expert professional letter writer specializing in resignation letters. Write resignation letters that are professional, clear about the departure date, appropriately toned, and properly formatted. Never include placeholder brackets like [Your Name]. Use the actual provided information.`;

    const userPrompt = `Write a resignation letter:

FROM: ${userName || 'Employee'}
POSITION: ${position || 'Current Position'}
COMPANY: ${company}
TO: ${recipientName || 'Manager'}
LAST WORKING DAY: ${lastWorkingDay || 'To be determined'}
NOTICE PERIOD: ${validNoticePeriod.replace('_', ' ')}
REASON: ${reasonDescriptions[validReason]}

TONE: ${toneDescriptions[validTone]}
TEMPLATE STYLE: ${templateDescriptions[validTemplate]}
${additionsText}

Write the complete letter with proper business letter formatting.`;


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
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        userId,
      });
    } catch (aiErr) {
      await refundCredit(userId, creditCheck, 1);
      throw aiErr;
    }

    const letter = aiResponse.content;
    if (!letter) {
      await refundCredit(userId, creditCheck, 1);
      throw new Error("No content in AI response");
    }

    await recordUsage(userId, 'resignation', { provider: aiResponse.providerUsed || 'unknown' });

    // Persist generated letter so users can revisit it from history. Hard
    // requirement — surface an error rather than silently dropping the row.
    let savedId: string;
    try {
      savedId = await insertResignationLetter(getServiceClient(), {
        userId,
        content: letter,
        company,
        title: titleOverride,
        recipientName,
        position,
        noticePeriod: validNoticePeriod,
        reason: validReason,
        tone: validTone,
        templateStyle: validTemplate,
        effectiveDate,
        additions: additionIds && additionIds.length > 0
          ? additionIds
          : (Array.isArray(additions) ? additions : []),
        modelUsed: aiResponse.providerUsed,
      });
    } catch (persistErr) {
      log.error('Failed to persist resignation letter', persistErr);
      return new Response(
        JSON.stringify({
          error: 'persist_failed',
          message: 'Generated the letter but failed to save it. Please try again.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ id: savedId, letter, content: letter }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    log.error("Unhandled error", error);
    const { status, error: code, message } = toUserError(error);
    return new Response(
      JSON.stringify({ error: code, message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}));
