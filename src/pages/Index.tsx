import { useNavigate } from 'react-router-dom';
import { Sparkles, Target, Wand2, Mic, LogIn, User, LayoutDashboard, Settings, LogOut, LayoutGrid, Users, Globe, ArrowRight } from 'lucide-react';
import wiseAiLogo from '@/assets/wise-ai-logo.png';
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
import { useEffect, useState, useCallback } from 'react';

const features = [
  { icon: Sparkles, title: 'AI Writing Assistant', desc: 'Enhance bullets and summaries with one tap', iconColor: 'text-primary', gradient: 'from-primary/20 to-primary/5' },
  { icon: Target, title: 'ATS Score Checker', desc: 'Real-time scoring against any job posting', iconColor: 'text-emerald-500', gradient: 'from-emerald-500/20 to-emerald-500/5' },
  { icon: Wand2, title: 'Smart Job Tailoring', desc: 'AI adapts your resume to each job automatically', iconColor: 'text-blue-500', gradient: 'from-blue-500/20 to-blue-500/5' },
  { icon: Mic, title: 'Voice Mock Interviews', desc: 'Practice with AI voice coaching & real-time feedback', iconColor: 'text-orange-500', gradient: 'from-orange-500/20 to-orange-500/5' },
];

const getBonusChips = (authenticated: boolean) => [
  { icon: LayoutGrid, label: '12 Templates', href: authenticated ? '/templates' : '/auth' },
  { icon: Users, label: '4 AI Recruiters', href: authenticated ? '/ai-studio' : '/auth' },
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

  // Animation sequence: 0=blank → 1=avatar → 2=name → 3=badge → 4=sections → 5=hold → reset
  useEffect(() => {
    if (prefersReducedMotion) return;
    const delays: Record<number, number> = { 0: 300, 1: 500, 2: 500, 3: 600, 4: 3000 };
    const delay = delays[animStep] ?? 3000;
    const t = setTimeout(() => {
      setAnimStep((s) => (s >= 5 ? 0 : s + 1));
    }, delay);
    return () => clearTimeout(t);
  }, [animStep, prefersReducedMotion]);

  // Cycle theme dots
  useEffect(() => {
    const t = setInterval(() => setThemeIdx((i) => (i + 1) % 3), 2000);
    return () => clearInterval(t);
  }, []);

  const accent = THEME_ACCENTS[themeIdx];
  const show = (step: number) => prefersReducedMotion || animStep >= step;

  return (
    <div className="flex flex-col items-center">
      {/* Browser-style frame */}
      <div className="w-[260px] rounded-[28px] border-2 border-border/40 bg-card/80 backdrop-blur-sm shadow-xl overflow-hidden">
        {/* Status bar */}
        <div className="flex items-center justify-between px-5 pt-2 pb-1">
          <span className="text-[10px] text-muted-foreground font-medium">9:41</span>
          <div className="flex items-center gap-1">
            <div className="w-3.5 h-2 rounded-sm border border-muted-foreground/40 relative">
              <div className="absolute inset-[1px] right-[2px] rounded-[1px] bg-muted-foreground/50" />
            </div>
          </div>
        </div>

        {/* URL bar */}
        <div className="flex items-center gap-2 px-4 py-1.5 border-b border-border/20">
          <Globe className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
          <span className="text-[10px] text-muted-foreground/70 font-mono truncate">wiseresume.app/p/you</span>
        </div>

        {/* Portfolio content */}
        <div className="px-4 py-3 min-h-[190px] space-y-2.5">
          {/* Hero — avatar + name + badge */}
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

          {/* Section rows */}
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

          {/* Theme switcher dots */}
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

const Index = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, signOut } = useAuth();
  const { profile } = useProfile(user?.id, user);
  const prefersReducedMotion = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 120);
      const { scrollY } = window;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(max > 0 ? (scrollY / max) * 100 : 0);
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
          transition: { delay, duration: 0.6, ease: 'easeOut' as Easing },
        };

  const inView = (delay: number) =>
    prefersReducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 20 } as const,
          whileInView: { opacity: 1, y: 0 } as const,
          viewport: { once: true, margin: '-50px' },
          transition: { delay, duration: 0.5, ease: 'easeOut' as Easing },
        };

  const handleCTA = () => {
    triggerHaptic.medium();
    navigate(isAuthenticated ? '/dashboard' : '/auth');
  };

  return (
    <SpaceBackground>
      {/* Scroll progress bar for homepage */}
      {scrollProgress > 0 && (
        <div className="fixed top-0 left-0 right-0 h-[3px] z-[60] pointer-events-none">
          <div
            className="h-full bg-primary transition-[width] duration-75 ease-out"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>
      )}
      {/* Sticky Mini Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'glass-header border-b border-border/20 shadow-lg shadow-background/20'
            : 'bg-transparent'
        }`}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 h-12">
          <button
            onClick={() => { triggerHaptic.light(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="flex items-center gap-2 touch-manipulation"
          >
            <img src={wiseAiLogo} alt="WiseResume" className="w-7 h-7 object-contain" />
            <span className={`font-display font-bold text-sm text-foreground transition-opacity duration-300 ${scrolled ? 'opacity-100' : 'opacity-0'}`}>
              WiseResume
            </span>
          </button>

          {isAuthenticated ? (
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
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground active:scale-95 transition-all"
              onClick={() => { triggerHaptic.light(); navigate('/auth'); }}
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </Button>
          )}
        </div>
      </header>

      <main className="min-h-screen pb-12 max-w-4xl mx-auto w-full">
        {/* Hero */}
        <section className="flex flex-col items-center text-center px-4 sm:px-6 pt-20 pb-8">
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
            <img src={wiseAiLogo} alt="Wise AI Logo" className="relative z-10 w-[120px] h-[120px] object-contain" />
          </motion.div>

          <motion.h1
            className="text-fluid-2xl font-bold text-foreground leading-tight mb-3"
            {...fade(0.1)}
          >
            Build Your Dream Resume
          </motion.h1>

          <motion.p
            className="text-base text-muted-foreground mb-8 max-w-xs"
            {...fade(0.15)}
          >
            AI-powered. ATS-optimized. Ready in 5 minutes.
          </motion.p>

          <motion.div className="w-full flex justify-center" {...fade(0.2)}>
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
                {isAuthenticated ? 'Go to Dashboard' : 'Get Started Free'}
              </Button>
            </motion.div>
          </motion.div>

          <motion.p
            className="mt-4 text-xs text-muted-foreground flex items-center gap-1.5"
            {...fade(0.25)}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Free forever&nbsp;·&nbsp;No credit card
          </motion.p>
        </section>

        {/* See It in Action — two-card section */}
        <motion.section className="px-4 sm:px-6 mb-10" {...inView(0)}>
          <motion.h2
            className="text-2xl font-bold text-foreground text-center mb-2"
            {...inView(0)}
          >
            See It in Action
          </motion.h2>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Two powerful tools built for your career
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {/* Card A — AI Resume Editor */}
            <motion.div {...inView(0.05)}>
              <Card className="p-5 border-border/30 bg-card/50 backdrop-blur-sm h-full flex flex-col items-center gap-4">
                <div className="text-center">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
                    <Sparkles className="w-3 h-3" />
                    AI-Powered
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-1">AI-Enhanced Editor</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-[240px] mx-auto">
                    Write, improve, and tailor your resume with AI — one tap turns weak bullets into standout achievements.
                  </p>
                </div>
                <EditorDemo />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full max-w-[200px] gap-1.5 touch-manipulation active:scale-95"
                  onClick={() => { triggerHaptic.light(); navigate(isAuthenticated ? '/dashboard' : '/auth'); }}
                >
                  Try the AI Editor <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Card>
            </motion.div>

            {/* Card B — Public Portfolio */}
            <motion.div {...inView(0.1)}>
              <Card className="p-5 border-border/30 bg-card/50 backdrop-blur-sm h-full flex flex-col items-center gap-4">
                <div className="text-center">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-semibold mb-2">
                    <Globe className="w-3 h-3" />
                    New in v2.1
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-1">Public Portfolio Website</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-[240px] mx-auto">
                    Turn your resume into a beautiful personal site with themes, projects, and a shareable link — not just a PDF.
                  </p>
                </div>
                <PortfolioDemo />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full max-w-[200px] gap-1.5 touch-manipulation active:scale-95"
                  onClick={() => { triggerHaptic.light(); navigate(isAuthenticated ? '/profile' : '/auth'); }}
                >
                  Build Your Portfolio <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Card>
            </motion.div>
          </div>
        </motion.section>

        {/* Features */}
        <motion.section className="px-4 sm:px-6 mb-10" {...inView(0)}>
          <motion.h2
            className="text-2xl font-bold text-foreground text-center mb-2"
            {...inView(0)}
          >
            Why WiseResume?
          </motion.h2>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Everything you need to land the job
          </p>

          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl mx-auto">
            {features.map((f, i) => (
              <motion.div key={f.title} {...inView(0.08 * i)}>
                <Card className="p-4 border-border/30 bg-card/50 backdrop-blur-sm h-full hover:border-primary/40 transition-colors">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-3`}>
                    <f.icon className={`w-5 h-5 ${f.iconColor}`} />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Bonus chips */}
          <motion.div className="flex items-center justify-center gap-3 mt-5" {...inView(0.3)}>
            {getBonusChips(isAuthenticated).map((chip) => (
              <button
                key={chip.label}
                onClick={() => { triggerHaptic.light(); navigate(chip.href); }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-border/40 bg-card/30 backdrop-blur-sm text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all active:scale-95 touch-manipulation"
              >
                <chip.icon className="w-3.5 h-3.5" />
                {chip.label}
              </button>
            ))}
          </motion.div>
        </motion.section>

      </main>
    </SpaceBackground>
  );
};

export default Index;
