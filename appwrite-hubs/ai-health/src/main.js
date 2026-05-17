'use strict';

const PROVIDER_ENDPOINTS = {
  groq:       'https://api.groq.com/openai/v1/models',
  openrouter: 'https://openrouter.ai/api/v1/models',
  deepseek:   'https://api.deepseek.com/models',
  nvidia:     'https://integrate.api.nvidia.com/v1/models',
};

module.exports = async ({ req, res, log }) => {
  const timestamp = new Date().toISOString();

  // Collect every configured key across all providers
  const checks = [];
  for (const [provider, url] of Object.entries(PROVIDER_ENDPOINTS)) {
    const envVars = provider === 'deepseek'
      ? ['DEEPSEEK_KEY']
      : ['1', '2', '3'].map(n => `${provider.toUpperCase()}_KEY_${n}`);

    for (const envVar of envVars) {
      const apiKey = process.env[envVar];
      if (!apiKey) continue;
      checks.push({ provider, envVar, apiKey, url });
    }
  }

  // Probe all keys in parallel — no waiting on stragglers
  const results = await Promise.all(checks.map(async ({ provider, envVar, apiKey, url }) => {
    const start = Date.now();
    try {
      const response = await fetch(url, {
        method:  'GET',
        headers: { Authorization: `Bearer ${apiKey}` },
        signal:  AbortSignal.timeout(6000),
      });
      const ok        = response.status >= 200 && response.status < 300;
      const latencyMs = Date.now() - start;
      log(`ai-health: ${envVar} → ${response.status} (${latencyMs}ms)`);
      return { provider, envVar, ok, latencyMs, httpStatus: response.status };
    } catch (e) {
      log(`ai-health: ${envVar} → error: ${e.message}`);
      return { provider, envVar, ok: false, latencyMs: null, httpStatus: 0 };
    }
  }));

  // Aggregate per-provider: healthy if ANY key for that provider responds OK
  const providerSummary = {};
  for (const r of results) {
    if (!providerSummary[r.provider]) {
      providerSummary[r.provider] = { ok: false, latencyMs: null, keysTested: 0, keysOk: 0 };
    }
    const p = providerSummary[r.provider];
    p.keysTested++;
    if (r.ok) {
      p.keysOk++;
      p.ok = true;
      // Keep the best (lowest) latency across all keys for this provider
      if (p.latencyMs === null || r.latencyMs < p.latencyMs) p.latencyMs = r.latencyMs;
    }
  }

  const providers = Object.entries(providerSummary).map(([provider, s]) => ({
    provider,
    ok:          s.ok,
    latencyMs:   s.latencyMs,
    keysTested:  s.keysTested,
    keysOk:      s.keysOk,
    configured:  true,
  }));

  const passing = providers.filter(p => p.ok);
  const status  = providers.length === 0     ? 'unknown'
    : passing.length === providers.length    ? 'healthy'
    : passing.length > 0                     ? 'degraded'
    :                                          'down';

  const avgLatency = passing.length > 0
    ? Math.round(passing.reduce((s, p) => s + (p.latencyMs || 0), 0) / passing.length)
    : null;

  return res.json({ status, timestamp, providers, latencyMs: avgLatency });
};
