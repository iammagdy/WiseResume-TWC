#!/usr/bin/env node
/**
 * Compare local supabase/functions/ directories against the functions actually
 * deployed to the Supabase project, and (with --all / per-check flags) also
 * verify the four other "Supabase is the sole source of truth" parity rules
 * codified in Task #68 (Phase 4 of the edge-functions audit family):
 *
 *   1. INVENTORY parity   — every source dir is deployed; every deployed
 *                            slug has a source dir.                       (always on)
 *   2. FRESHNESS parity   — no deployed function is older than the most
 *                            recent commit touching its source dir.       (always on)
 *   3. CONFIG parity      — every deployed function's `verify_jwt` matches
 *                            its supabase/config.toml block.              (--check-config)
 *   4. AUTH-POSTURE parity — every deployed function returns the expected
 *                            HTTP status when called with no Authorization
 *                            header (default 401 per Phase 1's contract;
 *                            per-function overrides for legitimately public
 *                            endpoints — see scripts/edge-fn-drift-allowlist.json).
 *                                                                          (--check-auth)
 *   5. CALLER parity      — every deployed function has either (a) a
 *                            source caller or (b) an entry in the
 *                            non-source-caller allow-list.                 (--check-callers)
 *
 * `--all` enables checks 3, 4, 5 in addition to 1 and 2.
 *
 * The check uses the Supabase Management API endpoint
 *   GET https://api.supabase.com/v1/projects/{ref}/functions
 * with the existing SUPABASE_ACCESS_TOKEN secret. No new secrets required.
 *
 * Mirrors the exclusion convention used by scripts/deploy-functions.sh:
 *   - any directory whose name starts with `_` (e.g. `_shared`) is skipped
 *   - non-directory files (e.g. `EDGE_FUNCTION_AUDIT.md`) are skipped
 *   - a function directory must contain `index.ts` to be considered deployable
 *
 * Optional flags:
 *   --check-config         Also enforce CONFIG parity (rule 3).
 *   --check-auth           Also enforce AUTH-POSTURE parity (rule 4).
 *   --check-callers        Also enforce CALLER parity (rule 5).
 *   --all                  Shorthand for --check-config --check-auth --check-callers.
 *   --json=<path>          Write a structured drift report to <path>
 *                          (consumed by the DevKit Mission Control panel
 *                          and by the monthly re-audit workflow).
 *   --strict-known-drift   Treat allow-listed `knownPreExistingDrift`
 *                          entries as hard failures (used after their
 *                          named follow-up tasks close, to confirm parity).
 *
 * Exit codes:
 *   0 — every enabled check passed (warnings may still print)
 *   1 — at least one enabled check failed
 *   2 — configuration / network error
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=... node scripts/check-edge-functions-deployed.mjs
 *   SUPABASE_ACCESS_TOKEN=... node scripts/check-edge-functions-deployed.mjs --all
 *   SUPABASE_ACCESS_TOKEN=... node scripts/check-edge-functions-deployed.mjs --all --json=reports/edge-fn-drift-latest.json
 */
