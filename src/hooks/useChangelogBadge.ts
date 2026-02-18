import { useState, useEffect, useCallback } from 'react';

const SEEN_KEY = 'lastSeenChangelog';
const CHANGELOG_URL = '/changelog.json';

export function useChangelogBadge() {
  const [hasNew, setHasNew] = useState(false);

  useEffect(() => {
    fetch(CHANGELOG_URL)
      .then(r => r.json())
      .then((data: { version: string }[]) => {
        const latest = data[0]?.version;
        const seen = localStorage.getItem(SEEN_KEY);
        if (latest && seen !== latest) setHasNew(true);
      })
      .catch(() => {});
  }, []);

  const markSeen = useCallback(() => {
    fetch(CHANGELOG_URL)
      .then(r => r.json())
      .then((data: { version: string }[]) => {
        const latest = data[0]?.version;
        if (latest) {
          localStorage.setItem(SEEN_KEY, latest);
          setHasNew(false);
        }
      })
      .catch(() => {});
  }, []);

  return { hasNew, markSeen };
}
