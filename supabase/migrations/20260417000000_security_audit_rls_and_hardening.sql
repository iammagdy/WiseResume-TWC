-- ============================================================
-- Security Audit: Task #9 — RLS Policy Verification & Hardening
-- ============================================================
-- This migration documents and locks down RLS for all critical
-- user-data tables. No policy is loosened — only tightened.
-- 
-- Tables audited:
--   resumes, profiles, job_applications, resume_shares,
--   ai_credits, subscriptions, credit_transactions,
--   user_preferences, user_api_keys, portfolio_settings,
--   portfolio_history, portfolio_visits, rpc_rate_limits
-- ============================================================

-- --------------------------------------------------------
-- 1. CREDIT TRANSACTIONS — block direct client writes
--    Only service_role may insert/update/delete transactions.
--    Clients can view their own history (existing SELECT policy
--    stays), but any direct INSERT/UPDATE/DELETE is denied.
-- --------------------------------------------------------
DROP POLICY IF EXISTS "block_client_insert_credit_transactions" ON public.credit_transactions;
CREATE POLICY "block_client_insert_credit_transactions"
  ON public.credit_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "block_client_update_credit_transactions" ON public.credit_transactions;
CREATE POLICY "block_client_update_credit_transactions"
  ON public.credit_transactions
  FOR UPDATE
  TO authenticated
  USING (false);

DROP POLICY IF EXISTS "block_client_delete_credit_transactions" ON public.credit_transactions;
CREATE POLICY "block_client_delete_credit_transactions"
  ON public.credit_transactions
  FOR DELETE
  TO authenticated
  USING (false);

-- --------------------------------------------------------
-- 2. SUBSCRIPTIONS — block direct client writes
--    Subscription lifecycle is managed by Stripe webhooks
--    via service_role. Clients may only read their own row.
-- --------------------------------------------------------
DROP POLICY IF EXISTS "block_client_insert_subscriptions" ON public.subscriptions;
CREATE POLICY "block_client_insert_subscriptions"
  ON public.subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "block_client_update_subscriptions" ON public.subscriptions;
CREATE POLICY "block_client_update_subscriptions"
  ON public.subscriptions
  FOR UPDATE
  TO authenticated
  USING (false);

DROP POLICY IF EXISTS "block_client_delete_subscriptions" ON public.subscriptions;
CREATE POLICY "block_client_delete_subscriptions"
  ON public.subscriptions
  FOR DELETE
  TO authenticated
  USING (false);

-- --------------------------------------------------------
-- 3. AI CREDITS — confirm client UPDATE is blocked
--    The UPDATE policy was removed in a previous migration
--    (20260213065839). This is idempotent confirmation.
-- --------------------------------------------------------
DROP POLICY IF EXISTS "Users can update own credits" ON public.ai_credits;

-- --------------------------------------------------------
-- 4. RPC RATE LIMITS — no client access at all
--    RLS is already enabled with no policies, which means
--    all client-side access is denied by default. We add
--    explicit block policies for documentation clarity.
-- --------------------------------------------------------
DROP POLICY IF EXISTS "block_client_select_rpc_rate_limits" ON public.rpc_rate_limits;
CREATE POLICY "block_client_select_rpc_rate_limits"
  ON public.rpc_rate_limits
  FOR SELECT
  TO authenticated
  USING (false);

DROP POLICY IF EXISTS "block_client_insert_rpc_rate_limits" ON public.rpc_rate_limits;
CREATE POLICY "block_client_insert_rpc_rate_limits"
  ON public.rpc_rate_limits
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- --------------------------------------------------------
-- 5. STORAGE: avatars bucket — enforce image-only uploads
--    Update the bucket's allowed MIME types to accept only
--    image/* content. The frontend already enforces this
--    client-side; this adds server-side enforcement.
-- --------------------------------------------------------
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    file_size_limit = 5242880  -- 5 MB
WHERE id = 'avatars';

-- --------------------------------------------------------
-- 6. PORTFOLIO SETTINGS — ensure no stale anon policies
--    Explicitly re-confirm owner-only access (idempotent).
-- --------------------------------------------------------
DROP POLICY IF EXISTS "anon_read_portfolio_settings" ON public.portfolio_settings;

-- --------------------------------------------------------
-- 7. USER API KEYS — confirm no plaintext SELECT
--    Keys were already locked to owner via get_clerk_user_id().
--    Add a comment documenting the masking pattern.
-- --------------------------------------------------------
COMMENT ON TABLE public.user_api_keys IS
  'BYOK API keys table. RLS restricts all operations to key owner. '
  'Keys are stored and should only be accessed via service_role '
  'within Edge Functions (getUserKeyAndUrlFromDB), never exposed '
  'raw to the browser.';

-- --------------------------------------------------------
-- 8. Audit comment — document verified coverage
-- --------------------------------------------------------
COMMENT ON TABLE public.credit_transactions IS
  'Credit ledger. Clients: SELECT own rows only. '
  'INSERT/UPDATE/DELETE: service_role only (Stripe webhook / atomic_attempt_and_deduct_credit RPC).';

COMMENT ON TABLE public.subscriptions IS
  'Plan subscriptions. Clients: SELECT own row only. '
  'Mutations managed by Stripe webhooks via service_role.';

COMMENT ON TABLE public.ai_credits IS
  'Daily AI credit counters. Client UPDATE policy intentionally removed '
  'to prevent self-inflation. Mutations via atomic_attempt_and_deduct_credit RPC (service_role).';
