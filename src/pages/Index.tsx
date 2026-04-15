import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, Target, Wand2, Mic, LayoutDashboard, Settings, LogOut, Globe, ArrowRight, BarChart3, PenTool, CheckCircle2, User, Sun, Moon, Zap } from 'lucide-react';
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

function useScrollAnimation() {
  useEffect(() => {
    // Observe every .lp-animate element; add lp-visible on entry, remove on exit.
    // This makes animations fully reversible (appear on scroll down, hide on scroll up).
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('lp-visible');
          } else {
            entry.target.classList.remove('lp-visible');
          }
        });
      },
      // rootMargin bottom -80px: element must be 80px inside viewport before revealing.
      // rootMargin top -40px: element must be 40px past the top before hiding (gives a
      // small grace window so fast scrollers don't flicker).
      { threshold: 0, rootMargin: '-40px 0px -80px 0px' }
    );

    const observeAll = () =>
      document.querySelectorAll('.lp-animate').forEach((el) => observer.observe(el));

    observeAll();
    // Re-scan once after 600 ms to catch elements rendered by Suspense lazy loads.
    const t = setTimeout(observeAll, 600);

    // Watch for new .lp-animate elements added to the DOM (e.g. when the mode
    // toggle remounts FeatureSection components). Re-run observeAll whenever
    // child nodes are added anywhere in the document.
    const mutationObserver = new MutationObserver((mutations) => {
      const hasAddedNodes = mutations.some((m) => m.addedNodes.length > 0);
      if (hasAddedNodes) {
        observeAll();
      }
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
      clearTimeout(t);
    };
  }, []);
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