import { readdirSync, statSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'jnsfmkzgxsviuthaqlyy';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const FUNCTIONS_DIR = process.env.SUPABASE_FUNCTIONS_DIR || 'supabase/functions';
const CONFIG_TOML = process.env.SUPABASE_CONFIG_TOML || 'supabase/config.toml';
const ALLOWLIST_PATH = process.env.EDGE_FN_DRIFT_ALLOWLIST || 'scripts/edge-fn-drift-allowlist.json';
const PROJECT_BASE_URL = process.env.SUPABASE_FUNCTIONS_BASE_URL
  || `https://${PROJECT_REF}.supabase.co/functions/v1`;
// Supabase Management API's `updated_at` field is a metadata-write timestamp,
// not a deploy-event timestamp — it does not move on every `functions deploy`
// (verified Task #66, 2026-05-03: redeploys bumped `version` 264→269 with no
// `updated_at` movement, even after explicit PATCH no-op). We therefore allow
// a tolerance window so that a function whose source was committed shortly
// after a successful deploy is not flagged as stale. Override with
// EDGE_STALE_TOLERANCE_HOURS for stricter checks.
const STALE_TOLERANCE_HOURS_RAW = process.env.EDGE_STALE_TOLERANCE_HOURS ?? '6';
const STALE_TOLERANCE_HOURS_PARSED = Number.parseFloat(STALE_TOLERANCE_HOURS_RAW);
if (!Number.isFinite(STALE_TOLERANCE_HOURS_PARSED) || STALE_TOLERANCE_HOURS_PARSED < 0) {
  console.error(
    `EDGE_STALE_TOLERANCE_HOURS must be a finite, non-negative number (got: ${JSON.stringify(STALE_TOLERANCE_HOURS_RAW)}).`,
  );
  process.exit(2);
}
const STALE_TOLERANCE_MS = STALE_TOLERANCE_HOURS_PARSED * 60 * 60 * 1000;

if (!TOKEN) {
  console.error('SUPABASE_ACCESS_TOKEN is required.');
  process.exit(2);
}

// ---------------------------------------------------------------------------
// 0. Parse CLI flags.
// ---------------------------------------------------------------------------

const args = new Set(process.argv.slice(2));
let jsonOut = null;
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith('--json=')) jsonOut = arg.slice('--json='.length);
}
const checkConfig = args.has('--check-config') || args.has('--all');
const checkAuth = args.has('--check-auth') || args.has('--all');
const checkCallers = args.has('--check-callers') || args.has('--all');
const strictKnownDrift = args.has('--strict-known-drift');

// ---------------------------------------------------------------------------
// 1. Load the drift allow-list (non-source callers + per-fn no-auth overrides).
// ---------------------------------------------------------------------------

let allowlist = {
  nonSourceCallers: {},
  noAuthExpectedStatus: { _default: 401 },
  knownPreExistingDrift: {},
};
if (existsSync(ALLOWLIST_PATH)) {
  try {
    allowlist = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'));
  } catch (err) {
    console.error(`Failed to parse ${ALLOWLIST_PATH}:`, err.message);
    process.exit(2);
  }
} else if (checkAuth || checkCallers) {
  console.error(
    `Allow-list not found at ${ALLOWLIST_PATH} — required for --check-auth / --check-callers / --all.`,
  );
  process.exit(2);
}
const NO_AUTH_DEFAULT = allowlist.noAuthExpectedStatus?._default ?? 401;
const NO_AUTH_OVERRIDES = { ...(allowlist.noAuthExpectedStatus ?? {}) };
delete NO_AUTH_OVERRIDES._default;
delete NO_AUTH_OVERRIDES._comment;

// ---------------------------------------------------------------------------
// 2. Enumerate local function directories.
// ---------------------------------------------------------------------------

/**
 * Last commit time (Unix seconds → ms) for `path` in this repository, or 0
 * when git is unavailable / the path has no commits / we are not in a repo.
 *
 * Filesystem mtime is unreliable here: a fresh `git clone` (e.g. every CI
 * run) sets every file's mtime to the checkout time, which would mark every
 * deployed function as "stale" the first time the workflow runs. Git's
 * commit timestamp is stable across clones.
 */
function lastCommitMs(path) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%ct', '--', path], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (!out) return 0;
    const seconds = Number.parseInt(out, 10);
    return Number.isFinite(seconds) ? seconds * 1000 : 0;
  } catch {
    return 0;
  }
}

const localFunctions = new Map(); // name -> { lastCommitMs }
for (const entry of readdirSync(FUNCTIONS_DIR)) {
  if (entry.startsWith('_')) continue;
  const full = join(FUNCTIONS_DIR, entry);
  const st = statSync(full);
  if (!st.isDirectory()) continue;
  if (!existsSync(join(full, 'index.ts'))) continue;
  localFunctions.set(entry, { lastCommitMs: lastCommitMs(full) });
}

