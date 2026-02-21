/**
 * Progressive disclosure manager.
 * Gates discovery hints based on session count so users aren't overwhelmed
 * with multiple prompts simultaneously.
 *
 * Session 1-2: Only WhatsNextCard (core CTA)
 * Session 3+:  FeatureDiscovery / merged tips
 * Session 4+:  Discovery dots on tabs
 */

const SESSION_COUNT_KEY = 'wr-session-count';
const SESSION_ID_KEY = 'wr-session-id';

function getSessionCount(): number {
  try {
    return parseInt(localStorage.getItem(SESSION_COUNT_KEY) || '0', 10);
  } catch {
    return 0;
  }
}

/** Call once per app mount to increment the session counter. */
export function trackSession(): void {
  try {
    // Dedupe: only count once per browser session (tab lifecycle)
    const currentId = sessionStorage.getItem(SESSION_ID_KEY);
    if (currentId) return; // already counted this session
    sessionStorage.setItem(SESSION_ID_KEY, '1');
    const count = getSessionCount() + 1;
    localStorage.setItem(SESSION_COUNT_KEY, String(count));
  } catch {
    // storage unavailable — no-op
  }
}

type DiscoveryFeature =
  | 'whats-next'        // WhatsNextCard
  | 'feature-discovery' // merged feature tips in WhatsNextCard
  | 'discovery-dots'    // pulsing dots on bottom tabs
  | 'ai-studio-tour';   // AI Studio tour modal (always gated by its own flag)

/**
 * Returns true if the given discovery feature should be shown
 * based on the user's session count.
 */
export function shouldShowDiscovery(feature: DiscoveryFeature): boolean {
  const sessions = getSessionCount();

  switch (feature) {
    case 'whats-next':
      return true; // always visible
    case 'feature-discovery':
      return sessions >= 3;
    case 'discovery-dots':
      return sessions >= 4;
    case 'ai-studio-tour':
      return true; // gated by its own settings flag
    default:
      return true;
  }
}
