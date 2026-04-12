import { useNavigate } from 'react-router-dom';
import { Sparkles, Target, Wand2, Mic, LayoutDashboard, Settings, LogOut, Globe, ArrowRight, BarChart3, PenTool, CheckCircle2, Check, User, Quote, Sun, Moon } from 'lucide-react';
import { Footer } from '@/components/landing/Footer';
import { PageLoadingSpinner } from '@/components/ui/PageLoadingSpinner';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import triggerHaptic from '@/lib/haptics';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { useReducedMotion } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/safeClient';
import { QuickTailorSheet } from '@/components/landing/QuickTailorSheet';
import { InstallButton } from '@/components/pwa/InstallButton';
import { useThemeLogo } from '@/hooks/useThemeLogo';
import { FeatureTicker } from '@/components/landing/FeatureTicker';
import { StickyCtaBar } from '@/components/landing/StickyCtaBar';
import { FeatureSection, type FeatureSectionData } from '@/components/landing/FeatureSection';

const features = [
  { icon: Sparkles, title: 'AI Resume Writing', desc: 'AI rewrites vague bullets into quantified achievements that recruiters remember.', colorDark: 'text-indigo-400', colorLight: 'text-indigo-600', bgDark: 'bg-indigo-500/10', bgLight: 'bg-indigo-100' },
  { icon: Target, title: 'ATS Score Analysis', desc: 'Real-time ATS match percentage against any job posting — fix gaps instantly.', colorDark: 'text-emerald-400', colorLight: 'text-emerald-600', bgDark: 'bg-emerald-500/10', bgLight: 'bg-emerald-100' },
  { icon: Wand2, title: 'Smart Tailoring', desc: 'Paste a job description and AI rewrites your resume to match in 30 seconds.', colorDark: 'text-blue-400', colorLight: 'text-blue-600', bgDark: 'bg-blue-500/10', bgLight: 'bg-blue-100' },
  { icon: Mic, title: 'Interview Coaching', desc: 'Real voice interview practice with AI that listens, responds, and scores you live.', colorDark: 'text-orange-400', colorLight: 'text-orange-600', bgDark: 'bg-orange-500/10', bgLight: 'bg-orange-100' },
  { icon: PenTool, title: 'Cover Letters', desc: 'Generate tailored cover letters that match your resume and the job requirements.', colorDark: 'text-purple-400', colorLight: 'text-purple-600', bgDark: 'bg-purple-500/10', bgLight: 'bg-purple-100' },
  { icon: BarChart3, title: 'Application Tracker', desc: 'Track all your job applications in one place with status updates and analytics.', colorDark: 'text-pink-400', colorLight: 'text-pink-600', bgDark: 'bg-pink-500/10', bgLight: 'bg-pink-100' },
];

const pricingFeatures = {
  free: ['1 resume', 'Basic AI suggestions', 'ATS score check', 'PDF export', 'Portfolio site'],
  pro: ['Unlimited resumes', 'Advanced AI tools', 'Smart tailoring', 'Interview coaching', 'Cover letter generator', 'Application tracker', 'Priority support'],
  premium: ['Everything in Pro', 'Custom branding', 'Analytics dashboard', 'White-label exports', 'Early access features', 'Dedicated support'],
};

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
    desc: 'Paste any job description and receive a precisely tailored resume in seconds. Review every change before applying.',
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
      'Personalised URL you can share with any employer',
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
  'interviews',
  'competitive offers',
  'your target role',
  'recruiter responses',
  'top-tier positions',
];

