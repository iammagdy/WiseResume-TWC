import { useNavigate } from 'react-router-dom';
import { Sparkles, Target, Wand2, Mic, LayoutDashboard, Settings, LogOut, Globe, ArrowRight, FileText, BarChart3, PenTool, CheckCircle2, Check, User, Zap, ShieldCheck, Gift, Briefcase } from 'lucide-react';
import { Footer } from '@/components/landing/Footer';
import { PageLoadingSpinner } from '@/components/ui/PageLoadingSpinner';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import triggerHaptic from '@/lib/haptics';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { motion, useReducedMotion, type Easing } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/safeClient';
import { QuickTailorSheet } from '@/components/landing/QuickTailorSheet';
import { useTheme } from '@/hooks/use-theme';
import { InstallButton } from '@/components/pwa/InstallButton';
import { useThemeLogo } from '@/hooks/useThemeLogo';
import { Sun, Moon } from 'lucide-react';
import { FeatureTicker } from '@/components/landing/FeatureTicker';
import { StickyCtaBar } from '@/components/landing/StickyCtaBar';
import { FeatureSection, FeatureDotNav, type FeatureSectionData } from '@/components/landing/FeatureSection';

const features = [
  { icon: Sparkles, title: 'AI Resume Writing', desc: 'AI rewrites vague bullets into quantified achievements that recruiters remember.', color: 'text-primary', bg: 'bg-primary/10' },
  { icon: Target, title: 'ATS Score Analysis', desc: 'Real-time ATS match percentage against any job posting — fix gaps instantly.', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
  { icon: Wand2, title: 'Smart Tailoring', desc: 'Paste a job description and AI rewrites your resume to match in 30 seconds.', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
  { icon: Mic, title: 'Interview Coaching', desc: 'Real voice interview practice with AI that listens, responds, and scores you live.', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10' },
  { icon: PenTool, title: 'Cover Letters', desc: 'Generate tailored cover letters that match your resume and the job requirements.', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10' },
  { icon: BarChart3, title: 'Application Tracker', desc: 'Track all your job applications in one place with status updates and analytics.', color: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-500/10' },
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
    badge: { icon: Sparkles, label: 'AI Resume Editor', color: 'bg-primary/10 text-primary' },
    bigLabel: 'Resume',
    title: 'AI-Powered Resume Writing',
    desc: 'Watch AI turn weak bullets into quantified achievements — with a live ATS score that updates as you write.',
    bullets: [
      'AI rewrites vague bullets into measurable, recruiter-ready results',
      'Live ATS score that updates with every edit',
      'One-click enhancement for any section of your resume',
    ],
    demo: 'editor',
  },
  {
    id: 'tailoring',
    direction: 'rtl',
    badge: { icon: Wand2, label: 'Smart Tailoring', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    bigLabel: 'Tailoring',
    title: 'Keyword Injection in Seconds',
    desc: 'Paste a job description and AI rewrites your resume to match in 30 seconds. See the before and after instantly.',
    bullets: [
      'Automatically matches keywords from any job description',
      'Before/after comparison shows exactly what changed',
      'Raises your ATS match score with precision',
    ],
    demo: 'tailoring',
  },
  {
    id: 'portfolio',
    direction: 'ltr',
    badge: { icon: Globe, label: 'Live Portfolio', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    bigLabel: 'Portfolio',
    title: 'Public Portfolio Website',
    desc: 'Turn your resume into a beautiful personal site with themes, projects, and a shareable link — zero design skills needed.',
    bullets: [
      'Auto-synced from your resume — always up to date',
      'Shareable link with a custom slug',
      'Themed layouts that update with one click',
    ],
    demo: 'portfolio',
  },
  {
    id: 'interview',
    direction: 'rtl',
    badge: { icon: Mic, label: 'Interview Coach', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
    bigLabel: 'Interview',
    title: 'AI Interview Practice',
    desc: 'Get scored on real interview questions with AI feedback on every answer. Practice any role, any industry.',
    bullets: [
      'Real-time voice recognition — just speak naturally',
      'AI scores each answer and gives specific tips',
      'Practice any industry, role, or question type',
    ],
    demo: 'interview',
  },
  {
    id: 'tracker',
    direction: 'ltr',
    badge: { icon: BarChart3, label: 'Application Tracker', color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400' },
    bigLabel: 'Tracker',
    title: 'Kanban Job Tracker',
    desc: 'Visualize every application at a glance. Drag cards across your pipeline and never lose track of an opportunity.',
    bullets: [
      'Kanban board with drag-and-drop pipeline stages',
      'Status history so you always know where things stand',
      'Analytics show your application funnel at a glance',
    ],
    demo: 'tracker',
  },
];

const FEATURE_IDS = featureSections.map((s) => s.id);

const Index = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, signOut } = useAuth();
  const { profile } = useProfile(isAuthenticated ? user?.id : undefined, user);
  const prefersReducedMotion = useReducedMotion();
  const themeLogo = useThemeLogo();
  const { isDark, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [tailorOpen, setTailorOpen] = useState(false);

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
    const onScroll = () => {
      setScrolled(window.scrollY > 80);
      if (progressRef.current) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const pct = max > 0 ? window.scrollY / max * 100 : 0;
        progressRef.current.style.width = `${pct}%`;
        const parent = progressRef.current.parentElement;
        if (parent) parent.style.display = pct > 0 ? '' : 'none';
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const getInitials = () => {
    if (profile?.fullName) {
      const parts = profile.fullName.trim().split(/\s+/);
      return (parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '');
    }
    if (user?.email) return user.email[0].toUpperCase();
    return null;
  };

  const fade = (delay: number) =>
    prefersReducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 20 } as const,
          animate: { opacity: 1, y: 0 } as const,
          transition: { delay, duration: 0.5, ease: 'easeOut' as Easing },
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
    <div className="min-h-screen bg-background">
      <a
        href="#landing-main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:m-2"
      >
        Skip to content
      </a>

      {/* Background: deep gradient with floating blobs */}
      <div
        className="fixed inset-0 -z-10 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute inset-0 hero-gradient-bg" />
        <div className="hero-blob hero-blob-1" />
        <div className="hero-blob hero-blob-2" />
        <div className="hero-blob hero-blob-3" />
      </div>

      <div className="fixed top-0 left-0 right-0 h-[2px] z-[60] pointer-events-none" style={{ display: 'none' }}>
        <div ref={progressRef} className="h-full bg-primary transition-[width] duration-75 ease-out" />
      </div>

      {/* Sticky Header — backdrop-blur on scroll */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-background/80 backdrop-blur-md border-b border-border shadow-soft-sm'
            : 'bg-transparent'
        }`}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 h-14 max-w-6xl mx-auto">
          <button
            onClick={() => { triggerHaptic.light(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="flex items-center gap-2.5 touch-manipulation"
            aria-label="WiseResume – scroll to top"
          >
            <img alt="WiseResume" loading="lazy" className="w-8 h-8 object-contain rounded-lg" src={themeLogo} />
            <span className="font-display font-bold text-sm text-foreground">WiseResume</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="relative flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <Sun
                className={`w-4 h-4 absolute transition-all duration-200 ${isDark ? 'opacity-100 rotate-0' : 'opacity-0 rotate-90'}`}
              />
              <Moon
                className={`w-4 h-4 absolute transition-all duration-200 ${isDark ? 'opacity-0 -rotate-90' : 'opacity-100 rotate-0'}`}
              />
            </button>

            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="touch-manipulation active:scale-95 transition-transform" aria-label="Account menu">
                    <Avatar className="h-8 w-8 border border-border">
                      <AvatarImage src={profile?.avatarUrl ?? undefined} />
                      <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { triggerHaptic.light(); kindeLogin(); }}
                className="text-sm font-medium"
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      <main id="landing-main" className="max-w-6xl mx-auto w-full">
        {/* Hero Section */}
        <section
          ref={heroRef}
          className="flex flex-col items-center text-center px-4 sm:px-6 pt-[calc(7rem+env(safe-area-inset-top))] pb-12 sm:pb-16 relative"
        >
          <motion.div className="mb-6" {...fade(0)}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
              <Sparkles className="w-3 h-3" />
              AI-Powered Career Platform
            </span>
          </motion.div>

          <motion.h1
            className="text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground leading-[1.05] tracking-tight mb-5 max-w-3xl"
            {...fade(0.08)}
          >
            Land your dream job with a{' '}
            <span className="gradient-text">perfect resume</span>
          </motion.h1>

          <motion.p
            className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-lg leading-relaxed"
            {...fade(0.14)}
          >
            Build, tailor, and optimize your resume with AI. Practice interviews, track applications, and create your portfolio — all in one place.
          </motion.p>

          <motion.div className="w-full flex flex-col items-center gap-4" {...fade(0.2)}>
            {isAuthenticated ? (
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                <Button
                  size="lg"
                  onClick={() => { triggerHaptic.light(); navigate('/dashboard'); }}
                  className="h-12 text-base font-semibold rounded-xl flex-1"
                >
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => { triggerHaptic.light(); setTailorOpen(true); }}
                  className="h-12 text-base font-semibold rounded-xl flex-1"
                >
                  <Sparkles className="w-4 h-4 mr-2 text-primary" />
                  Quick Tailor
                </Button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                <Button
                  size="lg"
                  onClick={handleCTA}
                  className="h-12 text-base font-semibold rounded-xl flex-1 shadow-soft-lg cta-glow-pulse"
                >
                  Get Started Free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => { triggerHaptic.light(); kindeLogin(); }}
                  className="h-12 text-base font-semibold rounded-xl flex-1"
                >
                  Sign In
                </Button>
              </div>
            )}
          </motion.div>

          <motion.div className="mt-5 flex items-center gap-4 sm:gap-6 text-sm text-muted-foreground flex-wrap justify-center" {...fade(0.25)}>
            {['Free to start', 'No credit card', 'AI-powered'].map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                {item}
              </span>
            ))}
          </motion.div>

          {/* Scroll to explore arrow */}
          <motion.div
            className="mt-10 flex flex-col items-center gap-1.5 text-muted-foreground/60"
            {...fade(0.35)}
          >
            <span className="text-xs tracking-widest uppercase">Scroll to explore</span>
            <motion.div
              animate={prefersReducedMotion ? {} : { y: [0, 6, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M9 3v12M4 10l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>
          </motion.div>
        </section>

        {/* Feature Ticker — looping marquee strip */}
        <FeatureTicker />

        {/* Glowing separator */}
        <div className="hero-separator mx-4 sm:mx-6 mb-12" aria-hidden="true" />

        {/* Value Props Strip — honest, no invented numbers */}
        <section className="px-4 sm:px-6 pb-16">
          <motion.div
            className="flex items-center justify-center gap-4 sm:gap-8 flex-wrap"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            {valueProps.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-border bg-card/60 backdrop-blur-sm">
                <Icon className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">{label}</span>
              </div>
            ))}
          </motion.div>
        </section>

        {/* Section heading */}
        <motion.div
          className="text-center px-4 sm:px-6 mb-4"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-2">
            See it in action
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Five powerful features, one seamless platform
          </p>
        </motion.div>

        {/* Alternating Feature Sections */}
        {featureSections.map((section) => (
          <FeatureSection key={section.id} data={section} />
        ))}

        {/* Features — Uniform 2-column grid */}
        <section className="px-4 sm:px-6 pb-20">
          <motion.div
            className="text-center mb-12"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-2">
              Everything you need
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              One platform for your entire job search
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="flex items-start gap-4 p-5 rounded-2xl border border-border bg-card shadow-soft"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-20px' }}
                transition={{ duration: 0.4, delay: i * 0.06, ease: 'easeOut' }}
              >
                <div className={`w-11 h-11 rounded-xl ${f.bg} flex items-center justify-center shrink-0`}>
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-base mb-1">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section className="px-4 sm:px-6 pb-20">
          <motion.div
            className="text-center mb-10"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-2">
              Simple pricing
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Start free, upgrade when you need more
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {/* Free */}
            <motion.div
              className="pricing-card rounded-2xl border border-border bg-card p-6 flex flex-col"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ duration: 0.4, delay: 0.04, ease: 'easeOut' }}
            >
              <h3 className="text-base font-semibold text-foreground mb-1">Free</h3>
              <p className="text-3xl font-bold text-foreground mb-1">$0<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
              <p className="text-sm text-muted-foreground mb-5">Perfect to get started</p>
              <ul className="space-y-2.5 mb-7 flex-1">
                {pricingFeatures.free.map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-foreground">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button variant="outline" size="lg" className="w-full h-11 rounded-xl" aria-label="Get started with the Free plan" onClick={() => handleCTA('free')}>
                Get Started
              </Button>
            </motion.div>

            {/* Pro — highlighted with ring */}
            <motion.div
              className="pricing-card pricing-card-pro rounded-2xl border-2 border-primary bg-card p-6 flex flex-col relative"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ duration: 0.4, delay: 0.08, ease: 'easeOut' }}
            >
              <span className="absolute -top-3 left-6 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                Most Popular
              </span>
              <h3 className="text-base font-semibold text-foreground mb-1">Pro</h3>
              <p className="text-3xl font-bold text-foreground mb-1">$9<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
              <p className="text-sm text-muted-foreground mb-5">For serious job seekers</p>
              <ul className="space-y-2.5 mb-7 flex-1">
                {pricingFeatures.pro.map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-foreground">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button size="lg" className="w-full h-11 rounded-xl" aria-label="Get started with the Pro plan" onClick={() => handleCTA('pro')}>
                Get Started
              </Button>
            </motion.div>

            {/* Premium */}
            <motion.div
              className="pricing-card rounded-2xl border border-amber-400/40 bg-card p-6 flex flex-col relative"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ duration: 0.4, delay: 0.12, ease: 'easeOut' }}
            >
              <span className="absolute -top-3 left-6 px-3 py-0.5 rounded-full bg-amber-500 text-white text-xs font-semibold">
                Power Users
              </span>
              <h3 className="text-base font-semibold text-foreground mb-1">Premium</h3>
              <p className="text-3xl font-bold text-foreground mb-1">$19<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
              <p className="text-sm text-muted-foreground mb-5">For career professionals</p>
              <ul className="space-y-2.5 mb-7 flex-1">
                {pricingFeatures.premium.map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-foreground">
                    <Check className="w-4 h-4 text-amber-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button size="lg" variant="outline" className="w-full h-11 rounded-xl border-amber-400/50 hover:bg-amber-50 dark:hover:bg-amber-950/20" aria-label="Get started with the Premium plan" onClick={() => handleCTA('premium')}>
                Get Started
              </Button>
            </motion.div>
          </div>
        </section>

        {/* Install CTA */}
        <section className="px-4 sm:px-6 pb-16">
          <motion.div
            className="flex flex-col sm:flex-row items-center gap-5 p-6 rounded-2xl border border-border bg-card max-w-lg mx-auto"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-30px' }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-base font-semibold text-foreground mb-0.5">Get the App</h3>
              <p className="text-sm text-muted-foreground">
                Install WiseResume for quick access — works like a native app.
              </p>
            </div>
            <InstallButton className="w-full sm:w-auto" />
          </motion.div>
        </section>

        {/* Final CTA */}
        {!isAuthenticated && (
          <section className="px-4 sm:px-6 pb-20">
            <motion.div
              className="flex flex-col items-center text-center gap-5 max-w-lg mx-auto"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                Ready to land your dream job?
              </h2>
              <p className="text-base text-muted-foreground">
                Your next opportunity is waiting — start building a resume that gets noticed.
              </p>
              <Button
                size="lg"
                onClick={handleCTA}
                className="h-12 text-base font-semibold rounded-xl px-8 shadow-soft-lg cta-glow-pulse"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          </section>
        )}

        <Footer />
      </main>

      {/* Dot navigation — desktop only, tracks active feature section */}
      <FeatureDotNav sectionIds={FEATURE_IDS} />

      {/* Sticky bottom CTA bar — non-authenticated users only */}
      {!isAuthenticated && (
        <StickyCtaBar
          heroRef={heroRef}
          onGetStarted={handleCTA}
          onSignIn={() => { triggerHaptic.light(); kindeLogin(); }}
        />
      )}

      <QuickTailorSheet open={tailorOpen} onOpenChange={setTailorOpen} />
    </div>
  );
};

export default Index;
