'use strict';

const assert = require('node:assert/strict');
const {
  cairoDayBounds,
  summarizeVisitorEvents,
  buildMetricMeta,
  aggregateByCairoDay,
} = require('../../appwrite-hubs/admin-visitor-analytics/src/metrics.cjs');

const bounds = cairoDayBounds(new Date('2026-06-30T22:30:00.000Z'));
assert.equal(bounds.from, '2026-06-30T21:00:00.000Z');
assert.equal(bounds.to, '2026-07-01T21:00:00.000Z');

const events = [
  { event_type: 'page_view', session_id: 's1', anon_id: 'a1', user_id: '', page: '/', $createdAt: '2026-06-30T22:40:00.000Z' },
  { event_type: 'page_view', session_id: 's1', anon_id: 'a1', user_id: '', page: '/pricing', $createdAt: '2026-06-30T22:41:00.000Z' },
  { event_type: 'page_view', session_id: 's2', anon_id: 'a2', user_id: 'u1', page: '/dashboard', $createdAt: '2026-06-30T22:42:00.000Z' },
  { event_type: 'feature_use', session_id: 's2', anon_id: 'a2', user_id: 'u1', page: '/dashboard', $createdAt: '2026-06-30T22:43:00.000Z' },
  { event_type: 'page_view', session_id: 'bot', anon_id: 'bot', page: '/', is_bot: true, $createdAt: '2026-06-30T22:44:00.000Z' },
  { event_type: 'page_view', session_id: 'admin', anon_id: 'admin', page: '/devkit', $createdAt: '2026-06-30T22:45:00.000Z' },
];

const summary = summarizeVisitorEvents(events);
assert.deepEqual(summary, {
  sessions: 2,
  pageViews: 3,
  uniqueVisitors: 2,
  authenticatedActiveUsers: 1,
});

assert.deepEqual(buildMetricMeta({ truncated: false, source: 'visitor_events' }), {
  timezone: 'Africa/Cairo',
  complete: true,
  truncated: false,
  source: 'visitor_events',
});
assert.equal(buildMetricMeta({ truncated: true, source: 'visitor_events' }).complete, false);
const daily = aggregateByCairoDay(events.slice(0, 4));
assert.equal(daily.length, 1);
assert.deepEqual(daily[0], { date: '2026-07-01', sessions: 2, pageViews: 3, uniqueVisitors: 2, authenticatedActiveUsers: 1 });

console.log('✓ admin analytics metrics: Cairo boundaries + distinct metric semantics OK');
