'use strict';

const ANALYTICS_TIMEZONE = 'Africa/Cairo';

function zonedParts(date, timeZone = ANALYTICS_TIMEZONE) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(parts.filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)]));
}

function zonedMidnightUtc(year, month, day, timeZone = ANALYTICS_TIMEZONE) {
  const desiredUtc = Date.UTC(year, month - 1, day, 0, 0, 0);
  let guess = desiredUtc;
  for (let i = 0; i < 3; i += 1) {
    const p = zonedParts(new Date(guess), timeZone);
    const representedUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    guess += desiredUtc - representedUtc;
  }
  return new Date(guess);
}

function cairoDayBounds(now = new Date()) {
  const p = zonedParts(now);
  const from = zonedMidnightUtc(p.year, p.month, p.day);
  const nextDate = new Date(Date.UTC(p.year, p.month - 1, p.day + 1));
  const next = zonedParts(nextDate, 'UTC');
  const to = zonedMidnightUtc(next.year, next.month, next.day);
  return { from: from.toISOString(), to: to.toISOString(), timezone: ANALYTICS_TIMEZONE };
}

function isCountableEvent(event) {
  if (!event || event.is_bot || event.is_internal) return false;
  return !(typeof event.page === 'string' && event.page.startsWith('/devkit'));
}

function summarizeVisitorEvents(events) {
  const countable = (events || []).filter(isCountableEvent);
  const pageViews = countable.filter(event => event.event_type === 'page_view');
  return {
    sessions: new Set(countable.map(event => event.session_id).filter(Boolean)).size,
    pageViews: pageViews.length,
    uniqueVisitors: new Set(countable.map(event => event.anon_id).filter(Boolean)).size,
    authenticatedActiveUsers: new Set(countable.map(event => event.user_id).filter(Boolean)).size,
  };
}

function buildMetricMeta({ truncated = false, source }) {
  return {
    timezone: ANALYTICS_TIMEZONE,
    complete: !truncated,
    truncated: Boolean(truncated),
    source,
  };
}

function aggregateByCairoDay(events) {
  const buckets = new Map();
  for (const event of (events || []).filter(isCountableEvent)) {
    const timestamp = event.occurred_at || event.$createdAt;
    if (!timestamp) continue;
    const p = zonedParts(new Date(timestamp));
    const date = `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
    if (!buckets.has(date)) buckets.set(date, []);
    buckets.get(date).push(event);
  }
  return [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, bucket]) => ({ date, ...summarizeVisitorEvents(bucket) }));
}

module.exports = {
  ANALYTICS_TIMEZONE,
  cairoDayBounds,
  isCountableEvent,
  summarizeVisitorEvents,
  buildMetricMeta,
  aggregateByCairoDay,
};
