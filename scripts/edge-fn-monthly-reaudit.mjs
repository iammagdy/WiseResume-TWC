#!/usr/bin/env node
/**
 * Monthly re-audit driver (Task #68, Phase 4 — step 6).
 *
 * Re-runs the Task #61 probe-set across every deployed edge function and
 * writes a human-readable monthly snapshot to
 * `reports/edge-fn-drift-<YYYY-MM-DD>.md`. Probes per function (4):
 *
 *   - CORS preflight  (OPTIONS, expect 200/204 + Access-Control-Allow-*)
 *   - no-auth         (POST {} with no Authorization header)
 *   - auth + test JWT (POST {} with HS256 JWT signed by SUPABASE_JWT_SECRET)
 *   - anon-only       (POST {} with apikey header but no JWT)
 *
 * Verdict (matches Task #61 §7 heuristic):
 *   - RED    : CORS preflight fails OR ≥2 structural drifts
 *   - YELLOW : exactly 1 structural drift (5xx noauth, 503 auth, etc.)
 *   - GREEN  : otherwise
 *
 * Each run also writes the verdict-per-function to
 * `reports/.edge-fn-drift-<YYYY-MM-DD>.json` (cleaned up after the markdown
 * is written) so the script doubles as a JSON producer for downstream
 * tooling. The diff section of the markdown compares against the most
 * recent prior `reports/edge-fn-drift-*.md` snapshot — verdict transitions
 * (e.g. GREEN→YELLOW) and added/removed slugs are called out.
 *
 * Required env:
 *   SUPABASE_ACCESS_TOKEN — Management API (list functions + fetch anon key)
 *   SUPABASE_JWT_SECRET   — used to mint the HS256 test JWT
 *   SUPABASE_PROJECT_REF  — defaults to jnsfmkzgxsviuthaqlyy
 *
 * Exit codes:
 *   0 — report written (verdicts may include RED/YELLOW; that's the point)
 *   2 — env / network / Management API error
 */
import { createHmac, randomUUID } from 'node:crypto';
import {
  existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

// Allow-list (also consumed by scripts/check-edge-functions-deployed.mjs).
// Used here to (a) skip CORS POST-allow check for GET-only public endpoints
// like og-image, and (b) reclassify probe drifts that are already tracked
// under separate fix tasks from RED → YELLOW.
const ALLOWLIST_PATH = 'scripts/edge-fn-drift-allowlist.json';
let allowlist = { noAuthExpectedStatus: {}, knownPreExistingDrift: {} };
try {
  allowlist = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'));
} catch (err) {
  console.error(`WARN: could not read ${ALLOWLIST_PATH} (${err?.message || err}) — proceeding without overrides.`);
}
// og-image is the only GET-only function we serve publicly; its OPTIONS
// preflight legitimately won't list POST. The allow-list signals this via
// noAuthExpectedStatus[og-image] = 200 (a successful GET-style probe).
const GET_ONLY_FUNCTIONS = new Set(['og-image']);

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'jnsfmkzgxsviuthaqlyy';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
const FUNCTIONS_BASE_URL = process.env.SUPABASE_FUNCTIONS_BASE_URL
  || `https://${PROJECT_REF}.supabase.co/functions/v1`;
const PROBE_TIMEOUT_MS = Number.parseInt(process.env.EDGE_FN_PROBE_TIMEOUT_MS || '5000', 10);
const PROBE_CONCURRENCY = Number.parseInt(process.env.EDGE_FN_PROBE_CONCURRENCY || '8', 10);
const TEST_USER_UUID = '00000000-0000-4000-8000-000000000061';
const SMOKE_ORIGIN = process.env.EDGE_FN_PROBE_ORIGIN || 'https://wiseresume.com';
const REPORTS_DIR = 'reports';
const today = new Date().toISOString().slice(0, 10);
const reportPath = process.env.EDGE_FN_REAUDIT_REPORT_PATH
  || join(REPORTS_DIR, `edge-fn-drift-${today}.md`);
const jsonOutPath = process.env.EDGE_FN_REAUDIT_JSON_PATH
  || join(REPORTS_DIR, `.edge-fn-drift-${today}.json`);

if (!ACCESS_TOKEN) {
  console.error('SUPABASE_ACCESS_TOKEN is required.');
  process.exit(2);
}
if (!JWT_SECRET) {
  console.error('SUPABASE_JWT_SECRET is required to mint the test JWT.');
  process.exit(2);
}

mkdirSync(REPORTS_DIR, { recursive: true });

// ── Mint the test JWT (HS256, 1h TTL, role authenticated, no admin claims) ──

function base64url(input) {
  return Buffer.from(input).toString('base64')
    .replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function mintTestJwt() {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: TEST_USER_UUID,
    role: 'authenticated',
    aud: 'authenticated',
    iss: `https://${PROJECT_REF}.supabase.co/auth/v1`,
    iat: now,
    exp: now + 3600,
    session_id: randomUUID(),
  };
  const head = base64url(JSON.stringify(header));
  const body = base64url(JSON.stringify(payload));
  const sig = createHmac('sha256', JWT_SECRET).update(`${head}.${body}`).digest('base64')
    .replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${head}.${body}.${sig}`;
}
const TEST_JWT = mintTestJwt();

// ── Fetch the project anon key via Management API ────────────────────────────

async function fetchAnonKey() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys`, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });
  if (!res.ok) {
    throw new Error(`Management API ${res.status} fetching api-keys: ${(await res.text()).slice(0, 300)}`);
  }
  const keys = await res.json();
  const anon = Array.isArray(keys) ? keys.find(k => k.name === 'anon') : null;
  if (!anon?.api_key) throw new Error('No anon key returned by Management API.');
  return anon.api_key;
}

