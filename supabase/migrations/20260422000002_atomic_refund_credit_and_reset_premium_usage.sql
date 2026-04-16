-- Atomic credit REFUND function — companion to atomic_attempt_and_deduct_credit.
--
-- Policy: the platform deducts credits BEFORE the AI call so the accounting is
-- race-safe. When the AI call itself fails (provider down, timeout, 5xx, etc.)
-- the already-committed debit must be reversed so users are not penalised for
-- infrastructure failures they did not cause.
--
-- Edge functions that wrap this in their catch blocks (wise-ai-chat,
-- interview-chat, agentic-chat, etc.) pass the SAME amount they deducted so
-- the counter returns to its pre-attempt value.
--
-- Semantics:
--   - Decrements daily_usage and total_usage by p_amount (never below 0).
--   - Only touches today's row; stale rows from a prior date are left alone.
--   - Missing row is a no-op (the refund can't undo a debit that never made
--     it to the table — this can happen if the original deduct failed before
--     committing; safe fail behaviour).
--
-- Security: service_role only, identical grant pattern to the deduct RPC.

CREATE OR REPLACE FUNCTION public.atomic_refund_credit(
  p_user_id UUID,
  p_amount  INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_today        DATE := CURRENT_DATE;
  v_new_daily    INTEGER;
  v_new_total    BIGINT;
BEGIN
  IF p_amount < 1 THEN
    RAISE EXCEPTION 'p_amount must be >= 1, got %', p_amount;
  END IF;

  UPDATE public.ai_credits
     SET daily_usage = GREATEST(
                         CASE WHEN usage_date = v_today THEN daily_usage - p_amount
                              ELSE 0 END,
                         0
                       ),
         total_usage = GREATEST(total_usage - p_amount, 0),
         updated_at  = NOW()
   WHERE user_id = p_user_id
   RETURNING daily_usage, total_usage
        INTO v_new_daily, v_new_total;

  IF NOT FOUND THEN
    -- No row to refund — nothing to do. Return a benign success so the
    -- calling edge function doesn't spiral into a secondary failure.
    RETURN jsonb_build_object(
      'refunded',    false,
      'reason',      'no_row',
      'daily_usage', 0,
      'total_usage', 0
    );
  END IF;

  RETURN jsonb_build_object(
    'refunded',    true,
    'daily_usage', v_new_daily,
    'total_usage', v_new_total
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.atomic_refund_credit(UUID, INTEGER)
  FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.atomic_refund_credit(UUID, INTEGER)
  TO service_role;

-- ── One-off data repair ─────────────────────────────────────────────────────
-- During the AI-outage window users on Premium (active trial or permanent)
-- retried failed tools many times. Because the deduct RPC committed on each
-- attempt — before the AI call — their today-row daily_usage climbed into the
-- hundreds. For Premium users daily_limit is -1 (unlimited) so this is purely
-- cosmetic on the UI counter, BUT it has also been observed causing the
-- authoritative-limit path to reject in rare cases when trial evaluation fell
-- through. Reset today's usage to 0 for every currently-Premium user so the
-- counter agrees with their plan. Non-premium users are NOT touched.
-- Match Premium case-insensitively — historical data contained mixed casing
-- ('Premium', 'PREMIUM') which the runtime code now normalises, but this
-- one-off repair must cover the same set of users or it silently misses them.
UPDATE public.ai_credits ac
   SET daily_usage = 0,
       updated_at  = NOW()
  FROM public.subscriptions s
 WHERE ac.user_id = s.user_id
   AND ac.usage_date = CURRENT_DATE
   AND (
         LOWER(TRIM(s.plan_name)) = 'premium'
         OR (
              LOWER(TRIM(s.trial_plan)) = 'premium'
              AND s.trial_expires_at IS NOT NULL
              AND s.trial_expires_at > NOW()
            )
       );
