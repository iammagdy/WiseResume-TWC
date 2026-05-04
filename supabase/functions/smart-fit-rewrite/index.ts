/**
 * smart-fit-rewrite — Bullet-level rewrite suggestions for the resume editor's
 * "Smart Fit" panel. Accepts a batch of candidate bullets + the target JD,
 * extracts protected tokens (numbers, dates, JD keywords), runs a guarded AI
 * rewrite for each, and returns per-candidate outcomes.
 *
 * Trigger: invoked from the resume editor when the user opens Smart Fit
 *   ("rewrite" mode) and from the post-accept telemetry pipeline
 *   ("telemetry" mode).
 * Auth: AUTHENTICATED USER (`requireAuth`). Each call decrements one credit
 *   per rewritten candidate via `checkAndDeductCredit`; failed AI calls
 *   refund the credit.
 * Dispatch contract: POST `{mode?:'rewrite'|'telemetry', candidates?,
 *   jobDescription?, telemetry?}`. The default mode is `rewrite`. Returns
 *   `{success:true, outcomes:[...]}` on success; rate-limit / credit /
 *   payload-size violations return their own typed envelopes.
 *
 * Empty-input intent (audit H2 — Task #67, Phase 3): when `candidates` is
 *   absent OR explicitly an empty array, the function returns
 *   `{success:true, outcomes:[], reason:"no-op-empty-input"}` (HTTP 200) —
 *   not a 400. The editor calls this endpoint optimistically after the
 *   user filters every suggestion out via the accept/reject UI, so a 400
 *   there would be a UX regression for input the user did not author.
 *   The `reason` field lets callers distinguish a genuine no-op from a
 *   successful rewrite. See the in-branch comment at the no-op site for
 *   the full rationale.
 */
import { getCorsHeaders } from "../_shared/cors.ts";
import { callAIWithRetry, parseAIJSON, toUserError, sanitizeInputText } from "../_shared/aiClient.ts";
import { selectProviderForTool } from "../_shared/modelRouter.ts";
const __ROUTE = selectProviderForTool('one-page-optimizer');
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";
import { checkUserRateLimit } from "../_shared/userRateLimiter.ts";
import { requireAuth, tryAuth } from "../_shared/authMiddleware.ts";
import { checkAndDeductCredit, refundCredit } from "../_shared/creditUtils.ts";
import { checkPayloadSize } from "../_shared/requestUtils.ts";
import { isSmokeTest, smokeResponse } from "../_shared/smokeTest.ts";
import { logger } from "../_shared/logger.ts";

import { wrapHandler } from '../_shared/fnLogger.ts';
const log = logger('smart-fit-rewrite');

interface ProtectedTokenIn { text: string; kind: string }

interface RewriteCandidate {
  id: string;
  text: string;
  /** Hint from the client. Server extracts its own and unions the two sets. */
  preserve?: ProtectedTokenIn[];
  targetLength: number;
}

interface RewriteRequest {
  mode?: 'rewrite' | 'telemetry';
  candidates?: RewriteCandidate[];
  /** Used server-side to derive JD keywords for protection. */
  jobDescription?: string;
  telemetry?: TelemetryEvent;
}

interface TelemetryEvent {
  outcome: 'analyzed' | 'applied' | 'undone' | 'still_overflowing';
  targetPages?: number;
  pagesBefore?: number;
  pagesAfterRecommended?: number;
  pagesAfterApplied?: number;
  rewriteCount?: number;
  dropCount?: number;
  collapseCount?: number;
  recommendedRewrites?: number;
  recommendedDrops?: number;
  recommendedCollapses?: number;
  appliedRewrites?: number;
  appliedDrops?: number;
  appliedCollapses?: number;
  layoutFitApplied?: boolean;
  stillOverflowing?: boolean;
  convergedMs?: number;
}

interface CandidateOutcome {
  id: string;
  text: string;
  valid: boolean;
  reason?: string;
  missingTokens?: string[];
}

const MAX_PAYLOAD = 100_000;
const MAX_CANDIDATES = 12;

// ─── Server-side protected token extraction ────────────────────────────────
// Mirrors the client logic in src/lib/smartFit/protectedTokens.ts. We
// recompute tokens from each candidate's source text + JD here so the
// validation contract is enforced server-side and a malicious client can
// never widen what the AI is allowed to drop.

