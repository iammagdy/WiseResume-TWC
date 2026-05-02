/**
 * wisehire-mask-cvs — AI CV Anonymisation
 *
 * POST /functions/v1/wisehire-mask-cvs
 * Body: multipart/form-data
 *   files: File[] (PDF, max 10)
 *
 * Rate limits:
 *   Starter plan     : 3 batches / day
 *   Professional plan: 20 batches / day
 *   Business+        : unlimited
 *
 * Returns: { results: MaskResult[] }
 */

import { requireAuth, AuthError, authErrorResponse } from '../_shared/authMiddleware.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/dbClient.ts';
import { callAI, toUserError } from '../_shared/aiClient.ts';
import { selectProviderForTool } from "../_shared/modelRouter.ts";
import { wrapHandler } from '../_shared/fnLogger.ts';
const __ROUTE = selectProviderForTool('wisehire-mask-cvs');

const WISEHIRE_PAID_PLANS = ['wisehire_starter', 'wisehire_professional', 'wisehire_business', 'wisehire_enterprise'];
const STARTER_DAILY_LIMIT = 3;
const PRO_DAILY_LIMIT = 20;
const MAX_FILES = 10;
const MAX_RESUME_CHARS = 4_000;

const CANDIDATE_LABELS = ['A','B','C','D','E','F','G','H','I','J'];

export interface MaskResult {
  label: string;
  filename: string;
  maskedText: string;
  redactedFields: string[];
}

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
  return text
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_RESUME_CHARS);
}

/** Check and record daily rate limit using ai_usage_logs */
async function checkDailyLimit(
  userId: string,
  action: string,
  dailyLimit: number,
  db: ReturnType<typeof getServiceClient>,
): Promise<{ allowed: boolean }> {
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);

  const { count, error } = await db
    .from('ai_usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action_type', action)
    .gte('created_at', dayStart.toISOString());

  if (error) {
    console.error('Rate limit check error:', error);
    return { allowed: false };
  }

  if ((count ?? 0) >= dailyLimit) {
    return { allowed: false };
  }

  await db.from('ai_usage_logs').insert({ user_id: userId, action_type: action });
  return { allowed: true };
}

Deno.serve(wrapHandler("wisehire-mask-cvs", async (req) => {
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

    const files = formData.getAll('files') as File[];

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

    const now = new Date();
    const isTrialActive = !!(
      sub?.trial_plan &&
      sub?.trial_expires_at &&
      WISEHIRE_PAID_PLANS.includes(sub.trial_plan) &&
      new Date(sub.trial_expires_at) > now
    );
    const isPaidActive = !!(
      sub?.plan_name &&
      WISEHIRE_PAID_PLANS.includes(sub.plan_name) &&
      sub.status === 'active'
    );
    const isActiveSub = isTrialActive || isPaidActive;

    if (!isActiveSub) {
      return json({ error: 'Active WiseHire plan required' }, 403, cors);
    }

    const effectivePlan = isPaidActive ? sub!.plan_name : sub!.trial_plan;
    const isStarter = effectivePlan === 'wisehire_starter';
    const isPro = effectivePlan === 'wisehire_professional';

    // ── 4. Rate limit ─────────────────────────────────────────────
    if (isStarter || isPro) {
      const dailyLimit = isStarter ? STARTER_DAILY_LIMIT : PRO_DAILY_LIMIT;
      const rateLimitResult = await checkDailyLimit(userId, 'wisehire_mask_cvs', dailyLimit, db);
      if (!rateLimitResult.allowed) {
        return json({
          error: `Daily CV masking limit reached (${dailyLimit}/day). Resets at midnight UTC.`,
          rateLimited: true,
        }, 429, cors);
      }
    }

    // ── 6. Extract text and mask each PDF ─────────────────────────
    const results: MaskResult[] = await Promise.all(
      files.map(async (file, index) => {
        const label = `Candidate ${CANDIDATE_LABELS[index] ?? String(index + 1)}`;
        const buffer = await file.arrayBuffer();
        const rawText = extractTextFromPdfBuffer(buffer);

        if (!rawText.trim()) {
          return {
            label,
            filename: file.name,
            maskedText: '[Could not extract readable text from this PDF]',
            redactedFields: [],
          };
        }

        const prompt = `You are a CV anonymisation expert. Your job is to replace all personally identifiable information (PII) in the CV text below with redaction placeholders. 

Replace the following PII types with the exact placeholders shown:
- Full name, first name, last name → [NAME]
- Email address → [EMAIL]
- Phone number, mobile number → [PHONE]
- Physical address, street, city, postcode, country of residence → [ADDRESS]
- Date of birth, age → [DATE OF BIRTH]
- Nationality, citizenship, right to work status → [NATIONALITY]
- Gender, pronouns, title (Mr/Mrs/Ms/Miss) → [GENDER]
- LinkedIn URL, personal website, GitHub profile → [PROFILE LINK]
- Photo references → [PHOTO]

Return a JSON object with exactly this structure:
{
  "maskedText": "<the full CV text with all PII replaced by placeholders>",
  "redactedFields": ["NAME", "EMAIL", ...] (list only the field types that were actually found and redacted)
}

CV Text:
${rawText}`;

        try {
          const aiResponse = await callAI({
            model: __ROUTE.model,
            wiseresumeSubProvider: __ROUTE.provider,
            userId,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            maxTokens: 2000,
          });

          const raw = aiResponse.content ?? '';
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error('No JSON in response');

          const parsed = JSON.parse(jsonMatch[0]);
          return {
            label,
            filename: file.name,
            maskedText: typeof parsed.maskedText === 'string' ? parsed.maskedText : rawText,
            redactedFields: Array.isArray(parsed.redactedFields) ? parsed.redactedFields : [],
          };
        } catch (err) {
          console.error(`Masking failed for ${file.name}:`, err);
          return {
            label,
            filename: file.name,
            maskedText: rawText,
            redactedFields: [],
          };
        }
      })
    );

    // ── 7. Persist session to DB ──────────────────────────────────
    // owner_id = userId (auth.uid()) — FK references auth.users(id)
    const { error: sessionErr } = await db
      .from('wisehire_mask_sessions')
      .insert({ owner_id: userId, results });
    if (sessionErr) console.error('Failed to persist mask session:', sessionErr);

    return json({ results }, 200, cors);

  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin);
    console.error('wisehire-mask-cvs error:', err);
    const { status, error: code, message } = toUserError(err);
    return json({ error: code, message }, status, cors);
  }
}));
