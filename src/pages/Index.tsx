import './index-landing.css';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
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
import { LandingModeTransition } from '@/components/landing/LandingModeTransition';
/* Eagerly preload whichever hero chunk corresponds to the initial active
   product mode. Both heroes use React.lazy below so the inactive product
   subtree stays out of the entry chunk; this preload simply primes the
   active hero chunk so it's already in cache when Suspense reads it,
   giving FCP/LCP parity with an eager import for the active product. */
if (typeof window !== 'undefined') {
  const isWiseHire =
    window.location.pathname === '/enterprises' ||
    new URLSearchParams(window.location.search).get('for') === 'companies';
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

const LpFallback = ({ minHeight = 320 }: { minHeight?: number }) => (
  <div aria-hidden="true" style={{ minHeight, width: '100%' }} />
);

function resolveIsDark(theme: 'light' | 'dark' | 'system'): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return getSafeMatchMedia('(prefers-color-scheme: dark)').matches;
}

const Index = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, signOut } = useAuth();
  const { profile } = useProfile(isAuthenticated ? user?.id : undefined, user);
  const prefersReducedMotion = usePrefersReducedMotion();
  const themeLogo = useThemeLogo();
  const [scrolled, setScrolled] = useState(false);
  const storeTheme = useSettingsStore((s) => s.theme);
  const setThemeStore = useSettingsStore((s) => s.setTheme);
  const setLpProduct = useSettingsStore((s) => s.setLpProduct);
  const [isDark, setIsDark] = useState(() => resolveIsDark(storeTheme));

  useEffect(() => { setIsDark(resolveIsDark(storeTheme)); }, [storeTheme]);

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
  const pendingModeRef = useRef<'jobseeker' | 'wisehire' | null>(null);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waveKey, setWaveKey] = useState(0);
  const [waveColor, setWaveColor] = useState('rgba(29,78,216,0.15)');
  const [waveOrigin, setWaveOrigin] = useState({ x: 640, y: 21 });
  const modeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { register: kindeRegister } = useKindeAuth();

  useEffect(() => () => {
    if (modeTimerRef.current !== null) clearTimeout(modeTimerRef.current);
  }, []);

  useEffect(() => { setLpProduct(mode); }, [mode, setLpProduct]);

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
  }, [mode]);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('access_token=') && hash.includes('refresh_token=')) {
      navigate('/auth/callback' + hash, { replace: true });
    }
  }, [navigate]);

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

  const handleWaveComplete = useCallback(() => {
    const next = pendingModeRef.current;
    if (next !== null) {
      pendingModeRef.current = null;
      startTransition(() => setDisplayProduct(next));
    }
  }, []);

  const handleLandingModeChange = (m: 'jobseeker' | 'wisehire', btnOrigin: { x: number; y: number }) => {
    if (m === mode) return;
    triggerHaptic.light();
    if (!prefersReducedMotion) {
      if (modeTimerRef.current !== null) { clearTimeout(modeTimerRef.current); modeTimerRef.current = null; }
      pendingModeRef.current = m;
      setWaveOrigin(btnOrigin);
      setWaveColor(m === 'wisehire' ? 'rgba(37,99,235,0.15)' : 'rgba(185,28,28,0.15)');
      setWaveKey((k) => k + 1);
      /* Phase 5: prime the same View Transitions ripple used by the theme
         toggle so the product swap shares its smooth crossfade with the
         brand-color repaint. Origin is the toggle-button center. */
      document.documentElement.style.setProperty('--lp-ripple-x', Math.round(btnOrigin.x) + 'px');
      document.documentElement.style.setProperty('--lp-ripple-y', Math.round(btnOrigin.y) + 'px');
      type DocWithVT = Document & { startViewTransition?: (cb: () => void) => void };
      const startVT = (document as DocWithVT).startViewTransition?.bind(document);
      modeTimerRef.current = setTimeout(() => {
        modeTimerRef.current = null;
        if (!startVT) {
          startTransition(() => setMode(m));
        } else {
          startVT(() => { flushSync(() => setMode(m)); });
        }
      }, 300);
    } else {
      setMode(m);
      setDisplayProduct(m);
      pendingModeRef.current = null;
    }
  };

  const handleThemeToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    triggerHaptic.light();
    const rect = e.currentTarget.getBoundingClientRect();
    document.documentElement.style.setProperty('--lp-ripple-x', Math.round(rect.left + rect.width / 2) + 'px');
    document.documentElement.style.setProperty('--lp-ripple-y', Math.round(rect.top + rect.height / 2) + 'px');
    type DocWithVT = Document & { startViewTransition?: (cb: () => void) => void };
    const startVT = (document as DocWithVT).startViewTransition?.bind(document);
    const applyToggle = (prev: boolean) => { const next = !prev; setThemeStore(next ? 'dark' : 'light'); return next; };
    if (!startVT || prefersReducedMotion) { setIsDark(applyToggle); return; }
    startVT(() => { flushSync(() => setIsDark(applyToggle)); });
  };

  return (
    <div
      className="lp-root min-h-screen"
      data-theme="landing"
      data-lp-scheme={isDark ? 'dark' : 'light'}
      data-lp-product={displayProduct === 'wisehire' ? 'wisehire' : undefined}
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

      {!prefersReducedMotion && (
        <LandingModeTransition waveKey={waveKey} waveColor={waveColor} origin={waveOrigin} onWaveComplete={handleWaveComplete} />
      )}

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
        <Suspense fallback={<LpFallback minHeight={800} />}>
          <LandingMotionStage
            mode={mode}
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

export default Index;
