import { useNavigate } from 'react-router-dom';
import { Sparkles, Target, Wand2, Mic, LayoutDashboard, Settings, LogOut, Globe, ArrowRight, BarChart3, PenTool, CheckCircle2, Check, User, Zap, ShieldCheck, Gift, Briefcase } from 'lucide-react';
import { Footer } from '@/components/landing/Footer';
import { PageLoadingSpinner } from '@/components/ui/PageLoadingSpinner';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import triggerHaptic from '@/lib/haptics';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { useReducedMotion } from 'framer-motion';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/safeClient';
import { QuickTailorSheet } from '@/components/landing/QuickTailorSheet';
import { InstallButton } from '@/components/pwa/InstallButton';
import { useThemeLogo } from '@/hooks/useThemeLogo';
import { FeatureTicker } from '@/components/landing/FeatureTicker';
import { StickyCtaBar } from '@/components/landing/StickyCtaBar';
import { FeatureSection, FeatureDotNav, type FeatureSectionData } from '@/components/landing/FeatureSection';

const features = [
  { icon: Sparkles, title: 'AI Resume Writing', desc: 'AI rewrites vague bullets into quantified achievements that recruiters remember.', color: 'text-indigo-600', bg: 'bg-indigo-100' },
  { icon: Target, title: 'ATS Score Analysis', desc: 'Real-time ATS match percentage against any job posting — fix gaps instantly.', color: 'text-emerald-600', bg: 'bg-emerald-100' },
  { icon: Wand2, title: 'Smart Tailoring', desc: 'Paste a job description and AI rewrites your resume to match in 30 seconds.', color: 'text-blue-600', bg: 'bg-blue-100' },
  { icon: Mic, title: 'Interview Coaching', desc: 'Real voice interview practice with AI that listens, responds, and scores you live.', color: 'text-orange-600', bg: 'bg-orange-100' },
  { icon: PenTool, title: 'Cover Letters', desc: 'Generate tailored cover letters that match your resume and the job requirements.', color: 'text-purple-600', bg: 'bg-purple-100' },
  { icon: BarChart3, title: 'Application Tracker', desc: 'Track all your job applications in one place with status updates and analytics.', color: 'text-pink-600', bg: 'bg-pink-100' },
];

const valueProps = [
  { icon: Zap, label: 'AI-Powered' },
  { icon: ShieldCheck, label: 'ATS-Optimized' },
  { icon: Gift, label: 'Free to Start' },
  { icon: Briefcase, label: 'Built for 2025' },
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
    badge: { icon: Sparkles, label: 'AI Resume Editor', color: 'bg-indigo-100 text-indigo-700' },
    bigLabel: 'Resume',
    title: 'AI-Powered Resume Writing',
    desc: 'Watch AI turn weak bullets into quantified achievements — with a live ATS score that updates as you write.',
    bullets: [
      'AI rewrites vague bullets into measurable, recruiter-ready results',
      'Live ATS score that updates with every edit',
      'One-click enhancement for any section of your resume',
    ],
    demo: 'editor',
    bandColor: 'brand',
  },
  {
    id: 'tailoring',
    direction: 'rtl',
    badge: { icon: Wand2, label: 'Smart Tailoring', color: 'bg-blue-100 text-blue-700' },
    bigLabel: 'Tailoring',
    title: 'Keyword Injection in Seconds',
    desc: 'Paste a job description and AI rewrites your resume to match in 30 seconds. See the before and after instantly.',
    bullets: [
      'Automatically matches keywords from any job description',
      'Before/after comparison shows exactly what changed',
      'Raises your ATS match score with precision',
    ],
    demo: 'tailoring',
    bandColor: 'beige',
  },
  {
    id: 'portfolio',
    direction: 'ltr',
    badge: { icon: Globe, label: 'Live Portfolio', color: 'bg-emerald-100 text-emerald-700' },
    bigLabel: 'Portfolio',
    title: 'Public Portfolio Website',
    desc: 'Turn your resume into a beautiful personal site with themes, projects, and a shareable link — zero design skills needed.',
    bullets: [
      'Auto-synced from your resume — always up to date',
      'Shareable link with a custom slug',
      'Themed layouts that update with one click',
    ],
    demo: 'portfolio',
    bandColor: 'dark',
  },
  {
    id: 'interview',
    direction: 'rtl',
    badge: { icon: Mic, label: 'Interview Coach', color: 'bg-orange-100 text-orange-700' },
    bigLabel: 'Interview',
    title: 'AI Interview Practice',
    desc: 'Get scored on real interview questions with AI feedback on every answer. Practice any role, any industry.',
    bullets: [
      'Real-time voice recognition — just speak naturally',
      'AI scores each answer and gives specific tips',
      'Practice any industry, role, or question type',
    ],
    demo: 'interview',
    bandColor: 'tint',
  },
  {
    id: 'tracker',
    direction: 'ltr',
    badge: { icon: BarChart3, label: 'Application Tracker', color: 'bg-pink-100 text-pink-700' },
    bigLabel: 'Tracker',
    title: 'Kanban Job Tracker',
    desc: 'Visualize every application at a glance. Drag cards across your pipeline and never lose track of an opportunity.',
    bullets: [
      'Kanban board with drag-and-drop pipeline stages',
      'Status history so you always know where things stand',
      'Analytics show your application funnel at a glance',
    ],
    demo: 'tracker',
    bandColor: 'brand',
  },
];

