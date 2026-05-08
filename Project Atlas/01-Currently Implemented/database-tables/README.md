# Database Tables Index

  **Last verified:** 2026-05-08
  **Type:** index
  **Sources:**
  - `src/integrations/supabase/types.ts` (UTF-8 encoded — generated from live Supabase schema. 61 tables + 1 view + 37 RPCs as of this regeneration)
  - `supabase/migrations/` (158 migration files)
  - `project-governance/ARCHITECTURE.md` §5 + §6

  **Canonical owner:** `project-governance/ARCHITECTURE.md` §5.

  ---

  ## All tables (61)

  ### WiseResume / shared (44)

  - [admin_user_notes](./admin_user_notes.md)
- [ai_credits](./ai_credits.md)
- [ai_usage_logs](./ai_usage_logs.md)
- [app_settings](./app_settings.md)
- [audit_logs](./audit_logs.md)
- [bug_reports](./bug_reports.md)
- [career_assessments](./career_assessments.md)
- [contact_inquiries](./contact_inquiries.md)
- [contact_requests](./contact_requests.md)
- [coupon_redemptions](./coupon_redemptions.md)
- [cover_letters](./cover_letters.md)
- [credit_transactions](./credit_transactions.md)
- [discount_codes](./discount_codes.md)
- [feature_requests](./feature_requests.md)
- [interview_sessions](./interview_sessions.md)
- [job_applications](./job_applications.md)
- [jobs](./jobs.md)
- [messages](./messages.md)
- [notifications](./notifications.md)
- [portfolio_history](./portfolio_history.md)
- [portfolio_settings](./portfolio_settings.md)
- [portfolio_visits](./portfolio_visits.md)
- [profiles](./profiles.md)
- [push_subscriptions](./push_subscriptions.md)
- [resignation_letters](./resignation_letters.md)
- [resume_certifications](./resume_certifications.md)
- [resume_educations](./resume_educations.md)
- [resume_experiences](./resume_experiences.md)
- [resume_shares](./resume_shares.md)
- [resume_skills](./resume_skills.md)
- [resume_versions](./resume_versions.md)
- [resumes](./resumes.md)
- [rpc_rate_limits](./rpc_rate_limits.md)
- [share_comments](./share_comments.md)
- [short_links](./short_links.md)
- [social_links](./social_links.md)
- [store_screenshots](./store_screenshots.md)
- [subscriptions](./subscriptions.md)
- [tailor_history](./tailor_history.md)
- [token_exchanges](./token_exchanges.md)
- [usage_events](./usage_events.md)
- [user_api_keys](./user_api_keys.md)
- [user_gamification](./user_gamification.md)
- [user_preferences](./user_preferences.md)

### Newly carded (2026-05-08 reconciliation)

Previously listed only in migrations / `types.ts`, now have reference cards:

- [admin_sessions](./admin_sessions.md)
- [ai_key_migration_audit](./ai_key_migration_audit.md)
- [ai_provider_breaker](./ai_provider_breaker.md)
- [ai_routing_config](./ai_routing_config.md)
- [analytics_sweep_lock](./analytics_sweep_lock.md)
- [blocklist](./blocklist.md)
- [broadcasts](./broadcasts.md)
- [company_briefings](./company_briefings.md)
- [device_push_tokens](./device_push_tokens.md)
- [edge_function_logs](./edge_function_logs.md)
- [email_verification_tokens](./email_verification_tokens.md)
- [error_log](./error_log.md)
- [feature_flags](./feature_flags.md)
- [impersonation_revocations](./impersonation_revocations.md)
- [interview_answers](./interview_answers.md)
- [interview_attempts](./interview_attempts.md)
- [interview_question_bank](./interview_question_bank.md)
- [interview_report_tokens](./interview_report_tokens.md)
- [kinde_events](./kinde_events.md)
- [linkedin_import_quota](./linkedin_import_quota.md)
- [mobile_app_versions](./mobile_app_versions.md)
- [moderation_queue](./moderation_queue.md)
- [ops_health_events](./ops_health_events.md)
- [portfolio_exclusive_assignments](./portfolio_exclusive_assignments.md)
- [portfolio_interactions](./portfolio_interactions.md)
- [portfolio_premium_usernames](./portfolio_premium_usernames.md)
- [portfolio_reserved_usernames](./portfolio_reserved_usernames.md)
- [portfolio_username_rules](./portfolio_username_rules.md)
- [portfolio_user_overrides](./portfolio_user_overrides.md)
- [resume_snapshots](./resume_snapshots.md)
- [signup_otps](./signup_otps.md)
- [visitor_events](./visitor_events.md)

