/**
 * End-to-end test runner for the smart model router.
 *
 * For every tool registered in the router:
 *   1. Look up the routing decision via `selectProviderForTool(toolName)`.
 *   2. Call the chosen provider with a realistic prompt for that tool.
 *   3. Validate the response shape (JSON parses, required keys, no `<think>`,
 *      tool-specific checks like PII redaction).
 *   4. Print a per-tool PASS/FAIL line plus a summary at the end.
 *
 * Run from the project root:
 *   node_modules/.bin/tsx tests/model-comparison/runner.ts
 *
 * Optional flags (env vars):
 *   ONLY=enhance-section,tailor-resume   # comma-separated tool subset
 *   CONCURRENCY=4                        # parallel calls per provider (default 3)
 */

import { selectProviderForTool, ALL_ROUTES } from '../../supabase/functions/_shared/modelRouter.ts';
import { callGemma, callElephant, callQwen, type ProviderResult } from './providers.ts';
import { ALL_SCENARIOS, type Scenario } from './scenarios.ts';

// Default to sequential — free-tier rate limits otherwise create false failures.
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 1);
const INTER_CALL_DELAY_MS = Number(process.env.DELAY_MS ?? 1500);
const ONLY = process.env.ONLY?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];

type ToolResult = {
  tool: string;
  provider: string;
  model: string;
  ok: boolean;
  latencyMs: number;
  reason?: string;
  preview: string;
};

function callForRoute(provider: string, scenario: Scenario): Promise<ProviderResult> {
  const opts = {
    systemPrompt: scenario.systemPrompt,
    userPrompt: scenario.userPrompt,
    maxTokens: scenario.maxTokens,
    jsonMode: !!scenario.jsonMode,
  };
  switch (provider) {
    case 'openrouter':  return callGemma(opts);
    case 'openrouter2': return callElephant(opts);
    case 'groq':        return callQwen(opts);
    case 'auto':        return callGemma(opts); // mirrors aiClient fallback chain start
    default:
      return Promise.resolve({
        provider: 'gemma' as const,
        model: '<unknown>',
        ok: false,
        content: '',
        latencyMs: 0,
        error: `unknown provider "${provider}"`,
      });
  }
}

async function runOne(scenario: Scenario): Promise<ToolResult> {
  const route = selectProviderForTool(scenario.tool);
  const t0 = Date.now();
  const res = await callForRoute(route.provider, scenario);
  const latencyMs = Date.now() - t0;

  if (!res.ok) {
    return {
      tool: scenario.tool,
      provider: route.provider,
      model: route.model,
      ok: false,
      latencyMs,
      reason: res.error?.slice(0, 200) ?? 'provider call failed',
      preview: '',
    };
  }
  const validation = scenario.validate(res.content);
  return {
    tool: scenario.tool,
    provider: route.provider,
    model: route.model,
    ok: validation.ok,
    latencyMs,
    reason: validation.ok ? undefined : validation.reason,
    preview: res.content.replace(/\s+/g, ' ').slice(0, 140),
  };
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function pool<T>(items: Scenario[], n: number, fn: (s: Scenario) => Promise<T>): Promise<T[]> {
  const out: T[] = [];
  let i = 0;
  async function worker(workerId: number) {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
      if (i < items.length && INTER_CALL_DELAY_MS > 0) await sleep(INTER_CALL_DELAY_MS);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, (_, k) => worker(k)));
  return out;
}

function colour(ok: boolean, txt: string): string {
  return ok ? `\x1b[32m${txt}\x1b[0m` : `\x1b[31m${txt}\x1b[0m`;
}

(async () => {
  // Sanity: every scenario must map to a known route, every route should have a scenario.
  const scenarioTools = new Set(ALL_SCENARIOS.map((s) => s.tool));
  const routeTools = new Set(Object.keys(ALL_ROUTES));
  const missing = [...routeTools].filter((t) => !scenarioTools.has(t));
  const extra = [...scenarioTools].filter((t) => !routeTools.has(t));
  if (missing.length) console.warn(`! No scenario for routes: ${missing.join(', ')}`);
  if (extra.length) console.warn(`! Scenario for unknown route: ${extra.join(', ')}`);

  let scenarios = ALL_SCENARIOS;
  if (ONLY.length) scenarios = scenarios.filter((s) => ONLY.includes(s.tool));

  console.log(`\nRunning ${scenarios.length} tool scenarios (concurrency=${CONCURRENCY}, delay=${INTER_CALL_DELAY_MS}ms, retry-on-429=on)\n`);
  console.log('  tool                              provider     latency  status');
  console.log('  ' + '─'.repeat(74));

  const results = await pool(scenarios, CONCURRENCY, runOne);

  for (const r of results) {
    const tool = r.tool.padEnd(33);
    const prov = r.provider.padEnd(11);
    const lat = `${r.latencyMs}ms`.padStart(7);
    const status = r.ok ? colour(true, 'PASS') : colour(false, `FAIL — ${r.reason}`);
    console.log(`  ${tool} ${prov} ${lat}  ${status}`);
    if (!r.ok && r.preview) console.log(`    ↳ preview: ${r.preview}`);
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  const avgLatency = Math.round(results.reduce((s, r) => s + r.latencyMs, 0) / results.length);

  console.log('\n  ' + '─'.repeat(74));
  console.log(`  Total: ${results.length}   ${colour(true, `Pass: ${passed}`)}   ${colour(failed === 0, `Fail: ${failed}`)}   avg latency: ${avgLatency}ms`);

  // Per-provider breakdown
  const byProv: Record<string, { pass: number; fail: number; ms: number; n: number }> = {};
  for (const r of results) {
    const b = byProv[r.provider] ??= { pass: 0, fail: 0, ms: 0, n: 0 };
    if (r.ok) b.pass++; else b.fail++;
    b.ms += r.latencyMs;
    b.n++;
  }
  console.log('\n  per-provider:');
  for (const [p, b] of Object.entries(byProv)) {
    console.log(`    ${p.padEnd(12)} pass=${b.pass}/${b.n}  avg=${Math.round(b.ms / b.n)}ms`);
  }

  process.exit(failed === 0 ? 0 : 1);
})().catch((err) => {
  console.error('\nRunner crashed:', err);
  process.exit(2);
});
