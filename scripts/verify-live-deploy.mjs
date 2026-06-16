#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const SITE = process.env.LIVE_SITE_URL || 'https://wiseresume.app';
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const expectedVersion = `v${pkg.version}`;

const failures = [];
const checks = [];

async function head(path) {
  const res = await fetch(`${SITE}${path}`, { method: 'HEAD', redirect: 'manual' });
  return { status: res.status, headers: Object.fromEntries(res.headers) };
}
async function get(path) {
  const res = await fetch(`${SITE}${path}`, { redirect: 'manual' });
  return { status: res.status, headers: Object.fromEntries(res.headers), text: await res.text() };
}

async function main() {
  // 1. changelog.json version matches package.json
  const cl = await get('/changelog.json');
  let liveVersion = '(unparseable)';
  try {
    liveVersion = JSON.parse(cl.text)[0]?.version ?? '(missing)';
  } catch {}
  const versionOk = liveVersion === expectedVersion;
  checks.push(`changelog.json version: live=${liveVersion} expected=${expectedVersion} ${versionOk ? 'OK' : 'FAIL'}`);
  if (!versionOk) failures.push(`Live changelog.json reports ${liveVersion}, expected ${expectedVersion}. Upload almost certainly did not overwrite the live files.`);

  // 2. changelog.json must be served with no-cache (otherwise returning visitors keep old version)
  const clCache = (cl.headers['cache-control'] || '').toLowerCase();
  const clCacheOk = clCache.includes('no-cache') || clCache.includes('no-store');
  checks.push(`changelog.json Cache-Control: "${clCache || '(none)'}" ${clCacheOk ? 'OK' : 'FAIL'}`);
  if (!clCacheOk) failures.push(`changelog.json missing no-cache header — .htaccess on Hostinger is stale or missing. Returning visitors will keep seeing the old version.`);

  // 3. index.html must also be served with no-cache
  const idx = await head('/index.html');
  const idxCache = (idx.headers['cache-control'] || '').toLowerCase();
  const idxCacheOk = idxCache.includes('no-cache') || idxCache.includes('no-store');
  checks.push(`index.html Cache-Control: "${idxCache || '(none)'}" ${idxCacheOk ? 'OK' : 'FAIL'}`);
  if (!idxCacheOk) failures.push(`index.html missing no-cache header — same .htaccess problem as above.`);

  // 4. Required security headers (Task #26)
  const root = await head('/');
  const req = ['strict-transport-security', 'x-content-type-options', 'cross-origin-opener-policy'];
  for (const h of req) {
    const present = !!root.headers[h];
    checks.push(`header ${h}: ${present ? 'present' : 'MISSING'} ${present ? 'OK' : 'FAIL'}`);
    if (!present) failures.push(`Response header "${h}" missing from /. .htaccess on Hostinger is missing the Task #26 hardening.`);
  }

  // 5. .map deny rule active (Task #26)
  const mapProbe = await head('/assets/__deploy-verify-probe__.map');
  const mapBlocked = mapProbe.status === 403 || mapProbe.status === 404;
  checks.push(`.map probe status: ${mapProbe.status} ${mapBlocked ? 'OK' : 'FAIL'}`);
  if (!mapBlocked) failures.push(`*.map URLs return ${mapProbe.status} (expected 403/404). .htaccess deny rule not active.`);

  console.log(`\n[verify-live-deploy] target: ${SITE}`);
  console.log(`[verify-live-deploy] expected version: ${expectedVersion}\n`);
  for (const c of checks) console.log(`  ${c}`);
  console.log('');

  if (failures.length === 0) {
    console.log(`[verify-live-deploy] ✅ All checks passed.`);
    process.exit(0);
  }
  console.error(`[verify-live-deploy] ❌ ${failures.length} check(s) failed:\n`);
  for (const f of failures) console.error(`  - ${f}`);
  console.error(
    `\nMost likely cause: the FTP/SFTP upload did not overwrite /public_html/resume/ ` +
      `(or skipped dotfiles like .htaccess). Re-run .github/workflows/deploy.yml and confirm ` +
      `the lftp output lists every file under dist/ — especially ".htaccess" — being transferred.\n`
  );
  process.exit(1);
}

main().catch((err) => {
  console.error(`[verify-live-deploy] unexpected error: ${err?.message || err}`);
  process.exit(2);
});
