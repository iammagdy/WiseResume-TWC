import { useEffect, useRef, useState, useCallback } from 'react';
import { resolvePublicApiBase } from '@/lib/publicApiBase';

interface UsePortfolioTrackingProps {
  username?: string | null;
  refParam?: string | undefined;
  abVariant?: 'a' | 'b' | null;
}

interface BeaconSnapshot {
  username: string;
  refParam?: string;
  abVariant?: 'a' | 'b' | null;
}

export function usePortfolioTracking({ username, refParam, abVariant }: UsePortfolioTrackingProps) {
  const [stickyVisible, setStickyVisible] = useState(false);

  // Hero element tracked via a state-backed ref callback rather than a
  // plain RefObject. The previous RefObject implementation attached the
  // sticky-header IntersectionObserver in a `[]`-deps effect that ran
  // exactly once on mount — when the hero was not yet rendered (the
  // skeleton was still up), `heroRef.current` was null and the effect
  // bailed without re-attaching. State-backed refs re-trigger the
  // dependent effect the moment the hero element actually appears (or
  // changes), so the sticky header now reliably activates after the
  // skeleton is replaced by the real hero.
  const [heroEl, setHeroEl] = useState<HTMLDivElement | null>(null);
  const heroRef = useCallback((node: HTMLDivElement | null) => {
    setHeroEl(node);
  }, []);

  // Per-view state. Reset every time the portfolio `username` changes
  // (i.e. on navigation between portfolios within the same hook
  // instance) so timing, viewed sections, and the "already sent" guard
  // never leak from one portfolio's session into another's.
  const sectionsViewedRef = useRef<Set<string>>(new Set());
  const sectionTimingRef = useRef<Map<string, { accMs: number; enterTime: number | null }>>(new Map());
  const mountTimeRef = useRef<number>(Date.now());
  const trackSentRef = useRef(false);
  const lastUsernameRef = useRef<string | null | undefined>(undefined);
  const visitDocIdRef = useRef<string | null>(null);
  const earlyPingSentRef = useRef(false);

  // Live-value refs — only used by the public-API `sendTrackingBeacon`
  const usernameRef = useRef(username);
  const refParamRef = useRef(refParam);
  const abVariantRef = useRef(abVariant);
  useEffect(() => { usernameRef.current = username; }, [username]);
  useEffect(() => { refParamRef.current = refParam; }, [refParam]);
  useEffect(() => { abVariantRef.current = abVariant; }, [abVariant]);

  // Public-API beacon — kept for backward compatibility with tests/mocks.
  const sendTrackingBeacon = useCallback(() => {
    const isDebug = typeof window !== 'undefined' && (localStorage.getItem('wiseresume-debug') === 'true' || new URLSearchParams(window.location.search).has('debug'));
    const correlationId = 'visit_mock_' + Date.now();
    const url = `${resolvePublicApiBase()}/api/track-portfolio-view`;

    const now = Date.now();
    const sectionsTiming: Record<string, number> = {};
    sectionTimingRef.current.forEach((entry, id) => {
      let accMs = entry.accMs;
      if (entry.enterTime !== null) {
        accMs += now - entry.enterTime;
      }
      const secs = Math.round(accMs / 1000);
      if (secs >= 1) sectionsTiming[id] = secs;
    });

    const timeSpentSeconds = Math.round((Date.now() - mountTimeRef.current) / 1000);
    const ua = navigator.userAgent;
    const device = /Mobi|Android|iPhone|iPad|iPod/i.test(ua)
      ? (/iPad/i.test(ua) ? 'tablet' : 'mobile')
      : 'desktop';

    const payload = {
      username: usernameRef.current ?? '',
      ref: refParamRef.current ?? null,
      sections_viewed: [...sectionsViewedRef.current],
      sections_timing: JSON.stringify(sectionsTiming),
      time_spent_seconds: timeSpentSeconds,
      device,
      ab_variant: abVariantRef.current ?? null,
      action: 'visit_start',
      correlationId,
    };

    if (isDebug) console.log('[portfolio-tracking] sendTrackingBeacon manual invoke', payload);
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }, []);

  // Main lifecycle effect managing page pings, visibilitychange and pagehide
  useEffect(() => {
    if (!username) return;

    if (lastUsernameRef.current !== username) {
      trackSentRef.current = false;
      mountTimeRef.current = Date.now();
      sectionsViewedRef.current = new Set();
      sectionTimingRef.current = new Map();
      lastUsernameRef.current = username;
      visitDocIdRef.current = null;
      earlyPingSentRef.current = false;
    }

    const capturedUsername = username;
    const isDebug = typeof window !== 'undefined' && (localStorage.getItem('wiseresume-debug') === 'true' || new URLSearchParams(window.location.search).has('debug'));

    // Stable visitSessionId per page view session
    const visitSessionKey = `portfolio-visit-session-id:${capturedUsername}`;
    let visitSessionId = sessionStorage.getItem(visitSessionKey);
    if (!visitSessionId) {
      visitSessionId = 'visit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      sessionStorage.setItem(visitSessionKey, visitSessionId);
    }
    const correlationId = visitSessionId;

    if (isDebug) {
      console.log(`[portfolio-tracking] [${correlationId}] Hook effect mounted for ${capturedUsername}. sessionStorage sessionId: ${visitSessionId}`);
    }

    const buildPayload = (action: 'visit_start' | 'visit_end') => {
      const now = Date.now();
      const sectionsTiming: Record<string, number> = {};
      sectionTimingRef.current.forEach((entry, id) => {
        let accMs = entry.accMs;
        if (entry.enterTime !== null) {
          accMs += now - entry.enterTime;
        }
        const secs = Math.round(accMs / 1000);
        if (secs >= 1) sectionsTiming[id] = secs;
      });

      const timeSpentSeconds = Math.round((Date.now() - mountTimeRef.current) / 1000);
      const ua = navigator.userAgent;
      const device = /Mobi|Android|iPhone|iPad|iPod/i.test(ua)
        ? (/iPad/i.test(ua) ? 'tablet' : 'mobile')
        : 'desktop';

      return {
        username: capturedUsername,
        ref: refParamRef.current ?? null,
        sections_viewed: [...sectionsViewedRef.current],
        sections_timing: JSON.stringify(sectionsTiming),
        time_spent_seconds: timeSpentSeconds,
        device,
        ab_variant: abVariantRef.current ?? null,
        action,
        correlationId,
      };
    };

    const sendEarlyPing = async () => {
      if (earlyPingSentRef.current || trackSentRef.current) return;
      earlyPingSentRef.current = true;

      const payload = buildPayload('visit_start');
      if (isDebug) {
        console.log(`[portfolio-tracking] [${correlationId}] Sending 4-second early ping...`);
      }

      try {
        const url = `${resolvePublicApiBase()}/api/track-portfolio-view`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json() as { visitDocId?: string };
          if (data?.visitDocId) {
            visitDocIdRef.current = data.visitDocId;
            if (isDebug) {
              console.log(`[portfolio-tracking] [${correlationId}] Early ping created visitDocId: ${data.visitDocId}`);
            }
          }
        } else if (isDebug) {
          console.warn(`[portfolio-tracking] [${correlationId}] Early ping HTTP status: ${res.status}`);
        }
      } catch (err) {
        if (isDebug) {
          console.error(`[portfolio-tracking] [${correlationId}] Early ping error:`, err);
        }
      }
    };

    const timerId = setTimeout(sendEarlyPing, 4000);

    const sendFinalPing = () => {
      const wasEarlyPingSent = earlyPingSentRef.current;
      const visitDocId = visitDocIdRef.current;

      let action: 'visit_start' | 'visit_end';
      let shouldSend = false;

      if (!wasEarlyPingSent) {
        action = 'visit_start';
        shouldSend = true;
        trackSentRef.current = true;
      } else if (visitDocId) {
        action = 'visit_end';
        shouldSend = true;
      } else {
        if (isDebug) {
          console.log(`[portfolio-tracking] [${correlationId}] Final ping skipped (early ping failed/no doc ID)`);
        }
        shouldSend = false;
      }

      if (!shouldSend) return;

      const payload = {
        ...buildPayload(action!),
        visitDocId,
      };

      if (isDebug) {
        console.log(`[portfolio-tracking] [${correlationId}] Sending final ping. action: ${action!}, visitDocId: ${visitDocId || 'none'}`);
      }

      const url = `${resolvePublicApiBase()}/api/track-portfolio-view`;
      const json = JSON.stringify(payload);

      try {
        if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function' && action! === 'visit_end') {
          navigator.sendBeacon(url, new Blob([json], { type: 'application/json' }));
        } else {
          fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: json,
            keepalive: true,
          }).catch(() => {});
        }
      } catch (err) {
        if (isDebug) {
          console.error(`[portfolio-tracking] [${correlationId}] Final ping dispatch error:`, err);
        }
      }
    };

    const onHide = () => {
      if (isDebug) {
        console.log(`[portfolio-tracking] [${correlationId}] visibilitychange / pagehide triggered`);
      }
      sendFinalPing();
    };

    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);

    return () => {
      clearTimeout(timerId);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      if (isDebug) {
        console.log(`[portfolio-tracking] [${correlationId}] Hook effect cleanup (unmount)`);
      }
      sendFinalPing();
    };
  }, [username]);

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

  // Sticky header observer — depends on the hero element NODE so the
  // observer re-attaches the moment PublicHero mounts (or remounts)
  // after the initial paint. Previously the effect ran once with `[]`
  // deps, observed `null`, and never recovered when the hero appeared
  // later, breaking the sticky header on slow first paints.
  useEffect(() => {
    if (!heroEl) return;
    const observer = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting),
      { threshold: 0.1, rootMargin: '-80px 0px 0px 0px' }
    );
    observer.observe(heroEl);
    return () => observer.disconnect();
  }, [heroEl]);

  return { stickyVisible, heroRef, sendTrackingBeacon };
}