const NUMBER_RE = /\b\d+(?:[.,]\d+)*\b/g;
const PERCENT_RE = /\b\d+(?:\.\d+)?%/g;
const CURRENCY_RE = /[$€£¥]\s?\d+(?:[.,]\d+)*[KMB]?/g;
const DATE_RE = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{4}\b|\b\d{4}\s*[–-]\s*(?:\d{4}|Present|present)\b|\bQ[1-4]\s*\d{4}\b|\b\d{4}\b/g;
const ACRONYM_RE = /\b[A-Z]{2,}(?:\/[A-Z]{2,})*\b/g;
// Multi-word capitalized phrases catch company / person / institution / cert
// names that appear in the candidate text (e.g. "Acme Corp", "John Smith",
// "Stanford University", "AWS Solutions Architect"). Single capitalized
// words are skipped here — sentence-starts would over-match — but they are
// still picked up via ACRONYM_RE / TECH_TERMS when relevant.
const PROPER_PHRASE_RE = /\b[A-Z][a-zA-Z]+(?:[ &.-]+[A-Z][a-zA-Z]+){1,4}\b/g;

const PROPER_PHRASE_STOP_HEADS = new Set([
  // Sentence-start verb-noun phrases that the regex would otherwise catch
  // ("Led Cross Functional Team", "Built Customer Facing Dashboard"…). We
  // require the *head* word to not be a high-frequency action verb.
  'led', 'built', 'designed', 'managed', 'created', 'developed', 'launched',
  'shipped', 'delivered', 'drove', 'owned', 'partnered', 'collaborated',
  'increased', 'reduced', 'improved', 'enabled', 'enhanced', 'supported',
  'worked', 'used', 'helped', 'oversaw', 'spearheaded', 'achieved',
]);

const TECH_TERMS = [
  'AWS', 'GCP', 'Azure', 'React', 'Vue', 'Angular', 'Node.js', 'Python',
  'TypeScript', 'JavaScript', 'Go', 'Rust', 'Java', 'Kotlin', 'Swift',
  'PostgreSQL', 'Postgres', 'MySQL', 'MongoDB', 'Redis', 'Kafka', 'Docker',
  'Kubernetes', 'Terraform', 'GraphQL', 'REST', 'gRPC', 'TensorFlow', 'PyTorch',
];

const JD_STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'you', 'are', 'our', 'this', 'that', 'will',
  'have', 'has', 'from', 'your', 'their', 'they', 'them', 'these', 'those',
  'who', 'what', 'when', 'where', 'why', 'how', 'work', 'team', 'role',
  'about', 'into', 'over', 'such', 'each', 'some', 'more', 'than', 'also',
]);

function uniqMerge(out: ProtectedTokenIn[], add: ProtectedTokenIn[]): void {
  const seen = new Set(out.map(t => t.text.toLowerCase()));
  for (const t of add) {
    const k = t.text.toLowerCase();
    if (!seen.has(k)) { out.push(t); seen.add(k); }
  }
}

function extractFromText(text: string): ProtectedTokenIn[] {
  const tokens: ProtectedTokenIn[] = [];
  for (const m of text.matchAll(NUMBER_RE)) tokens.push({ text: m[0], kind: 'number' });
  for (const m of text.matchAll(PERCENT_RE)) tokens.push({ text: m[0], kind: 'percent' });
  for (const m of text.matchAll(CURRENCY_RE)) tokens.push({ text: m[0], kind: 'currency' });
  for (const m of text.matchAll(DATE_RE)) tokens.push({ text: m[0], kind: 'date' });
  for (const m of text.matchAll(ACRONYM_RE)) tokens.push({ text: m[0], kind: 'acronym' });
  for (const m of text.matchAll(PROPER_PHRASE_RE)) {
    const head = m[0].split(/[\s.&-]+/)[0].toLowerCase();
    if (PROPER_PHRASE_STOP_HEADS.has(head)) continue;
    tokens.push({ text: m[0], kind: 'proper-noun' });
  }
  const lower = text.toLowerCase();
  for (const term of TECH_TERMS) {
    if (lower.includes(term.toLowerCase())) tokens.push({ text: term, kind: 'tech' });
  }
  const out: ProtectedTokenIn[] = [];
  uniqMerge(out, tokens);
  return out;
}

