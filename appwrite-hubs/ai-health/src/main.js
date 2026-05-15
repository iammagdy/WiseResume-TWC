'use strict';

const ENDPOINT = process.env.APPWRITE_FUNCTION_API_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';

const PROVIDER_CONFIGS = [
  { key: 'OPENROUTER_KEY_1', provider: 'openrouter', url: 'https://openrouter.ai/api/v1/models' },
  { key: 'GROQ_KEY_1',       provider: 'groq',       url: 'https://api.groq.com/openai/v1/models' },
  { key: 'DEEPSEEK_KEY',     provider: 'deepseek',   url: 'https://api.deepseek.com/models' },
  { key: 'NVIDIA_KEY_1',     provider: 'nvidia',     url: 'https://integrate.api.nvidia.com/v1/models' },
];

module.exports = async ({ req, res, log }) => {
  const timestamp = new Date().toISOString();
  const providers = [];

  for (const cfg of PROVIDER_CONFIGS) {
    const apiKey = process.env[cfg.key];
    if (!apiKey) {
      providers.push({ provider: cfg.provider, ok: false, latencyMs: null, httpStatus: 0, configured: false });
      continue;
    }
    const start = Date.now();
    try {
      const response = await fetch(cfg.url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(6000),
      });
      const ok = response.status >= 200 && response.status < 300;
      providers.push({ provider: cfg.provider, ok, latencyMs: Date.now() - start, httpStatus: response.status, configured: true });
      log(`ai-health: ${cfg.provider} → ${response.status} (${Date.now() - start}ms)`);
    } catch (e) {
      providers.push({ provider: cfg.provider, ok: false, latencyMs: null, httpStatus: 0, configured: true });
      log(`ai-health: ${cfg.provider} → error: ${e.message}`);
    }
  }

  const configured = providers.filter(p => p.configured);
  const passing = configured.filter(p => p.ok);
  const status = configured.length === 0
    ? 'unknown'
    : passing.length === configured.length
      ? 'healthy'
      : passing.length > 0
        ? 'degraded'
        : 'down';

  return res.json({ status, timestamp, providers, latencyMs: passing.length > 0 ? Math.round(passing.reduce((s, p) => s + (p.latencyMs || 0), 0) / passing.length) : null });
};
