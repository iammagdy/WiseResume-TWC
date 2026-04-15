/**
 * wisehire-generate-brief — AI Candidate Brief Generator
 *
 * POST /functions/v1/wisehire-generate-brief
 * Body: { candidate_id: string, jd_text: string }
 *
 * Rate limits:
 *   Starter plan     : 5 briefs / day, 30 / month (fail-closed)
 *   Professional plan: 50 briefs / day
 *   Business+        : unlimited
 *
 * Returns: { brief: { id, match_score, strengths[], concerns[], interview_questions[], employment_notes } }
 */

import { requireAuth, AuthError, authErrorResponse } from '../_shared/authMiddleware.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/dbClient.ts';
import { callAI, getUserKeyFromDB } from '../_shared/aiClient.ts';
import { checkRateLimit } from '../_shared/rateLimiter.ts';

const WISEHIRE_PAID_PLANS = ['wisehire_starter', 'wisehire_professional', 'wisehire_business', 'wisehire_enterprise'];
const STARTER_DAILY_LIMIT = 5;
const STARTER_MONTHLY_LIMIT = 30;
const PRO_DAILY_LIMIT = 50;

function json(data: unknown, status = 200, cors: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const cors = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    const { userId } = await requireAuth(req);
    const db = getServiceClient();

    // ── 1. HR account type guard ────────────────────────────────
    const { data: profile } = await db
      .from('profiles')
      .select('account_type')
      .eq('user_id', userId)
      .maybeSingle();

    if (profile?.account_type !== 'hr') {
      return json({ error: 'Forbidden — WiseHire HR account required' }, 403, cors);
    }

    // Resolve profiles.id (PK) for FK joins (wisehire_* tables FK to profiles.id, not user_id)
    const { data: profileRow } = await db
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();
    const profileId = profileRow?.id ?? userId;

    // ── 2. Parse + validate body ─────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const { candidate_id, jd_text } = body as { candidate_id?: string; jd_text?: string };

    if (!candidate_id?.trim()) {
      return json({ error: 'candidate_id is required' }, 400, cors);
    }
    if (!jd_text?.trim() || jd_text.trim().length < 20) {
      return json({ error: 'jd_text must be at least 20 characters' }, 400, cors);
    }

    // ── 3. Fetch candidate (RLS bypass via service client) ────────
    const { data: candidate, error: candidateErr } = await db
      .from('wisehire_candidates')
      .select('id, owner_id, name, resume_text, role_id')
      .eq('id', candidate_id)
      .eq('owner_id', profileId)
      .maybeSingle();

    if (candidateErr || !candidate) {
      return json({ error: 'Candidate not found or access denied' }, 404, cors);
    }
    if (!candidate.resume_text?.trim()) {
      return json({ error: 'Candidate has no parsed resume text. Please upload and parse the resume first.' }, 400, cors);
    }

    // ── 4. Subscription plan check ────────────────────────────────
    const { data: sub } = await db
      .from('subscriptions')
      .select('plan_name, status, trial_plan, trial_expires_at')
      .eq('user_id', userId)
      .maybeSingle();

    const now = new Date();
    const isTrialActive = !!(
      sub?.trial_plan &&
      sub?.trial_expires_at &&
      new Date(sub.trial_expires_at) > now
    );
    const effectivePlan = isTrialActive ? sub!.trial_plan! : (sub?.plan_name ?? 'free');
    const isOnPaidWiseHire = WISEHIRE_PAID_PLANS.includes(effectivePlan);

    if (!isOnPaidWiseHire) {
      return json({ error: 'Active WiseHire plan required' }, 402, cors);
    }

    const isStarter = effectivePlan === 'wisehire_starter';
    const isPro = effectivePlan === 'wisehire_professional';
    const isUnlimited = ['wisehire_business', 'wisehire_enterprise'].includes(effectivePlan);

    // ── 5. BYOK check for Starter plan ───────────────────────────
    if (isStarter) {
      const openaiKey = await getUserKeyFromDB(userId, 'openai');
      const anthropicKey = await getUserKeyFromDB(userId, 'anthropic');
      if (!openaiKey && !anthropicKey) {
        return json({ requiresApiKey: true, error: 'Add an OpenAI or Anthropic API key in Settings to generate briefs on the Starter plan.' }, 402, cors);
      }
    }

    // ── 6. Rate limits ────────────────────────────────────────────
    if (isStarter) {
      const [dailyResult, monthlyResult] = await Promise.all([
        checkRateLimit(userId, { actionType: 'wisehire_brief', maxRequests: STARTER_DAILY_LIMIT, windowSeconds: 86_400, plan: 'free' }),
        checkRateLimit(userId, { actionType: 'wisehire_brief_monthly', maxRequests: STARTER_MONTHLY_LIMIT, windowSeconds: 30 * 86_400, plan: 'free' }),
      ]);
      if (!dailyResult.allowed) {
        return json({
          error: dailyResult.dbError
            ? 'Rate limit check temporarily unavailable.'
            : `Daily brief limit (${STARTER_DAILY_LIMIT}) reached. Upgrade to Professional for more.`,
          retryAfterSeconds: dailyResult.retryAfterSeconds,
        }, 429, cors);
      }
      if (!monthlyResult.allowed) {
        return json({ error: `Monthly brief limit (${STARTER_MONTHLY_LIMIT}) reached. Upgrade to Professional for more.` }, 429, cors);
      }
    } else if (isPro) {
      const dailyResult = await checkRateLimit(userId, { actionType: 'wisehire_brief', maxRequests: PRO_DAILY_LIMIT, windowSeconds: 86_400, plan: 'pro' });
      if (!dailyResult.allowed) {
        return json({ error: `Daily brief limit (${PRO_DAILY_LIMIT}) reached.` }, 429, cors);
      }
    }
    // isUnlimited → no rate limit check

    // ── 7. AI prompt ──────────────────────────────────────────────
    const systemPrompt = `You are a senior hiring manager and talent acquisition specialist with 15+ years of experience.
Your task is to analyse a candidate's resume against a job description and produce a structured, objective evaluation.
Use concise, professional language. Focus on evidence from the resume.
Respond ONLY with valid JSON — no markdown, no code blocks, no prose outside the JSON.`;

    const userPrompt = `Evaluate this candidate against the job description and return a JSON candidate brief.

JOB DESCRIPTION:
${jd_text.trim().slice(0, 3000)}

CANDIDATE RESUME:
${candidate.resume_text.trim().slice(0, 4000)}

Return EXACTLY this JSON structure:
{
  "match_score": <integer 0-100>,
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "concerns": ["concern 1", "concern 2", "concern 3"],
  "interview_questions": [
    "question 1", "question 2", "question 3", "question 4",
    "question 5", "question 6", "question 7", "question 8"
  ],
  "employment_notes": "2-3 sentence overall assessment and recommendation"
}`;

    const aiResponse = await callAI({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      maxTokens: 1500,
      userId,
      timeout: 30_000,
    });

    // ── 8. Parse AI response ──────────────────────────────────────
    const rawContent = aiResponse.content?.trim() ?? '';
    let parsed: {
      match_score: number;
      strengths: string[];
      concerns: string[];
      interview_questions: string[];
      employment_notes: string;
    };

    try {
      const cleaned = rawContent.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('[wisehire-generate-brief] Failed to parse AI JSON:', rawContent.slice(0, 200));
      return json({ error: 'AI returned an invalid response. Please try again.' }, 502, cors);
    }

    // Validate required fields
    if (
      typeof parsed.match_score !== 'number' ||
      !Array.isArray(parsed.strengths) ||
      !Array.isArray(parsed.concerns) ||
      !Array.isArray(parsed.interview_questions) ||
      typeof parsed.employment_notes !== 'string'
    ) {
      return json({ error: 'AI response was incomplete. Please try again.' }, 502, cors);
    }

    // Clamp score
    const matchScore = Math.min(100, Math.max(0, Math.round(parsed.match_score)));

    // ── 9. Insert brief into DB ───────────────────────────────────
    const shareToken = crypto.randomUUID();
    const { data: brief, error: insertErr } = await db
      .from('wisehire_candidate_briefs')
      .insert({
        owner_id: profileId,
        candidate_id: candidate.id,
        role_id: candidate.role_id ?? null,
        match_score: matchScore,
        strengths: parsed.strengths.slice(0, 5),
        concerns: parsed.concerns.slice(0, 5),
        interview_questions: parsed.interview_questions.slice(0, 10),
        employment_notes: parsed.employment_notes,
        ai_model_used: aiResponse.providerUsed ?? 'unknown',
        is_byok: isStarter,
        share_token: shareToken,
        share_token_active: true,
      })
      .select('id, match_score, strengths, concerns, interview_questions, employment_notes, created_at, share_token')
      .single();

    if (insertErr || !brief) {
      console.error('[wisehire-generate-brief] Insert failed:', insertErr?.message);
      return json({ error: 'Failed to save brief. Please try again.' }, 500, cors);
    }

    return json({ brief: { ...brief, candidate_name: candidate.name } }, 200, cors);
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin);
    console.error('[wisehire-generate-brief] Unhandled error:', err);
    return json({ error: 'Internal server error' }, 500, getCorsHeaders(origin));
  }
});
