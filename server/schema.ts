import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  bigint,
  timestamp,
  date,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ── profiles ─────────────────────────────────────────────────────────────────
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique(),
  email: text('email'),
  fullName: text('full_name'),
  username: text('username').unique(),
  avatarUrl: text('avatar_url'),
  accountType: text('account_type').default('candidate'),
  portfolioEnabled: boolean('portfolio_enabled').default(false),
  portfolioSlug: text('portfolio_slug'),
  isSuspended: boolean('is_suspended').default(false),
  suspensionReason: text('suspension_reason'),
  adminNotes: text('admin_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ── user_preferences ─────────────────────────────────────────────────────────
export const userPreferences = pgTable('user_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => profiles.userId, { onDelete: 'cascade' }),
  theme: text('theme').default('system'),
  language: text('language').default('en'),
  emailNotifications: boolean('email_notifications').default(true),
  marketingEmails: boolean('marketing_emails').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ── subscriptions ─────────────────────────────────────────────────────────────
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => profiles.userId, { onDelete: 'cascade' }),
    planName: text('plan_name').default('free'),
    status: text('status').default('active'),
    planUpdatedAt: timestamp('plan_updated_at', { withTimezone: true }),
    trialPlan: text('trial_plan'),
    trialExpiresAt: timestamp('trial_expires_at', { withTimezone: true }),
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    couponCode: text('coupon_code'),
    stripeCustomerId: text('stripe_customer_id'),
    stripeSubscriptionId: text('stripe_subscription_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    stripeCustomerIdx: index('idx_subscriptions_stripe_customer_id').on(t.stripeCustomerId),
    stripeSubscriptionIdx: index('idx_subscriptions_stripe_subscription_id').on(
      t.stripeSubscriptionId,
    ),
  }),
);

// ── ai_credits ────────────────────────────────────────────────────────────────
export const aiCredits = pgTable('ai_credits', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => profiles.userId, { onDelete: 'cascade' }),
  dailyUsage: integer('daily_usage').default(0),
  dailyLimit: integer('daily_limit').default(5),
  usageDate: date('usage_date').defaultNow(),
  totalUsage: bigint('total_usage', { mode: 'number' }).default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ── resumes ───────────────────────────────────────────────────────────────────
export const resumes = pgTable(
  'resumes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.userId, { onDelete: 'cascade' }),
    title: text('title').notNull().default('My Resume'),
    content: jsonb('content'),
    templateId: text('template_id'),
    isPrimary: boolean('is_primary').default(false),
    isPublic: boolean('is_public').default(false),
    thumbnailUrl: text('thumbnail_url'),
    isTrial: boolean('is_trial').notNull().default(false),
    trialExpiresAt: timestamp('trial_expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    userIdx: index('idx_resumes_user_id').on(t.userId),
    userUpdatedIdx: index('idx_resumes_user_updated').on(t.userId, t.updatedAt.desc()),
    templateIdx: index('idx_resumes_template_id').on(t.templateId),
  }),
);

// ── portfolios ────────────────────────────────────────────────────────────────
export const portfolios = pgTable('portfolios', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => profiles.userId, { onDelete: 'cascade' }),
  username: text('username').notNull().unique(),
  displayName: text('display_name'),
  bio: text('bio'),
  theme: text('theme').default('default'),
  customDomain: text('custom_domain'),
  isPublished: boolean('is_published').default(false),
  settings: jsonb('settings'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ── portfolio_short_links ─────────────────────────────────────────────────────
// Defined before portfolio_visits so its FK target exists for inline reference.
export const portfolioShortLinks = pgTable(
  'portfolio_short_links',
  {
    id: text('id').primaryKey(),
    portfolioUsername: text('portfolio_username')
      .notNull()
      .references(() => portfolios.username, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    visitCount: integer('visit_count').default(0),
  },
  (t) => ({
    portfolioUsernameIdx: index('idx_portfolio_short_links_username').on(t.portfolioUsername),
  }),
);

// ── portfolio_visits ──────────────────────────────────────────────────────────
export const portfolioVisits = pgTable(
  'portfolio_visits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    username: text('username')
      .notNull()
      .references(() => portfolios.username, { onDelete: 'cascade' }),
    country: text('country'),
    city: text('city'),
    referrer: text('referrer'),
    shortLinkId: text('short_link_id').references(() => portfolioShortLinks.id, {
      onDelete: 'cascade',
    }),
    sectionsViewed: jsonb('sections_viewed').default(sql`'[]'::jsonb`),
    timeSpentSeconds: integer('time_spent_seconds'),
    device: text('device'),
    companyName: text('company_name'),
    abVariant: text('ab_variant'),
    sectionsTiming: jsonb('sections_timing').default(sql`'{}'::jsonb`),
    visitedAt: timestamp('visited_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    usernameVisitedIdx: index('idx_portfolio_visits_username_visited').on(
      t.username,
      t.visitedAt.desc(),
    ),
    shortLinkIdx: index('idx_portfolio_visits_short_link_id').on(t.shortLinkId),
  }),
);

