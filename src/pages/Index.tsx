import './index-landing.css';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import triggerHaptic from '@/lib/haptics';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { useReducedMotion, motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef, useCallback, startTransition, lazy, Suspense } from 'react';
import { flushSync } from 'react-dom';
import { useSettingsStore } from '@/store/settingsStore';
import { getSafeMatchMedia } from '@/lib/envUtils';
import { useSearchParams } from 'react-router-dom';
import { QuickTailorSheet } from '@/components/landing/QuickTailorSheet';
import { useThemeLogo } from '@/hooks/useThemeLogo';
import { WaitlistModal } from '@/components/landing/WaitlistModal';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingToggle } from '@/components/landing/LandingToggle';
import { LandingModeTransition } from '@/components/landing/LandingModeTransition';
import { SoftDivider } from '@/components/landing/SoftDivider';
import { WiseResumeHero } from '@/components/landing/WiseResumeHero';
import {
  SCATTER_WRAPPER_VARIANTS, SCATTER_SECTION_ITEM,
  REDUCED_MOTION_WRAPPER, REDUCED_SECTION_ITEM,
} from '@/components/landing/landingAnimations';

/* Phase 2: Code-split inactive product trees + below-the-fold content.
   The hero of WiseResume loads eagerly (default landing); everything else
   downloads on demand. Each lazy boundary has a fixed-height Suspense
   fallback to prevent layout shift when chunks arrive. */
const WiseResumeContent = lazy(() =>
  import('@/components/landing/WiseResumeContent').then((m) => ({ default: m.WiseResumeContent }))
);
const WiseHireHero = lazy(() =>
  import('@/components/landing/wisehire/WiseHireHero').then((m) => ({ default: m.WiseHireHero }))
);
const WiseHireFeatures = lazy(() =>
  import('@/components/landing/wisehire/WiseHireFeatures').then((m) => ({ default: m.WiseHireFeatures }))
);
const WiseHirePricing = lazy(() =>
  import('@/components/landing/wisehire/WiseHirePricing').then((m) => ({ default: m.WiseHirePricing }))
);
const WiseHireDemoSection = lazy(() =>
  import('@/components/landing/wisehire/WiseHireDemoSection').then((m) => ({ default: m.WiseHireDemoSection }))
);
const WiseHireTrustSection = lazy(() =>
  import('@/components/landing/wisehire/WiseHireTrustSection').then((m) => ({ default: m.WiseHireTrustSection }))
);
const WiseHireFeatureTicker = lazy(() =>
  import('@/components/landing/wisehire/WiseHireFeatureTicker').then((m) => ({ default: m.WiseHireFeatureTicker }))
);
const WiseHireClosingCTA = lazy(() =>
  import('@/components/landing/wisehire/WiseHireClosingCTA').then((m) => ({ default: m.WiseHireClosingCTA }))
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
  const prefersReducedMotion = useReducedMotion();
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
          const parent = progressRef.current.parentElement;
          if (parent) parent.style.display = pct > 0 ? '' : 'none';
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
      modeTimerRef.current = setTimeout(() => {
        modeTimerRef.current = null;
        startTransition(() => setMode(m));
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

  const sectionItem = prefersReducedMotion ? REDUCED_SECTION_ITEM : SCATTER_SECTION_ITEM;
  const wrapperVariants = prefersReducedMotion ? REDUCED_MOTION_WRAPPER : SCATTER_WRAPPER_VARIANTS;

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

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-[2px] z-[60] pointer-events-none" style={{ display: 'none' }}>
        <div ref={progressRef} className="h-full transition-[width] duration-75 ease-out" style={{ background: 'var(--lp-brand)' }} />
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
        <AnimatePresence mode="popLayout">
          {mode === 'wisehire' ? (
            <motion.div key="wisehire" variants={wrapperVariants} initial="hidden" animate="visible" exit="exit">
              <motion.div variants={sectionItem} custom={0}>
                <Suspense fallback={<LpFallback minHeight={640} />}>
                  <WiseHireHero
                    onOpenWaitlist={() => setWaitlistOpen(true)}
                    mobileToggle={
                      <div className="sm:hidden relative z-10 flex justify-center mt-1 mb-6">
                        <LandingToggle uid="mob" compact mode={mode} prefersReducedMotion={prefersReducedMotion} onModeChange={handleLandingModeChange} />
                      </div>
                    }
                  />
                </Suspense>
                <SoftDivider product="wisehire" />
                <Suspense fallback={<LpFallback minHeight={120} />}><WiseHireFeatureTicker /></Suspense>
              </motion.div>
              <motion.div variants={sectionItem} custom={1}>
                <Suspense fallback={<LpFallback minHeight={600} />}><WiseHireDemoSection /></Suspense>
              </motion.div>
              <motion.div variants={sectionItem} custom={2}>
                <SoftDivider product="wisehire" />
                <Suspense fallback={<LpFallback minHeight={400} />}><WiseHireTrustSection /></Suspense>
              </motion.div>
              <motion.div variants={sectionItem} custom={3}>
                <SoftDivider product="wisehire" />
                <Suspense fallback={<LpFallback minHeight={480} />}><WiseHireFeatures onOpenWaitlist={() => setWaitlistOpen(true)} /></Suspense>
              </motion.div>
              <motion.div variants={sectionItem} custom={4}>
                <SoftDivider product="wisehire" />
                <Suspense fallback={<LpFallback minHeight={520} />}><WiseHirePricing onOpenWaitlist={() => setWaitlistOpen(true)} /></Suspense>
              </motion.div>
              <motion.div variants={sectionItem} custom={5}>
                <Suspense fallback={<LpFallback minHeight={320} />}>
                  <WiseHireClosingCTA prefersReducedMotion={prefersReducedMotion} onOpenWaitlist={() => setWaitlistOpen(true)} />
                </Suspense>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div key="wiseresume" variants={wrapperVariants} initial="hidden" animate="visible" exit="exit">
              <motion.div variants={sectionItem} custom={0}>
                <WiseResumeHero
                  mode={mode}
                  prefersReducedMotion={prefersReducedMotion}
                  themeLogo={themeLogo}
                  isAuthenticated={isAuthenticated}
                  heroRef={heroRef}
                  onModeChange={handleLandingModeChange}
                  onCTA={handleCTA}
                />
              </motion.div>
              <Suspense fallback={<LpFallback minHeight={800} />}>
                <WiseResumeContent prefersReducedMotion={prefersReducedMotion} isDark={isDark} onCTA={handleCTA} />
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <WaitlistModal open={waitlistOpen} onClose={() => setWaitlistOpen(false)} />
      {isAuthenticated && <QuickTailorSheet open={tailorOpen} onOpenChange={setTailorOpen} />}
    </div>
  );
};

export default Index;
