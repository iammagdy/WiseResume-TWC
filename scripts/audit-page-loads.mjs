/**
 * Audits lazy-loaded route modules by running Vite transform on each entry.
 * Catches missing npm packages and import-resolution failures that tsc may miss.
 */
import { createServer } from 'vite';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function collectLazyPages() {
  const sources = ['src/AppInterior.tsx', 'src/App.tsx', 'src/AppLanding.tsx'];
  const importRe = /import\(["'](\.\/[^"']+|@\/[^"']+)["']\)/g;
  const pages = new Set();

  for (const rel of sources) {
    const src = readFileSync(path.join(root, rel), 'utf8');
    let m;
    while ((m = importRe.exec(src))) {
      let p = m[1];
      if (p.startsWith('@/')) p = `src/${p.slice(2)}`;
      else if (p.startsWith('./')) p = `src/${p.slice(2)}`;
      if (!/\.(tsx?|jsx?)$/.test(p)) {
        const withTsx = `${p}.tsx`;
        const withTs = `${p}.ts`;
        p = existsSync(path.join(root, withTsx)) ? withTsx : withTs;
      }
      pages.add(p.replace(/\\/g, '/'));
    }
  }
  return [...pages].sort();
}

const pages = collectLazyPages();
const server = await createServer({
  configFile: path.join(root, 'vite.config.ts'),
  logLevel: 'error',
});
await server.pluginContainer.buildStart({});

const failures = [];
const missingFiles = [];

for (const page of pages) {
  const abs = path.join(root, page);
  if (!existsSync(abs)) {
    missingFiles.push(page);
    continue;
  }
  const id = abs.replace(/\\/g, '/');
  try {
    await server.pluginContainer.transform(readFileSync(abs, 'utf8'), id);
  } catch (e) {
    const msg = e?.message || String(e);
    const firstLine = msg.split('\n').find((l) => l.trim()) || msg;
    failures.push({ page, error: firstLine.slice(0, 500) });
  }
}

await server.close();

const report = {
  auditedAt: new Date().toISOString(),
  totalLazyPages: pages.length,
  transformOk: pages.length - failures.length - missingFiles.length,
  missingFiles,
  transformFailures: failures,
};

console.log(JSON.stringify(report, null, 2));
process.exit(failures.length + missingFiles.length > 0 ? 1 : 0);
