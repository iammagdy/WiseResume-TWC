import { useEffect, useRef, useState, useCallback } from 'react';
import { apiFnUrl } from '@/lib/apiFnUrl';

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
  // Per-section dwell time: Map<sectionId, {accumulatedMs, enterTime | null}>
  const sectionTimingRef = useRef<Map<string, { accMs: number; enterTime: number | null }>>(new Map());
  const mountTimeRef = useRef<number>(Date.now());
  const trackSentRef = useRef(false);

  // Keep mutable refs for values that change after mount so sendTrackingBeacon
  // stays stable (never triggers effect cleanup / re-run on data load).
  const usernameRef = useRef(username);
  const refParamRef = useRef(refParam);
  const abVariantRef = useRef(abVariant);
  useEffect(() => { usernameRef.current = username; }, [username]);
  useEffect(() => { refParamRef.current = refParam; }, [refParam]);
  useEffect(() => { abVariantRef.current = abVariant; }, [abVariant]);

  // Stable beacon function — reads from refs, never re-creates
  const sendTrackingBeacon = useCallback(() => {
    if (trackSentRef.current) return;
    if (!usernameRef.current) return;
    trackSentRef.current = true;

    // Flush any sections still in view (observer hasn't fired "exit" yet)
    const now = Date.now();
    sectionTimingRef.current.forEach((entry) => {
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
      username: usernameRef.current,
      ref: refParamRef.current,
      sectionsViewed: [...sectionsViewedRef.current],
      sectionsTiming,
      timeSpentSeconds,
      device,
      abVariant: abVariantRef.current ?? undefined,
    });

    const url = apiFnUrl(`track-portfolio-view`);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    } else {
      fetch(url, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {});
    }
  }, []); // ← intentionally empty: all state read from refs at call-time

  // Send beacon on page hide / visibility change — effect never re-runs
  useEffect(() => {
    const onHide = () => sendTrackingBeacon();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      sendTrackingBeacon(); // send on unmount
    };
  }, [sendTrackingBeacon]); // stable ref — fires once

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
            sectionsViewedRef.current.add(name);
            if (timing.enterTime === null) timing.enterTime = now;
          } else {
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
  }, [username]); // re-attach only on username change (page switch)

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

  return { stickyVisible, heroRef, sendTrackingBeacon };
}
