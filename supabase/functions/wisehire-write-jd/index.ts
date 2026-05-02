/**
 * wisehire-write-jd — AI Job Description Generator
 *
 * POST /functions/v1/wisehire-write-jd
 * Body: { input: string, role_id?: string }
 *
 * Rate limits:
 *   Starter plan : 10 JDs / day (fail-closed)
 *   Professional+: unlimited
 *
 * Returns: { jd: { title, summary, responsibilities[], requirements[], benefits[] } }
 */

import { requireAuth, AuthError, authErrorResponse } from '../_shared/authMiddleware.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/dbClient.ts';
import { callAI, toUserError } from '../_shared/aiClient.ts';
import { selectProviderForTool } from "../_shared/modelRouter.ts";
const __ROUTE = selectProviderForTool('wisehire-write-jd');
import { checkRateLimit } from '../_shared/rateLimiter.ts';

import { wrapHandler } from '../_shared/fnLogger.ts';
const WISEHIRE_PAID_PLANS = ['wisehire_starter', 'wisehire_professional', 'wisehire_business', 'wisehire_enterprise'];
const STARTER_JD_DAILY_LIMIT = 10;

function json(data: unknown, status = 200, cors: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(wrapHandler("wisehire-write-jd", async (req) => {
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

    // ── 2. Parse + validate body ─────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const { input, role_id } = body as { input?: string; role_id?: string };

    if (!input?.trim() || input.trim().length < 10) {
      return json({ error: 'input must be at least 10 characters' }, 400, cors);
    }

    // ── 3. Subscription plan check ────────────────────────────────
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

    // ── 4. Rate limit (Starter: 10/day; Pro+: unlimited) ─────────
    if (isStarter) {
      const rateResult = await checkRateLimit(userId, {
        actionType: 'wisehire_jd',
        maxRequests: STARTER_JD_DAILY_LIMIT,
        windowSeconds: 86_400,
        plan: 'free',
      });
      if (!rateResult.allowed) {
        return json({
          error: rateResult.dbError
            ? 'Rate limit check temporarily unavailable. Please try again in a moment.'
            : `Daily JD limit (${STARTER_JD_DAILY_LIMIT}) reached. Upgrade to Professional for unlimited JDs.`,
          retryAfterSeconds: rateResult.retryAfterSeconds,
        }, 429, cors);
      }
    }

    // ── 6. AI prompt ──────────────────────────────────────────────
    const systemPrompt = `You are an expert HR professional and recruitment specialist. 
Your task is to write comprehensive, engaging, and professional job descriptions that attract qualified candidates.
Always use inclusive, bias-free language.
Respond ONLY with valid JSON — no markdown, no code blocks, no prose.`;

    const userPrompt = `Write a complete, professional job description based on the following context:

"${input.trim()}"

Return a JSON object with exactly these fields:
{
  "title": "Job title (concise, professional)",
  "summary": "2-3 sentence role overview (compelling, clear purpose)",
  "responsibilities": ["bullet 1", "bullet 2", ...],  // 5-7 key responsibilities
  "requirements": ["bullet 1", "bullet 2", ...],       // 4-6 must-have requirements
  "benefits": ["bullet 1", "bullet 2", ...]            // 3-5 benefits/perks
}`;

    const aiResponse = await callAI({
      model: __ROUTE.model,
      wiseresumeSubProvider: __ROUTE.provider,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.6,
      maxTokens: 1200,
      userId,
      timeout: 25_000,
    });

    // ── 7. Parse AI response ──────────────────────────────────────
    const rawContent = aiResponse.content?.trim() ?? '';
    let jd: { title: string; summary: string; responsibilities: string[]; requirements: string[]; benefits: string[] };

    try {
      // Strip potential markdown code fences
      const cleaned = rawContent.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
      jd = JSON.parse(cleaned);
    } catch {
      console.error('[wisehire-write-jd] Failed to parse AI JSON:', rawContent.slice(0, 200));
      return json({ error: 'AI returned an invalid response. Please try again.' }, 502, cors);
    }

    // Validate required fields
    if (!jd.title || !jd.summary || !Array.isArray(jd.responsibilities)) {
      return json({ error: 'AI response was incomplete. Please try again.' }, 502, cors);
    }

    // ── 8. Save JD to role if role_id provided ────────────────────
    if (role_id) {
      const jdText = [
        `# ${jd.title}`,
        '',
        jd.summary,
        '',
        '## Responsibilities',
        ...jd.responsibilities.map((r: string) => `- ${r}`),
        '',
        '## Requirements',
        ...jd.requirements.map((r: string) => `- ${r}`),
        '',
        '## Benefits',
        ...(jd.benefits ?? []).map((b: string) => `- ${b}`),
      ].join('\n');

      const { error: updateErr } = await db
        .from('wisehire_roles')
        .update({ jd_text: jdText })
        .eq('id', role_id)
        .eq('owner_id', userId);

      if (updateErr) {
        console.warn('[wisehire-write-jd] Failed to update role jd_text:', updateErr.message);
      }
    }

    return json({ jd }, 200, cors);
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin);
    console.error('[wisehire-write-jd] Unhandled error:', err);
    const { status, error: code, message } = toUserError(err);
    return json({ error: code, message }, status, getCorsHeaders(origin));
  }
}));
