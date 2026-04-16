import { useEffect, useRef, useState, useCallback } from 'react';
import { EDGE_FUNCTIONS_URL } from '@/lib/supabaseConstants';

interface UsePortfolioTrackingProps {
  username?: string | null;
  refParam?: string | undefined;
  abVariant?: 'a' | 'b' | null;
}

export function usePortfolioTracking({ username, refParam, abVariant }: UsePortfolioTrackingProps) {
  const [stickyVisible, setStickyVisible] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  // Track visited sections (presence set)
  const sectionsViewedRef = useRef<Set<string>>(new Set());
  // Per-section dwell time tracking: Map<sectionId, {accumulatedMs, enterTime | null}>
  const sectionTimingRef = useRef<Map<string, { accMs: number; enterTime: number | null }>>(new Map());
  const mountTimeRef = useRef<number>(Date.now());
  const trackSentRef = useRef(false);

  const sendTrackingBeacon = useCallback(() => {
    if (trackSentRef.current) return;
    if (!username) return;
    trackSentRef.current = true;

    // Flush any sections still visible (observer hasn't fired "exit" yet)
    const now = Date.now();
    sectionTimingRef.current.forEach((entry, id) => {
      if (entry.enterTime !== null) {
        entry.accMs += now - entry.enterTime;
        entry.enterTime = null;
      }
    });

    // Convert ms map to seconds object (only include sections with >= 1s)
    const sectionsTiming: Record<string, number> = {};
    sectionTimingRef.current.forEach((entry, id) => {
      const secs = Math.round(entry.accMs / 1000);
      if (secs >= 1) sectionsTiming[id] = secs;
    });

    const timeSpentSeconds = Math.round((Date.now() - mountTimeRef.current) / 1000);
    const ua = navigator.userAgent;
    const device = /Mobi|Android|iPhone|iPad|iPod/i.test(ua)
      ? (/iPad/i.test(ua) ? 'tablet' : 'mobile')
      : 'desktop';
    const body = JSON.stringify({
      username,
      ref: refParam,
      sectionsViewed: [...sectionsViewedRef.current],
      sectionsTiming,
      timeSpentSeconds,
      device,
      abVariant: abVariant ?? undefined,
    });
    const url = `${EDGE_FUNCTIONS_URL}/functions/v1/track-portfolio-view`;
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    } else {
      fetch(url, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {});
    }
  }, [username, refParam, abVariant]);

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

  // Section scroll tracking: IntersectionObserver with dwell-time accumulation
  useEffect(() => {
    const sectionNames = ['experience', 'education', 'skills', 'projects', 'github', 'certifications', 'awards', 'publications', 'volunteering', 'case-studies', 'services'];
    const observer = new IntersectionObserver(
      (entries) => {
        const now = Date.now();
        for (const entry of entries) {
          const name = entry.target.id.replace('section-', '');
          if (!sectionTimingRef.current.has(name)) {
            sectionTimingRef.current.set(name, { accMs: 0, enterTime: null });
          }
          const timing = sectionTimingRef.current.get(name)!;
          if (entry.isIntersecting) {
            // Section entered view
            sectionsViewedRef.current.add(name);
            if (timing.enterTime === null) {
              timing.enterTime = now;
            }
          } else {
            // Section left view — accumulate time
            if (timing.enterTime !== null) {
              timing.accMs += now - timing.enterTime;
              timing.enterTime = null;
            }
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
  }, [username]);

  // Sticky header observer
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
