'use strict';

// B10/Fix2 — track-visitor-event sanitisation, bot guard, and rate limiting.
// Pure-logic checks via the module's __test export (no live Appwrite needed).

const assert = require('node:assert/strict');
const hub = require('../../appwrite-hubs/track-visitor-event/src/main.js');
const { sanitize, BOT_UA, ALLOWED_EVENT_TYPES, rateLimitKey, isRateLimited, RL_MAX_PER_WINDOW, hashAnonId } = hub.__test;

// sanitize: rejects unknown event types, keeps allowlisted fields, truncates.
assert.equal(sanitize({ event_type: 'evil' }), null, 'unknown event_type rejected');
assert.equal(sanitize(null), null, 'null rejected');
const clean = sanitize({ event_type: 'page_view', page: '/x', session_id: 's', bogus: 'DROP' });
assert.equal(clean.event_type, 'page_view');
assert.equal(clean.page, '/x');
assert.equal(clean.bogus, undefined, 'unknown field dropped');
assert.ok(ALLOWED_EVENT_TYPES.has('page_view'));

const privacy = sanitize({
  event_type: 'page_view',
  page: '/pricing',
  anon_id: 'anon-1',
  consent_state: 'pending',
  occurred_at: '2026-06-30T12:00:00.000Z',
  is_internal: false,
  is_bot: false,
  identity_version: 'v2',
});
assert.equal(privacy.consent_state, 'pending');
assert.equal(privacy.occurred_at, '2026-06-30T12:00:00.000Z');
assert.equal(privacy.is_internal, false);
assert.equal(privacy.is_bot, false);
assert.equal(privacy.identity_version, 'v2');
assert.equal(hashAnonId('anon-1', ''), null, 'identity linking stays disabled without a secret');
assert.match(hashAnonId('anon-1', 'test-secret'), /^[a-f0-9]{64}$/, 'identity links store a one-way HMAC');

// bot guard
assert.equal(BOT_UA.test('Mozilla/5.0 (compatible; Googlebot/2.1)'), true, 'bot detected');
assert.equal(BOT_UA.test('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)'), false, 'human not flagged');

// rate limiting — same key throttled after the window budget, other keys unaffected
const key = rateLimitKey({ events: [{ session_id: 'sess-A' }] }, { 'x-forwarded-for': '9.9.9.9' });
let allowed = 0;
let blocked = 0;
for (let i = 0; i < RL_MAX_PER_WINDOW + 5; i++) {
  if (isRateLimited(key)) blocked++;
  else allowed++;
}
assert.equal(allowed, RL_MAX_PER_WINDOW, 'allows exactly the window budget');
assert.equal(blocked, 5, 'blocks the excess');
const otherKey = rateLimitKey({ events: [{ anon_id: 'anon-B' }] }, {});
assert.equal(isRateLimited(otherKey), false, 'a different caller is not throttled');

// key derivation prefers session_id, then anon_id, then IP
const kSession = rateLimitKey({ events: [{ session_id: 's', anon_id: 'a' }] }, { 'x-forwarded-for': '1.1.1.1' });
const kAnon = rateLimitKey({ events: [{ anon_id: 'a' }] }, { 'x-forwarded-for': '1.1.1.1' });
const kIp = rateLimitKey({ events: [{}] }, { 'x-forwarded-for': '1.1.1.1' });
assert.notEqual(kSession, kAnon, 'session vs anon produce different keys');
assert.notEqual(kAnon, kIp, 'anon vs ip produce different keys');

console.log('✓ track-visitor-event hub: sanitize + bot guard + rate limit OK');
