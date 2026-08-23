'use strict';

const PLAN_RANK = Object.freeze({ free: 0, pro: 1, premium: 2 });
const VALID_PAID_PLANS = new Set(['pro', 'premium']);
const VALID_PROVIDER_STATUSES = new Set(['active', 'canceled', 'billing_issue']);

function normalizePlan(value) {
  const plan = String(value || '').trim().toLowerCase();
  // Ultimate is a public display label only. It is accepted here solely as a
  // defensive read-normalization for legacy data and is never a write value.
  return plan === 'ultimate' ? 'premium' : (Object.prototype.hasOwnProperty.call(PLAN_RANK, plan) ? plan : null);
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

function buildPlanCandidates({ subscription = null, providerState = null, nowMs = Date.now() } = {}) {
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

  const providerPlan = normalizePlan(providerState?.plan);
  if (
    providerPlan &&
    VALID_PAID_PLANS.has(providerPlan) &&
    VALID_PROVIDER_STATUSES.has(String(providerState?.status || '').toLowerCase()) &&
    isFutureTimestamp(providerState?.expires_at, nowMs)
  ) {
    candidates.push(candidate(providerPlan, 'revenuecat', { expiresAt: providerState.expires_at }));
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
  normalizePlan,
  isFutureTimestamp,
  buildPlanCandidates,
  resolveEffectivePlan,
};
