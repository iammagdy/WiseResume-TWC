#!/usr/bin/env node
/**
 * Static guard against Audit finding H1 (Task #11): four deployed edge
 * functions queried `public.portfolios`, a table that does not exist on this
 * Supabase project, causing silent runtime failures. Edge function code that
 * references a non-existent table or RPC deploys cleanly and only fails when
 * invoked in production.
 *
 * This script statically extracts every `.from('<name>')` and `.rpc('<name>')`
 * call across `supabase/functions/<func>/**\/*.ts` and cross-references them
 * against the live tables, views, and routines in the canonical Supabase
 * project (public schema). Any reference that does not resolve fails the check.
 *
 * The `_shared/` directory is scanned but its references are aggregated as
 * "shared" so a typo in shared code is still caught.
 *
 * Requires SUPABASE_ACCESS_TOKEN in env. Optional SUPABASE_PROJECT_REF and
 * SUPABASE_FUNCTIONS_DIR overrides.
 *
 * Exit codes:
 *   0 — no drift detected
 *   1 — at least one missing table or RPC reference
 *   2 — configuration / network error
 *
 * Usage:
 *   node scripts/check-edge-function-db-refs.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'jnsfmkzgxsviuthaqlyy';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const FUNCTIONS_DIR = process.env.SUPABASE_FUNCTIONS_DIR || 'supabase/functions';

if (!TOKEN) {
  console.error('SUPABASE_ACCESS_TOKEN is required.');
  process.exit(2);
}

// Tables/RPCs that exist outside the public schema (auth.users, storage, etc.)
// or are intentionally dynamic and should be ignored. Keep this list minimal.
const IGNORED_TABLES = new Set([
  // auth schema is accessed via supabase.auth.admin.*, not .from(),
  // but keep an escape hatch for storage and other schemas if ever used.
]);
const IGNORED_RPCS = new Set([]);

// ---------------------------------------------------------------------------
// 1. Walk supabase/functions/**/*.ts and extract references.
// ---------------------------------------------------------------------------

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walk(full));
    } else if (entry.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

const FROM_RE = /\.from\(\s*(['"`])([^'"`]+)\1\s*[,)]/g;
const RPC_RE = /\.rpc\(\s*(['"`])([^'"`]+)\1\s*[,)]/g;

function extractRefs(source) {
  const tables = [];
  const rpcs = [];
  let m;
  FROM_RE.lastIndex = 0;
  while ((m = FROM_RE.exec(source)) !== null) tables.push(m[2]);
  RPC_RE.lastIndex = 0;
  while ((m = RPC_RE.exec(source)) !== null) rpcs.push(m[2]);
  return { tables, rpcs };
}

const files = walk(FUNCTIONS_DIR);
// Map<ref, Array<{file, kind}>>
const refsByName = { table: new Map(), rpc: new Map() };

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const { tables, rpcs } = extractRefs(src);
  const rel = relative(process.cwd(), file);
  for (const t of tables) {
    if (!refsByName.table.has(t)) refsByName.table.set(t, []);
    refsByName.table.get(t).push(rel);
  }
  for (const r of rpcs) {
    if (!refsByName.rpc.has(r)) refsByName.rpc.set(r, []);
    refsByName.rpc.get(r).push(rel);
  }
}

// ---------------------------------------------------------------------------
// 2. Query the live Supabase project for tables, views, and routines.
// ---------------------------------------------------------------------------

async function query(sql) {
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) {
    console.error(`Supabase query failed (${res.status}):`, await res.text());
    process.exit(2);
  }
  return res.json();
}

const tableRows = await query(
  "SELECT table_name FROM information_schema.tables WHERE table_schema='public';",
);
const viewRows = await query(
  "SELECT table_name FROM information_schema.views WHERE table_schema='public';",
);
const routineRows = await query(
  "SELECT routine_name FROM information_schema.routines WHERE routine_schema='public' AND routine_type='FUNCTION';",
);

const liveTables = new Set([
  ...tableRows.map(r => r.table_name),
  ...viewRows.map(r => r.table_name),
]);
const liveRoutines = new Set(routineRows.map(r => r.routine_name));

// ---------------------------------------------------------------------------
// 3. Cross-reference.
// ---------------------------------------------------------------------------

const missingTables = [];
for (const [name, callers] of refsByName.table.entries()) {
  if (IGNORED_TABLES.has(name)) continue;
  if (!liveTables.has(name)) missingTables.push({ name, callers });
}

const missingRpcs = [];
for (const [name, callers] of refsByName.rpc.entries()) {
  if (IGNORED_RPCS.has(name)) continue;
  if (!liveRoutines.has(name)) missingRpcs.push({ name, callers });
}

console.log(`Edge function .ts files scanned: ${files.length}`);
console.log(`Distinct tables referenced:      ${refsByName.table.size}`);
console.log(`Distinct RPCs referenced:        ${refsByName.rpc.size}`);
console.log(`Live public tables/views:        ${liveTables.size}`);
console.log(`Live public functions:           ${liveRoutines.size}`);

if (missingTables.length === 0 && missingRpcs.length === 0) {
  console.log('\nIn sync — every .from() and .rpc() reference resolves.');
  process.exit(0);
}

if (missingTables.length > 0) {
  console.error(`\nERROR: ${missingTables.length} table reference(s) not in live schema:`);
  for (const { name, callers } of missingTables) {
    console.error(`  .from('${name}') — referenced by:`);
    for (const c of callers) console.error(`    - ${c}`);
  }
}

if (missingRpcs.length > 0) {
  console.error(`\nERROR: ${missingRpcs.length} RPC reference(s) not in live schema:`);
  for (const { name, callers } of missingRpcs) {
    console.error(`  .rpc('${name}') — referenced by:`);
    for (const c of callers) console.error(`    - ${c}`);
  }
}

console.error(
  '\nFix: either rename the reference to an existing table/function, ' +
    'add a migration that creates it, or add the name to the IGNORED_* ' +
    'allowlist in scripts/check-edge-function-db-refs.mjs (with justification).',
);
process.exit(1);
