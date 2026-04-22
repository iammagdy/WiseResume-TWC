import { getCorsHeaders } from "../_shared/cors.ts";
import { callAI, isAIError, parseAIJSON, toUserError } from "../_shared/aiClient.ts";
import { selectProviderForTool } from "../_shared/modelRouter.ts";
const __ROUTE = selectProviderForTool('detect-and-humanize');
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";
import { checkUserRateLimit } from "../_shared/userRateLimiter.ts";
import { requireAuth, authErrorResponse } from "../_shared/authMiddleware.ts";
import { checkAndDeductCredit, refundCredit } from "../_shared/creditUtils.ts";
import { getServiceClient } from "../_shared/dbClient.ts";
import { checkPayloadSize } from "../_shared/requestUtils.ts";
import { logger } from "../_shared/logger.ts";
const log = logger('detect-and-humanize');


interface DetectAndHumanizeRequest {
  text: string;
  action: 'detect' | 'humanize' | 'both';
  tone?: 'professional' | 'confident' | 'friendly';
}

const MAX_TEXT_LENGTH = 50000;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const sizeError = checkPayloadSize(req, 500 * 1024);
  if (sizeError) return sizeError;

  try {
    let userId: string;
    try {
      const auth = await requireAuth(req);
      userId = auth.userId;
    } catch (authErr) {
      return authErrorResponse(authErr, req.headers.get('origin'));
    }

    const rateCheck = await checkRateLimit(userId, { maxRequests: 15, windowSeconds: 60, actionType: 'detect_humanize' });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serverRateCheck = await checkUserRateLimit(userId, 'detect_humanize', 15, 60);
    if (!serverRateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${serverRateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { text, action, tone = 'professional' }: DetectAndHumanizeRequest = await req.json();

    if (!text || !action) {
      return new Response(
        JSON.stringify({ error: 'Text and action are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Text must be under ${MAX_TEXT_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result: Record<string, unknown> = {};
    let lastProviderUsed: string | undefined;

    const creditCheck = await checkAndDeductCredit(userId);
    if (!creditCheck.hasCredits) {
      return new Response(
        JSON.stringify({ error: 'Insufficient AI credits. Add your own Gemini API key for unlimited access.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Detection
    if (action === 'detect' || action === 'both') {
      const detectPrompt = `You are an expert at detecting AI-generated text. Analyze the following text for signs of AI authorship.

Look for these common AI patterns:
- Overused words: "delve", "tapestry", "synergy", "leverage", "spearheaded", "multifaceted", "seamlessly", "paradigm", "holistic", "robust"
- Formulaic structure: lists of exactly 3-5 items, overly balanced sentence lengths
- Lack of personal voice: generic phrasing, no unique perspectives
- Perfect grammar with no natural variations
- Buzzword density and corporate jargon overuse

Return a JSON object:
{
  "aiScore": <0-100>,
  "humanScore": <0-100>,
  "confidence": "<high|medium|low>",
  "flags": [{"phrase": "<exact phrase>", "reason": "<why>", "severity": "<high|medium|low>"}],
  "verdict": "<1-2 sentence assessment>"
}

Analyze this text:
"""
${text}
"""`;


      let detectResponse;
      try {
        detectResponse = await callAI({
          model: __ROUTE.model,
          wiseresumeSubProvider: __ROUTE.provider,
          messages: [{ role: 'user', content: detectPrompt }],
          temperature: 0.3,
          userId: userId,
        });
      } catch (aiErr) {
        await refundCredit(userId, creditCheck, 1);
        throw aiErr;
      }

      result.detection = parseAIJSON(detectResponse.content || '{}');
      lastProviderUsed = detectResponse.providerUsed;
    }

    // Humanization
    if (action === 'humanize' || action === 'both') {
      const toneInstructions: Record<string, string> = {
        professional: 'Maintain a professional tone while making it sound more natural and personal.',
        confident: 'Write with confident, assertive language. Use active voice and strong verbs.',
        friendly: 'Make it warm and approachable while still professional.',
      };

      const humanizePrompt = `You are an expert editor who makes AI-generated text sound naturally human.

Guidelines:
1. Replace overused AI words with natural alternatives
2. Vary sentence length and structure
3. Add subtle imperfections humans naturally make
4. ${toneInstructions[tone]}

Original text:
"""
${text}
"""

Return a JSON object:
{
  "original": "<the original text>",
  "humanized": "<your rewritten version>",
  "changes": ["<key changes made>"]
}`;

      let humanizeResponse;
      try {
        humanizeResponse = await callAI({
          model: __ROUTE.model,
          wiseresumeSubProvider: __ROUTE.provider,
          messages: [{ role: 'user', content: humanizePrompt }],
          temperature: 0.7,
          userId: userId,
        });
      } catch (aiErr) {
        await refundCredit(userId, creditCheck, 1);
        throw aiErr;
      }

      result.humanized = parseAIJSON(humanizeResponse.content || '{}');
      lastProviderUsed = humanizeResponse.providerUsed;
    }

    await recordUsage(userId, 'detect_humanize', { provider: lastProviderUsed || 'unknown' });


    return new Response(
      JSON.stringify({ success: true, ...result, _providerUsed: lastProviderUsed || 'unknown' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    log.error('Unhandled error', error);
    const { status, error: code, message } = toUserError(error);
    return new Response(
      JSON.stringify({ error: code, message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
