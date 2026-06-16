/**
 * Scans lazy-loaded route modules for bare npm imports missing from node_modules.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const declared = new Set([
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
]);

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
        p = existsSync(path.join(root, withTsx)) ? withTsx : `${p}.ts`;
      }
      pages.add(p.replace(/\\/g, '/'));
    }
  }
  return [...pages].sort();
}

function walkFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walkFiles(full, out);
    else if (/\.(tsx?|jsx?)$/.test(name)) out.push(full);
  }
  return out;
}

function resolveBareImport(spec) {
  if (spec.startsWith('@/') || spec.startsWith('.') || spec.startsWith('/')) return null;
  const parts = spec.split('/');
  let name = spec;
  if (spec.startsWith('@')) name = `${parts[0]}/${parts[1]}`;
  else name = parts[0];
  return name;
}

const importFromRe = /(?:import\s+(?:[^'"]+\s+from\s+)?|import\s*\(|require\s*\(\s*)['"]([^'"]+)['"]/g;
const pages = collectLazyPages();
const issues = [];

function checkFile(relPath) {
  const abs = path.join(root, relPath);
  if (!existsSync(abs)) {
    issues.push({ file: relPath, type: 'missing-file', detail: 'Route target file does not exist' });
    return;
  }
  const src = readFileSync(abs, 'utf8');
  const visited = new Set();
  const queue = [abs];

  while (queue.length) {
    const file = queue.shift();
    if (visited.has(file)) continue;
    visited.add(file);
    const content = readFileSync(file, 'utf8');
    let m;
    importFromRe.lastIndex = 0;
    while ((m = importFromRe.exec(content))) {
      const spec = m[1];
      if (spec.startsWith('@/')) {
        const rel = path.join(root, 'src', spec.slice(2));
        const candidates = [
          rel,
          `${rel}.ts`,
          `${rel}.tsx`,
          path.join(rel, 'index.ts'),
          path.join(rel, 'index.tsx'),
        ];
        const found = candidates.find((c) => existsSync(c));
        if (found && !visited.has(found)) queue.push(found);
        else if (!found) {
          issues.push({ file: path.relative(root, file).replace(/\\/g, '/'), type: 'missing-local', detail: spec });
        }
        continue;
      }
      if (spec.startsWith('.')) {
        const base = path.resolve(path.dirname(file), spec);
        const candidates = [
          base,
          `${base}.ts`,
          `${base}.tsx`,
          path.join(base, 'index.ts'),
          path.join(base, 'index.tsx'),
        ];
        const found = candidates.find((c) => existsSync(c));
        if (found && !visited.has(found)) queue.push(found);
        continue;
      }
      const bare = resolveBareImport(spec);
      if (!bare) continue;
      const inPkg = declared.has(bare);
      const inNodeModules = existsSync(path.join(root, 'node_modules', bare));
      if (!inNodeModules) {
        issues.push({
          file: path.relative(root, file).replace(/\\/g, '/'),
          type: 'missing-package',
          detail: `${bare} (import: ${spec})${inPkg ? ' — listed in package.json but not installed' : ' — not in package.json'}`,
        });
      }
    }
  }
}

for (const page of pages) checkFile(page);

const unique = [];
const seen = new Set();
for (const i of issues) {
  const key = `${i.type}|${i.file}|${i.detail}`;
  if (seen.has(key)) continue;
  seen.add(key);
  unique.push(i);
}

console.log(
  JSON.stringify(
    {
      auditedAt: new Date().toISOString(),
      lazyRouteModules: pages.length,
      issuesFound: unique.length,
      issues: unique,
    },
    null,
    2,
  ),
);

process.exit(unique.length > 0 ? 1 : 0);