// ---------------------------------------------------------------------------
// 3. List deployed functions via the Management API.
// ---------------------------------------------------------------------------

const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions`;
const res = await fetch(url, {
  headers: { Authorization: `Bearer ${TOKEN}` },
});
if (!res.ok) {
  console.error(`Management API returned ${res.status}:`, await res.text());
  process.exit(2);
}
const deployedList = await res.json();
if (!Array.isArray(deployedList)) {
  console.error('Unexpected Management API response shape:', deployedList);
  process.exit(2);
}

// Each entry has { id, slug, name, status, version, created_at, updated_at, ... }
// `slug` is the function name used in the supabase/functions/<slug>/ directory.
const deployedFunctions = new Map();
for (const fn of deployedList) {
  const slug = fn.slug || fn.name;
  if (!slug) continue;
  // updated_at is ISO 8601; some older Management API versions return epoch ms.
  let updatedAtMs = 0;
  if (typeof fn.updated_at === 'number') {
    updatedAtMs = fn.updated_at < 1e12 ? fn.updated_at * 1000 : fn.updated_at;
  } else if (typeof fn.updated_at === 'string') {
    const parsed = Date.parse(fn.updated_at);
    if (!Number.isNaN(parsed)) updatedAtMs = parsed;
  }
  deployedFunctions.set(slug, {
    updatedAtMs,
    status: fn.status,
    verifyJwt: typeof fn.verify_jwt === 'boolean' ? fn.verify_jwt : null,
    version: fn.version ?? null,
  });
}

// ---------------------------------------------------------------------------
// 4. Compute the inventory + freshness diff (rules 1 & 2 — always on).
// ---------------------------------------------------------------------------

const missingInDeployment = [];   // in source, NOT deployed
const orphanedDeployments = [];   // deployed, NOT in source
const possiblyStale = [];         // deployed updated_at older than local mtime

for (const [name, meta] of localFunctions.entries()) {
  const deployed = deployedFunctions.get(name);
  if (!deployed) {
    missingInDeployment.push(name);
    continue;
  }
  if (
    deployed.updatedAtMs > 0 &&
    meta.lastCommitMs > 0 &&
    deployed.updatedAtMs + STALE_TOLERANCE_MS < meta.lastCommitMs
  ) {
    possiblyStale.push({
      name,
      deployedAt: new Date(deployed.updatedAtMs).toISOString(),
      lastCommit: new Date(meta.lastCommitMs).toISOString(),
    });
  }
}

for (const name of deployedFunctions.keys()) {
  if (!localFunctions.has(name)) orphanedDeployments.push(name);
}

// ---------------------------------------------------------------------------
// 5. Optional: CONFIG parity (rule 3).
// ---------------------------------------------------------------------------

/**
 * Minimal TOML extractor for `[functions.<slug>]` blocks in supabase/config.toml.
 * Only reads the `verify_jwt` boolean — config.toml has no other parity-relevant
 * fields per function. Skips full TOML parsing to avoid pulling in a dep.
 */
function parseConfigTomlVerifyJwt(text) {
  const map = new Map();
  // Two-pass scan to avoid the `\Z` end-of-string anchor (which Node.js /
  // V8 does NOT support — it silently matches a literal `Z`):
  //   1. Find every [functions.<slug>] header, recording slug + body-start.
  //   2. Each block ends at the next [section] header (any kind) or EOF.
  // Supports both quoted (`[functions."foo-bar"]`) and unquoted
  // (`[functions.foo-bar]`) slug forms.
  const fnHeaderRe = /^\s*\[functions\.(?:"([^"]+)"|([\w-]+))\]\s*$/gm;
  const headers = [];
  let m;
  while ((m = fnHeaderRe.exec(text)) !== null) {
    headers.push({ slug: m[1] || m[2], bodyStart: m.index + m[0].length });
  }
  const anyHeaderRe = /^\s*\[[^\]]+\]\s*$/gm;
  for (const h of headers) {
    anyHeaderRe.lastIndex = h.bodyStart;
    const nextHeader = anyHeaderRe.exec(text);
    const bodyEnd = nextHeader ? nextHeader.index : text.length;
    const body = text.slice(h.bodyStart, bodyEnd);
    const verifyMatch = body.match(/^\s*verify_jwt\s*=\s*(true|false)\b/m);
    if (verifyMatch) map.set(h.slug, verifyMatch[1] === 'true');
  }
  return map;
}

const configMismatches = []; // {name, configValue, deployedValue}
const configMissing = [];    // deployed slug with no config.toml block at all
let configVerifyJwtMap = new Map();
if (checkConfig) {
  if (!existsSync(CONFIG_TOML)) {
    console.error(`Config file not found: ${CONFIG_TOML}`);
    process.exit(2);
  }
  configVerifyJwtMap = parseConfigTomlVerifyJwt(readFileSync(CONFIG_TOML, 'utf8'));
  for (const [name, deployed] of deployedFunctions.entries()) {
    if (deployed.verifyJwt === null) continue; // Management API didn't return it
    const cfg = configVerifyJwtMap.get(name);
    if (cfg === undefined) {
      configMissing.push({ name, deployedValue: deployed.verifyJwt });
    } else if (cfg !== deployed.verifyJwt) {
      configMismatches.push({ name, configValue: cfg, deployedValue: deployed.verifyJwt });
    }
  }
}

// ---------------------------------------------------------------------------
// 6. Optional: AUTH-POSTURE parity (rule 4) — no-auth probe per function.
// ---------------------------------------------------------------------------

const authChecks = []; // {name, expected, got, ok, knownDrift?: string}
const authFailures = [];
const authKnownDrifts = [];
const PROBE_TIMEOUT_MS = Number.parseInt(process.env.EDGE_FN_PROBE_TIMEOUT_MS || '5000', 10);
const PROBE_CONCURRENCY = Number.parseInt(process.env.EDGE_FN_PROBE_CONCURRENCY || '8', 10);

async function probeNoAuth(name) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
  try {
    const r = await fetch(`${PROJECT_BASE_URL}/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      signal: ctrl.signal,
    });
    return { ok: true, status: r.status };
  } catch (err) {
    return { ok: false, status: 0, error: err?.message || String(err) };
  } finally {
    clearTimeout(t);
  }
}

