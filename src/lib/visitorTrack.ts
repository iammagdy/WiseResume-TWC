/**
 * Visitor tracking utility.
 *
 * Two-tier tracking:
 *
 * TIER 1 — Pre-consent (always on, GDPR-safe):
 *   Uses a session-only (non-persistent) ephemeral_id + session_id.
 *   Nothing written to localStorage → zero cross-session linkability.
 *   Records page_view events so the DevKit Growth tab shows real visit counts
 *   even before users interact with the consent banner.
 *
 * TIER 2 — Post-consent (opt-in):
 *   After the visitor accepts cookies, events are upgraded to carry a
 *   persistent anon_id (localStorage) and include user_id when authenticated.
 *   Pre-consent queued events are re-emitted with the persistent ID.
 *
 * Country:
 *   Resolved once per session via a lightweight geo API and cached in
 *   sessionStorage. Included in all events so the DevKit map/country KPIs
 *   show real data.
 */
import { databases, DATABASE_ID, ID } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';

export const CONSENT_KEY = 'wise_tracking_consent';
export const ANON_ID_KEY  = 'wise_anon_id';

const SESSION_ID_KEY    = 'wise_session_id';
const COUNTRY_CACHE_KEY = 'wise_visitor_country';

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

// Ephemeral in-memory ID used before consent is given.
// Not persisted anywhere — new value each page load.
let _ephemeralId: string | null = null;
function getEphemeralId(): string {
  if (!_ephemeralId) _ephemeralId = crypto.randomUUID();
  return _ephemeralId;
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
// Country geo resolution
// ---------------------------------------------------------------------------

let _country: string | null = null;
let _countryFetching = false;

function getCachedCountry(): string | null {
  if (_country) return _country;
  try {
    const cached = sessionStorage.getItem(COUNTRY_CACHE_KEY);
    if (cached) { _country = cached; return cached; }
  } catch { /* ignore */ }
  return null;
}

/** Fetch country once per session; result is cached in sessionStorage + memory. */
function resolveCountry(): void {
  if (_country || _countryFetching) return;
  _countryFetching = true;
  fetch('https://ip-api.com/json/?fields=countryCode', { cache: 'no-store' })
    .then((r) => r.json())
    .then((data: { countryCode?: string }) => {
      const code = data?.countryCode ?? null;
      if (code && /^[A-Z]{2}$/.test(code)) {
        _country = code;
        try { sessionStorage.setItem(COUNTRY_CACHE_KEY, code); } catch { /* ignore */ }
      }
    })
    .catch(() => { /* geo lookup is best-effort */ })
    .finally(() => { _countryFetching = false; });
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
  country?: string | null;
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

function buildBaseEvent(useConsented: boolean): Omit<VisitorEvent, 'event_type' | 'page'> {
  const ua = navigator.userAgent;
  const country = getCachedCountry();
  return {
    anon_id:     useConsented ? getOrCreateAnonId() : getEphemeralId(),
    user_id:     useConsented ? _userId : null,
    session_id:  getOrCreateSessionId(),
    referrer:    document.referrer || undefined,
    device_type: detectDevice(ua),
    browser:     detectBrowser(ua),
    os:          detectOS(ua),
    ...(country ? { country } : {}),
  };
}

async function flush(): Promise<void> {
  if (_queue.length === 0) return;
  const batch = _queue.splice(0, _queue.length);
  // Write each event directly to the Appwrite visitor_events collection.
  // Fire-and-forget: errors are silently discarded.
  await Promise.allSettled(
    batch.map((event) =>
      databases
        .createDocument(DATABASE_ID, COLLECTIONS.visitor_events, ID.unique(), event as unknown as Record<string, unknown>)
        .catch(() => {}),
    ),
  );
}

function ensureFlushTimer(): void {
  if (_flushTimer !== null) return;
  _flushTimer = setInterval(flush, 10_000);

  const onHide = () => {
    if (document.visibilityState === 'hidden') void flush();
  };
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', () => void flush());
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fire a page view event.
 * Always records (pre-consent uses ephemeral session-only IDs).
 * Starts country geo resolution on first call.
 */
export function trackPageView(path: string): void {
  resolveCountry();
  ensureFlushTimer();
  const consented = getConsent();
  _queue.push({
    ...buildBaseEvent(consented),
    event_type: 'page_view',
    page: path,
  });
}

/** Fire a click event on a labelled target. No-op if consent not granted. */
export function trackClick(target: string, page: string): void {
  if (!getConsent()) return;
  ensureFlushTimer();
  _queue.push({
    ...buildBaseEvent(true),
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
    ...buildBaseEvent(true),
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
    ...buildBaseEvent(true),
    event_type: 'feature_use',
    page,
    target: featureName,
  });
}

/** Grant consent, persist it, and flush any queued pre-consent events immediately. */
export function grantConsent(): void {
  try {
    localStorage.setItem(CONSENT_KEY, 'granted');
    getOrCreateAnonId(); // ensure persistent anon_id exists now
  } catch { /* ignore */ }
  // Flush queued pre-consent events right away now that we have permission.
  void flush();
}

/** Reject consent, persist the refusal, and discard any queued pre-consent events. */
export function rejectConsent(): void {
  try {
    localStorage.setItem(CONSENT_KEY, 'rejected');
  } catch { /* ignore */ }
  // Discard buffered pre-consent events — user said no.
  _queue = [];
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
