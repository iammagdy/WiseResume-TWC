// SSRF validation regression tests for job-import hub.
// Exercises isBlockedIp and isSafeUrl functions.
const assert = require('node:assert/strict');

// Stub axios to let the hub load in this environment.
const Module = require('node:module');
const _origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'axios') {
    return { get: async () => ({}), post: async () => ({}) };
  }
  return _origLoad.apply(this, arguments);
};

const mod = require('../../appwrite-hubs/job-import/src/main.js');
Module._load = _origLoad;
const t = mod.__test;

assert.ok(t, 'job-import should expose __test helpers');
assert.ok(t.isBlockedIp, 'job-import should expose isBlockedIp');
assert.ok(t.isSafeUrl, 'job-import should expose isSafeUrl');

// --- Test Cases for isBlockedIp ---
const blockedIps = [
  '127.0.0.1',
  '127.255.0.1',
  '10.0.0.1',
  '192.168.1.1',
  '172.16.0.1',
  '172.31.255.255',
  '169.254.169.254',
  '100.64.0.1',
  '100.127.255.255',
  '192.0.2.1',
  '198.51.100.5',
  '203.0.113.12',
  '198.18.0.50',
  '198.19.255.255',
  '233.252.0.1',
  '0.0.0.0',
  '::1',
  'fe80::1',
  'fec0::1',
  'fc00::1',
  'fd00::2',
  '::ffff:127.0.0.1',
  '::ffff:192.168.0.1',
  '::ffff:10.0.0.1',
  'localhost'
];

for (const ip of blockedIps) {
  assert.equal(t.isBlockedIp(ip), true, `IP ${ip} should be blocked`);
}

const allowedIps = [
  '93.184.216.34',
  '8.8.8.8',
  '1.1.1.1',
  '142.250.190.46',
  '2607:f8b0:4005:802::200e'
];

for (const ip of allowedIps) {
  assert.equal(t.isBlockedIp(ip), false, `IP ${ip} should be allowed`);
}

// --- Test Cases for isSafeUrl ---
const blockedUrls = [
  'http://localhost/jobs',
  'http://127.0.0.1/jobs',
  'http://[::1]/jobs',
  'http://169.254.169.254/latest/meta-data/',
  'http://[::ffff:127.0.0.1]/jobs',
  'http://[fe80::1]/jobs',
  'ftp://google.com/jobs', // only http/https allowed
  'gopher://example.com'
];

for (const url of blockedUrls) {
  assert.equal(t.isSafeUrl(url), false, `URL ${url} should be unsafe`);
}

const allowedUrls = [
  'http://example.com/jobs',
  'https://wiseresume.app/upload',
  'https://google.com'
];

for (const url of allowedUrls) {
  assert.equal(t.isSafeUrl(url), true, `URL ${url} should be safe`);
}

console.log('[TEST] job-import SSRF defenses verified');
