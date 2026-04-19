import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireAuth, authErrorResponse } from "../_shared/authMiddleware.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callAIWithRetry, parseAIJSONWithRetry, sanitizeInputText, toUserError } from "../_shared/aiClient.ts";
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";
import { checkUserRateLimit } from "../_shared/userRateLimiter.ts";
import { getServiceClient } from "../_shared/dbClient.ts";
import { checkAndDeductCredit, refundCredit } from "../_shared/creditUtils.ts";
import { checkPayloadSize } from "../_shared/requestUtils.ts";
import { logger } from "../_shared/logger.ts";
const log = logger('tailor-section');


/**
 * Selects AI model for section tailoring based on intensity.
 */
function selectModel(intensity: string): string {
  if (intensity === 'aggressive') {
    return 'google/gemini-flash-1.5';
  }
  return 'meta-llama/llama-3.3-70b-instruct:free';
}

const VALID_SECTIONS = new Set([
  'summary', 'skills', 'experience', 'education', 'projects', 'certifications', 'awards',
]);

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const sizeError = checkPayloadSize(req, 200 * 1024);
  if (sizeError) return sizeError;

  try {
    let userId: string;
    try {
      const auth = await requireAuth(req);
      userId = auth.userId;
    } catch (authErr) {
      return authErrorResponse(authErr, req.headers.get('origin'));
    }
    console.log('[tailor-section] Authenticated user:', userId);

    const rateCheck = await checkRateLimit(userId, { maxRequests: 20, windowSeconds: 60, actionType: 'tailor_section' });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serverRateCheck = await checkUserRateLimit(userId, 'tailor_section', 20, 60);
    if (!serverRateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${serverRateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { section, currentContent, jobDescription: rawJobDescription, jobKeywords, userInstructions, intensity } = body;

    // Validate required fields
    if (!section || typeof section !== 'string' || !VALID_SECTIONS.has(section)) {
      return new Response(
        JSON.stringify({ error: `Invalid section. Must be one of: ${Array.from(VALID_SECTIONS).join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (currentContent === undefined || currentContent === null) {
      return new Response(
        JSON.stringify({ error: 'currentContent is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!rawJobDescription || typeof rawJobDescription !== 'string') {
      return new Response(
        JSON.stringify({ error: 'jobDescription is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tailorIntensity = intensity || 'moderate';
    const jobDescription = sanitizeInputText(rawJobDescription, 8_000);
    const keywords: string[] = Array.isArray(jobKeywords) ? jobKeywords.slice(0, 30) : [];
    const instructions = typeof userInstructions === 'string' ? userInstructions.slice(0, 500) : '';
    const selectedModel = selectModel(tailorIntensity);

    console.log(`[tailor-section] Rewriting section="${section}" with model=${selectedModel}, intensity=${tailorIntensity}`);

    const keywordsNote = keywords.length > 0
      ? `\nMust incorporate these keywords naturally where relevant: ${keywords.join(', ')}\n`
      : '';
    const instructionsNote = instructions
      ? `\nUser instructions: ${instructions}\n`
      : '';

    const intensityGuide: Record<string, string> = {
      light: 'Make minimal changes. Preserve the original voice. Only add keywords where they fit naturally.',
      moderate: 'Balance preservation of voice with optimization. Rewrite for clarity and keyword alignment.',
      aggressive: 'Maximize ATS compatibility. Rewrite extensively using job description terminology. Use powerful action verbs and add metrics wherever possible.',
    };
    const intensityNote = intensityGuide[tailorIntensity] || intensityGuide.moderate;

    const systemPrompt = `You are an expert resume writer specializing in ATS optimization and targeted tailoring. You rewrite individual resume sections to better match specific job descriptions. Return ONLY valid JSON with no markdown or code blocks.`;

    const userPrompt = `Rewrite this resume section to better match the target job description.

SECTION: ${section}
CURRENT CONTENT: ${JSON.stringify(currentContent)}

TARGET JOB DESCRIPTION:
${jobDescription}
${keywordsNote}${instructionsNote}
INTENSITY: ${intensityNote}

RULES:
- Never fabricate experience, metrics, or skills that don't exist in the original content
- Reframe and enhance existing content only
- Use strong action verbs and quantifiable achievements where possible
- Match terminology from the job description
- Keep the same structural format as the input (if array, return array; if string, return string)

Return this exact JSON:
{
  "rewrittenContent": <same type as input — string or array>,
  "changes": [
    {
      "description": "<what was changed>",
      "type": "<keyword_added | bullet_transformed | metric_added | reordered | phrasing_improved>",
      "impact": "<high | medium | low>"
    }
  ],
  "keywordsAdded": ["<keyword integrated>", "..."],
  "improvementSummary": "<1-2 sentence summary of what was improved>"
}`;


    const creditCheck = await checkAndDeductCredit(userId);
    if (!creditCheck.hasCredits) {
      return new Response(
        JSON.stringify({ error: 'Insufficient AI credits. Add your own Gemini API key for unlimited access.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    let aiResponse;
    try {
      aiResponse = await callAIWithRetry({
        model: selectedModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.4,
        maxTokens: 4000,
        userId,
      });
    } catch (aiErr) {
      await refundCredit(userId, creditCheck, 1);
      throw aiErr;
    }

    if (!aiResponse.content) {
      await refundCredit(userId, creditCheck, 1);
      throw new Error('No content in AI response');
    }

    const parsed = await parseAIJSONWithRetry<Record<string, unknown>>(aiResponse.content, {
      model: selectedModel,
      userId,
    });

    if (!parsed) {
      console.error('[tailor-section] Failed to parse AI response:', aiResponse.content?.slice(0, 300));
      await refundCredit(userId, creditCheck, 1);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response. Please try again.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await recordUsage(userId, 'tailor_section', { provider: aiResponse.providerUsed || 'unknown' });

    const svcClient = getServiceClient();

    try {
      svcClient.from('usage_events').insert({
        user_id: userId,
        event_type: 'ai.tailor_section',
        metadata: { section, model: aiResponse.providerUsed || 'unknown', intensity: tailorIntensity },
      }).then(() => {});
    } catch { /* non-critical */ }

    return new Response(
      JSON.stringify({
        section,
        rewrittenContent: parsed.rewrittenContent,
        changes: parsed.changes || [],
        keywordsAdded: parsed.keywordsAdded || [],
        improvementSummary: parsed.improvementSummary || '',
        _providerUsed: aiResponse.providerUsed || 'unknown',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    log.error('Unhandled error', error);

    const userError = toUserError(error);
    return new Response(
      JSON.stringify({ error: userError.message }),
      { status: userError.status, headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } }
    );
  }
});
