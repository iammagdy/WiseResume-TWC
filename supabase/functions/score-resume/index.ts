import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireAuth, decodeJwtPayload } from "../_shared/authMiddleware.ts";
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

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId } = await requireAuth(req);

    const rateCheck = await checkRateLimit(userId, { maxRequests: 60, windowSeconds: 60, actionType: 'score' });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { resume, templateId } = await req.json();

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
    const parsability = scoreParsability(resume);
    const lengthDensity = scoreLengthDensity(resume);
    const keywordOptimization = scoreKeywordOptimization(resume);
    const contentQuality = scoreContentQuality(resume);
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
    };

    // Only record usage for local users (cross-project users don't exist in auth.users)
    if (!userId.startsWith('ext:')) {
      try {
        await recordUsage(userId, 'score', { provider: 'deterministic' });
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
    return new Response(
      JSON.stringify({ error: 'Something went wrong. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