function extractJdKeywords(jd: string): ProtectedTokenIn[] {
  if (!jd) return [];
  const words = jd.match(/\b[A-Za-z][A-Za-z+#.-]{2,}\b/g) ?? [];
  const counts = new Map<string, number>();
  for (const w of words) {
    const lower = w.toLowerCase();
    if (JD_STOP_WORDS.has(lower) || lower.length < 4) continue;
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([text]) => ({ text, kind: 'jd-keyword' }));
}

function serverProtectedTokens(
  candidate: RewriteCandidate,
  jdTokens: ProtectedTokenIn[],
): ProtectedTokenIn[] {
  const out: ProtectedTokenIn[] = [];
  // Trust floor: regex extraction over the candidate text. This is the set
  // we guarantee to enforce regardless of what the client sent.
  uniqMerge(out, extractFromText(candidate.text));
  // JD tokens count only when they actually appear in the candidate text.
  const lower = candidate.text.toLowerCase();
  uniqMerge(out, jdTokens.filter(t => lower.includes(t.text.toLowerCase())));
  // Client `preserve` is ADDITIVE — it can only widen what's protected,
  // never narrow it. Filtered to entries that actually appear in the text
  // so a malicious client can't pad the set with junk to break rewrites.
  if (Array.isArray(candidate.preserve)) {
    const filtered = candidate.preserve
      .filter(p => p && typeof p.text === 'string' && p.text.length > 0)
      .filter(p => lower.includes(p.text.toLowerCase()));
    uniqMerge(out, filtered);
  }
  return out;
}

function findMissing(candidate: string, tokens: ProtectedTokenIn[]): string[] {
  const lower = candidate.toLowerCase();
  return tokens.filter(t => !lower.includes(t.text.toLowerCase())).map(t => t.text);
}

function buildPrompt(candidates: RewriteCandidate[], serverPreserve: Map<string, ProtectedTokenIn[]>, strict: boolean): string {
  const lines = candidates.map((c, i) => {
    const preserved = (serverPreserve.get(c.id) ?? []).map(p => `"${p.text}"`).join(', ') || '(none)';
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

function buildOutcomes(
  rewrites: unknown,
  candidates: RewriteCandidate[],
  serverPreserve: Map<string, ProtectedTokenIn[]>,
): CandidateOutcome[] {
  const byId = new Map<string, { id: string; text: string }>();
  if (Array.isArray(rewrites)) {
    for (const r of rewrites) {
      if (!r || typeof r !== 'object') continue;
      const obj = r as Record<string, unknown>;
      if (typeof obj.id === 'string' && typeof obj.text === 'string') {
        byId.set(obj.id, { id: obj.id, text: obj.text.trim() });
      }
    }
  }
  return candidates.map(c => {
    const r = byId.get(c.id);
    if (!r || !r.text) {
      return { id: c.id, text: c.text, valid: false, reason: 'AI did not return a rewrite for this sentence.' };
    }
    if (r.text.length >= c.text.length) {
      return { id: c.id, text: r.text, valid: false, reason: 'AI rewrite was not shorter than the original.' };
    }
    const tokens = serverPreserve.get(c.id) ?? [];
    const missing = findMissing(r.text, tokens);
    if (missing.length > 0) {
      return {
        id: c.id,
        text: r.text,
        valid: false,
        reason: `AI dropped ${missing.length} protected ${missing.length === 1 ? 'token' : 'tokens'}: ${missing.slice(0, 3).join(', ')}`,
        missingTokens: missing,
      };
    }
    return { id: c.id, text: r.text, valid: true };
  });
}

Deno.serve(wrapHandler("smart-fit-rewrite", async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const sizeError = checkPayloadSize(req, 200 * 1024);
  if (sizeError) return sizeError;

  const auth = await tryAuth(req, corsHeaders);
  if (auth instanceof Response) return auth;

  // Smoke-test bypass — return synthetic 200 without AI call or credit deduction.
  if (isSmokeTest(req)) {
    return smokeResponse(corsHeaders, { function_name: 'smart-fit-rewrite', success: true, outcomes: [] });
  }

  try {
    const { userId } = auth;
    const bodyText = await req.text();
    if (bodyText.length > MAX_PAYLOAD) {
      return new Response(
        JSON.stringify({ error: `Payload must be under ${MAX_PAYLOAD} characters` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const parsed: RewriteRequest = JSON.parse(bodyText);

    if (parsed.mode === 'telemetry') {
      const tele = parsed.telemetry || { outcome: 'analyzed' };
      const teleRate = await checkUserRateLimit(userId, 'smart_fit_telemetry', 60, 60);
      if (!teleRate.allowed) {
        return new Response(JSON.stringify({ success: true, recorded: false }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      log.info('smart_fit_telemetry', { userId, ...tele });
      return new Response(JSON.stringify({ success: true, recorded: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const candidates = (parsed.candidates ?? []).slice(0, MAX_CANDIDATES);
    if (candidates.length === 0) {
      // Empty-candidates branch is intentionally a graceful no-op (HTTP 200,
      // not 400). Rationale: the resume editor calls this endpoint
      // optimistically when the user clicks "Apply suggestions" — if the
      // accept/reject UI has already filtered every candidate out, the array
      // arrives empty and the right behaviour is "do nothing successfully"
      // rather than surfacing an error the user did not cause. The explicit
      // `reason` field lets callers distinguish this no-op from a real
      // success with rewrites.
      //
      // Scope of this branch: a missing/null `candidates` field (the `?? []`
      // fallback) and an explicit `candidates: []` both hit this path —
      // they are treated as the same "nothing to do" no-op. A non-array
      // truthy value (e.g. a string or object) is NOT coerced by `??` and
      // would throw at the `.slice(...)` call above, falling out to the
      // outer try/catch as a 500 — that is acceptable because the
      // orchestrator never sends a malformed `candidates` value in
      // production. Real per-candidate schema validation (id/text/
      // targetLength etc.) still happens in the AI loop below for
      // non-empty inputs and surfaces through the standard `toUserError`
      // envelope.
      // Resolved 2026-05-03 (Task #67, audit H2 — keep 200 with clearer payload).
      return new Response(
        JSON.stringify({ success: true, outcomes: [], reason: 'no-op-empty-input' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Recompute protected tokens server-side. This is the trust boundary —
    // even if the client sends an empty `preserve` array, the server still
    // rejects rewrites that drop numbers, dates, JD keywords, etc.
    const jdTokens = extractJdKeywords(parsed.jobDescription ?? '');
    const serverPreserve = new Map<string, ProtectedTokenIn[]>();
    for (const c of candidates) serverPreserve.set(c.id, serverProtectedTokens(c, jdTokens));

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
      const prompt = buildPrompt(candidates, serverPreserve, strict);
      const ai = await callAIWithRetry({
        model: __ROUTE.model,
        wiseresumeSubProvider: __ROUTE.provider,
        messages: [{ role: 'user', content: prompt }],
        temperature: strict ? 0.1 : 0.3,
        userId,
      });
      const json = parseAIJSON(ai.content || '{}');
      const outcomes = buildOutcomes(
        (json && typeof json === 'object' && (json as Record<string, unknown>).rewrites) || [],
        candidates,
        serverPreserve,
      );
      return { ai, outcomes };
    };

    let attempt: { ai: Awaited<ReturnType<typeof callAI>>; outcomes: CandidateOutcome[] };
    try {
      attempt = await callOnce(false);
      // Retry strictly for any candidate whose first-pass outcome was invalid.
      const invalidIds = attempt.outcomes.filter(o => !o.valid).map(o => o.id);
      if (invalidIds.length > 0) {
        log.info('partial validation pass — retrying strictly', {
          userId, invalidIds, total: candidates.length,
        });
        const retry = await callOnce(true);
        // Replace any first-pass invalid outcome with the retry's outcome
        // (which itself may still be invalid — that's surfaced to the UI).
        const retryById = new Map(retry.outcomes.map(o => [o.id, o]));
        attempt = {
          ai: retry.ai,
          outcomes: attempt.outcomes.map(o => o.valid ? o : (retryById.get(o.id) ?? o)),
        };
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
      validated: attempt.outcomes.filter(o => o.valid).length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        outcomes: attempt.outcomes,
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
}));