// ── List deployed functions ──────────────────────────────────────────────────

async function fetchDeployedFunctions() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/functions`, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });
  if (!res.ok) {
    throw new Error(`Management API ${res.status} listing functions: ${(await res.text()).slice(0, 300)}`);
  }
  const list = await res.json();
  return list.map(fn => fn.slug || fn.name).filter(Boolean).sort();
}

// ── Probe a single function ──────────────────────────────────────────────────

async function timedFetch(url, init) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
  try {
    const r = await fetch(url, { ...init, signal: ctrl.signal });
    return { ok: true, status: r.status, headers: r.headers };
  } catch (err) {
    return { ok: false, status: 0, error: err?.message || String(err), headers: null };
  } finally {
    clearTimeout(t);
  }
}

async function probeFunction(name, anonKey) {
  const url = `${FUNCTIONS_BASE_URL}/${name}`;

  // CORS preflight must include the apikey header to clear Supabase's gateway
  // — without it, the gateway returns a generic 200 with no CORS headers
  // (the function's own OPTIONS handler never runs). Real browsers send the
  // apikey via Access-Control-Request-Headers + the actual request includes it.
  const cors = await timedFetch(url, {
    method: 'OPTIONS',
    headers: {
      'Origin': SMOKE_ORIGIN,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization,apikey,content-type',
      'apikey': anonKey,
    },
  });
  const corsAllowOrigin = cors.headers?.get('access-control-allow-origin') || null;
  const corsAllowMethods = cors.headers?.get('access-control-allow-methods') || null;
  const corsAllowHeaders = cors.headers?.get('access-control-allow-headers') || null;
  // Supabase's edge-functions gateway (Cloudflare-fronted) returns
  // access-control-allow-{methods,headers} on every successful OPTIONS but
  // only echoes access-control-allow-origin for origins that match the
  // gateway's allow-list — so a probe from an arbitrary origin won't see
  // ACAO even though real browsers from a configured origin do. Treat the
  // presence of allow-methods (with POST) + allow-headers as the cross-origin
  // contract; ACAO is *additionally* recorded for the report but does not
  // gate the verdict. CORS is RED only if the preflight itself fails.
  const requirePost = !GET_ONLY_FUNCTIONS.has(name);
  const corsOk = cors.ok
    && (cors.status === 200 || cors.status === 204)
    && (!requirePost || (corsAllowMethods?.toUpperCase().includes('POST') ?? false))
    && (corsAllowMethods?.toUpperCase().match(/GET|POST|PUT|PATCH|DELETE/) !== null);

  const noauth = await timedFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': SMOKE_ORIGIN },
    body: '{}',
  });

  const auth = await timedFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': SMOKE_ORIGIN,
      'apikey': anonKey,
      'Authorization': `Bearer ${TEST_JWT}`,
    },
    body: '{}',
  });

  const anon = await timedFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': SMOKE_ORIGIN,
      'apikey': anonKey,
    },
    body: '{}',
  });

  return {
    name,
    cors: {
      ok: corsOk,
      status: cors.status,
      allowOrigin: corsAllowOrigin,
      allowMethods: corsAllowMethods,
      allowHeaders: corsAllowHeaders,
    },
    noauth: { status: noauth.status, ok: noauth.ok },
    auth:   { status: auth.status,   ok: auth.ok   },
    anon:   { status: anon.status,   ok: anon.ok   },
  };
}

// ── Verdict heuristic (matches Task #61 §7) ──────────────────────────────────

function classifyVerdict(p) {
  // Structural drift signals:
  //   - noauth returns 5xx (gateway/handler should 401 first)
  //   - auth   returns 5xx (handler crashed)
  //   - auth   returns 503 (service unavailable, e.g. SITE_URL missing)
  //   - anon   returns 5xx (handler crashed)
  // CORS preflight failure is treated as a top-level RED regardless.
  if (!p.cors.ok) {
    return {
      verdict: 'RED',
      reasons: [
        `CORS preflight failed (status ${p.cors.status}, allow-methods=${p.cors.allowMethods || '<none>'}, allow-headers=${p.cors.allowHeaders ? 'present' : '<none>'})`,
      ],
    };
  }
  const reasons = [];
  if (p.noauth.status >= 500) reasons.push(`noauth→${p.noauth.status} (gateway should 401 first)`);
  if (p.auth.status === 503) reasons.push(`auth→503 (service unavailable)`);
  else if (p.auth.status >= 500) reasons.push(`auth→${p.auth.status} (handler crashed)`);
  if (p.anon.status >= 500) reasons.push(`anon→${p.anon.status} (handler crashed)`);
  if (reasons.length >= 2) return { verdict: 'RED', reasons };
  if (reasons.length === 1) return { verdict: 'YELLOW', reasons };
  return { verdict: 'GREEN', reasons: [] };
}

function applyKnownDriftDowngrade(probe) {
  // Functions documented in scripts/edge-fn-drift-allowlist.json::
  // knownPreExistingDrift have an open fix task. We surface them as YELLOW
  // (so the report still highlights them) but never RED — RED is reserved
  // for new, undocumented drift.
  const knownEntry = allowlist?.knownPreExistingDrift?.[probe.name];
  if (knownEntry && probe.verdict === 'RED') {
    return {
      ...probe,
      verdict: 'YELLOW',
      reasons: [...probe.reasons, `(known pre-existing drift — ${knownEntry.expectedFix})`],
    };
  }
  return probe;
}

// ── Diff vs the most recent prior monthly snapshot ───────────────────────────

function loadPriorVerdicts() {
  if (!existsSync(REPORTS_DIR)) return null;
  const candidates = readdirSync(REPORTS_DIR)
    .filter(f => /^edge-fn-drift-\d{4}-\d{2}-\d{2}\.md$/.test(f) && !f.endsWith(`${today}.md`))
    .sort();
  if (candidates.length === 0) return null;
  const prior = candidates[candidates.length - 1];
  const text = readFileSync(join(REPORTS_DIR, prior), 'utf8');
  // The verdict-per-function table is written below in serializable form;
  // parse it back. Lines look like: `| \`<slug>\` | 🟢 GREEN | … |`
  const verdictRe = /^\|\s*`([^`]+)`\s*\|\s*(?:🟢|🟡|🔴)\s*(GREEN|YELLOW|RED)\s*\|/gm;
  const map = new Map();
  let m;
  while ((m = verdictRe.exec(text)) !== null) {
    map.set(m[1], m[2]);
  }
  return map.size > 0 ? { file: prior, verdicts: map } : null;
}

// ── Main ────────────────────────────────────────────────────────────────────

const checkedAt = new Date().toISOString();
let anonKey, deployed;
try {
  [anonKey, deployed] = await Promise.all([fetchAnonKey(), fetchDeployedFunctions()]);
} catch (err) {
  console.error(err.message);
  process.exit(2);
}

console.log(`Probing ${deployed.length} deployed function(s) at ${checkedAt}…`);
const queue = [...deployed];
const probes = [];
await Promise.all(
  Array.from({ length: Math.max(1, PROBE_CONCURRENCY) }, async () => {
    while (queue.length) {
      const name = queue.shift();
      if (!name) break;
      const probe = await probeFunction(name, anonKey);
      probes.push(applyKnownDriftDowngrade({ ...probe, ...classifyVerdict(probe) }));
    }
  }),
);
probes.sort((a, b) => a.name.localeCompare(b.name));

const counts = { GREEN: 0, YELLOW: 0, RED: 0 };
for (const p of probes) counts[p.verdict]++;

const prior = loadPriorVerdicts();
const transitions = []; // {name, from, to}
const added = [];
const removed = [];
if (prior) {
  const currentNames = new Set(probes.map(p => p.name));
  for (const [name, fromVerdict] of prior.verdicts.entries()) {
    if (!currentNames.has(name)) {
      removed.push(name);
      continue;
    }
    const cur = probes.find(p => p.name === name);
    if (cur && cur.verdict !== fromVerdict) {
      transitions.push({ name, from: fromVerdict, to: cur.verdict });
    }
  }
  const priorNames = new Set(prior.verdicts.keys());
  for (const p of probes) if (!priorNames.has(p.name)) added.push(p.name);
}

// ── Markdown ────────────────────────────────────────────────────────────────

const emoji = (v) => v === 'GREEN' ? '🟢' : v === 'YELLOW' ? '🟡' : '🔴';
const lines = [];
lines.push(`# Edge Functions Monthly Re-Audit — ${today}`);
lines.push('');
lines.push(`**Project ref:** \`${PROJECT_REF}\` · **Checked at:** ${checkedAt} · **Functions probed:** ${probes.length}`);
lines.push('');
lines.push(`**Summary:** 🟢 ${counts.GREEN} GREEN · 🟡 ${counts.YELLOW} YELLOW · 🔴 ${counts.RED} RED`);
lines.push('');
lines.push(
  `Generated by \`node scripts/edge-fn-monthly-reaudit.mjs\` (Task #68, Phase 4). Probes per ` +
  `function: CORS preflight, no-auth POST, auth POST (test JWT signed with SUPABASE_JWT_SECRET, ` +
  `sub \`${TEST_USER_UUID}\`), anon-only POST. Verdict heuristic matches the Task #61 audit §7 ` +
  `(RED if CORS fails or ≥2 structural drifts; YELLOW if 1; else GREEN).`,
);
lines.push('');

