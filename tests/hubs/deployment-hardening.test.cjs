'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('the deployment workflow requires explicit targets and uses immutable actions', () => {
  const workflow = read('.github/workflows/deploy-appwrite-hubs.yml');
  assert.match(workflow, /target:\s*\n\s*description:.*\n\s*required: true/);
  assert.doesNotMatch(workflow, /default:\s*all/i);
  assert.match(workflow, /node scripts\/validate-hub-targets\.cjs/);
  assert.match(workflow, /node scripts\/deploy_hubs\.cjs --only=/);
  assert.doesNotMatch(workflow, /--only=(?:all|\$\{\{\s*inputs\.target\s*\}\})/);
  for (const action of workflow.matchAll(/uses:\s*[^@\s]+@([^\s#]+)/g)) {
    assert.match(action[1], /^[a-f0-9]{40}$/i, `Action pin must be a full immutable SHA: ${action[0]}`);
  }
});

test('the deploy script blocks a hub that lacks a committed lockfile', () => {
  const script = read('scripts/deploy_hubs.cjs');
  assert.match(script, /missing package-lock\.json/);
  assert.match(script, /npm ci --omit=dev --ignore-scripts/);

  for (const entry of fs.readdirSync(path.join(root, 'appwrite-hubs'), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const hubDir = path.join(root, 'appwrite-hubs', entry.name);
    if (fs.existsSync(path.join(hubDir, 'package.json'))) {
      assert.equal(fs.existsSync(path.join(hubDir, 'package-lock.json')), true, `${entry.name} is missing package-lock.json`);
    }
  }
});
