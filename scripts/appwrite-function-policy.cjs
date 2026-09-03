'use strict';

/**
 * Canonical Appwrite Function execution policy.
 *
 * `execute` controls client-SDK invocation only. Appwrite schedules, events,
 * and Server SDK calls authenticated with an API key remain available when the
 * list is empty.
 */
const FUNCTION_EXECUTION_POLICIES = Object.freeze({
  'resume-section-ai': Object.freeze({
    classification: 'authenticated-user',
    caller: 'Resume editor through src/lib/appwrite-functions.ts',
    handlerAuth: 'Validates an Appwrite JWT and resolves the user account',
    execute: Object.freeze(['users']),
  }),
  'job-import': Object.freeze({
    classification: 'authenticated-user',
    caller: 'Authenticated upload and job-import flows through src/lib/appwrite-functions.ts',
    handlerAuth: 'Validates an Appwrite JWT before URL fetch, AI, credits, or writes',
    execute: Object.freeze(['users']),
  }),
  'ai-gateway': Object.freeze({
    classification: 'authenticated-user',
    caller: 'Authenticated AI features through src/lib/appwrite-functions.ts',
    handlerAuth: 'Validates Appwrite JWTs; purpose-signed tokens protect approved internal smoke actions',
    execute: Object.freeze(['users']),
  }),
  coupons: Object.freeze({
    classification: 'anonymous-public',
    caller: 'Public coupon validation and authenticated redemption/subscription reads',
    handlerAuth: 'Validation is public; redemption and subscription actions validate an Appwrite JWT',
    execute: Object.freeze(['any']),
  }),
  'billing-checkout': Object.freeze({
    classification: 'authenticated-user',
    caller: 'Authenticated subscription checkout intent through the future server-owned billing flow',
    handlerAuth: 'Resolves the canonical Appwrite user from an Appwrite JWT before any storage or provider call',
    execute: Object.freeze(['users']),
  }),
  'wisehire-gateway': Object.freeze({
    classification: 'authenticated-user',
    caller: 'WiseHire frontend actions through src/lib/appwrite-functions.ts',
    handlerAuth: 'Validates an Appwrite JWT and verifies WiseHire membership/role',
    execute: Object.freeze(['users']),
  }),
  'public-share': Object.freeze({
    classification: 'anonymous-public',
    caller: 'Public resume content/feedback, owner share management, portfolio chat, and interest flows',
    handlerAuth: 'Action-specific hashed bearer tokens, signed capabilities, owner JWTs, validation, and persistent rate limits',
    execute: Object.freeze(['any']),
  }),
  'ai-health': Object.freeze({
    classification: 'authenticated-user',
    caller: 'Authenticated application and DevKit health checks',
    handlerAuth: 'Validates an Appwrite JWT and rejects anonymous requests',
    execute: Object.freeze(['users']),
  }),
  'admin-devkit-data': Object.freeze({
    classification: 'admin-only',
    caller: 'Authenticated DevKit and DevKit2 clients',
    handlerAuth: 'Validates Appwrite JWT/admin label for login and signed DevKit tokens for actions',
    execute: Object.freeze(['users']),
  }),
  'admin-email': Object.freeze({
    classification: 'admin-only',
    caller: 'Authenticated DevKit email panels',
    handlerAuth: 'Requires a signed DevKit token',
    execute: Object.freeze(['users']),
  }),
  'admin-testmail': Object.freeze({
    classification: 'admin-only',
    caller: 'Authenticated DevKit Testmail panel',
    handlerAuth: 'Requires a signed DevKit token',
    execute: Object.freeze(['users']),
  }),
  'admin-feature-flags': Object.freeze({
    classification: 'admin-only',
    caller: 'Authenticated DevKit feature controls',
    handlerAuth: 'Requires a signed DevKit token',
    execute: Object.freeze(['users']),
  }),
  'admin-moderation': Object.freeze({
    classification: 'admin-only',
    caller: 'Authenticated DevKit moderation tools',
    handlerAuth: 'Requires a signed DevKit token',
    execute: Object.freeze(['users']),
  }),
  'admin-portfolio-usernames': Object.freeze({
    classification: 'admin-only',
    caller: 'Authenticated DevKit portfolio username tools',
    handlerAuth: 'Requires a signed DevKit token',
    execute: Object.freeze(['users']),
  }),
  'admin-visitor-analytics': Object.freeze({
    classification: 'admin-only',
    caller: 'Authenticated DevKit analytics panels',
    handlerAuth: 'Requires a signed DevKit token',
    execute: Object.freeze(['users']),
  }),
  'admin-onboarding-funnel': Object.freeze({
    classification: 'admin-only',
    caller: 'Authenticated DevKit onboarding analytics',
    handlerAuth: 'Requires a signed DevKit token',
    execute: Object.freeze(['users']),
  }),
  'admin-impersonate': Object.freeze({
    classification: 'admin-only',
    caller: 'Authenticated DevKit Act As lifecycle',
    handlerAuth: 'Requires signed DevKit or purpose-bound impersonation tokens',
    execute: Object.freeze(['users']),
  }),
  'inspect-ai-keys': Object.freeze({
    classification: 'admin-only',
    caller: 'Authenticated DevKit AI key inspection tools',
    handlerAuth: 'Requires a signed DevKit token',
    execute: Object.freeze(['users']),
  }),
  'admin-deploy-hubs': Object.freeze({
    classification: 'admin-only',
    caller: 'Authenticated DevKit deployment panel',
    handlerAuth: 'Requires a signed DevKit token',
    execute: Object.freeze(['users']),
  }),
  'admin-sentry': Object.freeze({
    classification: 'signed-internal',
    caller: 'Sentry webhook delivery and authenticated DevKit Sentry tools',
    handlerAuth: 'Requires a valid Sentry webhook signature or signed DevKit token',
    execute: Object.freeze(['any']),
  }),
  'revenuecat-webhook': Object.freeze({
    classification: 'anonymous-public',
    caller: 'RevenueCat HTTPS webhook delivery',
    handlerAuth: 'Requires constant-time comparison of the Authorization secret before parsing or mutating state',
    execute: Object.freeze(['any']),
  }),
  'paypal-webhook': Object.freeze({
    classification: 'anonymous-public',
    caller: 'PayPal HTTPS webhook delivery',
    handlerAuth: 'Requires successful PayPal webhook signature verification before parsing or mutating state',
    execute: Object.freeze(['any']),
  }),
  'email-service': Object.freeze({
    classification: 'anonymous-public',
    caller: 'Public auth email flows, authenticated account actions, and signed internal admin email actions',
    handlerAuth: 'Action-specific Appwrite JWT, OTP challenge, signed internal HMAC, or signed DevKit validation',
    execute: Object.freeze(['any']),
  }),
  'portfolio-gate': Object.freeze({
    classification: 'anonymous-public',
    caller: 'Public portfolio route gate and Appwrite warmup schedule',
    handlerAuth: 'Public read-only gate with bounded input; schedule warmup is side-effect free',
    execute: Object.freeze(['any']),
  }),
  'get-public-portfolio': Object.freeze({
    classification: 'anonymous-public',
    caller: 'Public portfolio route and Appwrite warmup schedule',
    handlerAuth: 'Public sanitized response with password/session controls and durable throttling',
    execute: Object.freeze(['any']),
  }),
  'verify-portfolio-password': Object.freeze({
    classification: 'anonymous-public',
    caller: 'Public portfolio password gate',
    handlerAuth: 'Password verification with durable fail-closed throttling',
    execute: Object.freeze(['any']),
  }),
  'portfolio-settings': Object.freeze({
    classification: 'authenticated-user',
    caller: 'Authenticated portfolio editor',
    handlerAuth: 'Validates an Appwrite JWT and derives the owner ID server-side',
    execute: Object.freeze(['users']),
  }),
  'track-visitor-event': Object.freeze({
    classification: 'anonymous-public',
    caller: 'Public and authenticated browser analytics ingestion',
    handlerAuth: 'Public bounded ingestion with event allowlist, bot guard, sanitization, and throttling',
    execute: Object.freeze(['any']),
  }),
  'job-feed-sync': Object.freeze({
    classification: 'schedule/internal-service-only',
    caller: 'Appwrite schedule and scripts/trigger-sync.cjs through an API-key Server SDK',
    handlerAuth: 'Appwrite execute policy denies Client SDK calls; schedule and API-key calls are platform-authorized',
    execute: Object.freeze([]),
  }),
  'get-remote-jobs': Object.freeze({
    classification: 'anonymous-public',
    caller: 'Remote Jobs feed; optionally enriches results for authenticated users',
    handlerAuth: 'Public read-only feed; optional Appwrite JWT controls user-action enrichment',
    execute: Object.freeze(['any']),
  }),
  'track-job-action': Object.freeze({
    classification: 'authenticated-user',
    caller: 'Authenticated Remote Jobs action mutations',
    handlerAuth: 'Validates an Appwrite JWT before any user-action write',
    execute: Object.freeze(['users']),
  }),
});