const FEATURE_IDS = featureSections.map((s) => s.id);

const TYPEWRITER_PHRASES = [
  'more job interviews.',
  'your dream career.',
  'a standout portfolio.',
  'the offer you deserve.',
  'AI-optimized resumes.',
];

const STAT_PILLS = [
  { icon: Target, countId: 'ats' as const, suffix: '/100', label: 'ATS Score' },
  { icon: Sparkles, countId: null, suffix: null, label: 'AI-Powered' },
  { icon: Zap, countId: 'resumes' as const, suffix: 'k+', label: 'Resumes Built' },
  { icon: Mic, countId: null, suffix: null, label: 'Interview Coach' },
];

function useTypewriter(phrases: string[]) {
  const [displayed, setDisplayed] = useState('');
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [phase, setPhase] = useState<'typing' | 'erasing'>('typing');

  useEffect(() => {
    const current = phrases[phraseIdx];
    if (phase === 'typing') {
      if (charIdx < current.length) {
        const t = setTimeout(() => {
          setDisplayed(current.slice(0, charIdx + 1));
          setCharIdx((i) => i + 1);
        }, 55);
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => setPhase('erasing'), 1600);
        return () => clearTimeout(t);
      }
    } else {
      if (charIdx > 0) {
        const t = setTimeout(() => {
          setCharIdx((i) => i - 1);
          setDisplayed(current.slice(0, charIdx - 1));
        }, Math.max(20, 400 / current.length));
        return () => clearTimeout(t);
      } else {
        setPhraseIdx((i) => (i + 1) % phrases.length);
        setCharIdx(0);
        setDisplayed('');
        setPhase('typing');
      }
    }
  }, [phase, charIdx, phraseIdx, phrases]);

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
          if (entry.isIntersecting) {
            entry.target.classList.add('lp-visible');
          }
        });
      },
      { threshold: 0, rootMargin: '0px 0px -60px 0px' }
    );

    const observe = () => {
      document.querySelectorAll('.lp-animate:not(.lp-visible)').forEach((el) => {
        if (!markIfVisible(el)) observer.observe(el);
      });
    };

    observe();
    const t = setInterval(observe, 500);
    return () => {
      observer.disconnect();
      clearInterval(t);
    };
  }, []);
}

function useStatCounters() {
  const [ats, setAts] = useState(0);
  const [resumes, setResumes] = useState(0);
  const pillsRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    let raf: number | null = null;
    const startCount = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      const duration = 1400;
      const startTime = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setAts(Math.round(eased * 92));
        setResumes(Math.round(eased * 12));
        if (p < 1) { raf = requestAnimationFrame(tick); }
      };
      raf = requestAnimationFrame(tick);
    };

    const cleanup = () => { if (raf !== null) cancelAnimationFrame(raf); };

    const el = pillsRef.current;
    if (!el) { startCount(); return cleanup; }

    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) {
      startCount();
      return cleanup;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { startCount(); observer.disconnect(); }
      },
      { threshold: 0 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cleanup();
    };
  }, []);

  return { ats, resumes, pillsRef };
}

