function deriveExactUserCounts(totalAuthUsers, unverifiedUsersTotal) {
  return {
    totalAuthUsers: totalAuthUsers == null ? null : totalAuthUsers,
    unverifiedUsersTotal: unverifiedUsersTotal == null ? null : unverifiedUsersTotal,
    verifiedUsers: totalAuthUsers != null && unverifiedUsersTotal != null
      ? Math.max(0, totalAuthUsers - unverifiedUsersTotal)
      : null,
  };
}

function effectivePlanCount(effectiveResult) {
  if (!effectiveResult || effectiveResult.error) return null;
  return effectiveResult.total ?? 0;
}

function buildUsageStats(documents, { requestedLimit = 50, availableTotal = null, error = false } = {}) {
  const docs = Array.isArray(documents) ? documents : [];
  if (error) {
    return {
      total: null,
      requestedLimit,
      availableTotal: null,
      attributedTotal: null,
      unattributed: null,
      openrouter: null,
      groq: null,
      deepseek: null,
      nvidia: null,
    };
  }

  const counts = {
    total: docs.length,
    requestedLimit,
    availableTotal: availableTotal ?? docs.length,
    attributedTotal: 0,
    unattributed: 0,
    openrouter: 0,
    groq: 0,
    deepseek: 0,
    nvidia: 0,
  };
  for (const doc of docs) {
    const provider = String(doc?.provider || '').toLowerCase();
    if (provider.includes('openrouter')) counts.openrouter += 1;
    else if (provider.includes('groq')) counts.groq += 1;
    else if (provider.includes('deepseek')) counts.deepseek += 1;
    else if (provider.includes('nvidia')) counts.nvidia += 1;
    else counts.unattributed += 1;
  }
  counts.attributedTotal = counts.openrouter + counts.groq + counts.deepseek + counts.nvidia;
  return counts;
}

function summarizeCompletionHealth(results, provider) {
  const entries = Object.entries(results || {})
    .filter(([key]) => key.startsWith(`${provider}:`))
    .map(([, value]) => value || {});
  if (entries.some(entry => entry.status === 'success')) return 'healthy';
  if (entries.length === 0) return 'no_recorded_probe';
  return String(entries[0].status || 'unknown').toLowerCase();
}

module.exports = {
  deriveExactUserCounts,
  effectivePlanCount,
  buildUsageStats,
  summarizeCompletionHealth,
};

module.exports._test = module.exports;

