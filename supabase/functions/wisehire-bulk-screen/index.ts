/**
 * wisehire-bulk-screen — AI Bulk Resume Screening
 *
 * POST /functions/v1/wisehire-bulk-screen
 * Body: multipart/form-data
 *   files: File[] (PDF, max 10)
 *   jd_text: string (required, 20–8000 chars)
 *   role_id?: string (optional)
 *
 * Rate limits:
 *   Starter plan     : 3 batches / day (BYOK required)
 *   Professional plan: 20 batches / day
 *   Business+        : unlimited
 *
 * Returns: { jobId, results: ScreenResult[] }
 */

import { requireAuth, AuthError, authErrorResponse } from '../_shared/authMiddleware.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/dbClient.ts';
import { callAI, getUserKeyFromDB } from '../_shared/aiClient.ts';
import { checkRateLimit } from '../_shared/rateLimiter.ts';

const WISEHIRE_PAID_PLANS = ['wisehire_starter', 'wisehire_professional', 'wisehire_business', 'wisehire_enterprise'];
const STARTER_DAILY_LIMIT = 3;
const PRO_DAILY_LIMIT = 20;
const MAX_FILES = 10;
const MAX_JD_CHARS = 8_000;
const MAX_RESUME_CHARS = 3_000;

function json(data: unknown, status = 200, cors: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

/** Strip PDF binary noise — extract printable ASCII text */
function extractTextFromPdfBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let text = '';
  for (let i = 0; i < bytes.length; i++) {
    const c = bytes[i];
    if ((c >= 32 && c <= 126) || c === 10 || c === 13) {
      text += String.fromCharCode(c);
    }
  }
  // Collapse whitespace, keep newlines for structure
  return text
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_RESUME_CHARS);
}