const TESTIMONIALS = [
  {
    quote: "I went from zero responses to three interviews in two weeks. The AI tailoring alone is worth it.",
    name: "Priya S.",
    role: "Product Manager, landed at Stripe",
  },
  {
    quote: "WiseResume's ATS score showed me exactly why my resume wasn't passing screening. Fixed it in minutes.",
    name: "James K.",
    role: "Software Engineer, landed at Shopify",
  },
  {
    quote: "The interview coach is exceptional. I rehearsed the same question ten times and the improvement was measurable.",
    name: "Maria L.",
    role: "Marketing Lead, landed at HubSpot",
  },
  {
    quote: "I'd been job hunting for months. Within a week of using WiseResume I had offers on the table.",
    name: "David T.",
    role: "Data Analyst, landed at Notion",
  },
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
    const markIfVisible = (el: Element) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        el.classList.add('lp-visible');
        return true;
      }
      return false;
    };
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('lp-visible');
        });
      },
      { threshold: 0, rootMargin: '0px 0px -80px 0px' }
    );
    const observe = () => {
      document.querySelectorAll('.lp-animate:not(.lp-visible)').forEach((el) => {
        if (!markIfVisible(el)) observer.observe(el);
      });
    };
    observe();
    const t = setInterval(observe, 500);
    return () => { observer.disconnect(); clearInterval(t); };
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
        top: 56,
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
              background: activeIdx === idx ? 'rgba(99,102,241,0.14)' : 'transparent',
              color: activeIdx === idx ? 'var(--lp-brand)' : 'var(--lp-text-subtle)',
              border: activeIdx === idx ? '1px solid rgba(99,102,241,0.28)' : '1px solid transparent',
            }}
          >
            {labels[idx]}
          </button>
        ))}
      </div>
    </div>
  );
}

