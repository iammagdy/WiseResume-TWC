import './index-landing.css';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, Target, Wand2, Mic, LayoutDashboard, Settings, LogOut, Globe, ArrowRight, BarChart3, PenTool, CheckCircle2, User, Sun, Moon, Zap, Menu, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { Footer } from '@/components/landing/Footer';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import triggerHaptic from '@/lib/haptics';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { useReducedMotion, motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useEffect, useLayoutEffect, useState, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useSettingsStore } from '@/store/settingsStore';
import { getSafeMatchMedia } from '@/lib/envUtils';
import { useSearchParams } from 'react-router-dom';
import { QuickTailorSheet } from '@/components/landing/QuickTailorSheet';
import { InstallButton } from '@/components/pwa/InstallButton';
import { useThemeLogo } from '@/hooks/useThemeLogo';
import { FeatureTicker } from '@/components/landing/FeatureTicker';
import { FeatureSection, type FeatureSectionData } from '@/components/landing/FeatureSection';
import { TrustSection } from '@/components/landing/TrustSection';
import { LandingToggle } from '@/components/landing/LandingToggle';
import { WaitlistModal } from '@/components/landing/WaitlistModal';
import { WiseHireHero } from '@/components/landing/wisehire/WiseHireHero';
import { WiseHireFeatures } from '@/components/landing/wisehire/WiseHireFeatures';
import { WiseHirePricing } from '@/components/landing/wisehire/WiseHirePricing';
import { WiseHireDemoSection } from '@/components/landing/wisehire/WiseHireDemoSection';
import { WiseHireTrustSection } from '@/components/landing/wisehire/WiseHireTrustSection';
import { WiseHireFeatureTicker } from '@/components/landing/wisehire/WiseHireFeatureTicker';

const features = [
  { icon: Sparkles, title: 'AI Resume Writing', desc: 'AI rewrites vague bullets into quantified achievements that recruiters remember.', colorDark: 'text-rose-400', colorLight: 'text-rose-600', bgDark: 'bg-rose-500/10', bgLight: 'bg-rose-100' },
  { icon: Target, title: 'ATS Score Analysis', desc: 'Real-time ATS match percentage against any job posting — fix gaps instantly.', colorDark: 'text-emerald-400', colorLight: 'text-emerald-600', bgDark: 'bg-emerald-500/10', bgLight: 'bg-emerald-100' },
  { icon: Wand2, title: 'Smart Tailoring', desc: 'Paste a job description and AI rewrites your resume to match in 30 seconds.', colorDark: 'text-blue-400', colorLight: 'text-blue-600', bgDark: 'bg-blue-500/10', bgLight: 'bg-blue-100' },
  { icon: Mic, title: 'Interview Coaching', desc: 'Real voice interview practice with AI that listens, responds, and scores you live.', colorDark: 'text-orange-400', colorLight: 'text-orange-600', bgDark: 'bg-orange-500/10', bgLight: 'bg-orange-100' },
  { icon: PenTool, title: 'Cover Letters', desc: 'Generate tailored cover letters that match your resume and the job requirements.', colorDark: 'text-purple-400', colorLight: 'text-purple-600', bgDark: 'bg-purple-500/10', bgLight: 'bg-purple-100' },
  { icon: BarChart3, title: 'Application Tracker', desc: 'Track all your job applications in one place with status updates and analytics.', colorDark: 'text-pink-400', colorLight: 'text-pink-600', bgDark: 'bg-pink-500/10', bgLight: 'bg-pink-100' },
];


const featureSections: FeatureSectionData[] = [
  {
    id: 'editor',
    direction: 'ltr',
    badge: { icon: Sparkles, label: 'AI Resume Editor', color: '' },
    categoryLabel: '01 — Resume Builder',
    bigLabel: 'Resume',
    title: 'AI-Powered Resume Writing',
    desc: 'Watch AI turn weak bullets into quantified achievements — with a live ATS score that updates as you write.',
    bullets: [
      'AI rewrites vague bullets into measurable, recruiter-ready results',
      'Live ATS score that updates with every edit',
      'One-click enhancement for any section of your resume',
    ],
    demo: 'editor',
    bandColor: 'dark1',
  },
  {
    id: 'tailoring',
    direction: 'rtl',
    badge: { icon: Wand2, label: 'Smart Tailoring', color: '' },
    categoryLabel: '02 — AI Tailoring',
    bigLabel: 'Tailoring',
    title: 'Precision Resume Tailoring',
    desc: 'Paste a job description and AI rewrites your resume to match in 30 seconds. See the before and after instantly.',
    bullets: [
      'Automatically matches keywords from any job description',
      'Before/after comparison shows exactly what changed',
      'Raises your ATS match score with precision',
    ],
    demo: 'tailoring',
    bandColor: 'dark2',
  },
  {
    id: 'portfolio',
    direction: 'ltr',
    badge: { icon: Globe, label: 'Live Portfolio', color: '' },
    categoryLabel: '03 — Portfolio',
    bigLabel: 'Portfolio',
    title: 'Public Portfolio Website',
    desc: 'Turn your resume into a beautiful personal site with themes, projects, and a shareable link — zero design skills needed.',
    bullets: [
      'Auto-synced from your resume — always up to date',
      'Shareable link with a custom slug',
      'Themed layouts that update with one click',
    ],
    demo: 'portfolio',
    bandColor: 'dark3',
  },
  {
    id: 'interview',
    direction: 'rtl',
    badge: { icon: Mic, label: 'Interview Coach', color: '' },
    categoryLabel: '04 — Interview Coach',
    bigLabel: 'Interview',
    title: 'AI Interview Practice',
    desc: 'Get scored on real interview questions with AI feedback on every answer. Practice any role, any industry.',
    bullets: [
      'Real-time voice recognition — just speak naturally',
      'AI scores each answer and gives specific tips',
      'Practice any industry, role, or question type',
    ],
    demo: 'interview',
    bandColor: 'dark1',
  },
  {
    id: 'tracker',
    direction: 'ltr',
    badge: { icon: BarChart3, label: 'Application Tracker', color: '' },
    categoryLabel: '05 — Job Tracker',
    bigLabel: 'Tracker',
    title: 'Kanban Job Tracker',
    desc: 'Visualize every application at a glance. Drag cards across your pipeline and never lose track of an opportunity.',
    bullets: [
      'Kanban board with drag-and-drop pipeline stages',
      'Status history so you always know where things stand',
      'Analytics show your application funnel at a glance',
    ],
    demo: 'tracker',
    bandColor: 'dark2',
  },
];

