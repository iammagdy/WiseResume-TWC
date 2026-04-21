// AI-3 regression tests:
//   1. parseAIJSONWithRetry's corrective second AI call must NOT pay a
//      separate breaker decision and must NOT record a separate breaker
//      outcome event. The user-visible action spends exactly one of each
//      across the parent + retry pair.
//   2. refundCredit must use the captured `usageDate` from the original
//      CreditCheckResult so a plan flip (pro trial → free, etc.) between
//      deduct and refund still hits the correct daily bucket — and must
//      no longer no-op based on a stale `effectivePlan === 'premium'`
//      check that over-charged trial users by 1 credit on AI failure.
//
// Run with:
//   deno test --allow-net --allow-env supabase/functions/_shared/__tests__/parseRetryAndRefund.test.ts

import { assertEquals, assert } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { parseAIJSONWithRetry } from "../aiClient.ts";
import { refundCredit, type CreditCheckResult } from "../creditUtils.ts";

Deno.test("AI-3: parseAIJSONWithRetry does not double-count the breaker", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalEnvGet = Deno.env.get;

  // Route the retry's underlying callAI through the legacy GEMINI_API_KEY
  // path (no managed AI configured) so we exercise the breaker branch we
  // changed. SUPABASE_URL / SERVICE_ROLE are required so getServiceClient()
  // can construct a client (its fetches will be intercepted below).
  Deno.env.get = ((key: string) => {
    if (key === 'GEMINI_API_KEY') return 'mock-gemini-key';
    if (key === 'SUPABASE_URL') return 'http://stub.local';
    if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'stub-service-role';
    if (key === 'EXT_SUPABASE_URL') return undefined;
    if (key === 'EXT_SUPABASE_SERVICE_ROLE_KEY') return undefined;
    if (key === 'OPENROUTER_API_KEY') return undefined;
    if (key === 'OPENROUTER2_API_KEY') return undefined;
    if (key === 'GROQ_API_KEY') return undefined;
    if (key === 'WISE_AI_API_KEY') return undefined;
    return originalEnvGet(key);
  }) as typeof Deno.env.get;

  let acquireBreakerCalls = 0;
  let recordBreakerCalls = 0;
  let geminiCalls = 0;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = input.toString();
    if (urlStr.includes('/rpc/try_acquire_breaker_pass')) {
      acquireBreakerCalls += 1;
      return new Response(JSON.stringify('closed'), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (urlStr.includes('/rpc/record_ai_breaker_event')) {
      recordBreakerCalls += 1;
      return new Response(JSON.stringify({ state: 'closed' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (urlStr.includes('generativelanguage.googleapis.com')) {
      geminiCalls += 1;
      // Return a clean JSON object as the corrected output.
      return new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: '{"fixed": true}' }] } }],
        usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 5 },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    // Any other request (e.g. supabase auth probes) — return 404 quickly.
    return new Response('not mocked', { status: 404 });
  }) as typeof fetch;

  try {
    await t.step("retry consumes one upstream call but zero breaker RPCs", async () => {
      const result = await parseAIJSONWithRetry<{ fixed: boolean }>(
        'this-is-not-json-at-all',
        { model: 'gemini-2.5-flash', userId: 'user-1' },
      );
      // The corrective retry returned valid JSON, so we should get the parsed object.
      assertEquals(result, { fixed: true });
      // Exactly one upstream Gemini call (the parse-retry — the parent call
      // happens in the endpoint, not here).
      assertEquals(geminiCalls, 1, 'expected exactly one upstream AI call from the retry');
      // The retry must NOT touch the breaker — neither acquire nor record.
      // The parent call's breaker bookkeeping covers the whole user-visible action.
      assertEquals(acquireBreakerCalls, 0, 'retry must not call try_acquire_breaker_pass');
      assertEquals(recordBreakerCalls, 0, 'retry must not call record_ai_breaker_event');
    });

    await t.step("retry returning malformed JSON still skips breaker accounting", async () => {
      acquireBreakerCalls = 0;
      recordBreakerCalls = 0;
      geminiCalls = 0;
      // Override Gemini response to return malformed JSON again so the retry parse fails.
      globalThis.fetch = (async (input: RequestInfo | URL): Promise<Response> => {
        const urlStr = input.toString();
        if (urlStr.includes('/rpc/try_acquire_breaker_pass')) {
          acquireBreakerCalls += 1;
          return new Response(JSON.stringify('closed'), { status: 200 });
        }
        if (urlStr.includes('/rpc/record_ai_breaker_event')) {
          recordBreakerCalls += 1;
          return new Response(JSON.stringify({ state: 'closed' }), { status: 200 });
        }
        if (urlStr.includes('generativelanguage.googleapis.com')) {
          geminiCalls += 1;
          return new Response(JSON.stringify({
            candidates: [{ content: { parts: [{ text: 'still not json !!!' }] } }],
            usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 5 },
          }), { status: 200 });
        }
        return new Response('not mocked', { status: 404 });
      }) as typeof fetch;

      const result = await parseAIJSONWithRetry('garbage', {
        model: 'gemini-2.5-flash',
        userId: 'user-1',
      });
      assertEquals(result, null, 'two malformed responses → null');
      assertEquals(geminiCalls, 1);
      assertEquals(acquireBreakerCalls, 0);
      assertEquals(recordBreakerCalls, 0);
    });
  } finally {
    globalThis.fetch = originalFetch;
    Deno.env.get = originalEnvGet;
  }
});

