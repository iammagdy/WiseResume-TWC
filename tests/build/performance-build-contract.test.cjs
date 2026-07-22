const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const distDir = path.resolve(__dirname, '../../dist');
const assetsDir = path.join(distDir, 'assets');

function readIndex() {
  return fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
}

function assetPath(url) {
  return path.join(distDir, url.replace(/^\//, ''));
}

function assetNames() {
  return fs.readdirSync(assetsDir);
}

test('public entry does not preload or import the charts feature chunk', () => {
  const html = readIndex();
  const entryUrl = html.match(/<script type="module"[^>]+src="([^"]+)"/)?.[1];

  assert.ok(entryUrl, 'expected a production entry script');
  assert.doesNotMatch(html, /rel="modulepreload"[^>]+charts-/);
  assert.doesNotMatch(fs.readFileSync(assetPath(entryUrl), 'utf8'), /from["']\.\/charts-/);
  assert.ok(assetNames().some((name) => /^charts-.*\.js$/.test(name)), 'expected a lazy charts chunk');
});

test('global prefetch bootstrap excludes Editor while Editor remains lazy', () => {
  const html = readIndex();
  const prefetchUrl = html.match(/<script src="([^"]*prefetch-[^"]+\.js)" defer>/)?.[1];

  assert.ok(prefetchUrl, 'expected the deferred prefetch bootstrap');
  assert.doesNotMatch(fs.readFileSync(assetPath(prefetchUrl), 'utf8'), /EditorPage-/);
  assert.ok(assetNames().some((name) => /^EditorPage-.*\.js$/.test(name)), 'expected a lazy Editor chunk');
});

test('heavy feature families remain split from the public entry', () => {
  const names = assetNames();

  for (const prefix of ['doc-export-', 'ocr-', 'DevToolsPage-', 'monitoring-']) {
    assert.ok(names.some((name) => name.startsWith(prefix)), `expected ${prefix} chunk`);
  }
});
