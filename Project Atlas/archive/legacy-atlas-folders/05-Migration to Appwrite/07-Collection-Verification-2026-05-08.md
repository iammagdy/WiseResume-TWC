# 07 - Live Appwrite Collection Verification (2026-05-08)

**Method:** `node-appwrite` SDK, `databases.listCollections('main', [Query.limit(100)])`, authenticated with `APPWRITE_API_KEY` against `https://fra.cloud.appwrite.io/v1`, project `69fd362b001eb325a192`.

**Result:** 96 collections. 0 storage buckets.

**MCP server:** `uvx mcp-server-appwrite` (v0.4.1) responds to JSON-RPC `initialize` handshake — output confirmed:
```json
{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05","capabilities":{"experimental":{},"resources":{"subscribe":false,"listChanged":false},"tools":{"listChanged":false}},"serverInfo":{"name":"appwrite","version":"0.4.1"}}}
```

## 96 Confirmed Collection IDs (alphabetical)

| # | Collection ID |
|---|---|
| 1 | admin_audit_logs |
| 2 | admin_sessions |
| 3 | admin_user_notes |
| 4 | ai_credits |
| 5 | ai_key_migration_audit |
| 6 | ai_provider_breaker |
| 7 | ai_routing_config |
| 8 | ai_usage_logs |
| 9 | analytics_sweep_lock |
| 10 | app_settings |
| 11 | audit_logs |
| 12 | blocklist |
| 13 | broadcasts |
| 14 | bug_reports |
| 15 | career_assessments |
| 16 | chat_messages |
| 17 | chat_sessions |
| 18 | company_briefings |
| 19 | contact_inquiries |
| 20 | contact_requests |
| 21 | coupon_redemptions |
| 22 | cover_letters |
| 23 | credit_transactions |
| 24 | device_push_tokens |
| 25 | discount_codes |
| 26 | edge_function_logs |
| 27 | email_verification_tokens |
| 28 | error_log |
| 29 | feature_flags |
| 30 | feature_requests |
| 31 | impersonation_revocations |
| 32 | interview_answers |
| 33 | interview_attempts |
| 34 | interview_question_bank |
| 35 | interview_report_tokens |
| 36 | interview_sessions |
| 37 | job_applications |
| 38 | jobs |
| 39 | kinde_events |
| 40 | linkedin_import_quota |
| 41 | messages |
| 42 | migration-ledger |
| 43 | mobile_app_versions |
| 44 | moderation_queue |
| 45 | notifications |
| 46 | ops_health_events |
| 47 | portfolio_exclusive_assignments |
| 48 | portfolio_history |
| 49 | portfolio_interactions |
| 50 | portfolio_premium_usernames |
| 51 | portfolio_reserved_usernames |
| 52 | portfolio_settings |
| 53 | portfolio_user_overrides |
| 54 | portfolio_username_rules |
| 55 | portfolio_visits |
| 56 | profiles |
| 57 | push_subscriptions |
| 58 | resignation_letters |
| 59 | resume_certifications |
| 60 | resume_educations |
| 61 | resume_experiences |
| 62 | resume_shares |
| 63 | resumes |
| 64 | rpc_rate_limits |
| 65 | share_comments |
| 66 | short_links |
| 67 | signup_otps |
| 68 | social_links |
| 69 | store_screenshots |
| 70 | subscriptions |
| 71 | tailor_history |
| 72 | talent_pool_profiles |
| 73 | talent_pool_views |
| 74 | token_exchanges |
| 75 | tool_cache |
| 76 | usage_events |
| 77 | user_api_keys |
| 78 | user_gamification |
| 79 | user_preferences |
| 80 | visitor_events |
| 81 | wisehire_applications |
| 82 | wisehire_bulk_screen_jobs |
| 83 | wisehire_candidate_briefs |
| 84 | wisehire_candidate_notes |
| 85 | wisehire_candidates |
| 86 | wisehire_clients |
| 87 | wisehire_companies |
| 88 | wisehire_invites |
| 89 | wisehire_mask_sessions |
| 90 | wisehire_outreach_emails |
| 91 | wisehire_pipeline_events |
| 92 | wisehire_roles |
| 93 | wisehire_saved_searches |
| 94 | wisehire_scorecard_templates |
| 95 | wisehire_scorecards |
| 96 | wisehire_waitlist |

## Collections in Supabase schema NOT in Appwrite (3)

| Collection ID | Status | Action required |
|---|---|---|
| resume_skills | Not created in Appwrite | Create in Console when migrating resume section hooks |
| resume_snapshots | Not created in Appwrite | Create in Console when implementing snapshot/rollback |
| resume_versions | Not created in Appwrite | Create in Console when implementing version history |

These 3 appear in `Project Atlas/01-Currently Implemented/database-tables/*.md` (reference cards written against the old Supabase schema) but were never ported to Appwrite. They are NOT in `src/lib/appwrite-collections.ts`.