const FEATURE_IDS = featureSections.map((s) => s.id);

const TYPEWRITER_WORDS = [
  'Senior Developer',
  'Product Manager',
  'Data Analyst',
  'UX Designer',
  'Data Engineer',
  'Marketing Lead',
];


function useTypewriterWord(words: string[]) {
  const [displayed, setDisplayed] = useState('');
  const [wordIdx, setWordIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [phase, setPhase] = useState<'typing' | 'erasing'>('typing');

  useEffect(() => {
    const current = words[wordIdx];
    if (phase === 'typing') {
      if (charIdx < current.length) {
        const t = setTimeout(() => {
          setDisplayed(current.slice(0, charIdx + 1));
          setCharIdx((i) => i + 1);
        }, 60);
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => setPhase('erasing'), 2000);
        return () => clearTimeout(t);
      }
    } else {
      if (charIdx > 0) {
        const t = setTimeout(() => {
          setCharIdx((i) => i - 1);
          setDisplayed(current.slice(0, charIdx - 1));
        }, Math.max(22, 350 / current.length));
        return () => clearTimeout(t);
      } else {
        setWordIdx((i) => (i + 1) % words.length);
        setCharIdx(0);
        setDisplayed('');
        setPhase('typing');
      }
    }
  }, [phase, charIdx, wordIdx, words]);

  return displayed;
}


function FeatureNumberedNav({ sectionIds, labels }: { sectionIds: string[]; labels: string[] }) {
  const [activeIdx, setActiveIdx] = useState(-1);
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    sectionIds.forEach((id, idx) => {
      const el = document.getElementById(`feature-${id}`);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveIdx(idx); },
        { threshold: 0.4 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [sectionIds]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(`feature-${id}`);
    if (el) el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
  };

  return (
    <div
      className="w-full overflow-x-auto py-4 px-4 sm:px-6"
      style={{
        position: 'sticky',
        top: 92,
        zIndex: 40,
        background: 'var(--lp-nav-bg)',
        backdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--lp-nav-border)',
        transition: 'background 0.3s ease',
      }}
    >
      <div className="flex items-center justify-center gap-1 sm:gap-2 min-w-max mx-auto">
        {sectionIds.map((id, idx) => (
          <button
            key={id}
            onClick={() => scrollTo(id)}
            className="transition-all duration-200 text-xs sm:text-sm font-medium px-3 sm:px-4 py-1.5 rounded-full whitespace-nowrap"
            style={{
              background: activeIdx === idx ? 'var(--lp-brand-pill-bg)' : 'transparent',
              color: activeIdx === idx ? 'var(--lp-brand)' : 'var(--lp-text-subtle)',
              border: activeIdx === idx ? '1px solid var(--lp-brand-pill-border)' : '1px solid transparent',
            }}
          >
            {labels[idx]}
          </button>
        ))}
      </div>
    </div>
  );
}

function resolveIsDark(theme: 'light' | 'dark' | 'system'): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return getSafeMatchMedia('(prefers-color-scheme: dark)').matches;
}

function HeroParallaxGlow({ prefersReducedMotion }: { prefersReducedMotion: boolean | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 600], [0, prefersReducedMotion ? 0 : -80]);

  return (
    <motion.div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ y }}
    >
      <div
        style={{
          position: 'absolute',
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '70vw',
          height: '40vh',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, var(--lp-hero-glow) 0%, transparent 70%)',
          filter: 'blur(40px)',
          opacity: 0.7,
        }}
      />
    </motion.div>
  );
}