/** Derive a display name from filename */
function nameFromFilename(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '')          // strip extension
    .replace(/[_\-]/g, ' ')           // underscores → spaces
    .replace(/\s+/g, ' ')
    .trim()
    || 'Unknown Applicant';
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const cors = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    const { userId } = await requireAuth(req);
    const db = getServiceClient();

    // ── 1. HR account type guard ──────────────────────────────────
    const { data: profile } = await db
      .from('profiles')
      .select('account_type')
      .eq('user_id', userId)
      .maybeSingle();

    if (profile?.account_type !== 'hr') {
      return json({ error: 'Forbidden — WiseHire HR account required' }, 403, cors);
    }

    // ── 2. Parse multipart form ───────────────────────────────────
    const contentType = req.headers.get('content-type') ?? '';
    if (!contentType.includes('multipart/form-data')) {
      return json({ error: 'Request must be multipart/form-data' }, 400, cors);
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return json({ error: 'Failed to parse form data' }, 400, cors);
    }

    const jdText = (formData.get('jd_text') as string | null)?.trim() ?? '';
    const roleId = (formData.get('role_id') as string | null)?.trim() || null;
    const files = formData.getAll('files') as File[];

    if (!jdText || jdText.length < 20) {
      return json({ error: 'jd_text must be at least 20 characters' }, 400, cors);
    }
    if (jdText.length > MAX_JD_CHARS) {
      return json({ error: `jd_text must be ≤ ${MAX_JD_CHARS} characters` }, 400, cors);
    }
    if (!files.length) {
      return json({ error: 'At least one PDF file is required' }, 400, cors);
    }
    if (files.length > MAX_FILES) {
      return json({ error: `Maximum ${MAX_FILES} files per batch` }, 400, cors);
    }

    // ── 3. Subscription plan check ────────────────────────────────
    const { data: sub } = await db
      .from('subscriptions')
      .select('plan_id, status, trial_ends_at')
      .eq('user_id', userId)
      .in('plan_id', WISEHIRE_PAID_PLANS)
      .maybeSingle();

    const isActiveSub = sub && (
      sub.status === 'active' ||
      (sub.status === 'trialing' && sub.trial_ends_at && new Date(sub.trial_ends_at) > new Date())
    );
    if (!isActiveSub) {
      return json({ error: 'Active WiseHire plan required' }, 403, cors);
    }

    const isStarter = sub.plan_id === 'wisehire_starter';
    const isPro = sub.plan_id === 'wisehire_professional';

    // ── 4. BYOK check for Starter ─────────────────────────────────
    if (isStarter) {
      const openaiKey = await getUserKeyFromDB(userId, 'openai');
      const anthropicKey = await getUserKeyFromDB(userId, 'anthropic');
      if (!openaiKey && !anthropicKey) {
        return json({ requiresApiKey: true, error: 'Starter plan requires your own OpenAI or Anthropic API key' }, 402, cors);
      }
    }

    // ── 5. Rate limit ─────────────────────────────────────────────
    if (!isStarter && !isPro) {
      // Business+ — unlimited, skip
    } else {
      const dailyLimit = isStarter ? STARTER_DAILY_LIMIT : PRO_DAILY_LIMIT;
      const rateLimitResult = await checkRateLimit(userId, {
        actionType: 'wisehire_bulk_screen',
        maxRequests: dailyLimit,
        windowSeconds: 86_400,
      });
      if (!rateLimitResult.allowed) {
        return json({
          error: `Daily bulk screening limit reached (${dailyLimit}/day). Resets at midnight UTC.`,
          rateLimited: true,
        }, 429, cors);
      }
    }

    // ── 6. Extract text from each PDF ────────────────────────────
    const resumeTexts: { name: string; text: string }[] = await Promise.all(
      files.map(async (file) => {
        const buffer = await file.arrayBuffer();
        const text = extractTextFromPdfBuffer(buffer);
        return { name: nameFromFilename(file.name), text };
      })
    );

    // ── 7. Score each resume in parallel ─────────────────────────
    const jdSnippet = jdText.slice(0, 2_000);

    const scoringResults = await Promise.all(
      resumeTexts.map(async ({ name, text }, index) => {
        if (!text.trim()) {
          return {
            rank: index + 1,
            filename_name: name,
            match_score: 0,
            strengths: [],
            concerns: ['Could not extract readable text from this PDF'],
            summary: 'Unable to parse resume content.',
          };
        }

        const prompt = `You are an expert HR screening assistant. Evaluate this resume against the job description and return ONLY valid JSON.

Job Description:
${jdSnippet}

Resume:
${text}

Return exactly this JSON structure:
{
  "match_score": <integer 0-100>,
  "strengths": [<exactly 3 short strings, each under 80 chars>],
  "concerns": [<exactly 2 short strings, each under 80 chars>],
  "summary": <one sentence under 120 chars>
}`;

        try {
          const aiResponse = await callAI({
            userId,
            model: 'openai/gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            maxTokens: 400,
          });

          const raw = aiResponse.content ?? '';
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error('No JSON in response');

          const parsed = JSON.parse(jsonMatch[0]);
          return {
            filename_name: name,
            match_score: Math.min(100, Math.max(0, parseInt(parsed.match_score) || 0)),
            strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 3) : [],
            concerns: Array.isArray(parsed.concerns) ? parsed.concerns.slice(0, 2) : [],
            summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 150) : '',
          };
        } catch {
          return {
            filename_name: name,
            match_score: 0,
            strengths: [],
            concerns: ['AI scoring failed for this resume'],
            summary: 'Could not generate evaluation.',
          };
        }
      })
    );

    // ── 8. Sort by score descending, add rank ────────────────────
    const sorted = scoringResults
      .sort((a, b) => b.match_score - a.match_score)
      .map((r, i) => ({ ...r, rank: i + 1 }));

    // ── 9. Persist job record ─────────────────────────────────────
    const { data: jobRow, error: jobErr } = await db
      .from('wisehire_bulk_screen_jobs')
      .insert({
        owner_id: userId,
        role_id: roleId,
        status: 'done',
        results: sorted,
        resume_count: files.length,
      })
      .select('id')
      .single();

    if (jobErr) {
      console.error('Failed to persist bulk screen job:', jobErr);
    }

    return json({ jobId: jobRow?.id ?? null, results: sorted }, 200, cors);

  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin);
    console.error('wisehire-bulk-screen error:', err);
    return json({ error: 'Internal server error' }, 500, getCorsHeaders(origin));
  }
});
