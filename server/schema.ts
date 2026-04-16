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
  uniqueIndex,
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
  userId: uuid('user_id').notNull().unique(),
  theme: text('theme').default('system'),
  language: text('language').default('en'),
  emailNotifications: boolean('email_notifications').default(true),
  marketingEmails: boolean('marketing_emails').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ── subscriptions ─────────────────────────────────────────────────────────────
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique(),
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
});

// ── ai_credits ────────────────────────────────────────────────────────────────
export const aiCredits = pgTable('ai_credits', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique(),
  dailyUsage: integer('daily_usage').default(0),
  dailyLimit: integer('daily_limit').default(5),
  usageDate: date('usage_date').defaultNow(),
  totalUsage: bigint('total_usage', { mode: 'number' }).default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ── resumes ───────────────────────────────────────────────────────────────────
export const resumes = pgTable('resumes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  title: text('title').notNull().default('My Resume'),
  content: jsonb('content'),
  templateId: text('template_id'),
  isPrimary: boolean('is_primary').default(false),
  isPublic: boolean('is_public').default(false),
  thumbnailUrl: text('thumbnail_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ── portfolios ────────────────────────────────────────────────────────────────
export const portfolios = pgTable('portfolios', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique(),
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

// ── portfolio_visits ──────────────────────────────────────────────────────────
export const portfolioVisits = pgTable('portfolio_visits', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull(),
  country: text('country'),
  city: text('city'),
  referrer: text('referrer'),
  shortLinkId: text('short_link_id'),
  sectionsViewed: jsonb('sections_viewed').default(sql`'[]'::jsonb`),
  timeSpentSeconds: integer('time_spent_seconds'),
  device: text('device'),
  companyName: text('company_name'),
  abVariant: text('ab_variant'),
  sectionsTiming: jsonb('sections_timing').default(sql`'{}'::jsonb`),
  visitedAt: timestamp('visited_at', { withTimezone: true }).defaultNow(),
});

// ── portfolio_interactions ────────────────────────────────────────────────────
export const portfolioInteractions = pgTable('portfolio_interactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  token: text('token').notNull().unique(),
  portfolioUsername: text('portfolio_username').notNull(),
  interactionType: text('interaction_type').default('interested'),
  referrerHostname: text('referrer_hostname'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ── job_applications ──────────────────────────────────────────────────────────
export const jobApplications = pgTable('job_applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  company: text('company'),
  position: text('position'),
  status: text('status').default('applied'),
  appliedAt: timestamp('applied_at', { withTimezone: true }),
  notes: text('notes'),
  jobUrl: text('job_url'),
  salary: text('salary'),
  location: text('location'),
  resumeId: uuid('resume_id'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ── interview_sessions ────────────────────────────────────────────────────────
export const interviewSessions = pgTable('interview_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
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
});

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
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id'),
  category: text('category'),
  action: text('action').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ── error_log ─────────────────────────────────────────────────────────────────
export const errorLog = pgTable('error_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  level: text('level').default('error'),
  message: text('message').notNull(),
  context: jsonb('context'),
  source: text('source'),
  userId: uuid('user_id'),
  resolved: boolean('resolved').default(false),
});

// ── user_api_keys ──────────────────────────────────────────────────────────────
export const userApiKeys = pgTable('user_api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  provider: text('provider').notNull(),
  encryptedKey: text('encrypted_key').notNull(),
  keyHint: text('key_hint'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ── token_exchanges ────────────────────────────────────────────────────────────
export const tokenExchanges = pgTable('token_exchanges', {
  id: uuid('id').primaryKey().defaultRandom(),
  kindeSub: text('kinde_sub').notNull(),
  userId: uuid('user_id'),
  status: text('status').default('success'),
  errorCode: text('error_code'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ── portfolio_short_links ─────────────────────────────────────────────────────
export const portfolioShortLinks = pgTable('portfolio_short_links', {
  id: text('id').primaryKey(),
  portfolioUsername: text('portfolio_username').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  visitCount: integer('visit_count').default(0),
});

// ── wisehire_companies ────────────────────────────────────────────────────────
export const wisehireCompanies = pgTable('wisehire_companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull().unique(),
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
export const wisehireJobs = pgTable('wisehire_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull(),
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
});

// ── wisehire_candidates ───────────────────────────────────────────────────────
export const wisehireCandidates = pgTable('wisehire_candidates', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull(),
  jobId: uuid('job_id'),
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
});

// ── wisehire_pipeline_events ──────────────────────────────────────────────────
export const wisehirePipelineEvents = pgTable('wisehire_pipeline_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull(),
  candidateId: uuid('candidate_id').notNull(),
  fromStage: text('from_stage'),
  toStage: text('to_stage').notNull(),
  movedAt: timestamp('moved_at', { withTimezone: true }).defaultNow(),
  movedBy: uuid('moved_by'),
});

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

// ── admin_settings ────────────────────────────────────────────────────────────
export const adminSettings = pgTable('admin_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  value: jsonb('value'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  updatedBy: uuid('updated_by'),
});
