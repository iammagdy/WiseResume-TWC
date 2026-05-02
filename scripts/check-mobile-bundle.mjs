#!/usr/bin/env node
/**
 * check-mobile-bundle.mjs
 *
 * Run after `vite build --mode mobile` (wired into `npm run build:mobile`)
 * to verify the admin DevKit was actually dead-code-eliminated from the
 * mobile bundle.
 *
 * The contract is: in mobile mode `vite.config.ts` replaces
 * `import.meta.env.VITE_DISABLE_DEVKIT` with the literal string `"true"`,
 * which lets `AppInterior.tsx` resolve the lazy `DevToolsPage` import to
 * a tiny stub at build time. The heavy `DevToolsPage-*.js` chunk should
 * therefore never appear in `dist/assets/`. We additionally scan every
 * emitted chunk for tell-tale DevKit identifiers in case someone wires
 * a non-lazy import to a DevKit module from elsewhere.
 *
 * Exits non-zero (and prints which file leaked) on any leak so CI catches
 * the regression before a binary is shipped to TestFlight / Play Console.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const ASSETS = join(DIST, 'assets');

// Pattern note: each entry uses a permissive suffix `[A-Za-z0-9]*[-.]`
// so common naming drift (e.g. `MissionControl` → `MissionControlPanel`,
// `MissionControlCard`) can't sneak past the filter. The trailing `[-.]`
// matches Rollup's hash separator (`-`) or the `.js`/`.mjs` extension.
const FORBIDDEN_FILENAMES = [
  /DevTools(?!Stub)[A-Za-z0-9]*[-.]/i,
  /AICost(?!Badge|Estimates)[A-Za-z0-9]*[-.]/i,
  /Analytics[A-Za-z0-9]*Panel[-.]/i,
  /MissionControl[A-Za-z0-9]*[-.]/i,
  /Observability[A-Za-z0-9]*Panel[-.]/i,
  /Moderation[A-Za-z0-9]*Panel[-.]/i,
  /Integrations[A-Za-z0-9]*Panel[-.]/i,
  /OwnerOps[A-Za-z0-9]*[-.]/i,
  /AIRouting[A-Za-z0-9]*[-.]/i,
  /AIKeySlot[A-Za-z0-9]*[-.]/i,
  /FeatureFlags[A-Za-z0-9]*Panel[-.]/i,
  /Broadcast[A-Za-z0-9]*Panel[-.]/i,
  /AdminUsers[A-Za-z0-9]*[-.]/i,
  /AuditLog[A-Za-z0-9]*Panel[-.]/i,
];

// Identifier substrings that should never appear inside any chunk that
// the binary actually loads. We tolerate the stub (which only pulls in
// react-router-dom). The scan is a coarse safety net — false positives
// can be silenced by adding the chunk name to the allow-list.
const FORBIDDEN_SUBSTRINGS = [
  'DEV_KIT_PASSWORD',
  'admin-devkit-data',
  'admin-ai-routing',
  'admin-ai-caps',
  'admin-moderation',
  'admin-integrations',
  'devKitAuthHeaders',
];

const ALLOW_LIST = new Set([
  // The stub renders the "unavailable" message and contains no DevKit
  // logic, so any future filename ending in `DevToolsStub-*.js` is fine.
]);

function listFiles(dir) {
  let out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out = out.concat(listFiles(full));
    else out.push(full);
  }
  return out;
}

let assets;
try {
  assets = listFiles(ASSETS);
} catch (e) {
  console.error(
    `[check-mobile-bundle] dist/assets/ not found. Did you run a build first? ` +
      `(${e.message})`,
  );
  process.exit(1);
}

const violations = [];

for (const file of assets) {
  const base = file.split('/').pop() ?? file;
  if (ALLOW_LIST.has(base)) continue;

  for (const re of FORBIDDEN_FILENAMES) {
    if (re.test(base)) {
      violations.push(`leaked chunk filename: ${file} (matches ${re})`);
    }
  }

  // Only scan JS payloads — images, fonts, etc. are irrelevant.
  if (!base.endsWith('.js') && !base.endsWith('.mjs')) continue;

  let body;
  try {
    body = readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  for (const needle of FORBIDDEN_SUBSTRINGS) {
    if (body.includes(needle)) {
      violations.push(
        `leaked DevKit string in ${file}: contains "${needle}"`,
      );
    }
  }
}

if (violations.length > 0) {
  console.error(
    `\n[check-mobile-bundle] FAIL — DevKit code leaked into the mobile bundle:\n`,
  );
  for (const v of violations) console.error(`  - ${v}`);
  console.error(
    `\nThe mobile build must dead-code-eliminate every admin surface. ` +
      `Check that:\n` +
      `  1. You ran \`vite build --mode mobile\` (not the regular \`build\`).\n` +
      `  2. Any new DevKit imports go through the lazy / stub-swap pattern\n` +
      `     in AppInterior.tsx (see the VITE_DISABLE_DEVKIT branch).\n` +
      `  3. No non-DevKit code statically imports from \`@/components/dev-kit\`\n` +
      `     or \`@/pages/DevToolsPage\`.\n`,
  );
  process.exit(1);
}

console.log(
  `[check-mobile-bundle] OK — scanned ${assets.length} dist/ assets, ` +
    `no DevKit leaks detected.`,
);
