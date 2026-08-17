'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  readManagedAuthTemplates,
} = require('./auth-template-contract.cjs');

const rootDir = path.resolve(__dirname, '..');
const templates = readManagedAuthTemplates(rootDir);

assert.strictEqual(templates.verification.type, 'verification');
assert.strictEqual(templates.verification.subject, 'Verify your WiseResume email');
assert.ok(templates.verification.message.includes('{{redirect}}'));
assert.ok(templates.verification.message.trim().length > 0);

assert.strictEqual(templates.recovery.type, 'recovery');
assert.strictEqual(templates.recovery.subject, 'Reset your WiseResume password');
assert.ok(templates.recovery.message.includes('{{redirect}}'));
assert.ok(templates.recovery.message.trim().length > 0);

const deployHubsSource = fs.readFileSync(path.join(__dirname, 'deploy_hubs.cjs'), 'utf8');
const deployEmailSource = fs.readFileSync(path.join(__dirname, 'deploy_email_service.cjs'), 'utf8');

assert.ok(deployHubsSource.includes('readManagedAuthTemplates(ROOT)'));
assert.ok(deployHubsSource.includes('patchAuthEmailTemplate(verification.type, verification.subject, verification.message)'));
assert.ok(deployHubsSource.includes('patchAuthEmailTemplate(recovery.type, recovery.subject, recovery.message)'));
assert.ok(!deployHubsSource.includes("patchAuthEmailTemplate('verification', ' ', ' ')"));
assert.ok(!deployHubsSource.includes('Blanked verification template'));

assert.ok(deployEmailSource.includes('readManagedAuthTemplates(process.cwd())'));
assert.ok(deployEmailSource.includes('message: template.message'));
assert.ok(!deployEmailSource.includes("message: ' '"));
assert.ok(!deployEmailSource.includes('Blanked auth template'));
assert.ok(!deployEmailSource.includes('Blanked verification'));

console.log('Auth template contract tests passed: managed verification/recovery templates are functional and deployment code cannot blank them.');