// ── portfolio_interactions ────────────────────────────────────────────────────
export const portfolioInteractions = pgTable(
  'portfolio_interactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    token: text('token').notNull().unique(),
    portfolioUsername: text('portfolio_username')
      .notNull()
      .references(() => portfolios.username, { onDelete: 'cascade' }),
    interactionType: text('interaction_type').default('interested'),
    referrerHostname: text('referrer_hostname'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    portfolioUsernameIdx: index('idx_portfolio_interactions_username').on(t.portfolioUsername),
  }),
);

// ── job_applications ──────────────────────────────────────────────────────────
export const jobApplications = pgTable(
  'job_applications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.userId, { onDelete: 'cascade' }),
    company: text('company'),
    position: text('position'),
    status: text('status').default('applied'),
    appliedAt: timestamp('applied_at', { withTimezone: true }),
    notes: text('notes'),
    jobUrl: text('job_url'),
    salary: text('salary'),
    location: text('location'),
    resumeId: uuid('resume_id').references(() => resumes.id, { onDelete: 'cascade' }),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    userCreatedIdx: index('idx_job_applications_user_created').on(t.userId, t.createdAt.desc()),
    resumeIdx: index('idx_job_applications_resume_id').on(t.resumeId),
  }),
);

// ── interview_sessions ────────────────────────────────────────────────────────
export const interviewSessions = pgTable(
  'interview_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.userId, { onDelete: 'cascade' }),
    jobTitle: text('job_title'),
    company: text('company'),
    sessionType: text('session_type').default('behavioral'),
    questions: jsonb('questions'),
    answers: jsonb('answers'),
    feedback: jsonb('feedback'),
    score: integer('score'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    userCreatedIdx: index('idx_interview_sessions_user_created').on(t.userId, t.createdAt.desc()),
  }),
);

// ── discount_codes ────────────────────────────────────────────────────────────
export const discountCodes = pgTable('discount_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  isActive: boolean('is_active').default(true),
  discountType: text('discount_type').default('percent'),
  discountValue: integer('discount_value').default(0),
  planOverride: text('plan_override'),
  maxUses: integer('max_uses').default(0),
  usesCount: integer('uses_count').default(0),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  planDays: integer('plan_days'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ── audit_logs ────────────────────────────────────────────────────────────────
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => profiles.userId, { onDelete: 'cascade' }),
    category: text('category'),
    action: text('action').notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    userCreatedIdx: index('idx_audit_logs_user_created').on(t.userId, t.createdAt.desc()),
  }),
);

// ── error_log ─────────────────────────────────────────────────────────────────
export const errorLog = pgTable(
  'error_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    level: text('level').default('error'),
    message: text('message').notNull(),
    context: jsonb('context'),
    source: text('source'),
    userId: uuid('user_id').references(() => profiles.userId, { onDelete: 'cascade' }),
    resolved: boolean('resolved').default(false),
  },
  (t) => ({
    userCreatedIdx: index('idx_error_log_user_created').on(t.userId, t.createdAt.desc()),
  }),
);

// ── user_api_keys ──────────────────────────────────────────────────────────────
export const userApiKeys = pgTable(
  'user_api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.userId, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    encryptedKey: text('encrypted_key').notNull(),
    keyHint: text('key_hint'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    userIdx: index('idx_user_api_keys_user_id').on(t.userId),
    userProviderIdx: index('idx_user_api_keys_user_provider').on(t.userId, t.provider),
  }),
);

// ── token_exchanges ────────────────────────────────────────────────────────────
export const tokenExchanges = pgTable(
  'token_exchanges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kindeSub: text('kinde_sub').notNull(),
    userId: uuid('user_id').references(() => profiles.userId, { onDelete: 'cascade' }),
    status: text('status').default('success'),
    errorCode: text('error_code'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    userCreatedIdx: index('idx_token_exchanges_user_created').on(t.userId, t.createdAt.desc()),
  }),
);

