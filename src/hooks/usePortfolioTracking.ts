import { useEffect, useRef, useState, useCallback } from 'react';
import { EDGE_FUNCTIONS_URL } from '@/lib/supabaseConstants';

interface UsePortfolioTrackingProps {
  username?: string | null;
  refParam?: string | undefined;
}

export function usePortfolioTracking({ username, refParam }: UsePortfolioTrackingProps) {
  const [stickyVisible, setStickyVisible] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  // Track visited sections via single shared IntersectionObserver
  const sectionsViewedRef = useRef<Set<string>>(new Set());
  const mountTimeRef = useRef<number>(Date.now());
  const trackSentRef = useRef(false);

  const sendTrackingBeacon = useCallback(() => {
    if (trackSentRef.current) return;
    if (!username) return;
    trackSentRef.current = true;
    const timeSpentSeconds = Math.round((Date.now() - mountTimeRef.current) / 1000);
    const body = JSON.stringify({
      username,
      ref: refParam,
      sectionsViewed: [...sectionsViewedRef.current],
      timeSpentSeconds,
    });
    const url = `${EDGE_FUNCTIONS_URL}/functions/v1/track-portfolio-view`;
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    } else {
      fetch(url, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {});
    }
  }, [username, refParam]);

  // Send beacon on page hide / visibility change
  useEffect(() => {
    const onHide = () => sendTrackingBeacon();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      sendTrackingBeacon(); // send on unmount
    };
  }, [sendTrackingBeacon]);

  // Section scroll tracking via single IntersectionObserver
  useEffect(() => {
    const sectionNames = ['experience', 'education', 'skills', 'projects', 'github', 'certifications', 'awards', 'publications', 'volunteering', 'case-studies', 'services'];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const name = entry.target.id.replace('section-', '');
            sectionsViewedRef.current.add(name);
          }
        }
      },
      { threshold: 0.3 }
    );
    sectionNames.forEach(name => {
      const el = document.getElementById(`section-${name}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [username]); // depend on username to re-attach if page content changes entirely

  // Sticky header observer
  // US3 FIX: Removed `portfolio` from dependency array to prevent flickering during refetches.
  // It only relies on `heroRef.current` mounting.
  useEffect(() => {
    if (!heroRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting),
      { threshold: 0.1, rootMargin: '-80px 0px 0px 0px' }
    );
    observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, []);

  return {
    stickyVisible,
    heroRef,
    sendTrackingBeacon
  };
}
