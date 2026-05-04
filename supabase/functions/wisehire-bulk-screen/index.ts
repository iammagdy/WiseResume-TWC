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
 *   Starter plan     : 3 batches / day
 *   Professional plan: 20 batches / day
 *   Business+        : unlimited
 *
 * Returns: { jobId, results: ScreenResult[] }
 */

import { requireAuth, AuthError, authErrorResponse } from '../_shared/authMiddleware.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/dbClient.ts';
import { callAI, toUserError } from '../_shared/aiClient.ts';
import { selectProviderForTool } from "../_shared/modelRouter.ts";
const __ROUTE = selectProviderForTool('wisehire-bulk-screen');
import { checkRateLimit } from '../_shared/rateLimiter.ts';

import { wrapHandler } from '../_shared/fnLogger.ts';
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

/** Extract text using pdfjs-dist (handles compressed streams, Unicode, multi-column) */
async function extractWithPdfJs(buffer: ArrayBuffer): Promise<string> {
  // @ts-ignore — npm specifier resolved at runtime by Deno
  const pdfjsLib = await import('npm:pdfjs-dist/build/pdf.min.mjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '';
  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
  }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ');
    pages.push(pageText);
  }
  return pages.join('\n\n').slice(0, MAX_RESUME_CHARS);
}

/** ASCII byte-strip fallback for cold-start import failures */
function extractTextFallback(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let text = '';
  for (let i = 0; i < bytes.length; i++) {
    const c = bytes[i];
    if ((c >= 32 && c <= 126) || c === 10 || c === 13) {
      text += String.fromCharCode(c);
    }
  }
  return text
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_RESUME_CHARS);
}

/** Extract text from a PDF buffer — pdfjs-dist with ASCII fallback */
async function extractTextFromPdfBuffer(buffer: ArrayBuffer): Promise<string> {
  try {
    return await extractWithPdfJs(buffer);
  } catch {
    return extractTextFallback(buffer);
  }
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

Deno.serve(wrapHandler("wisehire-bulk-screen", async (req) => {
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
      .select('plan_name, status, trial_plan, trial_expires_at')
      .eq('user_id', userId)
      .maybeSingle();

    // Resolve effective plan (honour active trial)
    const isTrialActive = sub?.trial_plan && sub?.trial_expires_at &&
      new Date(sub.trial_expires_at) > new Date();
    const effectivePlan: string = isTrialActive ? sub!.trial_plan! : (sub?.plan_name ?? 'free');

    const isActiveSub = WISEHIRE_PAID_PLANS.includes(effectivePlan);
    if (!isActiveSub) {
      return json({ error: 'Active WiseHire plan required' }, 403, cors);
    }

    const isStarter = effectivePlan === 'wisehire_starter';
    const isPro = effectivePlan === 'wisehire_professional';

    // ── 4. Rate limit ─────────────────────────────────────────────
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
        const text = await extractTextFromPdfBuffer(buffer);
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
            model: __ROUTE.model,
            wiseresumeSubProvider: __ROUTE.provider,
            userId,
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
    // Resolve profiles.id (PK) for FK joins (wisehire_* tables FK to profiles.id)
    const { data: profileRow } = await db
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();
    const profileId = profileRow?.id ?? userId;

    const { data: jobRow, error: jobErr } = await db
      .from('wisehire_bulk_screen_jobs')
      .insert({
        owner_id: profileId,
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
    const { status, error: code, message } = toUserError(err);
    return json({ error: code, message }, status, getCorsHeaders(origin));
  }
}));