function SoftDivider({ product = 'wiseresume' }: { product?: 'wiseresume' | 'wisehire' }) {
  const color = product === 'wisehire'
    ? 'rgba(29,78,216,0.13)'
    : 'rgba(158,27,34,0.10)';
  return (
    <div
      aria-hidden="true"
      style={{
        width: '100%',
        height: 1,
        background: `linear-gradient(to right, transparent 0%, ${color} 20%, ${color} 80%, transparent 100%)`,
        margin: 0,
      }}
    />
  );
}

const lpContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};
const lpItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const heroContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};
const heroItemVariants = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 26 } },
};

const SECTION_EXIT_VECTORS: Array<{ x: number; y: number; rotate: number }> = [
  { x: -280, y: -180, rotate: 9  },  // 0: top-left
  { x: 0,    y: -300, rotate: -5 },  // 1: straight up
  { x: 300,  y: -100, rotate: -8 },  // 2: top-right
  { x: -300, y: 160,  rotate: 7  },  // 3: bottom-left
  { x: 260,  y: 210,  rotate: -9 },  // 4: bottom-right
  { x: 0,    y: 290,  rotate: 6  },  // 5: straight down
];

const SECTION_ENTRY_VECTORS: Array<{ x: number; y: number }> = [
  { x: 260,  y: 210  },  // 0: from bottom-right
  { x: -240, y: 190  },  // 1: from bottom-left
  { x: -280, y: -120 },  // 2: from top-left
  { x: 290,  y: -140 },  // 3: from top-right
  { x: 0,    y: -250 },  // 4: from top (straight up)
  { x: 0,    y: 260  },  // 5: from bottom (straight down)
];

const SCATTER_WRAPPER_VARIANTS = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
  exit: { transition: { staggerChildren: 0.04, staggerDirection: -1 } },
};

const SECTION_ENTRY_ROTATIONS = [3, -3, 4, -4, 3, -3];

const SCATTER_SECTION_ITEM = {
  hidden: (i: number) => {
    const e = SECTION_ENTRY_VECTORS[i] ?? { x: 0, y: 100 };
    return { opacity: 0, x: e.x, y: e.y, scale: 0.88, rotate: SECTION_ENTRY_ROTATIONS[i] ?? 3, filter: 'blur(10px)' };
  },
  visible: {
    opacity: 1, x: 0, y: 0, scale: 1, rotate: 0, filter: 'blur(0px)',
    transition: { type: 'spring' as const, stiffness: 260, damping: 22 },
  },
  exit: (i: number) => {
    const e = SECTION_EXIT_VECTORS[i] ?? { x: 0, y: -100, rotate: 0 };
    return {
      opacity: 0, x: e.x, y: e.y, scale: 0.72, rotate: e.rotate, filter: 'blur(12px)',
      transition: { duration: 0.30, ease: [0.4, 0, 1, 1] as [number, number, number, number] },
    };
  },
};

const REDUCED_MOTION_WRAPPER = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const REDUCED_SECTION_ITEM = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

interface LandingModeTransitionProps {
  waveKey: number;
  waveColor: string;
  origin: { x: number; y: number };
}

