/**
 * useVisitorTracking — wires the visitor tracking system into the React app.
 *
 * Call once in AppRoutes (inside the router). It:
 *  1. Fires a page_view on every React Router navigation.
 *  2. Attaches a single delegated click listener for data-track elements.
 *  3. Observes data-section elements with IntersectionObserver + 2-second dwell.
 *  4. Syncs the current user_id into visitorTrack so events carry identity.
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView, trackClick, trackSectionView, setVisitorUserId } from '@/lib/visitorTrack';

interface UseVisitorTrackingOptions {
  userId?: string | null;
  /** When false, skips all listeners (e.g. public portfolio pages). */
  enabled?: boolean;
}

export function useVisitorTracking({ userId, enabled = true }: UseVisitorTrackingOptions = {}): void {
  const location = useLocation();
  const prevPathRef = useRef<string>('');

  // Sync user_id whenever auth state resolves
  useEffect(() => {
    if (!enabled) return;
    setVisitorUserId(userId ?? null);
  }, [enabled, userId]);

  // Page view on every navigation
  useEffect(() => {
    if (!enabled) return;
    const path = location.pathname;
    if (path === prevPathRef.current) return;
    prevPathRef.current = path;
    trackPageView(path);
  }, [enabled, location.pathname]);

  // Click tracking — delegated listener reads data-track attribute
  useEffect(() => {
    if (!enabled) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const el = target.closest<HTMLElement>('[data-track]');
      if (!el) return;
      const label = el.dataset.track;
      if (label) trackClick(label, window.location.pathname);
    };
    document.addEventListener('click', handleClick, { passive: true });
    return () => document.removeEventListener('click', handleClick);
  }, [enabled]);

  // Section scroll tracking — IntersectionObserver with 2-second dwell
  useEffect(() => {
    if (!enabled) return;
    const dwellTimers = new Map<string, ReturnType<typeof setTimeout>>();
    const firedSections = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          const sectionName = el.dataset.section;
          if (!sectionName) continue;

          if (entry.isIntersecting) {
            if (firedSections.has(sectionName)) continue;
            const timer = setTimeout(() => {
              firedSections.add(sectionName);
              trackSectionView(sectionName, window.location.pathname);
            }, 2000);
            dwellTimers.set(sectionName, timer);
          } else {
            const timer = dwellTimers.get(sectionName);
            if (timer !== undefined) {
              clearTimeout(timer);
              dwellTimers.delete(sectionName);
            }
          }
        }
      },
      { threshold: 0.3 },
    );

    // Observe all data-section elements currently in DOM
    const observe = () => {
      document.querySelectorAll<HTMLElement>('[data-section]').forEach((el) => {
        observer.observe(el);
      });
    };

    observe();

    // Re-observe when route changes cause new elements to mount
    const mutationObserver = new MutationObserver(observe);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
      dwellTimers.forEach((t) => clearTimeout(t));
    };
  }, [enabled, location.pathname]);
}
