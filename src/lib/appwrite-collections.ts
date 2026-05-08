/**
 * Appwrite Collections & Buckets — Single Source of Truth
 *
 * Generated from live API: 96 collections in database 'main'.
 * Last verified: 2026-05-08
 *
 * Usage:
 *   import { COLLECTIONS, DATABASE_ID } from '@/lib/appwrite-collections';
 *   databases.listDocuments(DATABASE_ID, COLLECTIONS.resumes, [...]);
 */

export const DATABASE_ID = 'main' as const;

export const COLLECTIONS = {
  // Admin
  admin_audit_logs:                  'admin_audit_logs',
  admin_sessions:                    'admin_sessions',
  admin_user_notes:                  'admin_user_notes',

  // AI
  ai_credits:                        'ai_credits',
  ai_key_migration_audit:            'ai_key_migration_audit',
  ai_provider_breaker:               'ai_provider_breaker',
  ai_routing_config:                 'ai_routing_config',
  ai_usage_logs:                     'ai_usage_logs',

  // Analytics / Ops
  analytics_sweep_lock:              'analytics_sweep_lock',
  audit_logs:                        'audit_logs',
  edge_function_logs:                'edge_function_logs',
  error_log:                         'error_log',
  ops_health_events:                 'ops_health_events',
  usage_events:                      'usage_events',
  visitor_events:                    'visitor_events',

  // App Config
  app_settings:                      'app_settings',
  feature_flags:                     'feature_flags',
  mobile_app_versions:               'mobile_app_versions',

  // Auth / Identity
  blocklist:                         'blocklist',
  email_verification_tokens:         'email_verification_tokens',
  impersonation_revocations:         'impersonation_revocations',
  kinde_events:                      'kinde_events',
  signup_otps:                       'signup_otps',
  token_exchanges:                   'token_exchanges',
  user_api_keys:                     'user_api_keys',

  // Career
  career_assessments:                'career_assessments',
  company_briefings:                 'company_briefings',
  cover_letters:                     'cover_letters',
  job_applications:                  'job_applications',
  jobs:                              'jobs',
  resignation_letters:               'resignation_letters',
  tailor_history:                    'tailor_history',

  // Chat / Messaging
  broadcasts:                        'broadcasts',
  chat_messages:                     'chat_messages',
  chat_sessions:                     'chat_sessions',
  messages:                          'messages',
  notifications:                     'notifications',

  // Coupons / Billing
  coupon_redemptions:                'coupon_redemptions',
  credit_transactions:               'credit_transactions',
  discount_codes:                    'discount_codes',
  subscriptions:                     'subscriptions',

  // Feedback / Support
  bug_reports:                       'bug_reports',
  contact_inquiries:                 'contact_inquiries',
  contact_requests:                  'contact_requests',
  feature_requests:                  'feature_requests',
  moderation_queue:                  'moderation_queue',

  // Gamification
  user_gamification:                 'user_gamification',

  // Interview
  interview_answers:                 'interview_answers',
  interview_attempts:                'interview_attempts',
  interview_question_bank:           'interview_question_bank',
  interview_report_tokens:           'interview_report_tokens',
  interview_sessions:                'interview_sessions',

  // LinkedIn
  linkedin_import_quota:             'linkedin_import_quota',

  // Migration
  migration_ledger:                  'migration-ledger',

  // Mobile / Push
  device_push_tokens:                'device_push_tokens',
  push_subscriptions:                'push_subscriptions',

  // Portfolio
  portfolio_exclusive_assignments:   'portfolio_exclusive_assignments',
  portfolio_history:                 'portfolio_history',
  portfolio_interactions:            'portfolio_interactions',
  portfolio_premium_usernames:       'portfolio_premium_usernames',
  portfolio_reserved_usernames:      'portfolio_reserved_usernames',
  portfolio_settings:                'portfolio_settings',
  portfolio_user_overrides:          'portfolio_user_overrides',
  portfolio_username_rules:          'portfolio_username_rules',
  portfolio_visits:                  'portfolio_visits',
  short_links:                       'short_links',
  social_links:                      'social_links',

  // Profiles
  profiles:                          'profiles',
  user_preferences:                  'user_preferences',

  // Rate Limiting / Cache
  rpc_rate_limits:                   'rpc_rate_limits',
  tool_cache:                        'tool_cache',

  // Resumes
  resume_certifications:             'resume_certifications',
  resume_educations:                 'resume_educations',
  resume_experiences:                'resume_experiences',
  resume_shares:                     'resume_shares',
  resumes:                           'resumes',

  // Sharing
  share_comments:                    'share_comments',

  // Store / App Screenshots
  store_screenshots:                 'store_screenshots',

  // Talent Pool
  talent_pool_profiles:              'talent_pool_profiles',
  talent_pool_views:                 'talent_pool_views',

  // WiseHire
  wisehire_applications:             'wisehire_applications',
  wisehire_bulk_screen_jobs:         'wisehire_bulk_screen_jobs',
  wisehire_candidate_briefs:         'wisehire_candidate_briefs',
  wisehire_candidate_notes:          'wisehire_candidate_notes',
  wisehire_candidates:               'wisehire_candidates',
  wisehire_clients:                  'wisehire_clients',
  wisehire_companies:                'wisehire_companies',
  wisehire_invites:                  'wisehire_invites',
  wisehire_mask_sessions:            'wisehire_mask_sessions',
  wisehire_outreach_emails:          'wisehire_outreach_emails',
  wisehire_pipeline_events:          'wisehire_pipeline_events',
  wisehire_roles:                    'wisehire_roles',
  wisehire_saved_searches:           'wisehire_saved_searches',
  wisehire_scorecard_templates:      'wisehire_scorecard_templates',
  wisehire_scorecards:               'wisehire_scorecards',
  wisehire_waitlist:                 'wisehire_waitlist',
} as const;

export type CollectionId = typeof COLLECTIONS[keyof typeof COLLECTIONS];

/**
 * Storage buckets — no buckets exist in the live project yet (verified 2026-05-08).
 * Add bucket IDs here as they are created in Appwrite Console.
 */
export const BUCKETS = {} as const;
