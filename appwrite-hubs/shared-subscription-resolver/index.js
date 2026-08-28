'use strict';

const PLAN_RANK = Object.freeze({ free: 0, pro: 1, premium: 2 });
const VALID_PAID_PLANS = new Set(['pro', 'premium']);
const VALID_PROVIDER_STATUSES = new Set(['active', 'canceled', 'billing_issue']);
const VALID_PROVIDER_ENVIRONMENTS = new Set(['sandbox', 'production']);

function normalizePlan(value) {
  const plan = String(value || '').trim().toLowerCase();
  // Ultimate is a public display label only. It is accepted here solely as a
  // defensive read-normalization for legacy data and is never a write value.
  return plan === 'ultimate' ? 'premium' : (Object.prototype.hasOwnProperty.call(PLAN_RANK, plan) ? plan : null);
}

function normalizeProviderEnvironment(value) {
  const environment = String(value || '').trim().toLowerCase();
  return VALID_PROVIDER_ENVIRONMENTS.has(environment) ? environment : '';
}

function configuredProviderEnvironment(env = process.env) {
  return normalizeProviderEnvironment(env.BILLING_ACCESS_ENVIRONMENT || env.BILLING_CHECKOUT_ENVIRONMENT);
}

function isFutureTimestamp(value, nowMs = Date.now()) {
  const timestamp = new Date(value || 0).getTime();
  return Number.isFinite(timestamp) && timestamp > nowMs;
}

function candidate(plan, source, metadata = {}) {
  const normalized = normalizePlan(plan);
  if (!normalized) return null;
  return { plan: normalized, source, ...metadata };
}

function buildPlanCandidates({ subscription = null, providerState = null, providerEnvironment = '', nowMs = Date.now() } = {}) {
  const candidates = [candidate('free', 'free')];

  // The legacy plan field is the durable manual/admin or coupon entitlement.
  // effective_plan is used only as a compatibility fallback for older rows
  // that predate plan population; it is never treated as provider state.
  const basePlan = subscription?.plan ?? subscription?.effective_plan;
  const manualCandidate = candidate(basePlan, subscription?.coupon_code ? 'coupon' : 'manual/admin');
  if (manualCandidate) candidates.push(manualCandidate);

  const trialPlan = normalizePlan(subscription?.trial_plan);
  if (trialPlan && isFutureTimestamp(subscription?.trial_expires_at, nowMs)) {
    candidates.push(candidate(trialPlan, 'active trial', { expiresAt: subscription.trial_expires_at }));
  }

  // Provider state is accepted only when a trusted caller supplies an explicit
  // mode and the persisted provider state carries the same mode. Unknown mode
  // is deliberately fail-closed so Sandbox state cannot grant future Production access.
  const selectedEnvironment = normalizeProviderEnvironment(providerEnvironment);
  const stateEnvironment = normalizeProviderEnvironment(providerState?.environment);
  const providerPlan = normalizePlan(providerState?.plan);
  if (
    selectedEnvironment &&
    stateEnvironment === selectedEnvironment &&
    providerPlan &&
    VALID_PAID_PLANS.has(providerPlan) &&
    VALID_PROVIDER_STATUSES.has(String(providerState?.status || '').toLowerCase()) &&
    isFutureTimestamp(providerState?.expires_at, nowMs)
  ) {
    candidates.push(candidate(providerPlan, 'revenuecat', {
      expiresAt: providerState.expires_at,
      providerEnvironment: selectedEnvironment,
    }));
  }

  return candidates;
}

function resolveEffectivePlan(input = {}) {
  const candidates = buildPlanCandidates(input);
  return candidates.reduce((best, current) => (
    PLAN_RANK[current.plan] > PLAN_RANK[best.plan] ? current : best
  ), candidates[0]);
}

module.exports = {
  PLAN_RANK,
  VALID_PAID_PLANS,
  VALID_PROVIDER_STATUSES,
  VALID_PROVIDER_ENVIRONMENTS,
  normalizePlan,
  normalizeProviderEnvironment,
  configuredProviderEnvironment,
  isFutureTimestamp,
  buildPlanCandidates,
  resolveEffectivePlan,
};