Deno.test("AI-3: refundCredit honors captured usageDate across plan flips", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalEnvGet = Deno.env.get;

  Deno.env.get = ((key: string) => {
    if (key === 'SUPABASE_URL') return 'http://stub.local';
    if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'stub-service-role';
    if (key === 'EXT_SUPABASE_URL') return undefined;
    if (key === 'EXT_SUPABASE_SERVICE_ROLE_KEY') return undefined;
    return originalEnvGet(key);
  }) as typeof Deno.env.get;

  type RpcCall = { name: string; body: Record<string, unknown> };
  let refundCalls: RpcCall[] = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = input.toString();
    if (urlStr.includes('/rpc/atomic_refund_credit')) {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      refundCalls.push({ name: 'atomic_refund_credit', body });
      return new Response(JSON.stringify(null), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response('not mocked', { status: 404 });
  }) as typeof fetch;

  try {
    await t.step("refunds the exact captured usage_date even when captured plan was pro", async () => {
      refundCalls = [];
      const deduction: CreditCheckResult = {
        hasCredits: true,
        remaining: 9,
        isByok: false,
        effectivePlan: 'pro',
        usageDate: '2026-04-21',
      };
      await refundCredit('user-1', deduction, 1);
      assertEquals(refundCalls.length, 1, 'expected exactly one atomic_refund_credit RPC');
      assertEquals(refundCalls[0].body.p_usage_date, '2026-04-21',
        'must subtract from the SAME daily row that was debited');
      assertEquals(refundCalls[0].body.p_user_id, 'user-1');
      assertEquals(refundCalls[0].body.p_amount, 1);
    });

    await t.step("refunds when captured plan is premium but a usage_date exists (regression)", async () => {
      // Pre-fix code short-circuited on effectivePlan === 'premium' even
      // when the deduct RPC HAD created a counter row, over-charging the
      // user by 1. The new gate is `usageDate` presence, so this refund
      // must go through.
      refundCalls = [];
      const deduction: CreditCheckResult = {
        hasCredits: true,
        remaining: 0,
        isByok: false,
        effectivePlan: 'premium',
        usageDate: '2026-04-21',
      };
      await refundCredit('user-2', deduction, 2);
      assertEquals(refundCalls.length, 1);
      assertEquals(refundCalls[0].body.p_usage_date, '2026-04-21');
      assertEquals(refundCalls[0].body.p_amount, 2);
    });

    await t.step("no-op when no counter row was created (no usageDate)", async () => {
      refundCalls = [];
      const deduction: CreditCheckResult = {
        hasCredits: true,
        remaining: 9999,
        isByok: false,
        effectivePlan: 'premium',
        // usageDate intentionally undefined → deduct RPC short-circuited
        // (e.g. true unlimited path) → nothing to refund.
      };
      await refundCredit('user-3', deduction, 1);
      assertEquals(refundCalls.length, 0, 'no debit ever occurred → no refund RPC');
    });

    await t.step("trial-flip race: captured usage_date is decisive, not live plan", async () => {
      // Scenario: at deduct time, user was on a 'pro' trial — counter was
      // incremented for date D. Between deduct and refund, the trial
      // expired and the user's effective plan flipped to 'free'. The
      // CreditCheckResult we hand back to refundCredit still carries the
      // ORIGINAL effectivePlan='pro' AND usageDate=D, and the refund must
      // hit row D regardless of any current-plan re-derivation.
      refundCalls = [];
      const deduction: CreditCheckResult = {
        hasCredits: true,
        remaining: 0,
        isByok: false,
        effectivePlan: 'pro', // captured at deduct, even though user is now 'free'
        usageDate: '2026-04-21',
      };
      await refundCredit('user-4', deduction, 1);
      assertEquals(refundCalls.length, 1);
      assertEquals(refundCalls[0].body.p_usage_date, '2026-04-21');
    });

    await t.step("BYOK and !hasCredits paths still no-op", async () => {
      refundCalls = [];
      await refundCredit('user-5', {
        hasCredits: true, remaining: 9999, isByok: true, effectivePlan: 'byok', usageDate: undefined,
      }, 1);
      await refundCredit('user-6', {
        hasCredits: false, remaining: 0, isByok: false, effectivePlan: 'free', usageDate: undefined,
      }, 1);
      assertEquals(refundCalls.length, 0);
    });
  } finally {
    globalThis.fetch = originalFetch;
    Deno.env.get = originalEnvGet;
  }
});
