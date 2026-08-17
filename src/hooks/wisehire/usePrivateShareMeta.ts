import { useEffect } from 'react';

function ensureMeta(name: string, content: string) {
  const selector = `meta[name="${name}"]`;
  const existing = document.head.querySelector<HTMLMetaElement>(selector);
  const meta = existing ?? document.createElement('meta');
  const previous = existing?.getAttribute('content');
  if (!existing) {
    meta.setAttribute('name', name);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
  return () => {
    if (!existing) meta.remove();
    else if (previous === null) existing.removeAttribute('content');
    else existing.setAttribute('content', previous);
  };
}

export function usePrivateShareMeta(title: string) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;
    const restoreRobots = ensureMeta('robots', 'noindex, nofollow, noarchive');
    const restoreReferrer = ensureMeta('referrer', 'no-referrer');
    return () => {
      document.title = previousTitle;
      restoreRobots();
      restoreReferrer();
    };
  }, [title]);
}