if (prior) {
  lines.push(`## Diff vs ${prior.file}`);
  lines.push('');
  if (transitions.length === 0 && added.length === 0 && removed.length === 0) {
    lines.push('No verdict changes since the prior snapshot. ✅');
  } else {
    if (transitions.length > 0) {
      lines.push('### Verdict transitions');
      lines.push('');
      for (const t of transitions) {
        lines.push(`- \`${t.name}\` — ${emoji(t.from)} ${t.from} → ${emoji(t.to)} ${t.to}`);
      }
      lines.push('');
    }
    if (added.length > 0) {
      lines.push('### Added since prior snapshot');
      lines.push('');
      for (const n of added) lines.push(`- \`${n}\``);
      lines.push('');
    }
    if (removed.length > 0) {
      lines.push('### Removed since prior snapshot');
      lines.push('');
      for (const n of removed) lines.push(`- \`${n}\``);
      lines.push('');
    }
  }
} else {
  lines.push(`## Diff vs prior snapshot`);
  lines.push('');
  lines.push('No prior `reports/edge-fn-drift-*.md` found — this is the baseline snapshot.');
  lines.push('');
}

lines.push(`## Verdict per function`);
lines.push('');
lines.push('| Function | Verdict | CORS | noauth | auth | anon | Reasons |');
lines.push('|---|---|---|---|---|---|---|');
for (const p of probes) {
  const reasons = p.reasons.length ? p.reasons.join('; ') : '';
  lines.push(
    `| \`${p.name}\` | ${emoji(p.verdict)} ${p.verdict} | ${p.cors.status}${p.cors.ok ? '' : ' ✗'} ` +
    `| ${p.noauth.status || '—'} | ${p.auth.status || '—'} | ${p.anon.status || '—'} | ${reasons} |`,
  );
}
lines.push('');

