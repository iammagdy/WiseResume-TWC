'use strict';

function classifyCompletionStatuses(entries) {
  const normalized = (Array.isArray(entries) ? entries : []).map(entry => ({
    status: String(entry?.status || 'unknown').toLowerCase(),
    latencyMs: entry?.latencyMs,
  }));

  if (normalized.length === 0) {
    return { status: 'no_recorded_probe', healthyCount: 0, totalCount: 0, healthyLatencyMs: null };
  }

  const healthy = normalized.filter(entry => entry.status === 'success');
  if (healthy.length === normalized.length) {
    return {
      status: 'healthy',
      healthyCount: healthy.length,
      totalCount: normalized.length,
      healthyLatencyMs: healthy[0]?.latencyMs ?? null,
    };
  }

  if (healthy.length > 0) {
    return { status: 'mixed', healthyCount: healthy.length, totalCount: normalized.length, healthyLatencyMs: null };
  }

  return {
    status: normalized[0].status,
    healthyCount: 0,
    totalCount: normalized.length,
    healthyLatencyMs: null,
  };
}

module.exports = { classifyCompletionStatuses };
