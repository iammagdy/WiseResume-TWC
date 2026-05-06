import { requireAuth, authErrorResponse } from "../_shared/authMiddleware.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callAIWithRetry, parseAIJSONWithRetry } from "../_shared/aiClient.ts";
import { logger } from "../_shared/logger.ts";
import { wrapHandler } from "../_shared/fnLogger.ts";

const log = logger('validate-tailor');

// ── Deterministic keyword utilities ─────────────────────────────────────────
// Replicated verbatim from tailor-resume/index.ts so both functions use the
// exact same algorithm. Do NOT delegate keyword scoring to AI.

function stem(word: string): string {
  const w = word.toLowerCase().trim();
  let s = w.replace(/'s$/, '');
  const suffixes = ['ations', 'ation', 'ments', 'ment', 'ities', 'ity', 'ness',
    'ings', 'ing', 'tion', 'ions', 'ion', 'ers', 'er', 'ies', 'es', 's', 'ed', 'ly'];
  for (const suffix of suffixes) {
    if (s.length > suffix.length + 3 && s.endsWith(suffix)) {
      s = s.slice(0, s.length - suffix.length);
      break;
    }
  }
  return s;
}

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 0);
}

function countKeywordInTokens(keyword: string, textTokens: string[]): number {
  const kwTokens = tokenize(keyword);
  if (kwTokens.length === 0) return 0;
  if (kwTokens.length === 1) {
    const stemmedKw = stem(kwTokens[0]);
    return textTokens.filter(t => stem(t) === stemmedKw).length;
  }
  const stemmedKwTokens = kwTokens.map(stem);
  let count = 0;
  for (let i = 0; i <= textTokens.length - stemmedKwTokens.length; i++) {
    let match = true;
    for (let j = 0; j < stemmedKwTokens.length; j++) {
      if (stem(textTokens[i + j]) !== stemmedKwTokens[j]) { match = false; break; }
    }
    if (match) count++;
  }
  return count;
}

function resumeToText(resume: Record<string, unknown>): string {
  const parts: string[] = [];
  if (typeof resume.summary === 'string') parts.push(resume.summary);
  if (Array.isArray(resume.skills)) {
    parts.push(
      (resume.skills as unknown[])
        .map((s) => (typeof s === 'string' ? s : (s as Record<string, string>)?.name || ''))
        .join(' '),
    );
  }
  if (Array.isArray(resume.experience)) {
    for (const exp of resume.experience as Record<string, unknown>[]) {
      if (typeof exp.description === 'string') parts.push(exp.description);
      if (typeof exp.position === 'string') parts.push(exp.position);
      if (Array.isArray(exp.achievements)) parts.push((exp.achievements as string[]).join(' '));
    }
  }
  if (Array.isArray(resume.education)) {
    for (const edu of resume.education as Record<string, unknown>[]) {
      const eduParts = [edu.degree, edu.field, edu.institution].filter(Boolean) as string[];
      if (eduParts.length > 0) parts.push(eduParts.join(' '));
    }
  }
  if (Array.isArray(resume.projects)) {
    for (const proj of resume.projects as Record<string, unknown>[]) {
      if (typeof proj.description === 'string') parts.push(proj.description);
      if (Array.isArray(proj.technologies)) parts.push((proj.technologies as string[]).join(' '));
    }
  }
  if (Array.isArray(resume.certifications)) {
    for (const cert of resume.certifications as Record<string, unknown>[]) {
      if (typeof cert.name === 'string') parts.push(cert.name);
    }
  }
  return parts.join(' ');
}

function computeDeterministicScores(
  keywords: string[],
  finalResumeText: string,
): { score: number; matched_keywords: string[]; missing_keywords: string[] } {
  if (!keywords.length) return { score: 0, matched_keywords: [], missing_keywords: [] };

  const finalTokens = tokenize(finalResumeText);
  const matched_keywords: string[] = [];
  const missing_keywords: string[] = [];

  for (const keyword of keywords) {
    if (!keyword.trim()) continue;
    if (countKeywordInTokens(keyword, finalTokens) > 0) {
      matched_keywords.push(keyword);
    } else {
      missing_keywords.push(keyword);
    }
  }

  const total = keywords.filter(k => k.trim()).length;
  const score = total > 0 ? Math.round((matched_keywords.length / total) * 100) : 0;
  return { score, matched_keywords, missing_keywords };
}

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