const Index = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, signOut } = useAuth();
  const { profile } = useProfile(isAuthenticated ? user?.id : undefined, user);
  const prefersReducedMotion = useReducedMotion();
  const themeLogo = useThemeLogo();
  const [scrolled, setScrolled] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const progressRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [tailorOpen, setTailorOpen] = useState(false);
  const [headlineVisible, setHeadlineVisible] = useState(false);
  const [ctaPulse, setCtaPulse] = useState(false);

  const typewriterWord = useTypewriterWord(TYPEWRITER_WORDS);
  useScrollAnimation();

  const FEATURE_NAV_LABELS = ['01  Resume Builder', '02  AI Tailoring', '03  Portfolio', '04  Interview Coach', '05  Job Tracker'];

  useEffect(() => {
    const t1 = setTimeout(() => setHeadlineVisible(true), 100);
    const t2 = setTimeout(() => setCtaPulse(true), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
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
    if (sessionStorage.getItem('backend-warmed')) return;
    sessionStorage.setItem('backend-warmed', '1');
    fetch(SUPABASE_URL + '/rest/v1/', {
      method: 'HEAD',
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY }
    }).catch(() => {});
  }, []);

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
      navigate(`/auth?plan=${plan}`);
    } else {
      kindeRegister();
    }
  };

  if (authLoading) return <PageLoadingSpinner />;

  return (
    <div
      className="lp-root min-h-screen"
      data-theme="landing"
      data-lp-scheme={isDark ? 'dark' : 'light'}
      style={{ colorScheme: isDark ? 'dark' : 'light' }}
    >
      <style>{`
        /* ── DARK THEME (default) ───────────────────────────────── */
        .lp-root {
          --lp-brand: #6366F1;
          --lp-bg: #0a0a0f;
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
          --lp-hero-glow: rgba(99,102,241,0.18);
          --lp-section-alt: #0d0d14;
          --lp-section-alt2: #0f0f18;
          --lp-eyebrow: #818CF8;
          --lp-logo-text: rgba(255,255,255,0.88);
          --lp-signin-color: rgba(255,255,255,0.72);
          --lp-signin-bg: rgba(255,255,255,0.07);
          --lp-signin-border: rgba(255,255,255,0.1);
          --lp-trust-color: rgba(240,240,245,0.35);
          --lp-trust-icon: rgba(99,102,241,0.7);
          --lp-toggle-bg: rgba(255,255,255,0.07);
          --lp-toggle-border: rgba(255,255,255,0.1);
          --lp-toggle-color: rgba(255,255,255,0.55);
          background: var(--lp-bg);
          color: var(--lp-text);
          transition: background 0.3s ease, color 0.3s ease;
        }

        /* ── LIGHT THEME ─────────────────────────────────────────── */
        .lp-root[data-lp-scheme="light"] {
          --lp-bg: #f5f5fb;
          --lp-card: #ffffff;
          --lp-card-glass: rgba(0,0,0,0.03);
          --lp-border: rgba(0,0,0,0.06);
          --lp-border-card: rgba(0,0,0,0.08);
          --lp-text: #0f0f1a;
          --lp-text-muted: rgba(15,15,26,0.55);
          --lp-text-subtle: rgba(15,15,26,0.35);
          --lp-header-scrolled-bg: rgba(245,245,251,0.94);
          --lp-header-scrolled-border: rgba(0,0,0,0.08);
          --lp-nav-bg: rgba(245,245,251,0.96);
          --lp-nav-border: rgba(0,0,0,0.08);
          --lp-hero-glow: rgba(99,102,241,0.09);
          --lp-section-alt: #ededf5;
          --lp-section-alt2: #e8e8f2;
          --lp-eyebrow: #6366F1;
          --lp-logo-text: #0f0f1a;
          --lp-signin-color: rgba(15,15,26,0.7);
          --lp-signin-bg: rgba(0,0,0,0.05);
          --lp-signin-border: rgba(0,0,0,0.1);
          --lp-trust-color: rgba(15,15,26,0.4);
          --lp-trust-icon: rgba(99,102,241,0.75);
          --lp-toggle-bg: rgba(0,0,0,0.05);
          --lp-toggle-border: rgba(0,0,0,0.1);
          --lp-toggle-color: rgba(15,15,26,0.55);
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

        /* Scroll animations */
        .lp-animate {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.65s cubic-bezier(0.22, 1, 0.36, 1), transform 0.65s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .lp-animate.lp-visible { opacity: 1; transform: translateY(0); }

        /* Directional slides */
        .lp-animate.lp-from-left  { transform: translateX(-40px); }
        .lp-animate.lp-from-right { transform: translateX(40px); }
        .lp-animate.lp-from-left.lp-visible,
        .lp-animate.lp-from-right.lp-visible { transform: translateX(0); }

        /* CTA pulse */
        @keyframes lp-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); }
          50% { box-shadow: 0 0 0 8px rgba(99,102,241,0.12); }
        }
        .lp-cta-pulse { animation: lp-pulse 2.8s ease-in-out infinite; }

        /* Hero entrance */
        @keyframes lp-hero-in {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .lp-hero-sub   { animation: lp-hero-in 0.6s cubic-bezier(0.22,1,0.36,1) 0.45s both; }
        .lp-hero-cta   { animation: lp-hero-in 0.6s cubic-bezier(0.22,1,0.36,1) 0.65s both; }
        .lp-hero-trust { animation: lp-hero-in 0.5s cubic-bezier(0.22,1,0.36,1) 0.82s both; }

        @media (prefers-reduced-motion: reduce) {
          .lp-hero-sub,.lp-hero-cta,.lp-hero-trust { animation: none; opacity: 1; transform: none; }
          .lp-word { opacity: 1; transform: none; transition: none; }
          .lp-animate { opacity: 1; transform: none; transition: none; }
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
          background: #818CF8;
          margin-left: 2px;
          vertical-align: middle;
          border-radius: 1px;
          animation: lp-blink 1s step-end infinite;
        }
        @keyframes lp-blink { 0%,100%{opacity:1} 50%{opacity:0} }

        /* Feature card hover */
        .lp-feature-card {
          transition: border-color 0.22s ease, background 0.22s ease, transform 0.22s ease;
          cursor: default;
        }
        .lp-root[data-lp-scheme="dark"] .lp-feature-card:hover {
          border-color: rgba(99,102,241,0.22) !important;
          background: rgba(255,255,255,0.05) !important;
          transform: translateY(-3px);
        }
        .lp-root[data-lp-scheme="light"] .lp-feature-card:hover {
          border-color: rgba(99,102,241,0.2) !important;
          background: rgba(99,102,241,0.04) !important;
          transform: translateY(-3px);
        }

        /* Testimonial card */
        .lp-testimonial-card {
          transition: border-color 0.22s ease, transform 0.22s ease;
        }
        .lp-testimonial-card:hover {
          border-color: rgba(99,102,241,0.2) !important;
          transform: translateY(-2px);
        }

        /* Separator */
        .lp-separator {
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.3) 30%, rgba(99,102,241,0.5) 50%, rgba(99,102,241,0.3) 70%, transparent 100%);
        }

        /* Gradient text — dark */
        .lp-gradient-text {
          background: linear-gradient(135deg, #a5b4fc 0%, #818CF8 50%, #c4b5fd 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* Gradient text — light (darker indigo so it reads on light bg) */
        .lp-root[data-lp-scheme="light"] .lp-gradient-text {
          background: linear-gradient(135deg, #6366F1 0%, #4F46E5 50%, #7C3AED 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
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
          background: rgba(99,102,241,0.12);
          border-color: rgba(99,102,241,0.25);
          color: var(--lp-brand);
        }
        .lp-theme-toggle:active { transform: scale(0.96); }

        /* Radial ripple reveal — View Transitions API */
        ::view-transition-old(root) {
          animation: none;
          mix-blend-mode: normal;
        }
        ::view-transition-new(root) {
          animation: lp-ripple-reveal 0.62s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          mix-blend-mode: normal;
        }
        @keyframes lp-ripple-reveal {
          from { clip-path: circle(0% at var(--lp-ripple-x, 50%) var(--lp-ripple-y, 50%)); }
          to   { clip-path: circle(150% at var(--lp-ripple-x, 50%) var(--lp-ripple-y, 50%)); }
        }
      `}</style>

      <a
        href="#landing-main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:rounded-md focus:m-2"
        style={{ background: '#6366F1', color: '#fff' }}
      >
        Skip to content
      </a>

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-[2px] z-[60] pointer-events-none" style={{ display: 'none' }}>
        <div ref={progressRef} className="h-full transition-[width] duration-75 ease-out" style={{ background: '#6366F1' }} />
      </div>

      {/* Sticky Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'lp-header-scrolled' : 'bg-transparent'}`}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 h-14 max-w-6xl mx-auto">
          <button
            onClick={() => { triggerHaptic.light(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="flex items-center gap-2.5 touch-manipulation"
            aria-label="WiseResume – scroll to top"
          >
            <img alt="WiseResume" loading="lazy" className="w-8 h-8 object-contain rounded-lg" src={themeLogo} />
            <span className="font-display font-bold text-sm" style={{ color: 'var(--lp-logo-text)' }}>WiseResume</span>
          </button>

          <div className="flex items-center gap-2">
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
                if (!startVT || prefersReducedMotion) {
                  setIsDark((d) => !d);
                  return;
                }
                startVT(() => { flushSync(() => setIsDark((d) => !d)); });
              }}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Light mode' : 'Dark mode'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="touch-manipulation active:scale-95 transition-transform" aria-label="Account menu">
                    <Avatar className="h-8 w-8" style={{ border: '1px solid var(--lp-border-card)' }}>
                      <AvatarImage src={profile?.avatarUrl ?? undefined} />
                      <AvatarFallback className="text-xs font-semibold" style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8' }}>
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
            ) : (
              <button
                onClick={() => { triggerHaptic.light(); kindeLogin(); }}
                className="text-sm font-medium px-4 py-1.5 rounded-lg transition-all duration-200"
                style={{
                  color: 'var(--lp-signin-color)',
                  background: 'var(--lp-signin-bg)',
                  border: '1px solid var(--lp-signin-border)',
                }}
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <main id="landing-main" className="w-full">
        {/* ─── HERO ─── */}
        <section
          ref={heroRef}
          className="relative flex flex-col items-center text-center px-4 sm:px-6 overflow-hidden"
          style={{
            background: 'var(--lp-bg)',
            paddingTop: 'calc(7rem + env(safe-area-inset-top))',
            paddingBottom: '6rem',
            minHeight: '88vh',
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

          {/* Eyebrow */}
          <p
            className="relative z-10 mb-7"
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
            className="relative z-10 font-extrabold leading-[1.05] max-w-4xl"
            style={{
              fontSize: 'clamp(4rem, 8vw, 7rem)',
              color: 'var(--lp-text)',
              letterSpacing: '-0.035em',
              transition: 'color 0.3s ease',
            }}
          >
            {['Land', 'more'].map((word, i) => (
              <span key={i} style={{ display: 'inline-block', marginRight: '0.22em' }}>
                <span
                  className={`lp-word ${headlineVisible && !prefersReducedMotion ? 'lp-word-visible' : prefersReducedMotion ? 'lp-word-visible' : ''}`}
                  style={{ transitionDelay: `${80 + i * 100}ms` }}
                >
                  {word}
                </span>
              </span>
            ))}
            <span style={{ display: 'inline-block' }}>
              <span
                className={`lp-word lp-gradient-text ${headlineVisible && !prefersReducedMotion ? 'lp-word-visible' : prefersReducedMotion ? 'lp-word-visible' : ''}`}
                style={{ transitionDelay: '280ms', minWidth: '2ch' }}
              >
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
            Build, tailor, and optimise your resume with AI. Practice interviews, track applications, and launch your portfolio — all in one place.
          </p>

          {/* CTA — single primary action */}
          <div className="relative z-10 lp-hero-cta">
            {isAuthenticated ? (
              <button
                onClick={() => { triggerHaptic.light(); navigate('/dashboard'); }}
                className={`h-12 px-8 text-base font-semibold rounded-xl flex items-center gap-2 transition-all ${ctaPulse ? 'lp-cta-pulse' : ''}`}
                style={{ background: '#6366F1', color: '#fff' }}
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleCTA}
                className={`h-12 px-8 text-base font-semibold rounded-xl flex items-center gap-2 transition-all ${ctaPulse ? 'lp-cta-pulse' : ''}`}
                style={{ background: '#6366F1', color: '#fff' }}
              >
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </button>
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
        <div className="text-center px-4 sm:px-6 py-16 max-w-4xl mx-auto lp-animate" style={{ background: 'var(--lp-bg)' }}>
          <p style={{ fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--lp-eyebrow)', fontWeight: 600, marginBottom: '0.75rem' }}>
            See it in action
          </p>
          <h2
            className="font-bold leading-tight"
            style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: 'var(--lp-text)', letterSpacing: '-0.02em' }}
          >
            Five tools. One platform.<br />
            <span className="lp-gradient-text">Your unfair advantage in hiring.</span>
          </h2>
        </div>

        {/* ─── ALTERNATING FEATURE BAND SECTIONS ─── */}
        {featureSections.map((section) => (
          <FeatureSection key={section.id} data={section} />
        ))}

        {/* ─── EVERYTHING YOU NEED GRID ─── */}
        <section className="px-4 sm:px-6 py-20" style={{ background: 'var(--lp-bg)' }}>
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12 lp-animate">
              <p style={{ fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--lp-eyebrow)', fontWeight: 600, marginBottom: '0.75rem' }}>
                Full toolkit
              </p>
              <h2 className="font-bold" style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', color: 'var(--lp-text)', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
                Everything you need
              </h2>
              <p style={{ color: 'var(--lp-text-muted)' }} className="max-w-md mx-auto">
                One platform for your entire job search
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl mx-auto">
              {features.map((f, i) => (
                <div
                  key={f.title}
                  className={`flex items-start gap-4 p-5 lp-animate ${i % 2 === 0 ? 'lp-from-left' : 'lp-from-right'} lp-feature-card`}
                  style={{
                    borderRadius: 16,
                    background: 'var(--lp-card)',
                    border: '1px solid var(--lp-border-card)',
                    transitionDelay: `${i * 60}ms`,
                  }}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDark ? f.bgDark : f.bgLight}`}>
                    <f.icon className={`w-5 h-5 ${isDark ? f.colorDark : f.colorLight}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--lp-text)' }}>{f.title}</h3>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--lp-text-muted)' }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── SEPARATOR ─── */}
        <div className="lp-separator" aria-hidden="true" />

        {/* ─── TESTIMONIALS ─── */}
        <section className="px-4 sm:px-6 py-20" style={{ background: 'var(--lp-section-alt)' }}>
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14 lp-animate">
              <p style={{ fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--lp-eyebrow)', fontWeight: 600, marginBottom: '0.75rem' }}>
                Success Stories
              </p>
              <h2 className="font-bold" style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', color: 'var(--lp-text)', letterSpacing: '-0.02em' }}>
                Job seekers rely on WiseResume
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {TESTIMONIALS.map((t, i) => (
                <div
                  key={t.name}
                  className={`lp-animate ${i % 2 === 0 ? 'lp-from-left' : 'lp-from-right'} lp-testimonial-card flex flex-col gap-4 p-5`}
                  style={{
                    borderRadius: 16,
                    background: 'var(--lp-card)',
                    border: '1px solid var(--lp-border-card)',
                    transitionDelay: `${i * 80}ms`,
                  }}
                >
                  <Quote className="w-5 h-5 flex-shrink-0" style={{ color: 'rgba(99,102,241,0.5)' }} />
                  <p className="text-sm leading-relaxed flex-1" style={{ color: 'var(--lp-text-muted)' }}>
                    "{t.quote}"
                  </p>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--lp-text)' }}>{t.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--lp-text-subtle)' }}>{t.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── SEPARATOR ─── */}
        <div className="lp-separator" aria-hidden="true" />

        {/* ─── PRICING ─── */}
        <section className="px-4 sm:px-6 py-20" style={{ background: 'var(--lp-bg)' }}>
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10 lp-animate">
              <p style={{ fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--lp-eyebrow)', fontWeight: 600, marginBottom: '0.75rem' }}>
                Pricing
              </p>
              <h2 className="font-bold mb-2" style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', color: 'var(--lp-text)', letterSpacing: '-0.02em' }}>
                Simple pricing
              </h2>
              <p style={{ color: 'var(--lp-text-muted)' }} className="max-w-md mx-auto">
                Start free, upgrade when you need more
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {/* Free */}
              <div
                className="lp-animate lp-from-left flex flex-col p-6"
                style={{ borderRadius: 20, background: 'var(--lp-card)', border: '1px solid var(--lp-border-card)', transitionDelay: '0ms' }}
              >
                <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--lp-text)' }}>Free</h3>
                <p className="text-3xl font-bold mb-1" style={{ color: 'var(--lp-text)' }}>$0<span className="text-sm font-normal" style={{ color: 'var(--lp-text-muted)' }}>/mo</span></p>
                <p className="text-xs mb-5" style={{ color: 'var(--lp-text-muted)' }}>Perfect to get started</p>
                <ul className="space-y-2.5 mb-7 flex-1">
                  {pricingFeatures.free.map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm" style={{ color: 'var(--lp-text-muted)' }}>
                      <Check className="w-4 h-4 shrink-0" style={{ color: '#6366F1' }} />
                      {item}
                    </li>
                  ))}
                </ul>
                <button
                  className="w-full h-11 rounded-xl text-sm font-semibold transition-all"
                  style={{ border: '1px solid var(--lp-border-card)', color: 'var(--lp-text)', background: 'transparent' }}
                  onClick={() => handleCTA('free')}
                >
                  Get Started
                </button>
              </div>

              {/* Pro */}
              <div
                className="lp-animate flex flex-col p-6 relative"
                style={{ borderRadius: 20, background: '#6366F1', border: '1px solid rgba(255,255,255,0.15)', transitionDelay: '60ms' }}
              >
                <span
                  className="absolute -top-3 left-6 px-3 py-0.5 rounded-full text-xs font-semibold"
                  style={{ background: '#fff', color: '#6366F1' }}
                >
                  Most Popular
                </span>
                <h3 className="text-base font-semibold mb-1" style={{ color: '#fff' }}>Pro</h3>
                <p className="text-3xl font-bold mb-1" style={{ color: '#fff' }}>$9<span className="text-sm font-normal" style={{ color: 'rgba(255,255,255,0.6)' }}>/mo</span></p>
                <p className="text-xs mb-5" style={{ color: 'rgba(255,255,255,0.65)' }}>For serious job seekers</p>
                <ul className="space-y-2.5 mb-7 flex-1">
                  {pricingFeatures.pro.map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm" style={{ color: 'rgba(255,255,255,0.9)' }}>
                      <Check className="w-4 h-4 shrink-0" style={{ color: '#fff' }} />
                      {item}
                    </li>
                  ))}
                </ul>
                <button
                  className="w-full h-11 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: '#fff', color: '#6366F1' }}
                  onClick={() => handleCTA('pro')}
                >
                  Get Started
                </button>
              </div>

              {/* Premium */}
              <div
                className="lp-animate lp-from-right flex flex-col p-6 relative"
                style={{ borderRadius: 20, background: 'var(--lp-card)', border: '1px solid rgba(245,158,11,0.28)', transitionDelay: '120ms' }}
              >
                <span
                  className="absolute -top-3 left-6 px-3 py-0.5 rounded-full text-xs font-semibold"
                  style={{ background: '#F59E0B', color: '#fff' }}
                >
                  Power Users
                </span>
                <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--lp-text)' }}>Premium</h3>
                <p className="text-3xl font-bold mb-1" style={{ color: 'var(--lp-text)' }}>$19<span className="text-sm font-normal" style={{ color: 'var(--lp-text-muted)' }}>/mo</span></p>
                <p className="text-xs mb-5" style={{ color: 'var(--lp-text-muted)' }}>For career professionals</p>
                <ul className="space-y-2.5 mb-7 flex-1">
                  {pricingFeatures.premium.map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm" style={{ color: 'var(--lp-text-muted)' }}>
                      <Check className="w-4 h-4 shrink-0" style={{ color: '#F59E0B' }} />
                      {item}
                    </li>
                  ))}
                </ul>
                <button
                  className="w-full h-11 rounded-xl text-sm font-semibold transition-all"
                  style={{ border: '1px solid rgba(245,158,11,0.4)', color: '#F59E0B', background: 'transparent' }}
                  onClick={() => handleCTA('premium')}
                >
                  Get Started
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ─── PWA INSTALL STRIP ─── */}
        <section className="px-4 sm:px-6 py-10" style={{ background: 'var(--lp-section-alt)', borderTop: '1px solid var(--lp-border)' }}>
          <div className="max-w-xl mx-auto text-center lp-animate">
            <p className="font-semibold mb-1" style={{ color: 'var(--lp-text)' }}>Install WiseResume</p>
            <p className="text-sm mb-4" style={{ color: 'var(--lp-text-muted)' }}>Add to your home screen for a native app experience</p>
            <InstallButton />
          </div>
        </section>

        {/* ─── FINAL CTA ─── */}
        {!isAuthenticated && (
          <section className="px-4 sm:px-6 py-24 text-center" style={{ background: 'var(--lp-bg)' }}>
            <div className="max-w-2xl mx-auto lp-animate">
              <h2
                className="font-extrabold mb-4"
                style={{ fontSize: 'clamp(2rem, 4.5vw, 3.25rem)', color: 'var(--lp-text)', letterSpacing: '-0.03em', lineHeight: 1.1 }}
              >
                Ready to accelerate<br />
                <span className="lp-gradient-text">your job search?</span>
              </h2>
              <p className="mb-8" style={{ color: 'var(--lp-text-muted)', fontSize: '1.05rem' }}>
                Join thousands of professionals who've accelerated their career with WiseResume.
              </p>
              <button
                onClick={handleCTA}
                className="px-10 text-base font-semibold rounded-xl inline-flex items-center gap-2.5 transition-all"
                style={{ background: '#6366F1', color: '#fff', height: '3.25rem' }}
              >
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </button>
              <p className="mt-5 text-xs" style={{ color: 'var(--lp-text-subtle)' }}>No credit card required · Free plan forever</p>
            </div>
          </section>
        )}

        <Footer lpMode />
      </main>

      {/* Sticky CTA bar — unauthenticated only */}
      {!isAuthenticated && (
        <StickyCtaBar
          heroRef={heroRef}
          onGetStarted={handleCTA}
          onSignIn={() => { triggerHaptic.light(); kindeLogin(); }}
          lpMode
        />
      )}

      {/* Quick tailor sheet */}
      {isAuthenticated && (
        <QuickTailorSheet open={tailorOpen} onOpenChange={setTailorOpen} />
      )}
    </div>
  );
};

export default Index;
