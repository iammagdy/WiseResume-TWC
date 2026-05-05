/**
 * Visitor tracking utility.
 *
 * - No-ops until GDPR consent is granted.
 * - Queues events in memory and flushes every 10 s or on page hide.
 * - Anonymous visitors receive a persistent anon_id in localStorage.
 * - Authenticated users send their user_id alongside.
 * - All geo resolution happens server-side (CF headers); client only
 *   sends device/browser signals.
 */
import { apiFnUrl } from '@/lib/apiFnUrl';

export const CONSENT_KEY = 'wise_tracking_consent';
export const ANON_ID_KEY  = 'wise_anon_id';

const SESSION_ID_KEY = 'wise_session_id';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === 'granted';
  } catch {
    return false;
  }
}

function getOrCreateAnonId(): string {
  try {
    let id = localStorage.getItem(ANON_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ANON_ID_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function getOrCreateSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_ID_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

type DeviceType = 'mobile' | 'desktop' | 'tablet';

function detectDevice(ua: string): DeviceType {
  if (/iPad/i.test(ua)) return 'tablet';
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) return 'mobile';
  return 'desktop';
}

function detectBrowser(ua: string): string {
  if (/Edg\//i.test(ua))      return 'Edge';
  if (/SamsungBrowser/i.test(ua)) return 'Samsung';
  if (/OPR\//i.test(ua))      return 'Opera';
  if (/Firefox\//i.test(ua))  return 'Firefox';
  if (/Chrome\//i.test(ua))   return 'Chrome';
  if (/Safari\//i.test(ua))   return 'Safari';
  return 'Other';
}

function detectOS(ua: string): string {
  if (/Windows/i.test(ua))    return 'Windows';
  if (/Mac OS X/i.test(ua))   return 'macOS';
  if (/Android/i.test(ua))    return 'Android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Linux/i.test(ua))      return 'Linux';
  return 'Other';
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VisitorEvent {
  anon_id: string;
  user_id: string | null;
  session_id: string;
  event_type: 'page_view' | 'click' | 'section_view' | 'feature_use';
  page: string;
  target?: string;
  section?: string;
  referrer?: string;
  device_type: DeviceType;
  browser: string;
  os: string;
}

// ---------------------------------------------------------------------------
// Queue + flush
// ---------------------------------------------------------------------------

let _queue: VisitorEvent[] = [];
let _flushTimer: ReturnType<typeof setInterval> | null = null;
let _userId: string | null = null;

/** Called by auth context after login so events carry the user_id. */
export function setVisitorUserId(id: string | null): void {
  _userId = id;
}

function buildBaseEvent(): Omit<VisitorEvent, 'event_type' | 'page'> {
  const ua = navigator.userAgent;
  return {
    anon_id:     getOrCreateAnonId(),
    user_id:     _userId,
    session_id:  getOrCreateSessionId(),
    referrer:    document.referrer || undefined,
    device_type: detectDevice(ua),
    browser:     detectBrowser(ua),
    os:          detectOS(ua),
  };
}

async function flush(): Promise<void> {
  if (_queue.length === 0) return;
  const batch = _queue.splice(0, _queue.length);
  const url = apiFnUrl('track-visitor-event');
  const body = JSON.stringify({ events: batch });
  try {
    const enqueued =
      typeof navigator.sendBeacon === 'function' &&
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    if (!enqueued) {
      await fetch(url, {
        method: 'POST',
        body,
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch {
    // fire-and-forget; never surface tracking errors
  }
}

function ensureFlushTimer(): void {
  if (_flushTimer !== null) return;
  _flushTimer = setInterval(flush, 10_000);

  const onHide = () => {
    if (document.visibilityState === 'hidden') flush();
  };
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', flush);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Fire a page view event. No-op if consent not granted. */
export function trackPageView(path: string): void {
  if (!getConsent()) return;
  ensureFlushTimer();
  _queue.push({
    ...buildBaseEvent(),
    event_type: 'page_view',
    page: path,
  });
}

/** Fire a click event on a labelled target. No-op if consent not granted. */
export function trackClick(target: string, page: string): void {
  if (!getConsent()) return;
  ensureFlushTimer();
  _queue.push({
    ...buildBaseEvent(),
    event_type: 'click',
    page,
    target,
  });
}

/** Fire a section scroll event with optional dwell. No-op if consent not granted. */
export function trackSectionView(section: string, page: string): void {
  if (!getConsent()) return;
  ensureFlushTimer();
  _queue.push({
    ...buildBaseEvent(),
    event_type: 'section_view',
    page,
    section,
  });
}

/** Fire a named feature use event. No-op if consent not granted. */
export function trackFeatureUse(featureName: string, page: string): void {
  if (!getConsent()) return;
  ensureFlushTimer();
  _queue.push({
    ...buildBaseEvent(),
    event_type: 'feature_use',
    page,
    target: featureName,
  });
}

/** Grant consent, persist it, and create anon_id if not already set. */
export function grantConsent(): void {
  try {
    localStorage.setItem(CONSENT_KEY, 'granted');
    getOrCreateAnonId(); // ensure anon_id exists now
  } catch { /* ignore */ }
}

/** Reject consent, persist the refusal. */
export function rejectConsent(): void {
  try {
    localStorage.setItem(CONSENT_KEY, 'rejected');
  } catch { /* ignore */ }
}

/** Check whether user has already made a consent choice (any answer). */
export function hasConsentDecision(): boolean {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === 'granted' || v === 'rejected';
  } catch {
    return false;
  }
}
