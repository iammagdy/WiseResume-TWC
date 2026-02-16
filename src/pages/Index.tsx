import { useNavigate } from 'react-router-dom';
import { Sparkles, Target, Wand2, Mic, LogIn, User, LayoutDashboard, Settings, LogOut, LayoutGrid, Users } from 'lucide-react';
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
import { motion, useReducedMotion, type Easing } from 'framer-motion';
import { useEffect, useState } from 'react';

const features = [
  { icon: Sparkles, title: 'AI Writing Assistant', desc: 'Enhance bullets and summaries with one tap', iconColor: 'text-primary', gradient: 'from-primary/20 to-primary/5' },
  { icon: Target, title: 'ATS Score Checker', desc: 'Real-time scoring against any job posting', iconColor: 'text-emerald-500', gradient: 'from-emerald-500/20 to-emerald-500/5' },
  { icon: Wand2, title: 'Smart Job Tailoring', desc: 'AI adapts your resume to each job automatically', iconColor: 'text-blue-500', gradient: 'from-blue-500/20 to-blue-500/5' },
  { icon: Mic, title: 'Voice Mock Interviews', desc: 'Practice with AI voice coaching & real-time feedback', iconColor: 'text-orange-500', gradient: 'from-orange-500/20 to-orange-500/5' },
];

const bonusChips = [
  { icon: LayoutGrid, label: '12 Templates', href: '/templates' },
  { icon: Users, label: '4 AI Recruiters', href: '/auth' },
];

const Index = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, signOut } = useAuth();
  const { profile } = useProfile(user?.id, user);
  const prefersReducedMotion = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 120);
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

      <main className="min-h-screen pb-12">
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

        {/* Editor Demo */}
        <motion.section className="px-4 sm:px-6 mb-10" {...inView(0)}>
          <EditorDemo />
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

          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 max-w-md mx-auto">
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
            {bonusChips.map((chip) => (
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

        {/* Bottom CTA */}
        <motion.section className="px-4 sm:px-6 py-12" {...inView(0)}>
          <div className="max-w-md mx-auto text-center">
            <motion.div className="mb-5" {...inView(0.05)}>
              {/* Mini ATS score ring */}
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-[3px] border-primary/20 relative">
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 64 64">
                  <circle
                    cx="32" cy="32" r="28"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="3"
                    strokeDasharray={`${0.85 * 2 * Math.PI * 28} ${2 * Math.PI * 28}`}
                    strokeLinecap="round"
                    className="drop-shadow-[0_0_6px_hsl(var(--primary)/0.4)]"
                  />
                </svg>
                <span className="text-sm font-bold text-primary">85</span>
              </div>
            </motion.div>

            <motion.h2
              className="text-2xl font-bold text-foreground mb-2"
              {...inView(0.1)}
            >
              Your Next Career Move Starts Here
            </motion.h2>
            <motion.p
              className="text-sm text-muted-foreground mb-6 leading-relaxed"
              {...inView(0.15)}
            >
              Get your ATS score up and land more interviews
            </motion.p>

            <motion.div {...inView(0.2)}>
              <Button
                size="lg"
                className="w-full h-14 text-lg font-semibold gap-3 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all duration-300 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] touch-manipulation"
                onClick={handleCTA}
              >
                <Sparkles className="w-5 h-5" />
                {isAuthenticated ? 'Go to Dashboard' : 'Get Started Free'}
              </Button>
            </motion.div>
          </div>
        </motion.section>
      </main>
    </SpaceBackground>
  );
};

export default Index;
