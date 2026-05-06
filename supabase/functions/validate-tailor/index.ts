import { requireAuth, authErrorResponse } from "../_shared/authMiddleware.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callAIWithRetry, parseAIJSONWithRetry } from "../_shared/aiClient.ts";
import { logger } from "../_shared/logger.ts";
import { wrapHandler } from "../_shared/fnLogger.ts";
import { resumeToText, computeDeterministicScores } from "../_shared/keywordScoring.ts";

const log = logger('validate-tailor');

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(wrapHandler('validate-tailor', async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const _fnStart = Date.now();

  let userId: string;
  try {
    const auth = await requireAuth(req);
    userId = auth.userId;
  } catch (authErr) {
    return authErrorResponse(authErr, req.headers.get('origin'));
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const { originalResume, jobDescription, finalResume, mustHaveKeywords } = body;

  if (!originalResume || typeof originalResume !== 'object' || Array.isArray(originalResume)) {
    return new Response(
      JSON.stringify({ error: 'originalResume is required and must be an object' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
  if (!finalResume || typeof finalResume !== 'object' || Array.isArray(finalResume)) {
    return new Response(
      JSON.stringify({ error: 'finalResume is required and must be an object' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
  if (typeof jobDescription !== 'string') {
    return new Response(
      JSON.stringify({ error: 'jobDescription is required and must be a string' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const keywords: string[] = Array.isArray(mustHaveKeywords)
    ? (mustHaveKeywords as unknown[]).filter((k): k is string => typeof k === 'string' && k.trim().length > 0)
    : [];

  // ── Phase 1: Deterministic keyword scoring (no AI, no credits) ───────────
  const finalText = resumeToText(finalResume as Record<string, unknown>);
  const deterministic = computeDeterministicScores(keywords, finalText);

  log.info('Phase 1 complete', {
    function_name: 'validate-tailor',
    score: deterministic.score,
    matched: deterministic.matched_keywords.length,
    missing: deterministic.missing_keywords.length,
    total_keywords: keywords.length,
  });

  // ── Phase 2: AI qualitative evaluation ───────────────────────────────────
  // AI returns issues, strengths, verdict ONLY.
  // Score and keyword lists come exclusively from Phase 1.
  // No credit deduction — validation is bundled with the Apply step.
  let issues: string[] = [];
  let strengths: string[] = [];
  let verdict: 'weak' | 'average' | 'strong' | null = null;

  try {
    const originalSkills: string[] = Array.isArray((originalResume as Record<string, unknown>).skills)
      ? ((originalResume as Record<string, unknown>).skills as unknown[])
          .filter((s): s is string => typeof s === 'string')
      : [];
    const finalSkills: string[] = Array.isArray((finalResume as Record<string, unknown>).skills)
      ? ((finalResume as Record<string, unknown>).skills as unknown[])
          .filter((s): s is string => typeof s === 'string')
      : [];

    const summarySnippet = typeof (finalResume as Record<string, unknown>).summary === 'string'
      ? ((finalResume as Record<string, unknown>).summary as string).slice(0, 500)
      : '';

    const expSnippet = Array.isArray((finalResume as Record<string, unknown>).experience)
      ? ((finalResume as Record<string, unknown>).experience as Record<string, unknown>[])
          .slice(0, 2)
          .map(e => {
            const bullets = Array.isArray(e.achievements)
              ? (e.achievements as string[]).slice(0, 3).join(' | ')
              : '';
            return `${e.position ?? ''} at ${e.company ?? ''}: ${bullets}`;
          })
          .join('\n')
      : '';

    const systemPrompt = `You are a resume quality evaluator. Your role is strictly to evaluate — not to rewrite or suggest rewrites.

Evaluation rules:
- Flag as an issue any skill in finalSkills that is absent from both originalSkills AND the job description (hallucinated skill).
- Flag as an issue any achievement bullet that uses generic phrases: "responsible for", "worked on", "helped with", "assisted in", "participated in".
- A strength must be specific and concrete — not a general quality like "good communication".
- Set verdict based on the deterministic score: score >= 75 → strong, score >= 50 → average, score < 50 → weak.

Return ONLY valid JSON. No markdown. No explanation outside the JSON.`;

    const userPrompt = `DETERMINISTIC SCORE: ${deterministic.score}%
MATCHED KEYWORDS: ${deterministic.matched_keywords.join(', ') || 'none'}
MISSING KEYWORDS: ${deterministic.missing_keywords.join(', ') || 'none'}

ORIGINAL SKILLS: ${originalSkills.join(', ') || 'none'}
FINAL SKILLS: ${finalSkills.join(', ') || 'none'}

FINAL SUMMARY:
${summarySnippet}

FINAL EXPERIENCE (first 2 entries):
${expSnippet}

JOB DESCRIPTION (excerpt):
${jobDescription.slice(0, 2000)}

Return this exact JSON:
{
  "issues": ["<specific issue — max 5>"],
  "strengths": ["<specific concrete strength — max 3>"],
  "verdict": "<weak|average|strong>"
}`;

    const aiResponse = await callAIWithRetry({
      featureName: 'tailor-resume',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      maxTokens: 600,
      userId,
    });

    if (aiResponse.content) {
      const parsed = await parseAIJSONWithRetry<Record<string, unknown>>(aiResponse.content, {
        userId,
      });
      if (parsed) {
        issues = Array.isArray(parsed.issues)
          ? (parsed.issues as unknown[]).filter((i): i is string => typeof i === 'string').slice(0, 5)
          : [];
        strengths = Array.isArray(parsed.strengths)
          ? (parsed.strengths as unknown[]).filter((s): s is string => typeof s === 'string').slice(0, 3)
          : [];
        const rawVerdict = parsed.verdict;
        if (rawVerdict === 'weak' || rawVerdict === 'average' || rawVerdict === 'strong') {
          verdict = rawVerdict;
        }
      }
    }
  } catch (aiErr) {
    // Phase 2 failure is non-fatal — return Phase 1 deterministic results with verdict: null
    log.info('Phase 2 AI evaluation failed (non-fatal), returning deterministic results only', {
      error: aiErr instanceof Error ? aiErr.message : String(aiErr),
    });
  }

  log.info('request completed', {
    function_name: 'validate-tailor',
    score: deterministic.score,
    matched: deterministic.matched_keywords.length,
    missing: deterministic.missing_keywords.length,
    verdict,
    duration_ms: Date.now() - _fnStart,
  });

  return new Response(
    JSON.stringify({
      score: deterministic.score,
      matched_keywords: deterministic.matched_keywords,
      missing_keywords: deterministic.missing_keywords,
      issues,
      strengths,
      verdict,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}));