if (checkAuth) {
  // Pool the probes so we don't fire 74 fetches at once.
  const slugs = [...deployedFunctions.keys()].sort();
  const queue = [...slugs];
  const workers = Array.from({ length: Math.max(1, PROBE_CONCURRENCY) }, async () => {
    while (queue.length) {
      const name = queue.shift();
      if (!name) break;
      const expected = NO_AUTH_OVERRIDES[name] ?? NO_AUTH_DEFAULT;
      const result = await probeNoAuth(name);
      const got = result.status;
      const ok = result.ok && got === expected;
      const knownDrift = allowlist.knownPreExistingDrift?.[name]?.drift ?? null;
      const entry = { name, expected, got, ok, knownDrift };
      authChecks.push(entry);
      if (!ok) {
        if (knownDrift && !strictKnownDrift) authKnownDrifts.push(entry);
        else authFailures.push(entry);
      }
    }
  });
  await Promise.all(workers);
  authChecks.sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------------------
// 7. Optional: CALLER parity (rule 5).
// ---------------------------------------------------------------------------

/**
 * Cheap source-caller scan — every match of the function's slug as a quoted
 * string literal across src/, mobile/, server/. False positives (e.g. a
 * generic word slug) are tolerated; the goal is to detect zero-caller funcs.
 */
function countSourceCallers(name) {
  // Quote-anchored to avoid matching prose. Excludes the supabase/functions/
  // tree (handler-internal references shouldn't count) and the audit reports.
  try {
    const out = execFileSync(
      'rg',
      [
        '-l',
        '--no-messages',
        '-g', '!supabase/functions/**',
        '-g', '!reports/**',
        '-g', '!tests/**',
        '-g', '!node_modules/**',
        '-g', '!dist/**',
        '-g', '!build/**',
        '-g', '!.local/**',
        '-g', '!.github/workflows/**',
        '-g', '!scripts/edge-fn-drift-allowlist.json',
        '-g', '!scripts/check-edge-functions-deployed.mjs',
        '-F',
        `'${name}'`,
        'src/', 'mobile/', 'server/',
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    return out.trim().split('\n').filter(Boolean).length;
  } catch {
    // ripgrep exits 1 when no match; treat as zero callers.
    return 0;
  }
}

const callerOrphans = []; // {name, reason: 'unknown'}
if (checkCallers) {
  for (const name of deployedFunctions.keys()) {
    if (allowlist.nonSourceCallers?.[name]) continue; // documented non-source caller
    if (countSourceCallers(name) > 0) continue;
    callerOrphans.push({ name });
  }
  callerOrphans.sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------------------
// 8. Report.
// ---------------------------------------------------------------------------

const checkedAt = new Date().toISOString();
console.log(`Project ref:               ${PROJECT_REF}`);
console.log(`Local functions (source):  ${localFunctions.size}`);
console.log(`Deployed functions:        ${deployedFunctions.size}`);
console.log(`Checks enabled:            inventory, freshness${checkConfig ? ', config' : ''}${checkAuth ? ', auth-posture' : ''}${checkCallers ? ', callers' : ''}`);
console.log('');

let failed = false;

if (orphanedDeployments.length > 0) {
  console.log(
    `WARNING: ${orphanedDeployments.length} function(s) are deployed but have no source directory:`,
  );
  for (const name of orphanedDeployments.sort()) console.log(`  - ${name}`);
  console.log(
    '  (These are usually leftovers from deleted/renamed functions. ' +
      'Delete them via the Supabase dashboard or the Management API ' +
      'if they are truly unused.)',
  );
  console.log('');
}

if (possiblyStale.length > 0) {
  console.log(
    `WARNING: ${possiblyStale.length} deployed function(s) appear older than the local source:`,
  );
  for (const { name, deployedAt, lastCommit } of possiblyStale.sort((a, b) => a.name.localeCompare(b.name))) {
    console.log(`  - ${name} (deployed ${deployedAt}, last commit ${lastCommit})`);
  }
  console.log(
    '  (Compared against the last git commit time for the function directory. ' +
      'Re-run the Deploy Supabase Edge Functions workflow to be safe.)',
  );
  console.log('');
}

if (checkConfig) {
  if (configMissing.length > 0) {
    console.error(
      `ERROR: ${configMissing.length} deployed function(s) have no [functions.<name>] block in ${CONFIG_TOML}:`,
    );
    for (const { name, deployedValue } of configMissing.sort((a, b) => a.name.localeCompare(b.name))) {
      console.error(`  - ${name} (deployed verify_jwt=${deployedValue})`);
    }
    console.error('  Fix: add a matching block per Task #66 (Phase 2) so config.toml mirrors deployed truth.\n');
    failed = true;
  }
  if (configMismatches.length > 0) {
    console.error(
      `ERROR: ${configMismatches.length} function(s) have config.toml verify_jwt that disagrees with deployed value:`,
    );
    for (const { name, configValue, deployedValue } of configMismatches.sort((a, b) => a.name.localeCompare(b.name))) {
      console.error(`  - ${name} (config=${configValue}, deployed=${deployedValue})`);
    }
    console.error('  Fix: redeploy the function (config.toml-driven) OR edit config.toml to match deployed.\n');
    failed = true;
  }
}

if (checkAuth) {
  const okCount = authChecks.filter(c => c.ok).length;
  console.log(`Auth-posture probes:       ${okCount}/${authChecks.length} pass (default expected ${NO_AUTH_DEFAULT})`);
  if (authKnownDrifts.length > 0) {
    console.log(`  ${authKnownDrifts.length} known pre-existing drift(s) (allow-listed):`);
    for (const c of authKnownDrifts) {
      console.log(`  - ${c.name} (expected ${c.expected}, got ${c.got}) — ${c.knownDrift}`);
    }
  }
  if (authFailures.length > 0) {
    console.error(`ERROR: ${authFailures.length} function(s) returned an unexpected no-auth status:`);
    for (const c of authFailures) {
      console.error(`  - ${c.name} (expected ${c.expected}, got ${c.got || '<network error>'})`);
    }
    console.error('  Fix: align the function\'s auth handler so the gateway returns the documented status. ' +
      'Add a per-function override to scripts/edge-fn-drift-allowlist.json ONLY when the new behaviour is intentional.\n');
    failed = true;
  }
  console.log('');
}

if (checkCallers) {
  if (callerOrphans.length > 0) {
    console.error(`ERROR: ${callerOrphans.length} deployed function(s) have neither a source caller nor an allow-list entry:`);
    for (const { name } of callerOrphans) console.error(`  - ${name}`);
    console.error('  Fix: add a documented allow-list entry to scripts/edge-fn-drift-allowlist.json OR delete the function.\n');
    failed = true;
  } else {
    console.log('All deployed functions have a source caller or a documented non-source caller.');
    console.log('');
  }
}

if (missingInDeployment.length > 0) {
  console.error(
    `ERROR: ${missingInDeployment.length} function(s) exist in source but are NOT deployed:`,
  );
  for (const name of missingInDeployment.sort()) console.error(`  - ${name}`);
  console.error(
    '\nFix: run the "Deploy Supabase Edge Functions" GitHub Actions workflow ' +
      '(or `bash scripts/deploy-functions.sh` from a shell with SUPABASE_ACCESS_TOKEN). ' +
      'Until then, any client call to a missing function will fail at the CORS ' +
      'preflight stage with no useful error.',
  );
  failed = true;
}

// ---------------------------------------------------------------------------
// 9. Optional: write structured JSON report.
// ---------------------------------------------------------------------------

if (jsonOut) {
  const report = {
    checkedAt,
    projectRef: PROJECT_REF,
    counts: {
      sourceFunctions: localFunctions.size,
      deployedFunctions: deployedFunctions.size,
    },
    checksEnabled: {
      inventory: true,
      freshness: true,
      config: checkConfig,
      auth: checkAuth,
      callers: checkCallers,
    },
    inventory: {
      missingInDeployment,
      orphanedDeployments,
    },
    freshness: { possiblyStale, toleranceHours: STALE_TOLERANCE_HOURS_PARSED },
    config: checkConfig ? { mismatches: configMismatches, missing: configMissing } : null,
    auth: checkAuth
      ? {
          probes: authChecks,
          failures: authFailures,
          knownDrifts: authKnownDrifts,
          defaultExpected: NO_AUTH_DEFAULT,
        }
      : null,
    callers: checkCallers ? { orphans: callerOrphans } : null,
    overallPass: !failed,
  };
  mkdirSync(dirname(jsonOut), { recursive: true });
  writeFileSync(jsonOut, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Drift report written to ${jsonOut}`);
}

if (failed) {
  process.exit(1);
}

if (
  orphanedDeployments.length === 0 &&
  possiblyStale.length === 0 &&
  missingInDeployment.length === 0 &&
  (!checkConfig || (configMissing.length === 0 && configMismatches.length === 0)) &&
  (!checkAuth || authFailures.length === 0) &&
  (!checkCallers || callerOrphans.length === 0)
) {
  console.log('In sync — every enabled parity check passed.');
}
process.exit(0);