const yellows = probes.filter(p => p.verdict === 'YELLOW');
const reds = probes.filter(p => p.verdict === 'RED');
if (reds.length > 0) {
  lines.push(`## 🔴 RED (${reds.length})`);
  lines.push('');
  for (const p of reds) lines.push(`- \`${p.name}\` — ${p.reasons.join('; ')}`);
  lines.push('');
}
if (yellows.length > 0) {
  lines.push(`## 🟡 YELLOW (${yellows.length})`);
  lines.push('');
  for (const p of yellows) lines.push(`- \`${p.name}\` — ${p.reasons.join('; ')}`);
  lines.push('');
}

lines.push(`## Reproducing this report`);
lines.push('');
lines.push('```bash');
lines.push('SUPABASE_ACCESS_TOKEN=...   # Management API');
lines.push('SUPABASE_JWT_SECRET=...     # mints the HS256 test JWT');
lines.push('node scripts/edge-fn-monthly-reaudit.mjs');
lines.push('```');
lines.push('');
lines.push(
  `For per-push parity enforcement (inventory, config.toml verify_jwt, no-auth status, callers, ` +
  `freshness — the 5-rule "Supabase = source of truth" check) see ` +
  `\`scripts/check-edge-functions-deployed.mjs --all\` and the ` +
  `\`Check Edge Functions Are Deployed\` GitHub workflow.`,
);
lines.push('');

writeFileSync(reportPath, lines.join('\n'));
writeFileSync(jsonOutPath, JSON.stringify({ checkedAt, projectRef: PROJECT_REF, counts, probes }, null, 2));
// jsonOutPath is intentionally retained alongside the markdown for downstream
// tooling (e.g. external dashboards). The dotfile prefix keeps it out of
// glob-based directory listings while still being committed by the workflow.
console.log(`Monthly re-audit written to ${reportPath} (🟢 ${counts.GREEN} · 🟡 ${counts.YELLOW} · 🔴 ${counts.RED})`);
console.log(`Verdict snapshot JSON written to ${jsonOutPath}`);
process.exit(0);