// ── wisehire_companies ────────────────────────────────────────────────────────
export const wisehireCompanies = pgTable('wisehire_companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id')
    .notNull()
    .unique()
    .references(() => profiles.userId, { onDelete: 'cascade' }),
  name: text('name').default('My Company'),
  size: text('size'),
  logoUrl: text('logo_url'),
  website: text('website'),
  onboardingCompleted: boolean('onboarding_completed').default(false),
  settings: jsonb('settings'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ── wisehire_jobs ─────────────────────────────────────────────────────────────
export const wisehireJobs = pgTable(
  'wisehire_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => profiles.userId, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    department: text('department'),
    location: text('location'),
    type: text('type').default('full-time'),
    status: text('status').default('draft'),
    description: text('description'),
    requirements: text('requirements'),
    salary: text('salary'),
    applicationCount: integer('application_count').default(0),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    ownerCreatedIdx: index('idx_wisehire_jobs_owner_created').on(t.ownerId, t.createdAt.desc()),
  }),
);

// ── wisehire_candidates ───────────────────────────────────────────────────────
export const wisehireCandidates = pgTable(
  'wisehire_candidates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => profiles.userId, { onDelete: 'cascade' }),
    jobId: uuid('job_id').references(() => wisehireJobs.id, { onDelete: 'cascade' }),
    email: text('email'),
    fullName: text('full_name'),
    phone: text('phone'),
    resumeUrl: text('resume_url'),
    resumeText: text('resume_text'),
    linkedinUrl: text('linkedin_url'),
    portfolioUrl: text('portfolio_url'),
    pipelineStage: text('pipeline_stage').default('new'),
    aiScore: integer('ai_score'),
    aiBrief: jsonb('ai_brief'),
    notes: text('notes'),
    tags: text('tags').array(),
    metadata: jsonb('metadata'),
    maskedData: jsonb('masked_data'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    ownerCreatedIdx: index('idx_wisehire_candidates_owner_created').on(
      t.ownerId,
      t.createdAt.desc(),
    ),
    jobIdx: index('idx_wisehire_candidates_job_id').on(t.jobId),
  }),
);

// ── wisehire_pipeline_events ──────────────────────────────────────────────────
export const wisehirePipelineEvents = pgTable(
  'wisehire_pipeline_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => profiles.userId, { onDelete: 'cascade' }),
    candidateId: uuid('candidate_id')
      .notNull()
      .references(() => wisehireCandidates.id, { onDelete: 'cascade' }),
    fromStage: text('from_stage'),
    toStage: text('to_stage').notNull(),
    movedAt: timestamp('moved_at', { withTimezone: true }).defaultNow(),
    movedBy: uuid('moved_by'),
  },
  (t) => ({
    ownerMovedIdx: index('idx_wisehire_pipeline_events_owner_moved').on(
      t.ownerId,
      t.movedAt.desc(),
    ),
    candidateIdx: index('idx_wisehire_pipeline_events_candidate_id').on(t.candidateId),
  }),
);

// ── wisehire_waitlist ─────────────────────────────────────────────────────────
export const wisehireWaitlist = pgTable('wisehire_waitlist', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  fullName: text('full_name'),
  companyName: text('company_name'),
  companySize: text('company_size'),
  referralCode: text('referral_code'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ── ai_provider_breaker ───────────────────────────────────────────────────────
// Postgres-backed circuit breaker for managed AI providers (Phase 4).
// Shared across all edge function instances so a tripped breaker fan-outs
// instantly instead of each cold-start re-discovering the outage.
export const aiProviderBreaker = pgTable('ai_provider_breaker', {
  provider: text('provider').primaryKey(),
  failureCount: integer('failure_count').notNull().default(0),
  windowStartedAt: timestamp('window_started_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  openedUntil: timestamp('opened_until', { withTimezone: true }),
  // Half-open / single-probe lock — set by try_acquire_breaker_pass()
  // when a caller is granted the sole probe slot after cooldown expiry.
  probeInFlightUntil: timestamp('probe_in_flight_until', { withTimezone: true }),
  lastSuccessAt: timestamp('last_success_at', { withTimezone: true }),
  lastFailureAt: timestamp('last_failure_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── analytics_sweep_lock ──────────────────────────────────────────────────────
// Phase 5 retention sweep — single-row durable mutex. The Neon HTTP driver
// can't hold session advisory locks across statements, so we use a TTL row
// instead. See migration 20260425000000_analytics_retention.sql.
export const analyticsSweepLock = pgTable('analytics_sweep_lock', {
  id: integer('id').primaryKey().default(1),
  holder: text('holder').notNull(),
  acquiredAt: timestamp('acquired_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

// ── admin_settings ────────────────────────────────────────────────────────────
export const adminSettings = pgTable('admin_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  value: jsonb('value'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  updatedBy: uuid('updated_by'),
});
