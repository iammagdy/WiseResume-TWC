import { getCorsHeaders } from "../_shared/cors.ts";
import { callAI, parseAIJSON, toUserError, sanitizeInputText } from "../_shared/aiClient.ts";
import { selectProviderForTool } from "../_shared/modelRouter.ts";
const __ROUTE = selectProviderForTool('one-page-optimizer');
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";
import { checkUserRateLimit } from "../_shared/userRateLimiter.ts";
import { requireAuth } from "../_shared/authMiddleware.ts";
import { checkAndDeductCredit, refundCredit } from "../_shared/creditUtils.ts";
import { checkPayloadSize } from "../_shared/requestUtils.ts";
import { logger } from "../_shared/logger.ts";

const log = logger('smart-fit-rewrite');

interface RewriteCandidate {
  id: string;
  text: string;
  preserve: { text: string; kind: string }[];
  targetLength: number;
}

interface RewriteRequest {
  candidates: RewriteCandidate[];
}

const MAX_PAYLOAD = 100_000;
const MAX_CANDIDATES = 12;

function findMissing(candidate: string, tokens: { text: string }[]): string[] {
  const lower = candidate.toLowerCase();
  return tokens.filter(t => !lower.includes(t.text.toLowerCase())).map(t => t.text);
}

function buildPrompt(candidates: RewriteCandidate[], strict: boolean): string {
  const lines = candidates.map((c, i) => {
    const preserved = c.preserve.map(p => `"${p.text}"`).join(', ') || '(none)';
    return [
      `--- Candidate ${i + 1} (id: ${c.id}) ---`,
      `Original (${c.text.length} chars):`,
      sanitizeInputText(c.text, 2000),
      `MUST PRESERVE these substrings VERBATIM (case-insensitive substring match): ${preserved}`,
      `Target length: <= ${c.targetLength} characters.`,
    ].join('\n');
  }).join('\n\n');

  const strictness = strict
    ? 'You FAILED to preserve required substrings on a previous attempt. Be EXTREMELY conservative — keep every protected token exactly, even if the rewrite barely shortens.'
    : 'Shorten by removing filler ("really", "very", "actually"), redundant phrasing, and weak qualifiers. Keep every protected token exactly. Keep the same meaning.';

  return [
    'You are a resume editor. Shorten each candidate sentence to a tighter, recruiter-ready version.',
    strictness,
    'Return ONLY a JSON object with this EXACT shape (no prose, no markdown, no code fences):',
    `{ "rewrites": [{ "id": "<candidate id>", "text": "<shortened sentence>" }] }`,
    'Include one entry per candidate. If a candidate cannot be shortened safely, return its original text unchanged.',
    '',
    lines,
  ].join('\n');
}

function validateAndSanitize(
  rewrites: unknown,
  candidates: RewriteCandidate[],
): { id: string; text: string }[] {
  if (!Array.isArray(rewrites)) return [];
  const byId = new Map<string, RewriteCandidate>();
  for (const c of candidates) byId.set(c.id, c);
  const out: { id: string; text: string }[] = [];
  for (const r of rewrites) {
    if (!r || typeof r !== 'object') continue;
    const obj = r as Record<string, unknown>;
    if (typeof obj.id !== 'string' || typeof obj.text !== 'string') continue;
    const cand = byId.get(obj.id);
    if (!cand) continue;
    const text = obj.text.trim();
    if (!text) continue;
    const missing = findMissing(text, cand.preserve);
    if (missing.length > 0) continue; // fail closed
    if (text.length >= cand.text.length) continue; // must actually shorten
    out.push({ id: cand.id, text });
  }
  return out;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const sizeError = checkPayloadSize(req, 200 * 1024);
  if (sizeError) return sizeError;

  try {
    const { userId } = await requireAuth(req);
    const bodyText = await req.text();
    if (bodyText.length > MAX_PAYLOAD) {
      return new Response(
        JSON.stringify({ error: `Payload must be under ${MAX_PAYLOAD} characters` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const parsed: RewriteRequest = JSON.parse(bodyText);
    const candidates = (parsed.candidates ?? []).slice(0, MAX_CANDIDATES);
    if (candidates.length === 0) {
      return new Response(
        JSON.stringify({ success: true, rewrites: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const rate = await checkRateLimit(userId, {
      maxRequests: 20,
      windowSeconds: 60,
      actionType: 'smart_fit_rewrite',
    });
    if (!rate.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${rate.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const userRate = await checkUserRateLimit(userId, 'smart_fit_rewrite', 20, 60);
    if (!userRate.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${userRate.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const credit = await checkAndDeductCredit(userId);
    if (!credit.hasCredits) {
      return new Response(
        JSON.stringify({ error: 'Insufficient AI credits. Add your own Gemini API key for unlimited access.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const callOnce = async (strict: boolean) => {
      const prompt = buildPrompt(candidates, strict);
      const ai = await callAI({
        model: __ROUTE.model,
        wiseresumeSubProvider: __ROUTE.provider,
        messages: [{ role: 'user', content: prompt }],
        temperature: strict ? 0.1 : 0.3,
        userId,
      });
      const json = parseAIJSON(ai.content || '{}');
      const rewrites = validateAndSanitize(
        (json && typeof json === 'object' && (json as Record<string, unknown>).rewrites) || [],
        candidates,
      );
      return { ai, rewrites };
    };

    let attempt: { ai: Awaited<ReturnType<typeof callAI>>; rewrites: { id: string; text: string }[] };
    try {
      attempt = await callOnce(false);
      // If at least one candidate failed validation, retry once with strict prompt
      if (attempt.rewrites.length < candidates.length) {
        const missingIds = candidates
          .filter(c => !attempt.rewrites.some(r => r.id === c.id))
          .map(c => c.id);
        log.info('partial validation pass — retrying strictly', {
          userId, missingIds, total: candidates.length,
        });
        const retry = await callOnce(true);
        // Merge: keep the first-pass winners, add retry winners only if first lacks them.
        const seen = new Set(attempt.rewrites.map(r => r.id));
        for (const r of retry.rewrites) {
          if (!seen.has(r.id)) attempt.rewrites.push(r);
        }
      }
    } catch (err) {
      await refundCredit(userId, credit, 1);
      throw err;
    }

    await recordUsage(userId, 'smart_fit_rewrite', { provider: attempt.ai.providerUsed || 'unknown' });
    log.info('smart_fit_rewrite success', {
      userId,
      provider: attempt.ai.providerUsed,
      candidates: candidates.length,
      validated: attempt.rewrites.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        rewrites: attempt.rewrites,
        provider: attempt.ai.providerUsed || null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    log.error('Unhandled error', error);
    const userError = toUserError(error);
    return new Response(
      JSON.stringify({ error: userError.message }),
      { status: userError.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
