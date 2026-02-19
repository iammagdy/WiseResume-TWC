import { useState, useEffect, useCallback } from 'react';

const SEEN_KEY = 'lastSeenChangelog';
const CHANGELOG_URL = '/changelog.json';

// Module-level cache: fetch once per session, share across all hook instances
let cachedFetch: Promise<{ version: string }[]> | null = null;
function getChangelog(): Promise<{ version: string }[]> {
  if (!cachedFetch) {
    cachedFetch = fetch(CHANGELOG_URL)
      .then(r => r.json())
      .catch(() => []);
  }
  return cachedFetch;
}

export function useChangelogBadge() {
  const [hasNew, setHasNew] = useState(false);

  useEffect(() => {
    getChangelog().then((data) => {
      const latest = data[0]?.version;
      const seen = localStorage.getItem(SEEN_KEY);
      if (latest && seen !== latest) setHasNew(true);
    });
  }, []);

  const markSeen = useCallback(() => {
    getChangelog().then((data) => {
      const latest = data[0]?.version;
      if (latest) {
        localStorage.setItem(SEEN_KEY, latest);
        setHasNew(false);
      }
    });
  }, []);

  return { hasNew, markSeen };
}