const VALID_CLASSIFICATIONS = new Set([
  'anonymous-public',
  'authenticated-user',
  'admin-only',
  'signed-internal',
  'schedule/internal-service-only',
]);

function getFunctionExecutionPolicy(hubId) {
  const policy = FUNCTION_EXECUTION_POLICIES[hubId];
  if (!policy) {
    throw new Error(`Missing explicit Appwrite execution policy for ${hubId}`);
  }
  return policy;
}

function assertFunctionPolicyCoverage(hubIds) {
  const uniqueIds = [...new Set(hubIds)];
  const missing = uniqueIds.filter(id => !FUNCTION_EXECUTION_POLICIES[id]);
  const extra = Object.keys(FUNCTION_EXECUTION_POLICIES).filter(id => !uniqueIds.includes(id));
  const invalid = Object.entries(FUNCTION_EXECUTION_POLICIES)
    .filter(([, policy]) => !VALID_CLASSIFICATIONS.has(policy.classification))
    .map(([id]) => id);
  if (missing.length || extra.length || invalid.length) {
    throw new Error(
      `Appwrite policy mismatch: missing=[${missing.join(',')}], extra=[${extra.join(',')}], invalid=[${invalid.join(',')}]`,
    );
  }
}

function parseExplicitHubTargets(rawValue, knownHubIds = Object.keys(FUNCTION_EXECUTION_POLICIES)) {
  const raw = String(rawValue || '').trim();
  if (!raw) throw new Error('At least one explicit Appwrite hub target is required.');
  const requested = [...new Set(raw.split(',').map(value => value.trim()).filter(Boolean))];
  if (requested.includes('all')) {
    throw new Error('target=all is prohibited. Name the approved Appwrite hub IDs explicitly.');
  }
  const unknown = requested.filter(id => !knownHubIds.includes(id));
  if (unknown.length) throw new Error(`Unknown Appwrite hub target(s): ${unknown.join(', ')}`);
  return requested;
}

module.exports = {
  FUNCTION_EXECUTION_POLICIES,
  assertFunctionPolicyCoverage,
  getFunctionExecutionPolicy,
  parseExplicitHubTargets,
};
