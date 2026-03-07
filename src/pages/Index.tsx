import { useNavigate } from 'react-router-dom';
import { Sparkles, Target, Wand2, Mic, User, LayoutDashboard, Settings, LogOut, LayoutGrid, Users, Globe, ArrowRight, ShieldCheck, Lock, Brain, Trash2, UserPlus, FileText, Zap, Monitor } from 'lucide-react';
import { Footer } from '@/components/landing/Footer';
import { EditorDemo } from '@/components/landing/EditorDemo';
import { SpaceBackground } from '@/components/landing/SpaceBackground';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import triggerHaptic from '@/lib/haptics';
import { motion, useReducedMotion, AnimatePresence, type Easing } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInView } from '@/hooks/useInView';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/safeClient';
import { QuickTailorSheet } from '@/components/landing/QuickTailorSheet';
import { ThemeDropdown } from '@/components/settings/ThemeDropdown';
import { InstallButton } from '@/components/pwa/InstallButton';

import logoImage from '@/assets/wise-ai-logo.webp';

const features = [
  { icon: Sparkles, title: 'Weak bullet? Fixed in 1 tap', desc: 'AI rewrites vague bullets into quantified achievements that recruiters remember', iconColor: 'text-primary', gradient: 'from-primary/20 to-primary/5' },
  { icon: Target, title: 'Know your score before they do', desc: 'Real-time ATS match percentage against any job posting — then fix it instantly', iconColor: 'text-emerald-500', gradient: 'from-emerald-500/20 to-emerald-500/5' },
  { icon: Wand2, title: 'New job, new resume — instantly', desc: 'Paste a job description and AI rewrites your entire resume to match in 30 seconds', iconColor: 'text-blue-500', gradient: 'from-blue-500/20 to-blue-500/5' },
  { icon: Mic, title: 'Practice speaking, not just writing', desc: 'Real voice interview coaching with an AI that listens, responds, and scores you live', iconColor: 'text-orange-500', gradient: 'from-orange-500/20 to-orange-500/5' },
];

const comparisons = [
  { them: 'PDF only', us: 'Live portfolio website', icon: Globe },
  { them: 'Generic AI tips', us: '4 recruiter personas', icon: Users },
  { them: 'ATS score only', us: 'AI rewrites for each job', icon: Wand2 },
  { them: 'Text practice tips', us: 'Real voice interview coach', icon: Mic },
  { them: 'Basic templates', us: '30 polished designs', icon: LayoutGrid },
];

const getBonusChips = (authenticated: boolean) => [
  { icon: LayoutGrid, label: '30 Templates', href: authenticated ? '/templates' : `/auth?redirect=${encodeURIComponent('/templates')}` },
  { icon: Users, label: '4 AI Recruiters', href: authenticated ? '/ai-studio' : `/auth?redirect=${encodeURIComponent('/ai-studio')}` },
];

// Theme colors for portfolio demo cycling (using CSS variable refs)
const THEME_ACCENTS = [
  'hsl(var(--primary))',
  'hsl(165 60% 45%)',
  'hsl(28 90% 55%)',
];

