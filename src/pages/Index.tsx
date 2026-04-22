import './index-landing.css';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useAccountType } from '@/hooks/wisehire/useAccountType';
import triggerHaptic from '@/lib/haptics';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
// Step 4 (B-3) — full lazy-load: framer-motion is NOT imported by this
// page-level component anymore. The entire AnimatePresence + m.div tree
// lives in `LandingMotionStage` which is loaded via `React.lazy`, and
// `useReducedMotion` is replaced by a vanilla matchMedia hook in
// `src/lib/usePrefersReducedMotion`. Result: framer-motion is excluded
// from the landing entry chunk and only fetched once the motion stage
// chunk arrives.
import { useEffect, useState, useRef, useCallback, startTransition, lazy, Suspense } from 'react';
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion';
import { flushSync } from 'react-dom';
import { useSettingsStore } from '@/store/settingsStore';
import { getSafeMatchMedia } from '@/lib/envUtils';
import { useSearchParams } from 'react-router-dom';
import { useThemeLogo } from '@/hooks/useThemeLogo';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { useWebMcp } from '@/hooks/useWebMcp';
/* Eagerly preload whichever hero chunk corresponds to the initial active
   product mode. Both heroes use React.lazy below so the inactive product
   subtree stays out of the entry chunk; this preload simply primes the
   active hero chunk so it's already in cache when Suspense reads it,
   giving FCP/LCP parity with an eager import for the active product. */
if (typeof window !== 'undefined') {
  const isWiseHire =
    window.location.pathname === '/enterprises' ||
    new URLSearchParams(window.location.search).get('for') === 'companies';
  /* Kick off the LandingMotionStage chunk (which carries framer-motion)
     immediately, in parallel with the active hero chunk. Without this
     warm-up, the motion stage only starts downloading once <Suspense>
     reads the lazy import, which adds an extra waterfall step between
     the LpFallback wallpaper and the hero painting. */
  void import('@/components/landing/LandingMotionStage');
  if (isWiseHire) {
    void import('@/components/landing/wisehire/WiseHireHero');
  } else {
    void import('@/components/landing/WiseResumeContent');
  }
}

/* Phase 2: Code-split inactive product trees + below-the-fold content.
   All product subtrees + the AnimatePresence motion wrapper live in
   `LandingMotionStage`, lazy-loaded so framer-motion stays out of the
   landing entry chunk. The dialogs (WaitlistModal, QuickTailorSheet)
   are also lazy: they're invisible on first paint and only mount on
   user action. */
const LandingMotionStage = lazy(() => import('@/components/landing/LandingMotionStage'));
const WaitlistModal = lazy(() =>
  import('@/components/landing/WaitlistModal').then((m) => ({ default: m.WaitlistModal }))
);
const QuickTailorSheet = lazy(() =>
  import('@/components/landing/QuickTailorSheet').then((m) => ({ default: m.QuickTailorSheet }))
);
/* Task #15 (LCP fix): static hero shell rendered as the Suspense fallback
   for `LandingMotionStage`. It paints the H1 (the LCP element) on first
   render of `Index` — no waiting on the motion-stage chunk, no
   framer-motion opacity fade. The lazy stage hydrates on top once it
   arrives, but the LCP timestamp is already locked in by the shell. */
import LandingHeroShell from '@/components/landing/LandingHeroShell';

function resolveIsDark(theme: 'light' | 'dark' | 'system'): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return getSafeMatchMedia('(prefers-color-scheme: dark)').matches;
}

