import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import {
  scoreContactCompleteness,
  scoreSectionStructure,
  scoreParsability,
  scoreLengthDensity,
  scoreKeywordOptimization,
  scoreContentQuality,
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    let userId: string;

    // Try to get user from this project's auth first
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (user) {
      userId = user.id;
    } else {
      // Cross-project token: extract sub from JWT payload as identity
      try {
        const payloadB64 = token.split('.')[1];
        // JWT uses base64url: replace - with +, _ with /, then pad
        const b64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
        const padded = b64 + '='.repeat((4 - b64.length % 4) % 4);
        const payload = JSON.parse(atob(padded));
        if (payload.sub) {
          userId = payload.sub;
        } else {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const rateCheck = await checkRateLimit(userId, { maxRequests: 60, windowSeconds: 60, actionType: 'score' });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { resume } = await req.json();

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

    // ── Compute ALL 6 deterministic scores ───────────────────────────
    const contactCompleteness = scoreContactCompleteness(resume.contactInfo || {});
    const sectionStructure = scoreSectionStructure(resume);
    const parsability = scoreParsability(resume);
    const lengthDensity = scoreLengthDensity(resume);
    const keywordOptimization = scoreKeywordOptimization(resume);
    const contentQuality = scoreContentQuality(resume);

    const overallScore = Math.round(
      keywordOptimization * 0.35 +
      contentQuality * 0.25 +
      sectionStructure * 0.15 +
      parsability * 0.10 +
      contactCompleteness * 0.10 +
      lengthDensity * 0.05
    );

    const categories = {
      keywordOptimization,
      contentQuality,
      sectionStructure,
      parsability,
      contactCompleteness,
      lengthDensity,
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
        await recordUsage(userId, 'score');
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
