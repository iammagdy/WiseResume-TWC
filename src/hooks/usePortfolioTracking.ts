import { useEffect, useRef, useState, useCallback } from 'react';

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
  // Sentinel used to detect a real portfolio change (vs. a refParam /
  // abVariant tweak). Initialised to `undefined` so the very first
  // username sighting triggers a per-view reset, which is harmless.
  const lastUsernameRef = useRef<string | null | undefined>(undefined);

  // Live-value refs — only used by the public-API `sendTrackingBeacon`
  // wrapper so external callers (currently only test mocks; the real
  // page consumes only `stickyVisible` and `heroRef`) always fire
  // against the currently displayed portfolio. The effect-based
  // visibility/pagehide/unmount paths use a per-effect SNAPSHOT
  // instead — see `sendForView` below.
  const usernameRef = useRef(username);
  const refParamRef = useRef(refParam);
  const abVariantRef = useRef(abVariant);
  useEffect(() => { usernameRef.current = username; }, [username]);
  useEffect(() => { refParamRef.current = refParam; }, [refParam]);
  useEffect(() => { abVariantRef.current = abVariant; }, [abVariant]);

  // Stable beacon body builder. Accepts an explicit snapshot so the
  // unmount/visibility paths can pass the username/ref/abVariant they
  // were attached for, while the public-API wrapper passes live ref
  // values.
  const sendBeaconCore = useCallback((snap: BeaconSnapshot) => {
    if (trackSentRef.current) return;
    if (!snap.username) return;
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

    const payload: Record<string, unknown> = {
      username: snap.username,
      ref: snap.refParam ?? null,
      sections_viewed: [...sectionsViewedRef.current],
      sections_timing: JSON.stringify(sectionsTiming),
      time_spent_seconds: timeSpentSeconds,
      device,
      ab_variant: snap.abVariant ?? null,
    };

    // Deliver via navigator.sendBeacon where available — guaranteed delivery
    // even on page unload/pagehide because the browser completes the request
    // regardless of navigation. Falls back to keepalive fetch for environments
    // where sendBeacon is unavailable. Both paths are fire-and-forget.
    const body = JSON.stringify(payload);
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/track-portfolio-view', blob);
    } else {
      fetch('/api/track-portfolio-view', {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body,
      }).catch(() => {});
    }
  }, []);

  // Public-API beacon — wraps sendBeaconCore with live ref values so
  // external callers always fire against the currently displayed
  // portfolio.  Kept for backward compatibility with the hook's
  // declared return shape; the real page does not consume it.
  const sendTrackingBeacon = useCallback(() => {
    sendBeaconCore({
      username: usernameRef.current ?? '',
      refParam: refParamRef.current,
      abVariant: abVariantRef.current,
    });
  }, [sendBeaconCore]);

  // Visibility / pagehide handlers + unmount beacon.
  //
  // `username` is PINNED at effect-bind time (`capturedUsername`) and
  // re-bound only when the username itself changes — this is the core
  // Phase 3 fix. A fast /p/alice → /p/bob navigation with a reused
  // hook instance can never misattribute alice's view to bob, because
  // by the time the cleanup beacon fires the closure already holds
  // alice's name regardless of what `usernameRef.current` has since
  // become.
  //
  // `refParam` and `abVariant` are read from their live refs at FIRE
  // time, NOT pinned at bind time. Rationale:
  //   * `abVariant` is commonly resolved AFTER the initial render
  //     (e.g. assigned post profile-load). Pinning it at bind would
  //     attribute every late-resolving experiment session to `null`.
  //   * The `useEffect` cleanup-then-body ordering guarantees that
  //     during this effect's cleanup, refParamRef / abVariantRef
  //     still hold the OLD view's values: cleanup runs in reverse
  //     declaration order, so this effect's cleanup runs BEFORE the
  //     ref-update effects' bodies (declared above) re-run for the
  //     new view. Reading the refs in cleanup is therefore safe.
  //   * Visibility / pagehide events that fire mid-view see the
  //     latest refs, which is exactly what we want for late-resolved
  //     experiment attribution.
  //
  // Deps: ONLY `username` (and the stable sendBeaconCore). refParam /
  // abVariant changes do NOT re-bind — that would re-fire the cleanup
  // beacon every URL-hash tweak and break the "one beacon per
  // portfolio view" guarantee enforced by `trackSentRef`.
  useEffect(() => {
    if (!username) return;
    // Reset per-view state when the portfolio actually changes.
    // refParam / abVariant changes are explicitly NOT a portfolio
    // change, so the sentinel ref guards against false resets.
    if (lastUsernameRef.current !== username) {
      trackSentRef.current = false;
      mountTimeRef.current = Date.now();
      sectionsViewedRef.current = new Set();
      sectionTimingRef.current = new Map();
      lastUsernameRef.current = username;
    }

    const capturedUsername = username; // pin — see header comment
    const buildSnap = (): BeaconSnapshot => ({
      username: capturedUsername,
      refParam: refParamRef.current,
      abVariant: abVariantRef.current,
    });
    const onHide = () => sendBeaconCore(buildSnap());
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      sendBeaconCore(buildSnap()); // username pinned, refs read live
    };
  }, [username, sendBeaconCore]);

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
