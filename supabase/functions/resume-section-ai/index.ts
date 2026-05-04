// Task #56 — resume-section-ai merged router.
//
// Routes the four legacy resume-section AI function names —
// `enhance-section`, `tailor-section`, `fill-gap`, `explain-gap` — into a
// single Edge Function. Each per-action handler module is byte-for-byte
// equivalent to its pre-merge serve() body (auth, credit deduct/refund,
// model routing, prompts, response shapes, kill-switch / rate-limit keys
// preserved verbatim — see the per-handler header comments for details).
//
// Dispatch
// ────────
// The router buffers the request body once and dispatches on either:
//   - the `x-resume-section-ai-action` header (primary — used because the
//     `enhance` action's body already carries its own inner sub-`action`
//     field, generate/improve/ats_optimize/fix_error/etc., and clobbering
//     it would break enhance's byte-for-byte parity), OR
//   - a top-level `body.action` field (fallback for tailor / fill-gap /
//     explain-gap whose pre-merge originals never read body.action).
//
// Auth
// ────
// `requireAuth` runs ONCE at the top of the router (per task spec) —
// BEFORE we touch the request body. This matches the pre-merge per-
// function ordering exactly: each of the four originals had
// `requireAuth(req)` as the first line of its `serve()` body, before
// any body parse or validation. Per-handler kill-switch / payload-size
// / rate-limit / credit-deduct flow stays INSIDE each handler so the
// credit-refund-on-AI-error semantics remain byte-for-byte identical
// to the pre-merge functions. See EDGE_FUNCTION_AUDIT.md (Task #56)
// for the rationale: per-action credit costs, refund paths, and
// validation ordering all differ across the four handlers, so the
// credit check can't be hoisted without changing observable behaviour.
//
// Payload size
// ────────────
// A Content-Length-based guard runs at the router boundary AFTER auth
// and BEFORE we buffer the body, using the largest per-handler ceiling
// (500 KiB — enhance/fill-gap/explain-gap). Per-handler `checkPayloadSize`
// calls still run inside each handler with their original (sometimes
// stricter, e.g. tailor's 200 KiB) limits, preserving each handler's
// pre-merge envelope. The router-level guard prevents us from buffering
// a >500 KiB body via `req.text()` only to reject it downstream.
//
// CORS
// ────
// CORS preflight is handled here, before auth, so OPTIONS requests
// succeed without a token (matches every pre-merge function).
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireAuth, authErrorResponse } from "../_shared/authMiddleware.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { wrapHandler } from "../_shared/fnLogger.ts";
import { checkPayloadSize } from "../_shared/requestUtils.ts";
import { checkSmokeBypass } from "../_shared/smokeTest.ts";
import { logger } from "../_shared/logger.ts";
const log = logger('resume-section-ai');
import { handleEnhance } from "./enhance.ts";
import { handleTailor } from "./tailor.ts";
import { handleFillGap } from "./fillGap.ts";
import { handleExplainGap } from "./explainGap.ts";

type RouterAction = 'enhance' | 'tailor' | 'fill-gap' | 'explain-gap';

const VALID_ACTIONS: ReadonlySet<RouterAction> = new Set([
  'enhance',
  'tailor',
  'fill-gap',
  'explain-gap',
]);

function isRouterAction(value: unknown): value is RouterAction {
  return typeof value === 'string' && VALID_ACTIONS.has(value as RouterAction);
}

/**
 * Resolves the dispatch action from the header (preferred) or, if the
 * caller didn't set the header, from a top-level `body.action` field.
 *
 * The header is preferred because the `enhance` handler reads its own
 * inner `body.action` for sub-routing (generate / improve / ats_optimize
 * / fix_error / …). For tailor / fill-gap / explain-gap the body has no
 * pre-existing `action` field, so the body-level fallback is safe.
 */
function resolveAction(req: Request, bodyText: string): RouterAction | null {
  const headerVal = req.headers.get('x-resume-section-ai-action');
  if (isRouterAction(headerVal)) return headerVal;

  if (!bodyText) return null;
  try {
    const parsed = JSON.parse(bodyText) as { action?: unknown };
    if (isRouterAction(parsed?.action)) return parsed.action;
  } catch {
    // Body is not JSON or not an object — handler will return its own
    // 400 from JSON.parse if appropriate.
  }
  return null;
}

serve(wrapHandler('resume-section-ai', async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Smoke-test bypass — validates DevKit admin token (Authorization: Bearer).
  // MUST run before requireAuth so the admin token is not mis-validated as a Supabase JWT.
  {
    const smokeRes = await checkSmokeBypass(req, corsHeaders, 'resume-section-ai', {
      function_name: 'resume-section-ai',
      action: req.headers.get('x-resume-section-ai-action') ?? 'enhance',
      result: 'Experienced professional with a proven track record.',
    });
    if (smokeRes !== null) return smokeRes;
  }

  // Single auth gate at the top — BEFORE we touch the body.
  let userId: string;
  try {
    const auth = await requireAuth(req);
    userId = auth.userId;
  } catch (authErr) {
    return authErrorResponse(authErr, req.headers.get('origin'));
  }

  // Content-Length-based size guard at the router boundary, BEFORE we
  // buffer the body via req.text(). Uses the largest per-handler
  // ceiling (500 KiB — enhance/fill-gap/explain-gap). Per-handler
  // checkPayloadSize calls still run inside each handler with their
  // own (sometimes stricter, e.g. tailor's 200 KiB) limit so each
  // handler's pre-merge 413 envelope is preserved exactly.
  const sizeError = checkPayloadSize(req, 500 * 1024);
  if (sizeError) {
    // Re-emit with CORS headers attached (the shared helper omits them
    // because each pre-merge function used to merge them in itself).
    const text = await sizeError.text();
    return new Response(text, {
      status: sizeError.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Buffer the request body once at the router boundary so we can both
  // sniff `body.action` for fallback dispatch and hand the original text
  // to the per-action handler. Each handler does its own JSON.parse so a
  // malformed body produces the same per-handler 4xx as the pre-merge
  // function (rather than a router-level 400).
  let bodyText = '';
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    try {
      bodyText = await req.text();
    } catch {
      bodyText = '';
    }
  }

  const action = resolveAction(req, bodyText);
  const _fnStart = Date.now();

  if (!action) {
    log.warn('request dropped', { function_name: 'resume-section-ai', provider_used: null, error_type: 'InvalidActionError', duration_ms: Date.now() - _fnStart });
    return new Response(
      JSON.stringify({
        error: 'invalid_action',
        message:
          "Missing or unknown action. Provide 'x-resume-section-ai-action' header or top-level body.action ∈ {enhance, tailor, fill-gap, explain-gap}.",
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    let res: Response;
    switch (action) {
      case 'enhance':
        res = await handleEnhance(req, userId, bodyText, corsHeaders);
        break;
      case 'tailor':
        res = await handleTailor(req, userId, bodyText, corsHeaders);
        break;
      case 'fill-gap':
        res = await handleFillGap(req, userId, bodyText, corsHeaders);
        break;
      case 'explain-gap':
        res = await handleExplainGap(req, userId, bodyText, corsHeaders);
        break;
    }
    log.info('request completed', { function_name: 'resume-section-ai', provider_used: null, error_type: null, duration_ms: Date.now() - _fnStart, action });
    return res!;
  } catch (err) {
    log.error('Unhandled error', err, { function_name: 'resume-section-ai', provider_used: null, error_type: (err as Error)?.name ?? 'Error', duration_ms: Date.now() - _fnStart });
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
}));
