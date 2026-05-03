#!/usr/bin/env node
/**
 * Compare local supabase/functions/ directories against the functions actually
 * deployed to the Supabase project. Surface drift before users hit a missing
 * endpoint (e.g. a CORS preflight against a function that was never deployed).
 *
 * Compares three buckets:
 *   - in source but NOT deployed   → fails the script (missing on prod)
 *   - deployed but NOT in source   → reported as a warning (orphaned)
 *   - deployed but stale (deployed updated_at older than newest local mtime)
 *                                  → reported as a warning
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
 * Exit codes:
 *   0 — every local function is deployed (warnings may still be printed)
 *   1 — at least one local function is missing on the deployed project
 *   2 — configuration / network error
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=... node scripts/check-edge-functions-deployed.mjs
 */
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'jnsfmkzgxsviuthaqlyy';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const FUNCTIONS_DIR = process.env.SUPABASE_FUNCTIONS_DIR || 'supabase/functions';
// Supabase Management API's `updated_at` field is a metadata-write timestamp,
// not a deploy-event timestamp — it does not move on every `functions deploy`
// (verified Task #66, 2026-05-03: redeploys bumped `version` 264→269 with no
// `updated_at` movement, even after explicit PATCH no-op). We therefore allow
// a tolerance window so that a function whose source was committed shortly
// after a successful deploy is not flagged as stale. Override with
// EDGE_STALE_TOLERANCE_HOURS for stricter checks.
const STALE_TOLERANCE_MS =
  Number.parseFloat(process.env.EDGE_STALE_TOLERANCE_HOURS ?? '6') * 60 * 60 * 1000;

if (!TOKEN) {
  console.error('SUPABASE_ACCESS_TOKEN is required.');
  process.exit(2);
}

// ---------------------------------------------------------------------------
// 1. Enumerate local function directories.
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
// 2. List deployed functions via the Management API.
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
  deployedFunctions.set(slug, { updatedAtMs, status: fn.status });
}

// ---------------------------------------------------------------------------
// 3. Compute the diff.
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
// 4. Report.
// ---------------------------------------------------------------------------

console.log(`Project ref:               ${PROJECT_REF}`);
console.log(`Local functions (source):  ${localFunctions.size}`);
console.log(`Deployed functions:        ${deployedFunctions.size}`);
console.log('');

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
  process.exit(1);
}

console.log('In sync — every local edge function is deployed.');
process.exit(0);
