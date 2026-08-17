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
  '0.12.34.56',
  '224.0.0.1',
  '239.255.255.255',
  '240.0.0.1',
  '255.255.255.255',
  '64:ff9b::7f00:1',
  '2002::1',
  'ff02::1',
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
  'https://metadata.google.internal/computeMetadata/v1/',
  'https://service.internal/jobs',
  'https://printer.local/jobs',
  'https://router.home.arpa/jobs',
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

(async () => {
  const target = await t.resolveSafeTarget(
    'https://jobs.example.com/role',
    async () => [
      { address: '93.184.216.34', family: 4 },
      { address: '2606:2800:220:1:248:1893:25c8:1946', family: 6 },
    ],
  );
  assert.equal(target.hostname, 'jobs.example.com');
  assert.equal(target.addresses.length, 2);

  await assert.rejects(
    () => t.resolveSafeTarget(
      'https://rebind.example/jobs',
      async () => [
        { address: '93.184.216.34', family: 4 },
        { address: '127.0.0.1', family: 4 },
      ],
    ),
    /blocked network/,
    'a hostname with any private answer must be rejected',
  );

  const lookup = t.createPinnedLookup('jobs.example.com', [{ address: '93.184.216.34', family: 4 }]);
  const pinned = await new Promise((resolve, reject) => {
    lookup('jobs.example.com', { family: 4 }, (error, address, family) => {
      if (error) reject(error);
      else resolve({ address, family });
    });
  });
  assert.deepEqual(pinned, { address: '93.184.216.34', family: 4 });

  await assert.rejects(
    () => new Promise((resolve, reject) => {
      lookup('unexpected.example.com', {}, error => error ? reject(error) : resolve());
    }),
    /Unexpected DNS hostname/,
    'the transport lookup must not resolve a different hostname',
  );

  console.log('[TEST] job-import SSRF defenses verified');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