function ResumeScoreCard() {
  const rings = [
    { label: 'Work Experience', pct: 88 },
    { label: 'Keywords Match', pct: 94 },
    { label: 'Skills Section', pct: 76 },
  ];
  const circumference = 2 * Math.PI * 22;
  return (
    <div
      style={{
        width: 300,
        borderRadius: 20,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.10)',
        padding: '20px 22px',
        backdropFilter: 'blur(12px)',
        animation: 'lp-float 4.5s ease-in-out infinite',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <div style={{ position: 'relative', width: 54, height: 54, flexShrink: 0 }}>
          <svg width="54" height="54" viewBox="0 0 54 54" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="27" cy="27" r="22" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
            <circle
              cx="27" cy="27" r="22" fill="none" stroke="#6366F1" strokeWidth="4"
              strokeDasharray={`${circumference * 0.92} ${circumference}`}
              strokeLinecap="round"
            />
          </svg>
          <span style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 800, color: '#818CF8',
          }}>92</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)', marginBottom: 2, letterSpacing: '0.05em', textTransform: 'uppercase' }}>ATS Score</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 0 }}>Excellent</p>
        </div>
        <span style={{
          fontSize: 10, padding: '3px 9px', borderRadius: 100, flexShrink: 0,
          background: 'rgba(16,185,129,0.15)', color: '#34D399',
          border: '1px solid rgba(16,185,129,0.25)', fontWeight: 600,
        }}>↑ +12</span>
      </div>
      {rings.map(({ label, pct }) => (
        <div key={label} style={{ marginBottom: 11 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.48)' }}>{label}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#818CF8' }}>{pct}%</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)' }}>
            <div style={{ height: '100%', borderRadius: 2, width: `${pct}%`, background: 'linear-gradient(90deg, #6366F1, #818CF8)' }} />
          </div>
        </div>
      ))}
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
  const progressRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [tailorOpen, setTailorOpen] = useState(false);
  const [headlineVisible, setHeadlineVisible] = useState(false);
  const [ctaPulse, setCtaPulse] = useState(false);

  const typewriterText = useTypewriter(TYPEWRITER_PHRASES);
  const { ats, resumes, pillsRef } = useStatCounters();
  useScrollAnimation();

  const headlineWords = useMemo(() => [
    { text: 'Land', gradient: false },
    { text: 'your', gradient: false },
    { text: 'dream', gradient: true },
    { text: 'job', gradient: true },
  ], []);

  useEffect(() => {
    const t1 = setTimeout(() => setHeadlineVisible(true), 150);
    const t2 = setTimeout(() => setCtaPulse(true), 1600);
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
        if (glowRef.current) {
          glowRef.current.style.transform = `translateX(-50%) translateY(${lastY * 0.18}px)`;
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

  if (authLoading) {
    return <PageLoadingSpinner />;
  }

  return (
    <div
      className="lp-root min-h-screen"
      data-theme="landing"
      style={{ colorScheme: 'light' }}
    >
      <style>{`
        .lp-root {
          --lp-bg: #F5F0EB;
          --lp-brand: #4F46E5;
          --lp-brand-dark: #3730A3;
          --lp-brand-tint: #EEF2FF;
          --lp-card-white: #FFFFFF;
          --lp-card-muted: #EDE8E3;
          --lp-card-dark: #1A1A2E;
          --lp-text: #1A1A2E;
          --lp-text-muted: #6B6670;
          --lp-beige: #E8E0D6;
          --lp-hero-bg: #0D0F14;
          background: var(--lp-bg);
          color: var(--lp-text);
        }
        .lp-root * { font-style: normal !important; }

        /* Headline word entrance */
        .lp-word {
          display: inline-block;
          opacity: 0;
          transform: translateY(22px);
          transition: opacity 0.55s ease, transform 0.55s ease;
        }
        .lp-word.lp-word-visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* Scroll animations — 600ms cubic-bezier */
        .lp-animate {
          opacity: 0;
          transform: translateY(32px);
          transition: opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1), transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .lp-animate.lp-visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* CTA pulse — starts at 1600ms after mount */
        @keyframes lp-pulse {
          0%, 100% { box-shadow: 0 4px 14px -2px rgba(79, 70, 229, 0.3); }
          50% { box-shadow: 0 4px 28px 4px rgba(79, 70, 229, 0.6); }
        }
        .lp-cta-pulse {
          animation: lp-pulse 2.8s ease-in-out infinite;
        }

        /* Header scrolled style */
        .lp-header-scrolled {
          background: rgba(245, 240, 235, 0.88) !important;
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(26,26,46,0.1);
          box-shadow: 0 1px 8px rgba(26,26,46,0.06);
        }

        /* Separator */
        .lp-separator {
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, rgba(79,70,229,0.35) 25%, rgba(79,70,229,0.55) 50%, rgba(79,70,229,0.35) 75%, transparent 100%);
          box-shadow: 0 0 10px 1px rgba(79,70,229,0.15);
        }

        /* Typewriter cursor */
        .lp-cursor {
          display: inline-block;
          width: 2px;
          height: 0.8em;
          background: #818CF8;
          margin-left: 2px;
          vertical-align: middle;
          animation: lp-blink 1s step-end infinite;
        }
        @keyframes lp-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        /* Scroll arrow bounce */
        @keyframes lp-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(6px); }
        }

        /* Hero entrance animations — time-delay stagger, no scroll required */
        @keyframes lp-hero-in {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .lp-hero-badge      { animation: lp-hero-in 0.55s cubic-bezier(0.22,1,0.36,1) 0.05s both; }
        .lp-hero-typewriter { animation: lp-hero-in 0.55s cubic-bezier(0.22,1,0.36,1) 0.35s both; }
        .lp-hero-body       { animation: lp-hero-in 0.55s cubic-bezier(0.22,1,0.36,1) 0.50s both; }
        .lp-hero-cta        { animation: lp-hero-in 0.55s cubic-bezier(0.22,1,0.36,1) 0.65s both; }
        .lp-hero-trust      { animation: lp-hero-in 0.50s cubic-bezier(0.22,1,0.36,1) 0.80s both; }
        .lp-hero-pills      { animation: lp-hero-in 0.50s cubic-bezier(0.22,1,0.36,1) 0.94s both; }
        .lp-hero-card       { animation: lp-hero-in 0.55s cubic-bezier(0.22,1,0.36,1) 1.08s both; }
        .lp-hero-scroll     { animation: lp-hero-in 0.40s ease 1.40s both; }

        @media (prefers-reduced-motion: reduce) {
          .lp-hero-badge,.lp-hero-typewriter,.lp-hero-body,.lp-hero-cta,.lp-hero-trust,
          .lp-hero-pills,.lp-hero-card,.lp-hero-scroll {
            animation: none; opacity: 1; transform: none;
          }
        }

        /* Directional slide modifiers — override translateY with translateX */
        .lp-animate.lp-from-left  { transform: translateX(-44px); }
        .lp-animate.lp-from-right { transform: translateX(44px); }
        .lp-animate.lp-from-left.lp-visible,
        .lp-animate.lp-from-right.lp-visible { transform: translateX(0); }

        /* Float for hero product card */
        @keyframes lp-float {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-9px); }
        }

        /* Feature grid card hover lift */
        .lp-feature-card {
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .lp-feature-card:hover {
          transform: translateY(-5px) !important;
          box-shadow: 0 10px 36px rgba(26,26,46,0.14) !important;
        }

        /* Section accent underline */
        .lp-section-accent {
          display: block;
          width: 44px;
          height: 3px;
          border-radius: 2px;
          background: linear-gradient(90deg, #6366F1, #A78BFA);
          margin: 10px auto 0;
        }

        /* Stronger separator */
        .lp-separator {
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.5) 25%, rgba(99,102,241,0.7) 50%, rgba(99,102,241,0.5) 75%, transparent 100%);
          box-shadow: 0 0 14px 2px rgba(99,102,241,0.18);
        }
      `}</style>

      <a
        href="#landing-main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:rounded-md focus:m-2"
        style={{ background: 'var(--lp-brand)', color: '#fff' }}
      >
        Skip to content
      </a>

      <div className="fixed top-0 left-0 right-0 h-[2px] z-[60] pointer-events-none" style={{ display: 'none' }}>
        <div ref={progressRef} className="h-full transition-[width] duration-75 ease-out" style={{ background: 'var(--lp-brand)' }} />
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
            <span className="font-display font-bold text-sm" style={{ color: scrolled ? 'var(--lp-text)' : '#fff' }}>WiseResume</span>
          </button>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="touch-manipulation active:scale-95 transition-transform" aria-label="Account menu">
                    <Avatar className="h-8 w-8" style={{ border: '1px solid rgba(26,26,46,0.15)' }}>
                      <AvatarImage src={profile?.avatarUrl ?? undefined} />
                      <AvatarFallback className="text-xs font-semibold" style={{ background: 'rgba(79,70,229,0.1)', color: 'var(--lp-brand)' }}>
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
                className="text-sm font-medium px-4 py-1.5 rounded-lg transition-all duration-300"
                style={{
                  color: scrolled ? 'var(--lp-text)' : '#fff',
                  background: scrolled ? 'rgba(26,26,46,0.07)' : 'rgba(255,255,255,0.12)',
                }}
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <main id="landing-main" className="w-full">
        {/* Hero Section */}
        <section
          ref={heroRef}
          className="relative flex flex-col items-center text-center px-4 sm:px-6 pt-[calc(7rem+env(safe-area-inset-top))] pb-20 sm:pb-28 overflow-hidden"
          style={{ minHeight: '86vh', background: '#0D0F14' }}
        >
          {/* Indigo radial glow — parallaxes on scroll via glowRef */}
          <div
            ref={glowRef}
            aria-hidden="true"
            className="pointer-events-none absolute"
            style={{
              top: '-15%',
              left: '50%',
              transform: 'translateX(-50%) translateY(0)',
              width: '90%',
              maxWidth: 800,
              height: '65%',
              background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.26) 0%, rgba(79,70,229,0.12) 45%, transparent 72%)',
              filter: 'blur(48px)',
            }}
          />

          {/* Category label */}
          <div className="relative z-10 mb-6 lp-hero-badge">
            <span
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold"
              style={{
                background: 'rgba(99,102,241,0.15)',
                color: '#818CF8',
                border: '1px solid rgba(99,102,241,0.28)',
              }}
            >
              <Sparkles className="w-3 h-3" />
              AI-Powered Career Platform
            </span>
          </div>

          {/* Headline — word-by-word entrance, gradient on "dream job" */}
          <h1
            className="relative z-10 font-extrabold leading-[1.05] mb-5 max-w-4xl"
            style={{ fontSize: 'clamp(40px, 5.5vw, 76px)', color: '#fff', letterSpacing: '-0.03em' }}
          >
            {headlineWords.map((word, i) => (
              <span key={i} style={{ display: 'inline-block', marginRight: '0.25em' }}>
                <span
                  className={`lp-word ${headlineVisible && !prefersReducedMotion ? 'lp-word-visible' : prefersReducedMotion ? 'lp-word-visible' : ''}`}
                  style={{
                    transitionDelay: `${150 + i * 80}ms`,
                    ...(word.gradient ? {
                      background: 'linear-gradient(135deg, #818CF8 0%, #6366F1 50%, #A78BFA 100%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      color: 'transparent',
                    } : {}),
                  }}
                >
                  {word.text}
                </span>
              </span>
            ))}
          </h1>

          {/* Typewriter subheadline */}
          <p
            className="relative z-10 mb-3 lp-hero-typewriter"
            style={{ fontSize: '1.15rem', lineHeight: 1.65, color: 'rgba(255,255,255,0.62)', maxWidth: 520 }}
          >
            AI tools to help you land{' '}
            <span style={{ color: '#818CF8', fontWeight: 600 }}>
              {typewriterText}
              <span className="lp-cursor" aria-hidden="true" />
            </span>
          </p>

          {/* Body text */}
          <p
            className="relative z-10 mb-9 lp-hero-body"
            style={{ fontSize: '0.97rem', lineHeight: 1.65, color: 'rgba(255,255,255,0.48)', maxWidth: 440 }}
          >
            Build, tailor, and optimise your resume with AI. Practice interviews, track applications, and launch your portfolio — all in one place.
          </p>

          {/* CTA */}
          <div className="relative z-10 w-full flex flex-col items-center gap-4 lp-hero-cta">
            {isAuthenticated ? (
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                <button
                  onClick={() => { triggerHaptic.light(); navigate('/dashboard'); }}
                  className="h-12 px-6 text-base font-semibold rounded-xl flex items-center justify-center gap-2 transition-all"
                  style={{ background: '#4F46E5', color: '#fff', flex: 1 }}
                >
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { triggerHaptic.light(); setTailorOpen(true); }}
                  className="h-12 px-6 text-base font-semibold rounded-xl flex items-center justify-center gap-2 transition-all"
                  style={{ background: 'rgba(255,255,255,0.07)', color: '#818CF8', border: '1.5px solid rgba(99,102,241,0.28)', flex: 1 }}
                >
                  <Sparkles className="w-4 h-4" />
                  Quick Tailor
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                <button
                  onClick={handleCTA}
                  className={`h-12 px-6 text-base font-semibold rounded-xl flex items-center justify-center gap-2 transition-all ${ctaPulse ? 'lp-cta-pulse' : ''}`}
                  style={{ background: '#4F46E5', color: '#fff', flex: 1 }}
                >
                  Get Started Free
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { triggerHaptic.light(); kindeLogin(); }}
                  className="h-12 px-6 text-base font-semibold rounded-xl flex items-center justify-center gap-2 transition-all"
                  style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.82)', border: '1.5px solid rgba(255,255,255,0.13)', flex: 1 }}
                >
                  Sign In
                </button>
              </div>
            )}
          </div>

          {/* Trust badges */}
          <div className="relative z-10 mt-5 flex items-center gap-4 sm:gap-6 text-sm flex-wrap justify-center lp-hero-trust">
            {['Free to start', 'No credit card', 'AI-powered'].map((item) => (
              <span key={item} className="flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.42)' }}>
                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#6366F1' }} />
                {item}
              </span>
            ))}
          </div>

          {/* Stat pills — fully contained, no overflow */}
          <div ref={pillsRef} className="relative z-10 flex flex-wrap items-center justify-center gap-2.5 mt-8 lp-hero-pills">
            {STAT_PILLS.map(({ icon: Icon, countId, suffix, label }) => {
              const animatedCount = countId === 'ats' ? ats : countId === 'resumes' ? resumes : null;
              const displayPrefix = animatedCount !== null ? `${animatedCount}${suffix}` : null;
              return (
                <div
                  key={label}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-full"
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.11)',
                  }}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#818CF8' }} />
                  <span className="text-xs font-medium whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.72)' }}>
                    {displayPrefix && (
                      <span style={{ color: '#818CF8', fontWeight: 700 }}>{displayPrefix} </span>
                    )}
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Floating product preview card — desktop only */}
          <div className="relative z-10 mt-8 lp-hero-card hidden sm:block">
            <ResumeScoreCard />
          </div>

          {/* Scroll arrow */}
          <div className="relative z-10 mt-8 flex flex-col items-center gap-1.5 lp-hero-scroll" style={{ color: 'rgba(255,255,255,0.22)' }}>
            <span className="text-xs tracking-widest uppercase">Scroll to explore</span>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" style={{ animation: 'lp-bounce 1.6s ease-in-out infinite' }}>
              <path d="M9 3v12M4 10l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </section>

        {/* Feature Ticker */}
        <FeatureTicker lpMode />

        {/* Separator */}
        <div className="lp-separator mx-4 sm:mx-6 mb-12" aria-hidden="true" />

        {/* Value Props */}
        <section className="px-4 sm:px-6 pb-16 max-w-6xl mx-auto">
          <div className="flex items-center justify-center gap-3 sm:gap-6 flex-wrap lp-animate">
            {valueProps.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full"
                style={{ border: '1px solid rgba(26,26,46,0.12)', background: 'var(--lp-card-white)' }}
              >
                <Icon className="w-4 h-4" style={{ color: 'var(--lp-brand)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--lp-text)' }}>{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Section heading */}
        <div className="text-center px-4 sm:px-6 mb-6 max-w-6xl mx-auto lp-animate">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: 'var(--lp-text)', letterSpacing: '-0.02em' }}>
            See it in action
          </h2>
          <span className="lp-section-accent" aria-hidden="true" />
          <p style={{ color: 'var(--lp-text-muted)' }} className="max-w-md mx-auto mt-3">
            Five powerful features, one seamless platform
          </p>
        </div>

        {/* Alternating Feature Band Sections */}
        {featureSections.map((section) => (
          <FeatureSection key={section.id} data={section} />
        ))}

        {/* Features grid */}
        <section className="px-4 sm:px-6 py-20" style={{ background: 'var(--lp-beige)' }}>
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12 lp-animate">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2" style={{ color: 'var(--lp-text)', letterSpacing: '-0.02em' }}>
                Everything you need
              </h2>
              <p style={{ color: 'var(--lp-text-muted)' }} className="max-w-md mx-auto">
                One platform for your entire job search
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
              {features.map((f, i) => (
                <div
                  key={f.title}
                  className="flex items-start gap-4 p-5 lp-animate lp-feature-card"
                  style={{
                    borderRadius: 20,
                    background: 'var(--lp-card-white)',
                    boxShadow: '0 2px 16px rgba(26,26,46,0.06)',
                    transitionDelay: `${i * 60}ms`,
                  }}
                >
                  <div className={`w-11 h-11 rounded-xl ${f.bg} flex items-center justify-center shrink-0`}>
                    <f.icon className={`w-5 h-5 ${f.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base mb-1" style={{ color: 'var(--lp-text)' }}>{f.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--lp-text-muted)' }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="px-4 sm:px-6 py-20" style={{ background: 'var(--lp-card-dark)' }}>
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10 lp-animate">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2" style={{ color: '#fff', letterSpacing: '-0.02em' }}>
                Simple pricing
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.6)' }} className="max-w-md mx-auto">
                Start free, upgrade when you need more
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
              {/* Free */}
              <div
                className="lp-animate flex flex-col p-6"
                style={{ borderRadius: 24, background: 'rgba(255,255,255,0.07)', transitionDelay: '0ms' }}
              >
                <h3 className="text-base font-semibold mb-1" style={{ color: '#fff' }}>Free</h3>
                <p className="text-3xl font-bold mb-1" style={{ color: '#fff' }}>$0<span className="text-sm font-normal" style={{ color: 'rgba(255,255,255,0.5)' }}>/mo</span></p>
                <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.55)' }}>Perfect to get started</p>
                <ul className="space-y-2.5 mb-7 flex-1">
                  {pricingFeatures.free.map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>
                      <Check className="w-4 h-4 shrink-0" style={{ color: 'var(--lp-brand)' }} />
                      {item}
                    </li>
                  ))}
                </ul>
                <button
                  className="w-full h-11 rounded-xl text-sm font-semibold transition-all"
                  style={{ border: '1.5px solid rgba(255,255,255,0.2)', color: '#fff', background: 'transparent' }}
                  onClick={() => handleCTA('free')}
                  aria-label="Get started with the Free plan"
                >
                  Get Started
                </button>
              </div>

              {/* Pro */}
              <div
                className="lp-animate flex flex-col p-6 relative"
                style={{ borderRadius: 24, background: 'var(--lp-brand)', transitionDelay: '60ms' }}
              >
                <span
                  className="absolute -top-3 left-6 px-3 py-0.5 rounded-full text-xs font-semibold"
                  style={{ background: '#fff', color: 'var(--lp-brand)' }}
                >
                  Most Popular
                </span>
                <h3 className="text-base font-semibold mb-1" style={{ color: '#fff' }}>Pro</h3>
                <p className="text-3xl font-bold mb-1" style={{ color: '#fff' }}>$9<span className="text-sm font-normal" style={{ color: 'rgba(255,255,255,0.6)' }}>/mo</span></p>
                <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.65)' }}>For serious job seekers</p>
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
                  style={{ background: '#fff', color: 'var(--lp-brand)' }}
                  onClick={() => handleCTA('pro')}
                  aria-label="Get started with the Pro plan"
                >
                  Get Started
                </button>
              </div>

              {/* Premium */}
              <div
                className="lp-animate flex flex-col p-6 relative"
                style={{ borderRadius: 24, background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(245,158,11,0.35)', transitionDelay: '120ms' }}
              >
                <span
                  className="absolute -top-3 left-6 px-3 py-0.5 rounded-full text-xs font-semibold"
                  style={{ background: '#F59E0B', color: '#fff' }}
                >
                  Power Users
                </span>
                <h3 className="text-base font-semibold mb-1" style={{ color: '#fff' }}>Premium</h3>
                <p className="text-3xl font-bold mb-1" style={{ color: '#fff' }}>$19<span className="text-sm font-normal" style={{ color: 'rgba(255,255,255,0.5)' }}>/mo</span></p>
                <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.55)' }}>For career professionals</p>
                <ul className="space-y-2.5 mb-7 flex-1">
                  {pricingFeatures.premium.map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>
                      <Check className="w-4 h-4 shrink-0" style={{ color: '#F59E0B' }} />
                      {item}
                    </li>
                  ))}
                </ul>
                <button
                  className="w-full h-11 rounded-xl text-sm font-semibold transition-all"
                  style={{ border: '1.5px solid rgba(245,158,11,0.45)', color: '#F59E0B', background: 'transparent' }}
                  onClick={() => handleCTA('premium')}
                  aria-label="Get started with the Premium plan"
                >
                  Get Started
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Install CTA */}
        <section className="px-4 sm:px-6 py-16" style={{ background: 'var(--lp-bg)' }}>
          <div className="max-w-6xl mx-auto">
            <div
              className="flex flex-col sm:flex-row items-center gap-5 p-6 max-w-lg mx-auto lp-animate"
              style={{ borderRadius: 20, background: 'var(--lp-card-white)', boxShadow: '0 2px 16px rgba(26,26,46,0.07)', border: '1px solid rgba(26,26,46,0.08)' }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(79,70,229,0.1)' }}>
                <Sparkles className="w-6 h-6" style={{ color: 'var(--lp-brand)' }} />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-base font-semibold mb-0.5" style={{ color: 'var(--lp-text)' }}>Get the App</h3>
                <p className="text-sm" style={{ color: 'var(--lp-text-muted)' }}>
                  Install WiseResume for quick access — works like a native app.
                </p>
              </div>
              <InstallButton className="w-full sm:w-auto" />
            </div>
          </div>
        </section>

        {/* Final CTA */}
        {!isAuthenticated && (
          <section className="px-4 sm:px-6 pb-0" style={{ background: 'var(--lp-brand-tint)' }}>
            <div className="max-w-6xl mx-auto flex flex-col items-center text-center gap-5 max-w-lg mx-auto py-20 lp-animate">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--lp-text)', letterSpacing: '-0.02em' }}>
                Ready to land your dream job?
              </h2>
              <p className="text-base" style={{ color: 'var(--lp-text-muted)' }}>
                Your next opportunity is waiting — start building a resume that gets noticed.
              </p>
              <button
                onClick={handleCTA}
                className="h-12 px-8 text-base font-semibold rounded-xl flex items-center gap-2 lp-cta-pulse"
                style={{ background: 'var(--lp-brand)', color: '#fff' }}
              >
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </section>
        )}

        <Footer lpMode />
      </main>

      {/* Dot navigation */}
      <FeatureDotNav sectionIds={FEATURE_IDS} />

      {/* Sticky bottom CTA bar */}
      {!isAuthenticated && (
        <StickyCtaBar
          heroRef={heroRef}
          onGetStarted={handleCTA}
          onSignIn={() => { triggerHaptic.light(); kindeLogin(); }}
          lpMode
        />
      )}

      <QuickTailorSheet open={tailorOpen} onOpenChange={setTailorOpen} />
    </div>
  );
};

export default Index;