function PortfolioDemo() {
  const prefersReducedMotion = useReducedMotion();
  const [animStep, setAnimStep] = useState(prefersReducedMotion ? 5 : 0);
  const [themeIdx, setThemeIdx] = useState(0);
  const { ref: viewRef, inView } = useInView({ triggerOnce: false, rootMargin: '100px' });

  useEffect(() => {
    if (prefersReducedMotion || !inView) return;
    const delays: Record<number, number> = { 0: 300, 1: 500, 2: 500, 3: 600, 4: 3000 };
    const delay = delays[animStep] ?? 3000;
    const t = setTimeout(() => {
      setAnimStep((s) => (s >= 5 ? 0 : s + 1));
    }, delay);
    return () => clearTimeout(t);
  }, [animStep, prefersReducedMotion, inView]);

  useEffect(() => {
    if (!inView) return;
    const t = setInterval(() => setThemeIdx((i) => (i + 1) % 3), 2000);
    return () => clearInterval(t);
  }, [inView]);

  const accent = THEME_ACCENTS[themeIdx];
  const show = (step: number) => prefersReducedMotion || animStep >= step;

  return (
    <div ref={viewRef} className="flex flex-col items-center">
      <div className="w-[260px] rounded-[28px] border-2 border-border/40 bg-card/80 backdrop-blur-sm shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-2 pb-1">
          <span className="text-[10px] text-muted-foreground font-medium">9:41</span>
          <div className="flex items-center gap-1">
            <div className="w-3.5 h-2 rounded-sm border border-muted-foreground/40 relative">
              <div className="absolute inset-[1px] right-[2px] rounded-[1px] bg-muted-foreground/50" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-1.5 border-b border-border/20">
          <Globe className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
          <span className="text-[10px] text-muted-foreground/70 font-mono truncate">WiseResume/you</span>
        </div>

        <div className="px-4 py-3 min-h-[190px] space-y-2.5">
          <div className="flex items-center gap-2.5">
            <AnimatePresence>
              {show(1) && (
                <motion.div
                  key="avatar"
                  initial={prefersReducedMotion ? false : { scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-card"
                  style={{ background: accent }}
                >
                  YN
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex-1 space-y-1 min-w-0">
              <AnimatePresence>
                {show(2) && (
                  <motion.div
                    key="name"
                    initial={prefersReducedMotion ? false : { opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35 }}
                    className="h-2.5 rounded-full w-20"
                    style={{ background: accent + '55' }}
                  />
                )}
              </AnimatePresence>
              <AnimatePresence>
                {show(3) && (
                  <motion.div
                    key="badge"
                    initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-semibold text-card"
                    style={{ background: accent }}
                  >
                    Product Designer · Open to work
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="space-y-1.5">
            {['Experience', 'Skills', 'Projects'].map((label, i) => (
              <AnimatePresence key={label}>
                {show(4) && (
                  <motion.div
                    key={label}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.1 }}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 bg-muted/30 border border-border/20"
                  >
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: accent }} />
                    <span className="text-[9px] font-medium text-foreground/70">{label}</span>
                    <div className="flex-1 h-1 rounded-full bg-muted-foreground/15" />
                  </motion.div>
                )}
              </AnimatePresence>
            ))}
          </div>

          <div className="flex items-center justify-end gap-1.5 pt-1">
            <span className="text-[8px] text-muted-foreground/50 mr-0.5">Theme</span>
            {THEME_ACCENTS.map((color, i) => (
              <motion.div
                key={i}
                className="rounded-full border-2 transition-all duration-300"
                animate={{ width: i === themeIdx ? 14 : 8, height: i === themeIdx ? 14 : 8, borderColor: i === themeIdx ? color : 'transparent' }}
                transition={{ duration: 0.3 }}
                style={{ background: color, opacity: i === themeIdx ? 1 : 0.4 }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Authenticated hero — shown to users who are already logged in
// ──────────────────────────────────────────────────────────
interface AuthenticatedHeroProps {
  firstName?: string;
  navigate: ReturnType<typeof useNavigate>;
  onTailorOpen: () => void;
}

function AuthenticatedHero({ firstName, navigate, onTailorOpen }: AuthenticatedHeroProps) {
  const prefersReducedMotion = useReducedMotion();

  const quickActions = [
    {
      icon: FileText,
      label: 'My Resumes',
      sub: 'Edit or create new',
      href: '/dashboard',
      gradient: 'from-primary/20 to-primary/5',
      iconColor: 'text-primary',
    },
    {
      icon: Zap,
      label: 'Tailor to Job',
      sub: 'AI match in 30 sec',
      action: 'tailor',
      gradient: 'from-accent/20 to-accent/5',
      iconColor: 'text-accent',
    },
    {
      icon: Monitor,
      label: 'My Portfolio',
      sub: 'Build your site',
      href: '/portfolio',
      gradient: 'from-secondary/20 to-secondary/5',
      iconColor: 'text-secondary',
    },
    {
      icon: Mic,
      label: 'Interview Prep',
      sub: 'Practice speaking',
      href: '/interview',
      gradient: 'from-orange-500/20 to-orange-500/5',
      iconColor: 'text-orange-500',
    },
  ];

  const fade = (delay: number) =>
    prefersReducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 16 } as const,
          animate: { opacity: 1, y: 0 } as const,
          transition: { delay, duration: 0.5, ease: 'easeOut' as Easing },
        };

  return (
    <section className="flex flex-col items-center text-center px-4 sm:px-6 pt-[calc(4.5rem+env(safe-area-inset-top))] pb-6">
      {/* Logo */}
      <motion.div className="relative mb-5" {...fade(0)}>
        <div
          className="absolute inset-0 rounded-3xl blur-2xl opacity-40 animate-glow-pulse"
          style={{
            background: 'radial-gradient(circle, hsl(355 70% 50% / 0.5) 0%, transparent 70%)',
            width: 100,
            height: 100,
            top: -5,
            left: -5,
          }}
          aria-hidden="true"
        />
        <img
          src={logoImage}
          alt="Wise AI Logo"
          className="relative z-10 w-[90px] h-[90px] object-contain rounded-3xl"
          loading="eager"
        />
      </motion.div>

      <motion.h1
        className="text-2xl sm:text-3xl font-bold text-foreground leading-tight mb-1"
        {...fade(0.05)}
      >
        {firstName ? `Hey ${firstName} 👋` : 'Welcome back 👋'}
      </motion.h1>

      <motion.p
        className="text-sm text-muted-foreground mb-6"
        {...fade(0.1)}
      >
        What are you working on today?
      </motion.p>

      {/* 2×2 Quick-action grid */}
      <motion.div
        className="w-full max-w-xs grid grid-cols-2 gap-3"
        {...fade(0.15)}
      >
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => {
              triggerHaptic.medium();
              if (action.action === 'tailor') {
                onTailorOpen();
              } else if (action.href) {
                navigate(action.href);
              }
            }}
            className="flex flex-col items-start p-3.5 rounded-2xl border border-border/30 bg-card/60 backdrop-blur-sm text-left active:scale-[0.97] transition-all touch-manipulation hover:border-primary/30 hover:bg-card/80"
          >
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-2`}>
              <action.icon className={`w-4.5 h-4.5 ${action.iconColor}`} />
            </div>
            <p className="text-xs font-semibold text-foreground leading-tight">{action.label}</p>
            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{action.sub}</p>
          </button>
        ))}
      </motion.div>

      {/* Dashboard link */}
      <motion.button
        onClick={() => { triggerHaptic.light(); navigate('/dashboard'); }}
        className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
        {...fade(0.2)}
      >
        <LayoutDashboard className="w-3.5 h-3.5" />
        Open Full Dashboard
        <ArrowRight className="w-3 h-3" />
      </motion.button>
    </section>
  );
}

const Index = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, signOut } = useAuth();
  const { profile } = useProfile(isAuthenticated ? user?.id : undefined, user);
  const prefersReducedMotion = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [tailorOpen, setTailorOpen] = useState(false);

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
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
    }).catch(() => { });
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 120);
      if (progressRef.current) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
        progressRef.current.style.width = `${pct}%`;
        progressRef.current.parentElement!.style.display = pct > 0 ? '' : 'none';
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

  const getFirstName = () => {
    if (profile?.fullName) return profile.fullName.trim().split(/\s+/)[0];
    if (user?.email) return user.email.split('@')[0];
    return undefined;
  };

  const fade = (delay: number) =>
    prefersReducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 20 } as const,
          animate: { opacity: 1, y: 0 } as const,
          transition: { delay, duration: 0.6, ease: 'easeOut' as Easing },
        };

  const handleCTA = () => {
    triggerHaptic.medium();
    navigate('/auth');
  };

  return (
    <SpaceBackground>
      {/* Scroll progress bar */}
      <div className="fixed top-0 left-0 right-0 h-[3px] z-[60] pointer-events-none" style={{ display: 'none' }}>
        <div ref={progressRef} className="h-full bg-primary transition-[width] duration-75 ease-out" />
      </div>

      {/* Sticky Mini Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'glass-header border-b border-border/20 shadow-lg shadow-background/20' : 'bg-transparent'
        }`}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 h-12">
          <button
            onClick={() => { triggerHaptic.light(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="flex items-center gap-2 touch-manipulation"
          >
            <img src={logoImage} alt="WiseResume" loading="lazy" className="w-7 h-7 object-contain rounded-lg" />
            <span className={`font-display font-bold text-sm text-foreground transition-opacity duration-300 ${scrolled ? 'opacity-100' : 'opacity-0'}`}>
              WiseResume
            </span>
          </button>

          {isAuthenticated ? (
            <div className="flex items-center gap-1">
            <ThemeDropdown />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="touch-manipulation active:scale-95 transition-transform">
                  <Avatar className="h-8 w-8 border-2 border-primary/30">
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
            </div>
          ) : (
            /* Guest header: Log in (ghost) + Sign Up (solid) */
            <div className="flex items-center gap-1.5">
              <ThemeDropdown />
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground text-xs px-2.5 h-8 active:scale-95 transition-all"
                onClick={() => { triggerHaptic.light(); navigate('/auth?mode=login'); }}
              >
                Log in
              </Button>
              <Button
                size="sm"
                className="gap-1.5 h-8 px-3 text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all touch-manipulation"
                onClick={() => { triggerHaptic.medium(); navigate('/auth'); }}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Sign Up
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="min-h-screen pb-12 max-w-4xl mx-auto w-full">

        {/* ── AUTHENTICATED: personalized hero + install section ── */}
        {isAuthenticated ? (
          <>
            <AuthenticatedHero
              firstName={getFirstName()}
              navigate={navigate}
              onTailorOpen={() => setTailorOpen(true)}
            />

            {/* Install section */}
            <section className="px-4 sm:px-6 py-6">
              <div className="flex flex-col items-center text-center gap-4 p-6 rounded-2xl glass-surface border border-border/30 max-w-sm mx-auto">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">Get the app on your phone</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">Install WiseResume for quick access — works like a native app, no app store needed</p>
                </div>
                <InstallButton className="w-full max-w-xs" />
              </div>
            </section>

            <Footer />
          </>
        ) : (
          /* ── GUEST: full marketing landing page ── */
          <>
            {/* Hero */}
            <section className="flex flex-col items-center text-center px-4 sm:px-6 pt-[calc(5rem+env(safe-area-inset-top))] pb-6">
              <motion.div className="relative mb-6" {...fade(0)}>
                <div
                  className="absolute inset-0 rounded-3xl blur-2xl opacity-50 animate-glow-pulse"
                  style={{
                    background: 'radial-gradient(circle, hsl(355 70% 50% / 0.6) 0%, hsl(355 50% 40% / 0.3) 50%, transparent 70%)',
                    width: 140,
                    height: 140,
                    top: -10,
                    left: -10,
                  }}
                  aria-hidden="true"
                />
                <img
                  src={logoImage}
                  alt="Wise AI Logo"
                  className="relative z-10 w-[120px] h-[120px] object-contain rounded-3xl"
                  loading="eager"
                />
              </motion.div>

              <motion.h1
                className="text-fluid-2xl font-bold text-foreground leading-tight mb-3"
                {...fade(0.1)}
              >
                Build Your Dream Resume
              </motion.h1>

              <motion.p
                className="text-base text-muted-foreground mb-5 max-w-sm leading-relaxed"
                {...fade(0.15)}
              >
                The only resume app that{' '}
                <span className="text-foreground font-medium">coaches your interview</span>,{' '}
                <span className="text-foreground font-medium">scores your ATS match</span>, and{' '}
                <span className="text-foreground font-medium">builds your portfolio site</span> — all in one.
              </motion.p>

              {/* Primary CTA */}
              <motion.div className="w-full flex flex-col items-center gap-2" {...fade(0.2)}>
                <motion.div
                  className="w-full max-w-sm"
                  whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                >
                  <Button
                    size="lg"
                    className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-[0_0_24px_-4px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_32px_-4px_hsl(var(--primary)/0.7)] transition-all active:scale-[0.98] touch-manipulation"
                    onClick={handleCTA}
                  >
                    Get Started Free
                  </Button>
                </motion.div>

                {/* Already have an account */}
                <p className="text-xs text-muted-foreground">
                  Already have an account?{' '}
                  <button
                    onClick={() => { triggerHaptic.light(); navigate('/auth?mode=login'); }}
                    className="text-primary font-medium hover:underline touch-manipulation"
                  >
                    Log in →
                  </button>
                </p>
              </motion.div>

              {/* Quick Tailor CTA */}
              <motion.div className="w-full flex flex-col items-center gap-1.5 mt-3" {...fade(0.25)}>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full max-w-sm h-auto py-3 flex-col gap-0.5 border-primary/30 hover:border-primary/60 hover:bg-primary/5"
                  onClick={() => {
                    triggerHaptic.medium();
                    navigate(`/auth?redirect=${encodeURIComponent('/?tailor=1')}`);
                  }}
                >
                  <span className="flex items-center gap-2 text-base font-semibold">
                    <Wand2 className="w-4 h-4" />
                    Tailor Resume to a Job
                  </span>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    🔒 Sign up to unlock — free
                  </span>
                </Button>
              </motion.div>

              {/* Trust bar */}
              <motion.div className="mt-5 flex items-center gap-3 sm:gap-4 text-xs text-muted-foreground flex-wrap justify-center" {...fade(0.28)}>
                {[
                  { label: 'Free to start', icon: '✓' },
                  { label: 'No credit card', icon: '✓' },
                  { label: 'AI-powered', icon: '✓' },
                ].map((item, i) => (
                  <span key={item.label} className="flex items-center gap-1.5">
                    {i > 0 && <span className="w-px h-3 bg-border mr-1.5 sm:mr-2 hidden xs:inline-block" />}
                    <span className="w-4 h-4 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">{item.icon}</span>
                    {item.label}
                  </span>
                ))}
              </motion.div>
            </section>

            {/* Comparison Strip */}
            <section className="px-4 sm:px-6 mb-10 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="text-center mb-6">
                <p className="text-secondary text-xs font-medium tracking-wider uppercase mb-1">The WiseResume Difference</p>
                <h2 className="font-display text-2xl font-bold text-foreground">Not Just Another Resume Builder</h2>
              </div>
              <div className="max-w-lg mx-auto grid grid-cols-1 gap-2.5">
                {comparisons.map((item) => (
                  <div key={item.them} className="flex items-center gap-3 p-3 rounded-xl border border-border/20 bg-card/40">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-destructive/10 text-destructive flex items-center justify-center text-xs font-bold flex-shrink-0">✗</span>
                      <span className="text-[11px] leading-tight text-muted-foreground line-through">{item.them}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-border flex-shrink-0" />
                    <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                      <span className="text-[11px] leading-tight font-semibold text-foreground text-right">{item.us}</span>
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">✓</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* See It in Action */}
            <section className="px-4 sm:px-6 mb-10">
              <motion.h2
                className="text-2xl font-bold text-foreground text-center mb-2"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              >
                See It in Action
              </motion.h2>
              <motion.p
                className="text-sm text-muted-foreground text-center mb-6"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
              >
                From AI resume writing to a shareable personal website — all in one place
              </motion.p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-4xl mx-auto">
                {/* Card A — AI Resume Editor */}
                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: '-20px' }}
                  transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
                >
                  <Card className="p-5 border-t-2 border-border/30 border-t-primary/40 bg-card/50 backdrop-blur-sm h-full flex flex-col items-center gap-4 hover:shadow-lg hover:border-primary/20 transition-shadow duration-300">
                    <div className="text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2 animate-pulse">
                        <Sparkles className="w-3 h-3" />
                        AI Resume Editor
                      </span>
                      <h3 className="text-lg font-bold text-foreground mb-1">AI-Powered Resume Writing</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed max-w-[240px] mx-auto">
                        Watch AI turn weak bullets into quantified achievements — with a live ATS score that updates in real time.
                      </p>
                    </div>
                    <EditorDemo />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full max-w-[200px] gap-1.5 touch-manipulation active:scale-95 transition-transform"
                      onClick={() => { triggerHaptic.light(); navigate(`/auth?redirect=${encodeURIComponent('/dashboard')}`); }}
                    >
                      Try AI Editor <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Card>
                </motion.div>

                {/* Card B — Public Portfolio */}
                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: '-20px' }}
                  transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
                >
                  <Card className="p-5 border-t-2 border-border/30 border-t-emerald-500/40 bg-card/50 backdrop-blur-sm h-full flex flex-col items-center gap-4 hover:shadow-lg hover:border-emerald-500/20 transition-shadow duration-300">
                    <div className="text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-semibold mb-2 animate-pulse">
                        <Globe className="w-3 h-3" />
                        Live Website
                      </span>
                      <h3 className="text-lg font-bold text-foreground mb-1">Public Portfolio Website</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed max-w-[240px] mx-auto">
                        Turn your resume into a beautiful personal site with themes, projects, and a shareable link — not just a PDF.
                      </p>
                    </div>
                    <PortfolioDemo />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full max-w-[200px] gap-1.5 touch-manipulation active:scale-95 transition-transform"
                      onClick={() => { triggerHaptic.light(); navigate(`/auth?redirect=${encodeURIComponent('/portfolio')}`); }}
                    >
                      Build Your Portfolio <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Card>
                </motion.div>
              </div>
            </section>

            {/* Features */}
            <section className="px-4 sm:px-6 mb-10 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <h2 className="text-2xl font-bold text-foreground text-center mb-2">Why WiseResume?</h2>
              <p className="text-sm text-muted-foreground text-center mb-6">Everything you need to land the job</p>
              <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl mx-auto overflow-hidden">
                {features.map((f) => (
                  <Card key={f.title} className="p-4 border-border/30 bg-card/50 h-full hover:border-primary/40 transition-colors">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-3`}>
                      <f.icon className={`w-5 h-5 ${f.iconColor}`} />
                    </div>
                    <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                  </Card>
                ))}
              </div>
              <div className="flex items-center justify-center gap-3 mt-5">
                {getBonusChips(false).map((chip) => (
                  <button
                    key={chip.label}
                    onClick={() => { triggerHaptic.light(); navigate(chip.href); }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-border/40 bg-card/30 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all active:scale-95 touch-manipulation"
                  >
                    <chip.icon className="w-3.5 h-3.5" />
                    {chip.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Trust & Security Pillars */}
            <section className="px-4 sm:px-6 mb-10 animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
              <div className="text-center mb-5">
                <p className="text-primary text-xs font-medium tracking-wider uppercase mb-1">Your Data, Your Rules</p>
                <h2 className="font-display text-xl font-bold text-foreground">Built on Trust</h2>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 max-w-3xl mx-auto">
                {[
                  { icon: ShieldCheck, title: 'Encrypted', desc: 'Data encrypted at rest and in transit' },
                  { icon: Lock, title: 'Private by Default', desc: 'Only you see your resumes — never shared or sold' },
                  { icon: Brain, title: 'AI Transparency', desc: 'AI runs fresh per session — never stored or used to train' },
                  { icon: Trash2, title: 'Delete Anytime', desc: 'Full control — delete your data permanently' },
                ].map((pillar) => (
                  <Card key={pillar.title} className="p-3 border-border/20 bg-card/30 backdrop-blur-sm text-center h-full flex flex-col items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <pillar.icon className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="text-xs font-semibold text-foreground">{pillar.title}</h3>
                    <p className="text-[10px] text-muted-foreground leading-snug">{pillar.desc}</p>
                  </Card>
                ))}
              </div>
            </section>

            {/* How It Works */}
            <section className="px-4 sm:px-6 mb-10 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <div className="text-center mb-6">
                <p className="text-secondary text-xs font-medium tracking-wider uppercase mb-1">Simple as 1-2-3</p>
                <h2 className="font-display text-xl font-bold text-foreground">How It Works</h2>
              </div>
              <div className="flex items-start justify-center gap-3 sm:gap-6 max-w-md mx-auto">
                {[
                  { num: 1, title: 'Create or Upload', desc: 'Start from scratch or import your existing resume', icon: Sparkles },
                  { num: 2, title: 'AI Enhances It', desc: 'One tap turns weak bullets into quantified achievements', icon: Wand2 },
                  { num: 3, title: 'Export & Share', desc: 'Download as PDF or publish a portfolio website', icon: Globe },
                ].map((step, i) => (
                  <div key={step.num} className="flex flex-col items-center text-center flex-1">
                    <div className="relative mb-3">
                      <div
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center"
                        style={{
                          background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)',
                          boxShadow: '0 0 24px hsl(var(--primary) / 0.3)',
                        }}
                      >
                        <step.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
                      </div>
                      {i < 2 && (
                        <div
                          className="absolute top-1/2 left-full w-4 sm:w-8 h-px -translate-y-1/2 ml-1.5 sm:ml-3"
                          style={{ background: 'linear-gradient(90deg, hsl(var(--primary) / 0.6), hsl(var(--muted) / 0.3))' }}
                        />
                      )}
                    </div>
                    <span className="text-[10px] text-secondary mb-1 px-2 py-0.5 rounded-full bg-secondary/10">Step {step.num}</span>
                    <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-0.5">{step.title}</h3>
                    <p className="text-[10px] sm:text-xs text-muted-foreground leading-snug">{step.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Bottom CTA */}
            <section className="px-4 sm:px-6 py-10 mb-6 animate-fade-in-up" style={{ animationDelay: '0.35s' }}>
              <div className="max-w-md mx-auto text-center">
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-3 leading-tight">
                  Ready to Build Your<br />
                  <span className="text-primary">Dream Resume?</span>
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  AI-powered resume writing, interview coaching, and portfolio websites — all free to start.
                </p>
                <Button
                  size="lg"
                  className="w-full max-w-sm h-12 sm:h-14 text-base sm:text-lg font-semibold gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] touch-manipulation"
                  onClick={handleCTA}
                >
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                  Get Started Free
                </Button>
                <p className="mt-3 text-xs text-muted-foreground">Free forever · No credit card required</p>
              </div>
            </section>

            {/* Install on Device Section */}
            <section className="px-4 sm:px-6 py-10">
              <div className="flex flex-col items-center text-center gap-4 p-6 rounded-2xl glass-surface border border-border/30">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">Get the app on your phone</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">Install WiseResume for quick access — works like a native app, no app store needed</p>
                </div>
                <InstallButton className="w-full max-w-xs" />
              </div>
            </section>

            <Footer />
          </>
        )}
      </main>

      <QuickTailorSheet open={tailorOpen} onOpenChange={setTailorOpen} />
    </SpaceBackground>
  );
};

export default Index;