const Index = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, signOut } = useAuth();
  const { profile } = useProfile(isAuthenticated ? user?.id : undefined, user);
  const { isHR } = useAccountType();
  const prefersReducedMotion = usePrefersReducedMotion();
  const themeLogo = useThemeLogo();
  const [scrolled, setScrolled] = useState(false);
  const storeTheme = useSettingsStore((s) => s.theme);
  const setThemeStore = useSettingsStore((s) => s.setTheme);
  const setLpProduct = useSettingsStore((s) => s.setLpProduct);
  const [isDark, setIsDark] = useState(() => resolveIsDark(storeTheme));
  const preReactBgRemovedRef = useRef(false);

  useEffect(() => { setIsDark(resolveIsDark(storeTheme)); }, [storeTheme]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(isDark ? 'dark' : 'light');
    if (!preReactBgRemovedRef.current) {
      preReactBgRemovedRef.current = true;
      document.getElementById('pre-react-bg')?.remove();
    }
  }, [isDark]);

  const progressRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [tailorOpen, setTailorOpen] = useState(false);
  const [mode, setMode] = useState<'jobseeker' | 'wisehire'>(() => {
    if (typeof window === 'undefined') return 'jobseeker';
    if (window.location.pathname === '/enterprises') return 'wisehire';
    if (new URLSearchParams(window.location.search).get('for') === 'companies') return 'wisehire';
    return 'jobseeker';
  });
  const [displayProduct, setDisplayProduct] = useState<'jobseeker' | 'wisehire'>(() => {
    if (typeof window === 'undefined') return 'jobseeker';
    if (window.location.pathname === '/enterprises') return 'wisehire';
    if (new URLSearchParams(window.location.search).get('for') === 'companies') return 'wisehire';
    return 'jobseeker';
  });
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const { register: kindeRegister } = useKindeAuth();

  useEffect(() => { setLpProduct(mode); }, [mode, setLpProduct]);

  // Register WebMCP in-page tools so AI agents (Cloudflare AI, ChatGPT,
  // Claude, etc.) can discover what they can do on this page. No-op in
  // browsers without `navigator.modelContext`.
  useWebMcp({ navigate, setMode });

  /* Phase 5: stamp <body> with landing scheme/product data attributes so
     the themed fallback background rules in index-landing.css remain
     active even during brief windows when .lp-root is unmounted (route
     change, suspense fallback, lazy chunk hydration). We intentionally
     DO NOT clear these on unmount: the most-recent stamped theme keeps
     the page from flashing white while another route mounts. */
  useEffect(() => {
    document.body.dataset.lpScheme = isDark ? 'dark' : 'light';
  }, [isDark]);
  useEffect(() => {
    if (displayProduct === 'wisehire') document.body.dataset.lpProduct = 'wisehire';
    else delete document.body.dataset.lpProduct;
  }, [displayProduct]);

  useEffect(() => {
    const isWH = mode === 'wisehire';
    document.title = isWH ? 'WiseHire — Hire Smarter. Screen Faster.' : 'WiseResume — AI-Powered Career Platform';
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[property="${name}"]`) ??
               document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(name.startsWith('og:') ? 'property' : 'name', name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('og:title', isWH ? 'WiseHire — Hire Smarter. Screen Faster.' : 'WiseResume — AI-Powered Career Platform');
    setMeta('og:description', isWH
      ? 'AI-powered hiring platform. Brief Generator, JD Writer, Pipeline Board and more. Now in early access.'
      : 'AI that builds, tailors, and lands your next job. ATS scoring, interview coaching, and more.');
    setMeta('og:url', isWH ? `${window.location.origin}/enterprises` : window.location.origin);

    /* Task #13: swap the favicon (and matching apple-touch / og:image /
       twitter:image) so the browser tab icon mirrors the active brand.
       The pre-React script in index.html already sets the correct icon
       for first paint based on the URL; this effect handles in-app
       toggling between Individuals/Enterprises (and direct navigation
       between `/` and `/enterprises`) without a page reload. */
    const favHref = isWH ? '/favicon-wisehire.png' : '/favicon.png';
    const appleHref = isWH ? '/icons/icon-wisehire-192x192.png' : '/icons/icon-192x192.png';
    const setLinkHref = (id: string, href: string) => {
      const el = document.getElementById(id) as HTMLLinkElement | null;
      if (el && el.getAttribute('href') !== href) el.setAttribute('href', href);
    };
    const setMetaContent = (id: string, content: string) => {
      const el = document.getElementById(id) as HTMLMetaElement | null;
      if (el && el.getAttribute('content') !== content) el.setAttribute('content', content);
    };
    setLinkHref('app-favicon', favHref);
    setLinkHref('app-favicon-preload', favHref);
    setLinkHref('app-apple-touch-icon', appleHref);
    setMetaContent('app-og-image', favHref);
    setMetaContent('app-twitter-image', favHref);
    setLinkHref('app-manifest', isWH ? '/manifest-wisehire.json' : '/manifest.json');
  }, [mode]);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('access_token=') && hash.includes('refresh_token=')) {
      navigate('/auth/callback' + hash, { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && isHR) {
      navigate('/wisehire/dashboard', { replace: true });
    }
  }, [authLoading, isAuthenticated, isHR, navigate]);

  useEffect(() => {
    if (searchParams.get('tailor') === '1' && isAuthenticated) {
      setTailorOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, isAuthenticated, setSearchParams]);

  useEffect(() => {
    let rafId: number | null = null;
    let lastY = 0;
    let lastScrolled = false;
    const onScroll = () => {
      lastY = window.scrollY;
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        const nowScrolled = lastY > 80;
        if (nowScrolled !== lastScrolled) {
          lastScrolled = nowScrolled;
          setScrolled(nowScrolled);
        }
        if (progressRef.current) {
          const max = document.documentElement.scrollHeight - window.innerHeight;
          const pct = max > 0 ? lastY / max * 100 : 0;
          progressRef.current.style.width = `${pct}%`;
        }
        rafId = null;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  const handleCTA = useCallback((plan?: string) => {
    triggerHaptic.medium();
    if (plan) {
      navigate(`/auth?mode=signup&plan=${plan}`);
    } else {
      void Promise.resolve(kindeRegister()).catch(() => {
        toast.error('Unable to start sign-up. Please try again or contact support.');
      });
    }
  }, [navigate, kindeRegister]);

  /* Shorthand for the window transition-in-flight flag. When true,
     ScrollStack's per-frame card-transform loop skips its write pass
     so the brand/theme ripple doesn't contend for main-thread time. */
  type WinWithFlag = Window & { __lpTransition?: boolean };
  const setTransitionFlag = (on: boolean) => { (window as WinWithFlag).__lpTransition = on; };

  /* Clearable timer so rapid repeated toggles don't leave the flag
     set indefinitely when the no-VT fallback path is used. */
  const transitionFlagTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (transitionFlagTimerRef.current !== null) clearTimeout(transitionFlagTimerRef.current);
    setTransitionFlag(false);
  }, []);

  const clearFlagAfter = (ms = 600) => {
    if (transitionFlagTimerRef.current !== null) clearTimeout(transitionFlagTimerRef.current);
    transitionFlagTimerRef.current = setTimeout(() => {
      transitionFlagTimerRef.current = null;
      setTransitionFlag(false);
    }, ms);
  };

  type DocWithVT = Document & {
    startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> };
  };

  const handleLandingModeChange = (m: 'jobseeker' | 'wisehire', btnOrigin: { x: number; y: number }) => {
    if (m === mode) return;
    triggerHaptic.light();
    if (prefersReducedMotion) {
      setMode(m);
      setDisplayProduct(m);
      return;
    }
    document.documentElement.style.setProperty('--lp-ripple-x', Math.round(btnOrigin.x) + 'px');
    document.documentElement.style.setProperty('--lp-ripple-y', Math.round(btnOrigin.y) + 'px');
    const startVT = (document as DocWithVT).startViewTransition?.bind(document);
    setTransitionFlag(true);
    if (!startVT) {
      startTransition(() => { setMode(m); setDisplayProduct(m); });
      clearFlagAfter();
      return;
    }
    /* Only update `mode` (brand colors, header, favicon) inside the
       snapshot callback so the first frames of the ripple paint against
       the already-updated lightweight state. The heavy LandingMotionStage
       re-render (displayProduct) is deferred until after the ripple's
       first frame resolves — this prevents it from blocking the ripple.
       The catch fallback ensures displayProduct is never left stale if
       vt.ready rejects in edge cases (e.g., nested transitions). */
    const vt = startVT(() => { flushSync(() => setMode(m)); });
    vt.ready
      .then(() => { startTransition(() => setDisplayProduct(m)); })
      .catch(() => { startTransition(() => setDisplayProduct(m)); });
    vt.finished.then(() => setTransitionFlag(false)).catch(() => clearFlagAfter(0));
  };

  const handleThemeToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    triggerHaptic.light();
    const rect = e.currentTarget.getBoundingClientRect();
    document.documentElement.style.setProperty('--lp-ripple-x', Math.round(rect.left + rect.width / 2) + 'px');
    document.documentElement.style.setProperty('--lp-ripple-y', Math.round(rect.top + rect.height / 2) + 'px');
    const startVT = (document as DocWithVT).startViewTransition?.bind(document);
    const applyToggle = (prev: boolean) => { const next = !prev; setThemeStore(next ? 'dark' : 'light'); return next; };
    setTransitionFlag(true);
    if (!startVT || prefersReducedMotion) {
      setIsDark(applyToggle);
      clearFlagAfter();
      return;
    }
    const vt = startVT(() => { flushSync(() => setIsDark(applyToggle)); });
    vt.finished.then(() => setTransitionFlag(false)).catch(() => clearFlagAfter(0));
  };

  return (
    <div
      className="lp-root min-h-screen"
      data-theme="landing"
      data-lp-scheme={isDark ? 'dark' : 'light'}
      data-lp-product={mode === 'wisehire' ? 'wisehire' : undefined}
      style={{ colorScheme: isDark ? 'dark' : 'light', overflowX: 'hidden' }}
    >
      <a
        href="#landing-main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:rounded-md focus:m-2"
        style={{ background: 'var(--lp-brand)', color: '#fff' }}
      >
        Skip to content
      </a>

      {/* Progress bar — always rendered; width grows from 0 as the user scrolls,
          so it's invisible at the top of the page and visibly fills in the
          active brand color once scrolling begins. */}
      <div className="fixed top-0 left-0 right-0 h-[2px] z-[60] pointer-events-none">
        <div ref={progressRef} className="h-full transition-[width] duration-75 ease-out" style={{ background: 'var(--lp-brand)', width: 0 }} />
      </div>

      <LandingHeader
        mode={mode}
        isDark={isDark}
        scrolled={scrolled}
        themeLogo={themeLogo}
        profile={profile}
        user={user}
        isAuthenticated={isAuthenticated}
        authLoading={authLoading}
        prefersReducedMotion={prefersReducedMotion}
        onModeChange={handleLandingModeChange}
        onThemeToggle={handleThemeToggle}
        onOpenWaitlist={() => setWaitlistOpen(true)}
        onSignOut={signOut}
      />

      <main id="landing-main" className="w-full" style={{ position: 'relative' }}>
        <Suspense fallback={<LandingHeroShell mode={displayProduct} />}>
          <LandingMotionStage
            mode={displayProduct}
            prefersReducedMotion={prefersReducedMotion}
            isDark={isDark}
            isAuthenticated={isAuthenticated}
            themeLogo={themeLogo}
            heroRef={heroRef}
            onCTA={handleCTA}
            onLandingModeChange={handleLandingModeChange}
            onOpenWaitlist={() => setWaitlistOpen(true)}
          />
        </Suspense>
      </main>

      <LandingVersionFooter />

      {waitlistOpen && (
        <Suspense fallback={null}>
          <WaitlistModal open={waitlistOpen} onClose={() => setWaitlistOpen(false)} />
        </Suspense>
      )}
      {isAuthenticated && tailorOpen && (
        <Suspense fallback={null}>
          <QuickTailorSheet open={tailorOpen} onOpenChange={setTailorOpen} />
        </Suspense>
      )}
    </div>
  );
};

declare const __BUILD_COMMIT__: string;
declare const __BUILD_TIME__: string;

interface VersionInfo {
  shortCommit?: string;
  commit?: string;
  deployedAt?: string;
}

const LandingVersionFooter = () => {
  // Compile-time defaults — always present, no network needed.
  const [info, setInfo] = useState<VersionInfo>({
    shortCommit: __BUILD_COMMIT__,
    deployedAt: __BUILD_TIME__,
  });
  useEffect(() => {
    let cancelled = false;
    fetch('/version.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d?.shortCommit) setInfo(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const deployedLabel = info.deployedAt
    ? new Date(info.deployedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : null;
  return (
    <div
      className="w-full text-center text-xs py-4 select-none border-t"
      style={{
        color: 'var(--lp-muted, #888)',
        borderColor: 'var(--lp-border, rgba(128,128,128,0.15))',
        background: 'var(--lp-surface, transparent)',
      }}
      aria-label="Deployment version"
    >
      WiseResume · Build <span style={{ fontFamily: 'monospace' }}>{info.shortCommit}</span>
      {deployedLabel ? ` · ${deployedLabel}` : ''}
    </div>
  );
};

export default Index;