const WH_WRAPPER_VARIANTS = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
  exit: {
    transition: { staggerChildren: 0.028, staggerDirection: -1 },
  },
};
const WH_SECTION_ITEM = {
  hidden: { opacity: 0, y: 40, scale: 0.98 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring', stiffness: 260, damping: 28 },
  },
  exit: (i: number) => ({
    opacity: 0,
    y: -(22 + i * 9),
    filter: 'blur(3px)',
    scale: 0.97,
    transition: { duration: 0.14, ease: [0.4, 0, 1, 1] },
  }),
};
const WR_WRAPPER_VARIANTS = {
  hidden: {},
  visible: {},
  exit: {
    opacity: 0,
    scale: 0.95,
    filter: 'blur(8px)',
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] },
  },
};

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
  const [flashActive, setFlashActive] = useState(false);
  const [flashColor, setFlashColor] = useState('rgba(29,78,216,0.08)');

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
  useScrollAnimation();

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

  return (
    <div
      className="lp-root min-h-screen"
      data-theme="landing"
      data-lp-scheme={isDark ? 'dark' : 'light'}
      data-lp-product={mode === 'wisehire' ? 'wisehire' : undefined}
      style={{ colorScheme: isDark ? 'dark' : 'light' }}
    >
      <style>{`
        /* ── DARK THEME (default) ───────────────────────────────── */
        .lp-root {
          --lp-brand: #9E1B22;
          --lp-bg: transparent;
          --lp-card: #111118;
          --lp-card-glass: rgba(255,255,255,0.04);
          --lp-border: rgba(255,255,255,0.07);
          --lp-border-card: rgba(255,255,255,0.08);
          --lp-text: #f0f0f5;
          --lp-text-muted: rgba(240,240,245,0.52);
          --lp-text-subtle: rgba(240,240,245,0.32);
          --lp-header-scrolled-bg: rgba(10,10,15,0.9);
          --lp-header-scrolled-border: rgba(255,255,255,0.07);
          --lp-nav-bg: rgba(10,10,15,0.92);
          --lp-nav-border: rgba(255,255,255,0.07);
          --lp-hero-glow: rgba(158,27,34,0.18);
          --lp-section-alt: #0d0d14;
          --lp-section-alt2: #0f0f18;
          --lp-eyebrow: #E53E3E;
          --lp-logo-text: rgba(255,255,255,0.88);
          --lp-signin-color: rgba(255,255,255,0.72);
          --lp-signin-bg: rgba(255,255,255,0.07);
          --lp-signin-border: rgba(255,255,255,0.1);
          --lp-trust-color: rgba(240,240,245,0.35);
          --lp-trust-icon: rgba(158,27,34,0.7);
          --lp-toggle-bg: rgba(255,255,255,0.07);
          --lp-toggle-border: rgba(255,255,255,0.1);
          --lp-toggle-color: rgba(255,255,255,0.55);
          --lp-brand-pill-bg: rgba(158,27,34,0.1);
          --lp-brand-pill-border: rgba(158,27,34,0.28);
          --lp-brand-pill-glow: rgba(158,27,34,0.13);
          background: var(--lp-bg);
          color: var(--lp-text);
          transition: background 0.3s ease, color 0.3s ease;
        }

        /* ── LIGHT THEME ─────────────────────────────────────────── */
        .lp-root[data-lp-scheme="light"] {
          --lp-bg: rgba(255, 245, 245, 0.62);
          --lp-card: #ffffff;
          --lp-card-glass: rgba(0,0,0,0.03);
          --lp-border: rgba(0,0,0,0.06);
          --lp-border-card: rgba(0,0,0,0.08);
          --lp-text: #0f0f1a;
          --lp-text-muted: rgba(15,15,26,0.55);
          --lp-text-subtle: rgba(15,15,26,0.35);
          --lp-header-scrolled-bg: rgba(255, 245, 245, 0.94);
          --lp-header-scrolled-border: rgba(0,0,0,0.08);
          --lp-nav-bg: rgba(255, 245, 245, 0.96);
          --lp-nav-border: rgba(0,0,0,0.08);
          --lp-hero-glow: rgba(158,27,34,0.09);
          --lp-section-alt: #f5eded;
          --lp-section-alt2: #f2e8e8;
          --lp-eyebrow: #9E1B22;
          --lp-logo-text: #0f0f1a;
          --lp-signin-color: rgba(15,15,26,0.7);
          --lp-signin-bg: rgba(0,0,0,0.05);
          --lp-signin-border: rgba(0,0,0,0.1);
          --lp-trust-color: rgba(15,15,26,0.4);
          --lp-trust-icon: rgba(158,27,34,0.75);
          --lp-toggle-bg: rgba(0,0,0,0.05);
          --lp-toggle-border: rgba(0,0,0,0.1);
          --lp-toggle-color: rgba(15,15,26,0.55);
          --lp-brand-pill-bg: rgba(158,27,34,0.07);
          --lp-brand-pill-border: rgba(158,27,34,0.2);
          --lp-brand-pill-glow: rgba(158,27,34,0.1);
        }

        .lp-root * { font-style: normal !important; }

        /* Headline word entrance */
        .lp-word {
          display: inline-block;
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.6s cubic-bezier(0.22,1,0.36,1), transform 0.6s cubic-bezier(0.22,1,0.36,1);
        }
        .lp-word.lp-word-visible { opacity: 1; transform: translateY(0); }

        /* Scroll animations — entrance */
        .lp-animate {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.65s cubic-bezier(0.22, 1, 0.36, 1), transform 0.65s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .lp-animate.lp-visible { opacity: 1; transform: translateY(0); }

        /* Exit is faster and uses a simple ease-in so the reverse feels snappy */
        .lp-animate:not(.lp-visible) {
          transition-duration: 0.38s;
          transition-timing-function: ease-in;
        }

        /* Directional slides */
        .lp-animate.lp-from-left  { transform: translateX(-40px); }
        .lp-animate.lp-from-right { transform: translateX(40px); }
        .lp-animate.lp-from-left.lp-visible,
        .lp-animate.lp-from-right.lp-visible { transform: translateX(0); }

        /* CTA pulse */
        @keyframes lp-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(158,27,34,0); }
          50% { box-shadow: 0 0 0 8px rgba(158,27,34,0.12); }
        }
        .lp-cta-pulse { animation: lp-pulse 2.8s ease-in-out infinite; }

        /* Hero entrance */
        @keyframes lp-hero-in {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lp-cta-in {
          from { transform: translateY(20px); }
          to   { transform: translateY(0); }
        }
        .lp-hero-sub   { animation: lp-hero-in 0.6s cubic-bezier(0.22,1,0.36,1) 0.45s both; }
        .lp-hero-cta   { animation: lp-cta-in 0.6s cubic-bezier(0.22,1,0.36,1) 0.65s both; }
        .lp-hero-trust { animation: lp-hero-in 0.5s cubic-bezier(0.22,1,0.36,1) 0.82s both; }

        @media (prefers-reduced-motion: reduce) {
          .lp-hero-sub,.lp-hero-cta,.lp-hero-trust { animation: none; opacity: 1; transform: none; }
          .lp-word { opacity: 1; transform: none; transition: none; }
          /* Both with and without lp-visible — covers the higher-specificity exit rule */
          .lp-animate,
          .lp-animate:not(.lp-visible) { opacity: 1; transform: none; transition: none; }
          /* Disable gradient shimmer */
          .lp-gradient-text { animation: none !important; background-size: 100% 100% !important; }
          /* Disable pulse animations */
          .lp-cta-pulse { animation: none !important; }
          .wh-cta-pulse { animation: none !important; }
          /* Disable view transition */
          ::view-transition-old(root), ::view-transition-new(root) { animation: none; }
        }

        /* Header scrolled */
        .lp-header-scrolled {
          background: var(--lp-header-scrolled-bg) !important;
          backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--lp-header-scrolled-border);
        }

        /* Typewriter cursor */
        .lp-cursor {
          display: inline-block;
          width: 3px;
          height: 0.85em;
          background: #E53E3E;
          margin-left: 2px;
          vertical-align: middle;
          border-radius: 1px;
          animation: lp-blink 1s step-end infinite;
        }
        @keyframes lp-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @media (prefers-reduced-motion: reduce) {
          .lp-cursor { animation: none !important; opacity: 1 !important; }
        }

        /* Feature card hover */
        .lp-feature-card {
          transition: border-color 0.22s ease, background 0.22s ease, transform 0.22s ease;
          cursor: default;
        }
        .lp-root[data-lp-scheme="dark"] .lp-feature-card:hover {
          border-color: rgba(158,27,34,0.22) !important;
          background: rgba(255,255,255,0.05) !important;
          transform: translateY(-3px);
        }
        .lp-root[data-lp-scheme="light"] .lp-feature-card:hover {
          border-color: rgba(158,27,34,0.2) !important;
          background: rgba(158,27,34,0.04) !important;
          transform: translateY(-3px);
        }

        /* Testimonial card */
        .lp-testimonial-card {
          transition: border-color 0.22s ease, transform 0.22s ease;
        }
        .lp-testimonial-card:hover {
          border-color: rgba(158,27,34,0.2) !important;
          transform: translateY(-2px);
        }

        /* Separator */
        .lp-separator {
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, rgba(158,27,34,0.3) 30%, rgba(158,27,34,0.5) 50%, rgba(158,27,34,0.3) 70%, transparent 100%);
        }

        /* Gradient text — dark with shimmer */
        @keyframes lp-shimmer {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .lp-gradient-text {
          background: linear-gradient(135deg, #E53E3E 0%, #FF6B6B 25%, #C41E3A 50%, #FF8080 75%, #9E1B22 100%);
          background-size: 300% 300%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: lp-shimmer 4s ease infinite;
        }

        /* Gradient text — light (deeper crimson so it reads on light bg) */
        .lp-root[data-lp-scheme="light"] .lp-gradient-text {
          background: linear-gradient(135deg, #9E1B22 0%, #E11D48 25%, #B31B1B 50%, #C53030 75%, #9E1B22 100%);
          background-size: 300% 300%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: lp-shimmer 4s ease infinite;
        }

        /* Soft section divider gradient */
        .lp-section-divider {
          height: 60px;
          width: 100%;
          pointer-events: none;
        }
        .lp-section-divider-top {
          background: linear-gradient(to bottom, var(--lp-section-alt), transparent);
        }
        .lp-section-divider-bottom {
          background: linear-gradient(to top, var(--lp-section-alt), transparent);
        }

        /* Theme toggle button */
        .lp-theme-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
          background: var(--lp-toggle-bg);
          border: 1px solid var(--lp-toggle-border);
          color: var(--lp-toggle-color);
          flex-shrink: 0;
        }
        .lp-theme-toggle:hover {
          transform: scale(1.08);
          background: rgba(158,27,34,0.12);
          border-color: rgba(158,27,34,0.25);
          color: var(--lp-brand);
        }
        .lp-theme-toggle:active { transform: scale(0.96); }

        /* Radial ripple reveal — View Transitions API */
        ::view-transition-old(root) {
          animation: none;
          mix-blend-mode: normal;
        }
        ::view-transition-new(root) {
          /* 1.0 s with a smooth expo-out curve feels cinematic, not abrupt */
          animation: lp-ripple-reveal 1.0s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          mix-blend-mode: normal;
          /* Hint the browser to composite clip-path on the GPU to eliminate frame drops */
          will-change: clip-path;
        }
        @keyframes lp-ripple-reveal {
          from { clip-path: circle(0% at var(--lp-ripple-x, 50%) var(--lp-ripple-y, 50%)); }
          to   { clip-path: circle(150% at var(--lp-ripple-x, 50%) var(--lp-ripple-y, 50%)); }
        }

        /* ── WISEHIRE PRODUCT OVERRIDES ─────────────────────────── */
        /* Applied when data-lp-product="wisehire" — switches brand colour to WiseHire blue */
        .lp-root[data-lp-product="wisehire"] {
          --lp-brand: #1D4ED8;
          --lp-hero-glow: rgba(29,78,216,0.20);
          --lp-eyebrow: #3B82F6;
          --lp-trust-icon: rgba(29,78,216,0.75);
          --lp-brand-pill-bg: rgba(29,78,216,0.10);
          --lp-brand-pill-border: rgba(29,78,216,0.28);
          --lp-brand-pill-glow: rgba(29,78,216,0.15);
          --lp-section-alt2: #0b0f1c;
          transition: all 0.35s ease;
        }
        .lp-root[data-lp-product="wisehire"][data-lp-scheme="light"] {
          --lp-bg: rgba(240,245,255,0.62);
          --lp-section-alt: #eef2fb;
          --lp-section-alt2: #e8eef8;
          --lp-header-scrolled-bg: rgba(240,245,255,0.94);
          --lp-header-scrolled-border: rgba(29,78,216,0.12);
          --lp-nav-bg: rgba(240,245,255,0.96);
          --lp-nav-border: rgba(29,78,216,0.1);
          --lp-hero-glow: rgba(29,78,216,0.10);
          --lp-trust-color: rgba(15,15,26,0.4);
          --lp-trust-icon: rgba(29,78,216,0.80);
          --lp-brand-pill-bg: rgba(29,78,216,0.07);
          --lp-brand-pill-border: rgba(29,78,216,0.22);
        }
        /* Separator variant for WiseHire */
        .lp-root[data-lp-product="wisehire"] .lp-separator {
          background: linear-gradient(90deg, transparent 0%, rgba(29,78,216,0.3) 30%, rgba(29,78,216,0.5) 50%, rgba(29,78,216,0.3) 70%, transparent 100%);
        }
        /* Feature card hover — blue accent in WiseHire */
        .lp-root[data-lp-product="wisehire"][data-lp-scheme="dark"] .lp-feature-card:hover {
          border-color: rgba(29,78,216,0.28) !important;
          background: rgba(29,78,216,0.06) !important;
          transform: translateY(-3px);
        }
        .lp-root[data-lp-product="wisehire"][data-lp-scheme="light"] .lp-feature-card:hover {
          border-color: rgba(29,78,216,0.25) !important;
          background: rgba(29,78,216,0.05) !important;
          transform: translateY(-3px);
        }
        /* Testimonial card hover — blue accent in WiseHire */
        .lp-root[data-lp-product="wisehire"] .lp-testimonial-card:hover {
          border-color: rgba(29,78,216,0.22) !important;
          transform: translateY(-2px);
        }
        /* Theme toggle hover — blue accent in WiseHire */
        .lp-root[data-lp-product="wisehire"] .lp-theme-toggle:hover {
          background: rgba(29,78,216,0.12);
          border-color: rgba(29,78,216,0.28);
          color: var(--lp-brand);
        }
      `}</style>

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

      {/* Brand transition flash overlay — fires between exit and enter */}
      <AnimatePresence>
        {flashActive && (
          <motion.div
            key="brand-flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.08 } }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            aria-hidden="true"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 200,
              background: flashColor,
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>

      {/* Sticky Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'lp-header-scrolled' : 'bg-transparent'}`}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        {/* Product toggle strip — always visible, sits above the nav row */}
        <LandingToggle mode={mode} onModeChange={(m) => {
          triggerHaptic.light();
          setMode(m);
        }} />

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
                className="text-sm font-medium px-3 py-1.5 rounded-lg transition-all duration-200"
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
                className="text-sm font-medium px-3 py-1.5 rounded-lg transition-all duration-200"
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
                className="hidden xs:block text-sm font-medium px-3 py-1.5 rounded-lg transition-all duration-200"
                style={{ color: 'var(--lp-text-muted)', background: 'transparent' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--lp-text)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--lp-text-muted)'; }}
              >
                What's New
              </Link>
            )}
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

      <main id="landing-main" className="w-full">
        <AnimatePresence
          mode="wait"
          initial={false}
          onExitComplete={() => {
            if (!prefersReducedMotion) {
              setFlashColor(mode === 'wisehire' ? 'rgba(29,78,216,0.15)' : 'rgba(158,27,34,0.13)');
              setFlashActive(true);
              setTimeout(() => setFlashActive(false), 200);
            }
          }}
        >
        {mode === 'wisehire' ? (
          /* ═══════════════════════════════════════════════════════
             WISEHIRE MODE — full WiseHire landing experience
          ═══════════════════════════════════════════════════════ */
          <motion.div
            key="wisehire"
            variants={WH_WRAPPER_VARIANTS}
            initial={prefersReducedMotion ? 'visible' : 'hidden'}
            animate="visible"
            exit={prefersReducedMotion ? 'visible' : 'exit'}
          >
            <motion.div variants={WH_SECTION_ITEM} custom={0}>
              <WiseHireHero onOpenWaitlist={() => setWaitlistOpen(true)} />
              <SoftDivider product="wisehire" />
              <WiseHireFeatureTicker />
            </motion.div>
            <motion.div variants={WH_SECTION_ITEM} custom={1}>
              <WiseHireDemoSection />
            </motion.div>
            <motion.div variants={WH_SECTION_ITEM} custom={2}>
              <SoftDivider product="wisehire" />
              <WiseHireTrustSection />
            </motion.div>
            <motion.div variants={WH_SECTION_ITEM} custom={3}>
              <SoftDivider product="wisehire" />
              <WiseHireFeatures onOpenWaitlist={() => setWaitlistOpen(true)} />
            </motion.div>
            <motion.div variants={WH_SECTION_ITEM} custom={4}>
              <SoftDivider product="wisehire" />
              <WiseHirePricing onOpenWaitlist={() => setWaitlistOpen(true)} />
            </motion.div>
            <motion.div variants={WH_SECTION_ITEM} custom={5}>
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
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
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
            variants={WR_WRAPPER_VARIANTS}
            initial={prefersReducedMotion ? 'visible' : 'hidden'}
            animate="visible"
            exit={prefersReducedMotion ? 'visible' : 'exit'}
          >
        {/* ─── HERO ─── */}
        <section
          ref={heroRef}
          className="relative flex flex-col items-center text-center px-4 sm:px-6 overflow-hidden"
          style={{
            background: 'var(--lp-bg)',
            paddingTop: 'calc(7.75rem + env(safe-area-inset-top))',
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

          {/* Brand pill */}
          <div
            className="relative z-10 flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 lp-hero-sub"
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
          </div>

          {/* Eyebrow */}
          <p
            className="relative z-10 mb-7 lp-hero-sub"
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
          </p>

          {/* Main headline — typewriter word lives inside H1 */}
          <h1
            className="relative z-10 font-extrabold leading-[1.05]"
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
          </h1>

          {/* Subheading */}
          <p
            className="relative z-10 mt-6 mb-10 lp-hero-sub"
            style={{
              fontSize: 'clamp(1rem, 2.2vw, 1.2rem)',
              lineHeight: 1.6,
              color: 'var(--lp-text-muted)',
              maxWidth: 500,
            }}
          >
            AI that builds, tailors, and lands your next job.
          </p>

          {/* CTA — single primary action */}
          <div className="relative z-10 lp-hero-cta">
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
          </div>

          {/* Trust badges */}
          <div className="relative z-10 mt-8 flex items-center gap-5 sm:gap-7 text-xs flex-wrap justify-center lp-hero-trust">
            {['Free to start', 'No credit card', 'AI-powered'].map((item) => (
              <span key={item} className="flex items-center gap-1.5" style={{ color: 'var(--lp-trust-color)', transition: 'color 0.3s ease' }}>
                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--lp-trust-icon)', transition: 'color 0.3s ease' }} />
                {item}
              </span>
            ))}
          </div>
        </section>

        {/* ─── FEATURE TICKER ─── */}
        <FeatureTicker lpMode />

        {/* ─── SEPARATOR ─── */}
        <div className="lp-separator" aria-hidden="true" />

        {/* ─── NUMBERED FEATURE NAV ─── */}
        <FeatureNumberedNav sectionIds={FEATURE_IDS} labels={FEATURE_NAV_LABELS} />

        {/* ─── FEATURE SECTIONS HEADING ─── */}
        <motion.div
          className="text-center px-4 sm:px-6 py-16 max-w-4xl mx-auto"
          variants={lpItemVariants}
          initial="hidden"
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

        {/* ─── ALTERNATING FEATURE BAND SECTIONS ─── */}
        {featureSections.map((section) => (
          <FeatureSection key={section.id} data={section} />
        ))}

        <SoftDivider />

        {/* ─── EVERYTHING YOU NEED GRID ─── */}
        <section className="px-4 sm:px-6 py-20" style={{ background: 'var(--lp-bg)' }}>
          <div className="max-w-6xl mx-auto">
            <motion.div
              className="text-center mb-12"
              variants={lpItemVariants}
              initial="hidden"
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
              initial="hidden"
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

        <SoftDivider />

        {/* ─── TRUST SECTION ─── */}
        <TrustSection />

        {/* ─── PWA INSTALL STRIP ─── */}
        <section className="px-4 sm:px-6 py-10" style={{ background: 'var(--lp-section-alt)', borderTop: '1px solid var(--lp-border)' }}>
          <motion.div
            className="max-w-xl mx-auto text-center"
            variants={lpItemVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.2 }}
          >
            <p className="font-semibold mb-1" style={{ color: 'var(--lp-text)' }}>Install WiseResume</p>
            <p className="text-sm mb-4" style={{ color: 'var(--lp-text-muted)' }}>Add to your home screen for a native app experience</p>
            <InstallButton />
          </motion.div>
        </section>

        {/* ─── WISERESUME CLOSING CTA ─── */}
        <motion.section
          className="text-center"
          variants={lpItemVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.15 }}
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
        </motion.section>

        <Footer lpMode />
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
