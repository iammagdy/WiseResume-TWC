'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { parseExplicitHubTargets } = require('../../scripts/appwrite-function-policy.cjs');

const root = path.resolve(__dirname, '../..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function isGitTracked(repoRoot, relativePath) {
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', '--', relativePath], {
      cwd: repoRoot,
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

function assertTrackedLockfile(repoRoot, hubName) {
  const relativeLockfile = path.posix.join('appwrite-hubs', hubName, 'package-lock.json');
  const absoluteLockfile = path.join(repoRoot, relativeLockfile);
  assert.equal(fs.existsSync(absoluteLockfile), true, `${hubName} is missing package-lock.json`);
  assert.equal(isGitTracked(repoRoot, relativeLockfile), true, `${hubName} package-lock.json is not tracked by Git`);
}

function assertWorkflowHardening(workflowInput) {
  const workflow = workflowInput.replace(/\r\n/g, '\n');
  assert.match(workflow, /target:\s*\n\s*description:.*\n\s*required: true/);
  assert.doesNotMatch(workflow, /default:\s*all/i);
  assert.match(workflow, /node scripts\/validate-hub-targets\.cjs/);
  assert.match(workflow, /node scripts\/deploy_hubs\.cjs --only=/);
  assert.doesNotMatch(workflow, /--only=(?:all|\$\{\{\s*inputs\.target\s*\}\})/);
  for (const action of workflow.matchAll(/uses:\s*[^@\s]+@([^\s#]+)/g)) {
    assert.match(action[1], /^[a-f0-9]{40}$/i, `Action pin must be a full immutable SHA: ${action[0]}`);
  }
}

function createLockfileFixture({ lockfile = true, tracked = false }) {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wiseresume-lockfile-test-'));
  const hubDir = path.join(fixtureRoot, 'appwrite-hubs', 'fixture-hub');
  fs.mkdirSync(hubDir, { recursive: true });
  fs.writeFileSync(path.join(hubDir, 'package.json'), '{"name":"fixture-hub","version":"1.0.0"}\n');
  if (lockfile) fs.writeFileSync(path.join(hubDir, 'package-lock.json'), '{"lockfileVersion":3}\n');
  execFileSync('git', ['init', '--quiet'], { cwd: fixtureRoot });
  if (tracked) execFileSync('git', ['add', 'appwrite-hubs/fixture-hub/package-lock.json'], { cwd: fixtureRoot });
  return fixtureRoot;
}

test('the deployment workflow requires explicit targets and uses immutable actions', () => {
  const workflow = read('.github/workflows/deploy-appwrite-hubs.yml');
  assert.doesNotThrow(() => assertWorkflowHardening(workflow));
  assert.doesNotThrow(() => assertWorkflowHardening(workflow.replace(/\n/g, '\r\n')));
  assert.throws(() => assertWorkflowHardening(workflow.replace('required: true', 'required: false')));
});

test('the AI runtime receipt schema is provisioned before any receipt-writing hub deployment', () => {
  const workflow = read('.github/workflows/deploy-appwrite-hubs.yml');
  const setup = 'node scripts/setup_ai_runtime_receipts_schema.cjs';
  const deploy = 'Deploy explicitly selected Appwrite hubs';
  assert.match(workflow, new RegExp(setup.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.ok(workflow.indexOf(setup) < workflow.indexOf(deploy), 'receipt schema setup must precede hub deployment');

  for (const hub of ['admin-devkit-data', 'ai-gateway', 'job-import', 'resume-section-ai']) {
    assert.match(
      workflow,
      new RegExp(`contains\\(fromJSON\\(steps\\.targets\\.outputs\\.targets_json\\), '${hub}'\\)`),
      `receipt schema setup must cover ${hub}`,
    );
  }
});

test('every deployable hub lockfile is present and tracked by Git', () => {
  const script = read('scripts/deploy_hubs.cjs');
  assert.match(script, /missing package-lock\.json/);
  assert.match(script, /npm ci --omit=dev --ignore-scripts/);

  for (const entry of fs.readdirSync(path.join(root, 'appwrite-hubs'), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const hubDir = path.join(root, 'appwrite-hubs', entry.name);
    if (fs.existsSync(path.join(hubDir, 'package.json'))) {
      assertTrackedLockfile(root, entry.name);
    }
  }
});

test('lockfile tracking rejects ignored or missing files and accepts a staged tracked file', () => {
  const untrackedFixture = createLockfileFixture({ lockfile: true, tracked: false });
  const missingFixture = createLockfileFixture({ lockfile: false, tracked: false });
  const trackedFixture = createLockfileFixture({ lockfile: true, tracked: true });
  try {
    assert.throws(() => assertTrackedLockfile(untrackedFixture, 'fixture-hub'), /not tracked by Git/);
    assert.throws(() => assertTrackedLockfile(missingFixture, 'fixture-hub'), /missing package-lock/);
    assert.doesNotThrow(() => assertTrackedLockfile(trackedFixture, 'fixture-hub'));
  } finally {
    fs.rmSync(untrackedFixture, { recursive: true, force: true });
    fs.rmSync(missingFixture, { recursive: true, force: true });
    fs.rmSync(trackedFixture, { recursive: true, force: true });
  }
});

test('explicit deployment target validation rejects unsafe input and accepts known targets', () => {
  assert.throws(() => parseExplicitHubTargets(''), /At least one explicit Appwrite hub target/);
  assert.throws(() => parseExplicitHubTargets('all'), /target=all is prohibited/);
  assert.throws(() => parseExplicitHubTargets('job-feed-sync,unknown-hub'), /Unknown Appwrite hub target/);
  assert.deepEqual(
    parseExplicitHubTargets('job-feed-sync,get-remote-jobs,track-job-action'),
    ['job-feed-sync', 'get-remote-jobs', 'track-job-action'],
  );
});

test('the three recovery hub lockfiles are usable by npm ci in clean copies', { timeout: 120_000 }, () => {
  for (const hubName of ['job-feed-sync', 'get-remote-jobs', 'track-job-action']) {
    const sourceDir = path.join(root, 'appwrite-hubs', hubName);
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `wiseresume-${hubName}-`));
    try {
      fs.copyFileSync(path.join(sourceDir, 'package.json'), path.join(tempDir, 'package.json'));
      fs.copyFileSync(path.join(sourceDir, 'package-lock.json'), path.join(tempDir, 'package-lock.json'));
      execFileSync(npmCommand, ['ci', '--omit=dev', '--ignore-scripts'], {
        cwd: tempDir,
        stdio: 'pipe',
        shell: process.platform === 'win32',
      });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
});