> `kill_switches` is **not** a separate table — it is the `kill_switch_function` column on [`feature_flags`](./feature_flags.md). See `critical-systems/16-feature-flags-and-kill-switches.md`.

### WiseHire (17)

- [talent_pool_profiles](./talent_pool_profiles.md)
- [talent_pool_views](./talent_pool_views.md)
- [wisehire_applications](./wisehire_applications.md)
- [wisehire_bulk_screen_jobs](./wisehire_bulk_screen_jobs.md)
- [wisehire_candidate_briefs](./wisehire_candidate_briefs.md)
- [wisehire_candidate_notes](./wisehire_candidate_notes.md)
- [wisehire_candidates](./wisehire_candidates.md)
- [wisehire_clients](./wisehire_clients.md)
- [wisehire_companies](./wisehire_companies.md)
- [wisehire_invites](./wisehire_invites.md)
- [wisehire_outreach_emails](./wisehire_outreach_emails.md)
- [wisehire_pipeline_events](./wisehire_pipeline_events.md)
- [wisehire_roles](./wisehire_roles.md)
- [wisehire_saved_searches](./wisehire_saved_searches.md)
- [wisehire_scorecard_templates](./wisehire_scorecard_templates.md)
- [wisehire_scorecards](./wisehire_scorecards.md)
- [wisehire_waitlist](./wisehire_waitlist.md)

---

  ## RPCs (Postgres functions, 37 in generated types)

  These are exposed via PostgREST as `supabase.rpc(...)`. They are not individually carded — see `src/integrations/supabase/types.ts` for signatures and `supabase/migrations/` for definitions.

  ```
  add_share_comment, admin_grant_trial, admin_revoke_trial, admin_set_credits,
  admin_set_user_plan, admin_suspend_user, atomic_attempt_and_deduct_credit,
  check_email_rate_limit, check_username_available, cleanup_stale_data,
  deduct_ai_credits, get_all_users_admin, get_all_users_admin_v2,
  get_app_settings, get_clerk_user_id, get_my_plan,
  get_portfolio_active_status, get_portfolio_analytics, get_public_portfolio,
  get_share_comments, get_user_api_key_info, hash_share_password,
  increment_ai_usage, increment_portfolio_views, increment_share_view_count,
  increment_short_link_clicks, record_portfolio_visit, redeem_coupon,
  resolve_short_link, restore_resume, safe_uid, soft_delete_resume,
  soft_delete_resumes, upsert_ai_credits_limit, verify_share_password,
  wisehire_activate_early_access, wisehire_redeem_early_access_code
  ```

  The most security-critical RPC is **`atomic_attempt_and_deduct_credit`** (per Decision #6 — fail-closed credit deduction); it is now present in the generated types snapshot above as well as in `supabase/migrations/`.

  ## Views

  - `user_api_keys_safe` — sanitised view of `user_api_keys` (no encrypted values exposed).

  ---

  ## Notes

  - `src/integrations/supabase/types.ts` is now **UTF-8 encoded** (the previous UTF-16 LE snapshot has been replaced by a fresh `supabase gen types typescript` run against project `jnsfmkzgxsviuthaqlyy`). Read with the default UTF-8 reader.
  - Migrations exist for `chat_sessions`, `chat_messages`, `tool_cache`, and `admin_audit_logs` (`supabase/migrations/20260415161238_chat_sessions.sql`, `20260415165312_tool_cache.sql`, `20260410200000_admin_audit_log.sql`) but those tables are **not present in the live `public` schema** — they did not appear in the regenerated types either. Their pre-existing reference cards in this directory describe planned/migration state, not live state. Re-run the types generator after applying those migrations.
  - `linkedin_imports` is **planned, not built** — it lives in `Project Atlas/03-Ideas/` only.
  - All tables have RLS enabled. Most recent hardening: `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql`.

  **Maintenance:** when you add a table:
  1. Add a migration in `supabase/migrations/`.
  2. Apply via `apply-rpc-migration.yml` (`db-migration.yml` is broken).
  3. Regenerate `types.ts` (run `.github/workflows/generate-supabase-types.yml`, or locally: `SUPABASE_ACCESS_TOKEN=… npx supabase gen types typescript --project-id jnsfmkzgxsviuthaqlyy > src/integrations/supabase/types.ts`).
  4. Add a reference card here.
  5. Update this index and `project-governance/ARCHITECTURE.md` §5.