function LandingModeTransition({ waveKey, origin, waveColor }: LandingModeTransitionProps) {
  if (waveKey === 0) return null;
  return (
    <AnimatePresence>
      <motion.div
        key={waveKey}
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          pointerEvents: 'none',
          background: `radial-gradient(ellipse 90% 55% at ${origin.x}px ${origin.y}px, ${waveColor} 0%, transparent 68%)`,
        }}
        initial={{ opacity: 0, scale: 0.82 }}
        animate={{ opacity: [0, 1, 0.65, 0], scale: [0.82, 1.04, 1.1, 1.15] }}
        transition={{ duration: 0.9, times: [0, 0.33, 0.65, 1], ease: 'easeOut' }}
      />
    </AnimatePresence>
  );
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

  useEffect(() => {
    setIsDark(resolveIsDark(storeTheme));
  }, [storeTheme]);

  const progressRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [tailorOpen, setTailorOpen] = useState(false);
  const [ctaPulse, setCtaPulse] = useState(false);
  const [mode, setMode] = useState<'jobseeker' | 'wisehire'>(() =>
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('for') === 'companies'
      ? 'wisehire'
      : 'jobseeker'
  );
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waveKey, setWaveKey] = useState(0);
  const [waveColor, setWaveColor] = useState('rgba(29,78,216,0.15)');
  const [waveOrigin, setWaveOrigin] = useState({ x: 640, y: 21 });
  const modeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (modeTimerRef.current !== null) clearTimeout(modeTimerRef.current);
  }, []);

  useLayoutEffect(() => {
    setLpProduct(mode);
  }, [mode, setLpProduct]);

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
    setMeta('og:url', isWH ? `${window.location.origin}/?for=companies` : window.location.origin);
  }, [mode]);

  const typewriterWord = useTypewriterWord(TYPEWRITER_WORDS);

  const FEATURE_NAV_LABELS = ['01  Resume Builder', '02  AI Tailoring', '03  Portfolio', '04  Interview Coach', '05  Job Tracker'];

  useEffect(() => {
    const t2 = setTimeout(() => setCtaPulse(true), 1800);
    return () => { clearTimeout(t2); };
  }, []);

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
    const onScroll = () => {
      lastY = window.scrollY;
      setScrolled(lastY > 80);
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
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

  const getInitials = () => {
    if (profile?.fullName) {
      const parts = profile.fullName.trim().split(/\s+/);
      return (parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '');
    }
    if (user?.email) return user.email[0].toUpperCase();
    return null;
  };

  const { login: kindeLogin, register: kindeRegister } = useKindeAuth();

  const handleCTA = (plan?: string) => {
    triggerHaptic.medium();
    if (plan) {
      navigate(`/auth?mode=signup&plan=${plan}`);
    } else {
      void Promise.resolve(kindeRegister()).catch(() => {
        toast.error('Unable to start sign-up. Please try again or contact support.');
      });
    }
  };

  const handleLandingModeChange = (m: 'jobseeker' | 'wisehire', btnOrigin: { x: number; y: number }) => {
    if (m === mode) return;
    triggerHaptic.light();
    if (!prefersReducedMotion) {
      if (modeTimerRef.current !== null) {
        clearTimeout(modeTimerRef.current);
        modeTimerRef.current = null;
      }
      setWaveOrigin(btnOrigin);
      setWaveColor(m === 'wisehire' ? 'rgba(37,99,235,0.15)' : 'rgba(185,28,28,0.15)');
      setWaveKey((k) => k + 1);
      modeTimerRef.current = setTimeout(() => {
        modeTimerRef.current = null;
        flushSync(() => setMode(m));
      }, 300);
    } else {
      setMode(m);
    }
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

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-[2px] z-[60] pointer-events-none" style={{ display: 'none' }}>
        <div ref={progressRef} className="h-full transition-[width] duration-75 ease-out" style={{ background: 'var(--lp-brand)' }} />
      </div>

      {/* Brand color wave — fires on each mode switch, blooms from toggle center */}
      {!prefersReducedMotion && (
        <LandingModeTransition
          waveKey={waveKey}
          waveColor={waveColor}
          origin={waveOrigin}
        />
      )}

      {/* Sticky Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'lp-header-scrolled' : 'bg-transparent'}`}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        {/* Product toggle strip — hidden on mobile, sits above the nav row on sm+ */}
        <div className="hidden sm:block">
          <LandingToggle
            uid="hdr"
            mode={mode}
            prefersReducedMotion={prefersReducedMotion}
            onModeChange={handleLandingModeChange}
          />
        </div>

        <div className="flex items-center justify-between px-4 sm:px-6 h-14 max-w-6xl mx-auto">
          <button
            onClick={() => { triggerHaptic.light(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="flex items-center gap-2.5 touch-manipulation"
            aria-label={mode === 'wisehire' ? 'WiseHire – scroll to top' : 'WiseResume – scroll to top'}
          >
            <img
              alt={mode === 'wisehire' ? 'WiseHire' : 'WiseResume'}
              loading="lazy"
              className="w-10 h-10 object-contain rounded-xl"
              src={themeLogo}
              style={{
                filter: mode === 'wisehire' ? 'hue-rotate(220deg) saturate(2) brightness(0.85)' : undefined,
                transition: 'filter 0.35s ease',
              }}
            />
            <span
              className="font-display font-extrabold text-base tracking-tight"
              style={{ color: 'var(--lp-logo-text)', transition: 'color 0.35s ease' }}
            >
              {mode === 'wisehire' ? 'WiseHire' : 'WiseResume'}
            </span>
          </button>

          <div className="flex items-center gap-2">
            {/* Nav links */}
            {mode === 'wisehire' ? (
              <button
                className="hidden sm:block text-sm font-medium px-3 py-1.5 rounded-lg transition-all duration-200"
                style={{ color: 'var(--lp-text-muted)', background: 'transparent' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--lp-text)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--lp-text-muted)'; }}
                onClick={() => {
                  const el = document.getElementById('wisehire-pricing');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                Pricing
              </button>
            ) : (
              <Link
                to="/pricing"
                className="hidden sm:block text-sm font-medium px-3 py-1.5 rounded-lg transition-all duration-200"
                style={{ color: 'var(--lp-text-muted)', background: 'transparent' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--lp-text)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--lp-text-muted)'; }}
              >
                Pricing
              </Link>
            )}
            {mode === 'jobseeker' && (
              <Link
                to="/whats-new"
                className="hidden sm:block text-sm font-medium px-3 py-1.5 rounded-lg transition-all duration-200"
                style={{ color: 'var(--lp-text-muted)', background: 'transparent' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--lp-text)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--lp-text-muted)'; }}
              >
                What's New
              </Link>
            )}
            {/* Mobile hamburger — provides access to Pricing & What's New on small screens */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="sm:hidden lp-theme-toggle"
                  aria-label="Navigation menu"
                >
                  <Menu className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {mode === 'wisehire' ? (
                  <DropdownMenuItem
                    onClick={() => {
                      const el = document.getElementById('wisehire-pricing');
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                  >
                    <Tag className="w-4 h-4 mr-2" />
                    Pricing
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => navigate('/pricing')}>
                    <Tag className="w-4 h-4 mr-2" />
                    Pricing
                  </DropdownMenuItem>
                )}
                {mode === 'jobseeker' && (
                  <DropdownMenuItem onClick={() => navigate('/whats-new')}>
                    <Zap className="w-4 h-4 mr-2" />
                    What's New
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme toggle */}
            <button
              className="lp-theme-toggle"
              onClick={(e) => {
                triggerHaptic.light();
                const btn = e.currentTarget;
                const rect = btn.getBoundingClientRect();
                const x = Math.round(rect.left + rect.width / 2);
                const y = Math.round(rect.top + rect.height / 2);
                // Set on :root so ::view-transition-* pseudo-elements (which live
                // outside the normal DOM tree) can inherit the CSS variables.
                document.documentElement.style.setProperty('--lp-ripple-x', x + 'px');
                document.documentElement.style.setProperty('--lp-ripple-y', y + 'px');
                type DocWithVT = Document & { startViewTransition?: (cb: () => void) => void };
                const startVT = (document as DocWithVT).startViewTransition?.bind(document);
                const applyToggle = (prev: boolean) => {
                  const next = !prev;
                  setThemeStore(next ? 'dark' : 'light');
                  return next;
                };
                if (!startVT || prefersReducedMotion) {
                  setIsDark(applyToggle);
                  return;
                }
                startVT(() => { flushSync(() => setIsDark(applyToggle)); });
              }}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Light mode' : 'Dark mode'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {authLoading ? (
              <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: 'var(--lp-border-card)' }} />
            ) : isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="touch-manipulation active:scale-95 transition-transform" aria-label="Account menu">
                    <Avatar className="h-8 w-8" style={{ border: '1px solid var(--lp-border-card)' }}>
                      <AvatarImage src={profile?.avatarUrl ?? undefined} />
                      <AvatarFallback className="text-xs font-semibold" style={{ background: mode === 'wisehire' ? 'rgba(29,78,216,0.15)' : 'rgba(158,27,34,0.15)', color: mode === 'wisehire' ? '#3B82F6' : '#E53E3E' }}>
                        {getInitials() ?? <User className="w-3.5 h-3.5" />}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => { triggerHaptic.light(); navigate('/dashboard'); }}>
                    <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { triggerHaptic.light(); navigate('/settings'); }}>
                    <Settings className="w-4 h-4 mr-2" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={async () => { triggerHaptic.medium(); await signOut(); navigate('/'); }}
                  >
                    <LogOut className="w-4 h-4 mr-2" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : mode === 'jobseeker' ? (
              <button
                onClick={() => {
                  triggerHaptic.light();
                  void Promise.resolve(kindeLogin()).catch(() => {
                    toast.error('Unable to sign in. Please try again or contact support.');
                  });
                }}
                className="text-sm font-medium px-4 py-1.5 rounded-lg transition-all duration-200"
                style={{
                  color: 'var(--lp-signin-color)',
                  background: 'var(--lp-signin-bg)',
                  border: '1px solid var(--lp-signin-border)',
                }}
              >
                Sign In
              </button>
            ) : (
              <button
                onClick={() => setWaitlistOpen(true)}
                className="text-sm font-semibold px-4 py-1.5 rounded-lg transition-all duration-200"
                style={{
                  color: '#fff',
                  background: '#1D4ED8',
                  border: '1px solid #1D4ED8',
                }}
              >
                Join Waitlist
              </button>
            )}
          </div>
        </div>
      </header>

      <main id="landing-main" className="w-full" style={{ position: 'relative' }}>
        <AnimatePresence
          mode="popLayout"
        >
        {mode === 'wisehire' ? (
          /* ═══════════════════════════════════════════════════════
             WISEHIRE MODE — full WiseHire landing experience
          ═══════════════════════════════════════════════════════ */
          <motion.div
            key="wisehire"
            variants={prefersReducedMotion ? REDUCED_MOTION_WRAPPER : SCATTER_WRAPPER_VARIANTS}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.div variants={prefersReducedMotion ? REDUCED_SECTION_ITEM : SCATTER_SECTION_ITEM} custom={0}>
              <WiseHireHero
                onOpenWaitlist={() => setWaitlistOpen(true)}
                mobileToggle={
                  <div className="sm:hidden relative z-10 flex justify-center mb-4">
                    <LandingToggle
                      uid="mob"
                      compact
                      mode={mode}
                      prefersReducedMotion={prefersReducedMotion}
                      onModeChange={handleLandingModeChange}
                    />
                  </div>
                }
              />
              <SoftDivider product="wisehire" />
              <WiseHireFeatureTicker />
            </motion.div>
            <motion.div variants={prefersReducedMotion ? REDUCED_SECTION_ITEM : SCATTER_SECTION_ITEM} custom={1}>
              <WiseHireDemoSection />
            </motion.div>
            <motion.div variants={prefersReducedMotion ? REDUCED_SECTION_ITEM : SCATTER_SECTION_ITEM} custom={2}>
              <SoftDivider product="wisehire" />
              <WiseHireTrustSection />
            </motion.div>
            <motion.div variants={prefersReducedMotion ? REDUCED_SECTION_ITEM : SCATTER_SECTION_ITEM} custom={3}>
              <SoftDivider product="wisehire" />
              <WiseHireFeatures onOpenWaitlist={() => setWaitlistOpen(true)} />
            </motion.div>
            <motion.div variants={prefersReducedMotion ? REDUCED_SECTION_ITEM : SCATTER_SECTION_ITEM} custom={4}>
              <SoftDivider product="wisehire" />
              <WiseHirePricing onOpenWaitlist={() => setWaitlistOpen(true)} />
            </motion.div>
            <motion.div variants={prefersReducedMotion ? REDUCED_SECTION_ITEM : SCATTER_SECTION_ITEM} custom={5}>
            {/* ─── WISEHIRE CLOSING CTA ─── */}
            <section
              className="text-center"
              style={{
                background: 'var(--lp-section-alt)',
                borderTop: '1px solid var(--lp-border)',
                padding: 'clamp(52px, 6vw, 84px) clamp(20px, 4vw, 40px)',
                transition: 'background 0.35s ease',
              }}
            >
              <motion.div
                className="max-w-2xl mx-auto"
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 28 }}
                whileInView={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.4 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              >
                <p
                  style={{
                    fontSize: '0.75rem',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--lp-eyebrow)',
                    fontWeight: 600,
                    marginBottom: '0.75rem',
                    transition: 'color 0.35s ease',
                  }}
                >
                  Get early access
                </p>
                <h2
                  className="font-bold leading-tight"
                  style={{
                    fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)',
                    color: 'var(--lp-text)',
                    letterSpacing: '-0.025em',
                    marginBottom: '0.75rem',
                    transition: 'color 0.35s ease',
                  }}
                >
                  Join the waitlist.<br />Hire smarter from day one.
                </h2>
                <p
                  className="max-w-md mx-auto text-sm mb-8"
                  style={{ color: 'var(--lp-text-muted)', lineHeight: 1.65, transition: 'color 0.35s ease' }}
                >
                  Invite-only early access. No credit card required. Cancel anytime.
                </p>
                <motion.button
                  type="button"
                  onClick={() => setWaitlistOpen(true)}
                  className="inline-flex items-center gap-2 h-12 px-10 text-base font-semibold rounded-xl"
                  style={{ background: '#1D4ED8', color: '#fff' }}
                  whileHover={prefersReducedMotion ? {} : { scale: 1.04 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  Join the Waitlist
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </motion.div>
            </section>

            <Footer lpMode product="wisehire" />
            </motion.div>
          </motion.div>
        ) : (
          /* ═══════════════════════════════════════════════════════
             WISERESUME MODE — existing WiseResume landing
          ═══════════════════════════════════════════════════════ */
          <motion.div
            key="wiseresume"
            variants={prefersReducedMotion ? REDUCED_MOTION_WRAPPER : SCATTER_WRAPPER_VARIANTS}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
        {/* ─── SECTION 0: HERO + TICKER ─── */}
        <motion.div variants={prefersReducedMotion ? REDUCED_SECTION_ITEM : SCATTER_SECTION_ITEM} custom={0}>
        <section
          ref={heroRef}
          className="lp-hero-top relative flex flex-col items-center text-center px-4 sm:px-6 overflow-hidden"
          style={{
            background: 'var(--lp-bg)',
            paddingBottom: '4rem',
          }}
        >
          {/* Indigo radial glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse 80% 55% at 50% 0%, var(--lp-hero-glow) 0%, transparent 65%)',
              transition: 'background 0.3s ease',
            }}
          />
          {/* Parallax depth layer */}
          <HeroParallaxGlow prefersReducedMotion={prefersReducedMotion} />

          {/* Stagger container wrapping all hero content */}
          <motion.div
            className="relative z-10 flex flex-col items-center text-center w-full"
            variants={heroContainerVariants}
            initial={prefersReducedMotion ? 'visible' : 'hidden'}
            animate="visible"
          >
            {/* Mobile product toggle — visible on mobile only, placed in hero content flow */}
            <div className="sm:hidden mb-4">
              <LandingToggle
                uid="mob"
                compact
                mode={mode}
                prefersReducedMotion={prefersReducedMotion}
                onModeChange={handleLandingModeChange}
              />
            </div>

            {/* Brand pill */}
            <motion.div
              variants={heroItemVariants}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full mb-6"
              style={{
                background: 'var(--lp-brand-pill-bg)',
                border: '1px solid var(--lp-brand-pill-border)',
                boxShadow: '0 0 18px 0 var(--lp-brand-pill-glow)',
              }}
            >
              <img
                alt=""
                aria-hidden="true"
                src={themeLogo}
                className="w-5 h-5 object-contain rounded-md"
              />
              <span
                className="font-display font-semibold tracking-tight"
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--lp-eyebrow)',
                }}
              >
                WiseResume
              </span>
            </motion.div>

            {/* Eyebrow */}
            <motion.p
              variants={heroItemVariants}
              className="mb-7"
              style={{
                fontSize: '0.8rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--lp-eyebrow)',
                fontWeight: 600,
                transition: 'color 0.3s ease',
              }}
            >
              AI-Powered Career Platform
            </motion.p>

            {/* Main headline — typewriter word lives inside H1 */}
            <motion.h1
              variants={heroItemVariants}
              className="font-extrabold leading-[1.05]"
              style={{
                fontSize: 'clamp(1.9rem, 9vw, 5.5rem)',
                color: 'var(--lp-text)',
                letterSpacing: '-0.035em',
                transition: 'color 0.3s ease',
                overflow: 'visible',
                width: '100%',
                maxWidth: '100vw',
              }}
            >
              {/* Line 1: static "Stand out as a" — always one line */}
              <span style={{ display: 'block', whiteSpace: 'nowrap' }}>
                Stand out as a
              </span>
              {/* Line 2: typewriter role title only — always one line */}
              <span style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'visible' }}>
                <span className="lp-gradient-text" style={{ display: 'inline-block', minWidth: '12ch' }}>
                  {typewriterWord || '\u00A0'}
                  <span className="lp-cursor" aria-hidden="true" />
                </span>
              </span>
            </motion.h1>

            {/* Subheading */}
            <motion.p
              variants={heroItemVariants}
              className="mt-6 mb-10"
              style={{
                fontSize: 'clamp(1rem, 2.2vw, 1.2rem)',
                lineHeight: 1.6,
                color: 'var(--lp-text-muted)',
                maxWidth: 500,
              }}
            >
              AI that builds, tailors, and lands your next job.
            </motion.p>

            {/* CTA — single primary action */}
            <motion.div variants={heroItemVariants}>
              {isAuthenticated ? (
                <motion.button
                  onClick={() => { triggerHaptic.light(); navigate('/dashboard'); }}
                  className="h-12 px-8 text-base font-semibold rounded-xl flex items-center gap-2"
                  style={{ background: '#9E1B22', color: '#fff' }}
                  whileHover={prefersReducedMotion ? {} : { scale: 1.04 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              ) : (
                <motion.button
                  onClick={() => handleCTA()}
                  className="h-12 px-8 text-base font-semibold rounded-xl flex items-center gap-2"
                  style={{ background: '#9E1B22', color: '#fff' }}
                  whileHover={prefersReducedMotion ? {} : { scale: 1.04 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  Get Started Free
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              )}
            </motion.div>

            {/* Trust badges */}
            <motion.div
              variants={heroItemVariants}
              className="mt-8 flex items-center gap-5 sm:gap-7 text-xs flex-wrap justify-center"
            >
              {['Free to start', 'No credit card', 'AI-powered'].map((item) => (
                <span key={item} className="flex items-center gap-1.5" style={{ color: 'var(--lp-trust-color)', transition: 'color 0.3s ease' }}>
                  <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--lp-trust-icon)', transition: 'color 0.3s ease' }} />
                  {item}
                </span>
              ))}
            </motion.div>
          </motion.div>
        </section>

        {/* ─── FEATURE TICKER (still inside section 0) ─── */}
        <motion.div
          initial={prefersReducedMotion ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={{ once: false, amount: 0.15 }}
          variants={{
            hidden: { opacity: 0, y: 60 },
            visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 22 } },
          }}
        >
          <FeatureTicker lpMode />
        </motion.div>
        </motion.div>{/* ── end section 0 ── */}

        {/* ─── SECTION 1: FEATURE NAV + HEADING + FEATURE BAND SECTIONS ─── */}
        <motion.div variants={prefersReducedMotion ? REDUCED_SECTION_ITEM : SCATTER_SECTION_ITEM} custom={1}>
        <div className="lp-separator" aria-hidden="true" />
        <FeatureNumberedNav sectionIds={FEATURE_IDS} labels={FEATURE_NAV_LABELS} />

        <motion.div
          className="text-center px-4 sm:px-6 py-16 max-w-4xl mx-auto"
          variants={lpItemVariants}
          initial={prefersReducedMotion ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={{ once: false, amount: 0.2 }}
          style={{ background: 'var(--lp-bg)' }}
        >
          <p style={{ fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--lp-eyebrow)', fontWeight: 600, marginBottom: '0.75rem' }}>
            See it in action
          </p>
          <h2
            className="font-bold leading-tight"
            style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: 'var(--lp-text)', letterSpacing: '-0.02em' }}
          >
            Five tools. One platform.<br />
            <span className="lp-gradient-text">Your unfair advantage in the job market.</span>
          </h2>
        </motion.div>

        <SoftDivider />
        {featureSections.map((section) => (
          <FeatureSection key={section.id} data={section} />
        ))}
        <SoftDivider />
        </motion.div>{/* ── end section 1 ── */}

        {/* ─── SECTION 2: EVERYTHING YOU NEED GRID ─── */}
        <motion.div variants={prefersReducedMotion ? REDUCED_SECTION_ITEM : SCATTER_SECTION_ITEM} custom={2}>
        <section className="px-4 sm:px-6 py-20" style={{ background: 'var(--lp-bg)' }}>
          <div className="max-w-6xl mx-auto">
            <motion.div
              className="text-center mb-12"
              variants={lpItemVariants}
              initial={prefersReducedMotion ? 'visible' : 'hidden'}
              whileInView="visible"
              viewport={{ once: false, amount: 0.2 }}
            >
              <p style={{ fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--lp-eyebrow)', fontWeight: 600, marginBottom: '0.75rem' }}>
                Full toolkit
              </p>
              <h2 className="font-bold" style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', color: 'var(--lp-text)', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
                Everything you need
              </h2>
              <p style={{ color: 'var(--lp-text-muted)' }} className="max-w-md mx-auto">
                One platform for your entire job search
              </p>
            </motion.div>

            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl mx-auto"
              variants={lpContainerVariants}
              initial={prefersReducedMotion ? 'visible' : 'hidden'}
              whileInView="visible"
              viewport={{ once: false, amount: 0.1 }}
            >
              {features.map((f) => (
                <motion.div
                  key={f.title}
                  variants={lpItemVariants}
                  className="flex items-start gap-4 p-5 lp-feature-card"
                  style={{
                    borderRadius: 16,
                    background: 'var(--lp-card)',
                    border: '1px solid var(--lp-border-card)',
                  }}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDark ? f.bgDark : f.bgLight}`}>
                    <f.icon className={`w-5 h-5 ${isDark ? f.colorDark : f.colorLight}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--lp-text)' }}>{f.title}</h3>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--lp-text-muted)' }}>{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
        </motion.div>{/* ── end section 2 ── */}

        {/* ─── SECTION 3: TRUST SECTION ─── */}
        <motion.div variants={prefersReducedMotion ? REDUCED_SECTION_ITEM : SCATTER_SECTION_ITEM} custom={3}>
        <SoftDivider />
        <TrustSection />
        </motion.div>{/* ── end section 3 ── */}

        {/* ─── SECTION 4: PWA STRIP ─── */}
        <motion.div variants={prefersReducedMotion ? REDUCED_SECTION_ITEM : SCATTER_SECTION_ITEM} custom={4}>
        <section className="px-4 sm:px-6 py-10" style={{ background: 'var(--lp-section-alt)', borderTop: '1px solid var(--lp-border)' }}>
          <motion.div
            className="max-w-xl mx-auto text-center"
            variants={lpItemVariants}
            initial={prefersReducedMotion ? 'visible' : 'hidden'}
            whileInView="visible"
            viewport={{ once: false, amount: 0.2 }}
          >
            <p className="font-semibold mb-1" style={{ color: 'var(--lp-text)' }}>Install WiseResume</p>
            <p className="text-sm mb-4" style={{ color: 'var(--lp-text-muted)' }}>Add to your home screen for a native app experience</p>
            <InstallButton />
          </motion.div>
        </section>
        </motion.div>{/* ── end section 4 ── */}

        {/* ─── SECTION 5: CLOSING CTA + FOOTER ─── */}
        <motion.div variants={prefersReducedMotion ? REDUCED_SECTION_ITEM : SCATTER_SECTION_ITEM} custom={5}>
        <section
          className="text-center"
          style={{
            background: 'var(--lp-section-alt)',
            borderTop: '1px solid var(--lp-border)',
            padding: 'clamp(52px, 6vw, 84px) clamp(20px, 4vw, 40px)',
            transition: 'background 0.35s ease',
          }}
        >
          <div className="max-w-2xl mx-auto">
            <p
              style={{
                fontSize: '0.75rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--lp-eyebrow)',
                fontWeight: 600,
                marginBottom: '0.75rem',
                transition: 'color 0.35s ease',
              }}
            >
              Start today
            </p>
            <h2
              className="font-bold leading-tight"
              style={{
                fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)',
                color: 'var(--lp-text)',
                letterSpacing: '-0.025em',
                marginBottom: '0.75rem',
                transition: 'color 0.35s ease',
              }}
            >
              Your career edge<br />starts here.
            </h2>
            <p
              className="max-w-md mx-auto text-sm mb-8"
              style={{ color: 'var(--lp-text-muted)', lineHeight: 1.65, transition: 'color 0.35s ease' }}
            >
              Free to start. No credit card. AI-powered results from day one.
            </p>
            <motion.button
              type="button"
              onClick={() => handleCTA()}
              className="inline-flex items-center gap-2 h-12 px-10 text-base font-semibold rounded-xl"
              style={{ background: '#9E1B22', color: '#fff' }}
              whileHover={prefersReducedMotion ? {} : { scale: 1.04 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>
        </section>
        <Footer lpMode />
        </motion.div>{/* ── end section 5 ── */}

          </motion.div>
        )}
        </AnimatePresence>
      </main>

      {/* Waitlist modal — shown when any WiseHire CTA is clicked */}
      <WaitlistModal open={waitlistOpen} onClose={() => setWaitlistOpen(false)} />

      {/* Quick tailor sheet */}
      {isAuthenticated && (
        <QuickTailorSheet open={tailorOpen} onOpenChange={setTailorOpen} />
      )}
    </div>
  );
};

export default Index;
