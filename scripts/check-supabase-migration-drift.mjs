#!/usr/bin/env node
/**
 * Print every migration file in supabase/migrations/ that has NOT been
 * recorded in supabase_migrations.schema_migrations on the live Supabase
 * project. Exit code 1 if any drift is detected, 0 if in sync.
 *
 * Requires SUPABASE_ACCESS_TOKEN in env.
 *
 * Usage:
 *   node scripts/check-supabase-migration-drift.mjs
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'jnsfmkzgxsviuthaqlyy';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const MIG_DIR = 'supabase/migrations';

if (!TOKEN) {
  console.error('SUPABASE_ACCESS_TOKEN is required.');
  process.exit(2);
}

const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
const res = await fetch(url, {
  method: 'POST',
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;',
  }),
});
if (!res.ok) {
  console.error(`Query failed (${res.status}):`, await res.text());
  process.exit(2);
}
const rows = await res.json();
const applied = new Set(rows.map(r => r.version));

const files = readdirSync(MIG_DIR).filter(f => /^\d{14}.*\.sql$/.test(f)).sort();

const byVersion = new Map();
for (const f of files) {
  const v = f.match(/^(\d{14})/)[1];
  if (!byVersion.has(v)) byVersion.set(v, []);
  byVersion.get(v).push(f);
}

const pending = files.filter(f => !applied.has(f.match(/^(\d{14})/)[1]));

const dupVersions = [...byVersion.entries()].filter(([, list]) => list.length > 1);

console.log(`Migrations on disk:        ${files.length}`);
console.log(`Distinct versions on disk: ${byVersion.size}`);
console.log(`Applied to Supabase:       ${applied.size}`);
console.log(`Pending (by version):      ${pending.length}`);

if (dupVersions.length > 0) {
  console.log(
    `\nWARNING: ${dupVersions.length} version prefix(es) are reused by multiple files. ` +
      `schema_migrations.version is unique, so once one sibling is recorded, the others ` +
      `are silently treated as "applied" by version-only checks. Verify each sibling actually ran:`,
  );
  for (const [v, list] of dupVersions) {
    console.log(`  ${v}:`);
    for (const f of list) console.log(`    - ${f}`);
  }
}

if (pending.length === 0 && dupVersions.length === 0) {
  console.log('\nIn sync.');
  process.exit(0);
}

if (pending.length > 0) {
  console.log('\nPending migrations (version not in schema_migrations):');
  for (const f of pending) console.log(`  ${f}`);
}

process.exit(1);
