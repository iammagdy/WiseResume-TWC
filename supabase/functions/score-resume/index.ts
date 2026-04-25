import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { recordUsage } from "../_shared/rateLimiter.ts";
import { checkUserRateLimit } from "../_shared/userRateLimiter.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { isKillSwitchActive } from "../_shared/featureFlags.ts";
import { requireAuth } from "../_shared/authMiddleware.ts";
import { toUserError } from "../_shared/aiClient.ts";
import { wrapHandler } from "../_shared/fnLogger.ts";
import {
  scoreContactCompleteness,
  scoreSectionStructure,
  scoreParsability,
  scoreLengthDensity,
  scoreKeywordOptimization,
  scoreContentQuality,
  scoreTemplateFriendliness,
  generateFeedback,
} from "../_shared/scoringFunctions.ts";

const MAX_RESUME_SIZE = 100 * 1024;

// ── Main Handler ─────────────────────────────────────────────────────

serve(wrapHandler('score-resume', async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (await isKillSwitchActive('score-resume')) {
    return new Response(
      JSON.stringify({ success: false, error: 'Feature temporarily unavailable' }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const { userId } = await requireAuth(req);

    const body = await req.json();
    const { resume, templateId, source } = body;
    const isBackground = source === 'background';
    const featureKey = isBackground ? 'background_score' : 'score';

    const serverRateCheck = await checkUserRateLimit(userId, featureKey, 60, 60);
    if (!serverRateCheck.allowed) {
      const status = serverRateCheck.dbError ? 503 : 429;
      const msg = serverRateCheck.dbError
        ? 'Service temporarily unavailable. Please try again in a moment.'
        : `Rate limit exceeded. Try again in ${serverRateCheck.retryAfterSeconds}s.`;
      return new Response(
        JSON.stringify({ error: serverRateCheck.dbError ? 'service_unavailable' : 'rate_limit', message: msg }),
        { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!resume || typeof resume !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Resume is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resumeStr = JSON.stringify(resume);
    if (resumeStr.length > MAX_RESUME_SIZE) {
      return new Response(
        JSON.stringify({ error: 'Resume data too large' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Compute ALL 7 deterministic scores ───────────────────────────
    const contactCompleteness = scoreContactCompleteness(resume.contactInfo || {});
    const sectionStructure = scoreSectionStructure(resume);
    const parsabilityResult = scoreParsability(resume);
    const parsability = parsabilityResult.score;
    const tenseHint = parsabilityResult.tenseHint;
    const lengthDensity = scoreLengthDensity(resume);
    const keywordResult = scoreKeywordOptimization(resume);
    const keywordOptimization = keywordResult.score;
    const keywordGaps = keywordResult.keywordGaps;
    const contentResult = scoreContentQuality(resume);
    const contentQuality = contentResult.score;
    const weakBullets = contentResult.weakBullets;
    const templateFriendliness = scoreTemplateFriendliness(templateId);

    const overallScore = Math.round(
      keywordOptimization * 0.35 +
      contentQuality * 0.25 +
      sectionStructure * 0.10 +
      parsability * 0.10 +
      contactCompleteness * 0.05 +
      lengthDensity * 0.05 +
      templateFriendliness * 0.10
    );

    const categories = {
      keywordOptimization,
      contentQuality,
      sectionStructure,
      parsability,
      contactCompleteness,
      lengthDensity,
      templateFriendliness,
    };

    const { topStrength, topImprovement } = generateFeedback(categories);

    const result = {
      overallScore,
      categories,
      topStrength,
      topImprovement,
      keywordGaps,
      weakBullets,
      ...(tenseHint ? { tenseHint } : {}),
    };

    // Only record usage for local users (cross-project users don't exist in auth.users)
    if (!userId.startsWith('ext:')) {
      try {
        await recordUsage(userId, featureKey, { provider: 'deterministic' });
      } catch (usageErr) {
        console.warn('recordUsage skipped (cross-project user):', usageErr);
      }
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("score-resume error:", error);
    const { status, error: errorCode, message } = toUserError(error);
    return new Response(
      JSON.stringify({ error: errorCode, message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
