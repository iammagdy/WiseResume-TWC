import { useNavigate } from 'react-router-dom';
import { Sparkles, Target, Wand2, Mic, User, LayoutDashboard, Settings, LogOut, Globe, ArrowRight } from 'lucide-react';
import { Footer } from '@/components/landing/Footer';
import { PageLoadingSpinner } from '@/components/ui/PageLoadingSpinner';
import { SpaceBackground } from '@/components/landing/SpaceBackground';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import triggerHaptic from '@/lib/haptics';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { motion, useReducedMotion, AnimatePresence, type Easing } from 'framer-motion';
import { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInView } from '@/hooks/useInView';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/safeClient';
import { QuickTailorSheet } from '@/components/landing/QuickTailorSheet';
import { ThemeDropdown } from '@/components/settings/ThemeDropdown';
import { InstallButton } from '@/components/pwa/InstallButton';

import logoImage from '@/assets/wise-ai-logo.webp';

// Lazy-load heavy demo components — only mounted when scrolled into view
const LazyEditorDemo = lazy(() => import('@/components/landing/EditorDemo').then((m) => ({ default: m.EditorDemo })));
const LazyPortfolioDemo = lazy(() => import('@/components/landing/PortfolioDemo').then((m) => ({ default: m.PortfolioDemo })));

const DemoFallback = () =>
<div className="w-[260px] h-[280px] rounded-[28px] border-2 border-border/40 bg-card/80 animate-pulse" />;


const features = [
{ icon: Sparkles, title: 'Weak bullet? Fixed in 1 tap', desc: 'AI rewrites vague bullets into quantified achievements that recruiters remember', iconColor: 'text-primary', gradient: 'from-primary/20 to-primary/5' },
{ icon: Target, title: 'Know your score before they do', desc: 'Real-time ATS match percentage against any job posting — then fix it instantly', iconColor: 'text-emerald-500', gradient: 'from-emerald-500/20 to-emerald-500/5' },
{ icon: Wand2, title: 'New job, new resume — instantly', desc: 'Paste a job description and AI rewrites your entire resume to match in 30 seconds', iconColor: 'text-blue-500', gradient: 'from-blue-500/20 to-blue-500/5' },
{ icon: Mic, title: 'Practice speaking, not just writing', desc: 'Real voice interview coaching with an AI that listens, responds, and scores you live', iconColor: 'text-orange-500', gradient: 'from-orange-500/20 to-orange-500/5' }];



const Index = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, signOut } = useAuth();
  const { profile } = useProfile(isAuthenticated ? user?.id : undefined, user);
  const prefersReducedMotion = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [tailorOpen, setTailorOpen] = useState(false);

  // Safety net: if OAuth redirected here with tokens in the hash, forward to /auth/callback
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
      setScrolled(window.scrollY > 120);
      if (progressRef.current) {
        const parent = progressRef.current.parentElement;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const pct = max > 0 ? window.scrollY / max * 100 : 0;
        progressRef.current.style.width = `${pct}%`;
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

  const getFirstName = () => {
    if (profile?.fullName) return profile.fullName.trim().split(/\s+/)[0];
    if (user?.email) return user.email.split('@')[0];
    return undefined;
  };

  const fade = (delay: number) =>
  prefersReducedMotion ?
  {} :
  {
    initial: { opacity: 0, y: 20 } as const,
    animate: { opacity: 1, y: 0 } as const,
    transition: { delay, duration: 0.6, ease: 'easeOut' as Easing }
  };

  const { login: kindeLogin, register: kindeRegister } = useKindeAuth();

  const handleCTA = () => {
    triggerHaptic.medium();
    kindeRegister();
  };

  // Show loading state while auth resolves to prevent guest→auth flash
  if (authLoading) {
    return (
      <SpaceBackground>
        <PageLoadingSpinner />
      </SpaceBackground>);

  }

  return (
    <SpaceBackground>
      {/* Scroll progress bar */}
      <div className="fixed top-0 left-0 right-0 h-[3px] z-[60] pointer-events-none" style={{ display: 'none' }}>
        <div ref={progressRef} className="h-full bg-primary transition-[width] duration-75 ease-out" />
      </div>

      {/* Sticky Mini Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass-header' : 'bg-transparent'}`
        }
        style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        
        <div className="flex items-center justify-between px-4 sm:px-6 h-12">
          <button
            onClick={() => {triggerHaptic.light();window.scrollTo({ top: 0, behavior: 'smooth' });}}
            className="flex items-center gap-2 touch-manipulation">
            
            <img src={logoImage} alt="WiseResume" loading="lazy" className="w-7 h-7 object-contain rounded-lg" />
            <span className={`font-display font-bold text-sm text-foreground transition-opacity duration-300 ${scrolled ? 'opacity-100' : 'opacity-0'}`}>
              WiseResume
            </span>
          </button>

          {isAuthenticated ?
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
                <DropdownMenuItem onClick={() => {triggerHaptic.light();navigate('/dashboard');}}>
                  <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {triggerHaptic.light();navigate('/settings');}}>
                  <Settings className="w-4 h-4 mr-2" /> Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={async () => {triggerHaptic.medium();await signOut();navigate('/');}}>
                  
                  <LogOut className="w-4 h-4 mr-2" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </div> :

          <div className="flex items-center gap-1.5">
              <ThemeDropdown />
            </div>
          }
        </div>
      </header>

      <main className="min-h-screen pb-12 max-w-4xl mx-auto w-full">
        {/* Hero */}
        <section className="flex flex-col items-center text-center px-4 sm:px-6 pt-[calc(5rem+env(safe-area-inset-top))] pb-8">
          <motion.div className="relative mb-6" {...fade(0)}>
            <div
              className="absolute inset-0 rounded-3xl blur-2xl opacity-50 animate-glow-pulse"
              style={{
                background: 'radial-gradient(circle, hsl(355 70% 50% / 0.6) 0%, hsl(355 50% 40% / 0.3) 50%, transparent 70%)',
                width: 140,
                height: 140,
                top: -10,
                left: -10
              }}
              aria-hidden="true" />
            
            <img
              src={logoImage}
              alt="Wise AI Logo"
              className="relative z-10 w-[120px] h-[120px] object-contain rounded-3xl"
              loading="eager" />
            
          </motion.div>

          <motion.h1
            className="text-fluid-2xl font-bold text-foreground leading-tight mb-3"
            {...fade(0.1)}>
            
            Build Your Dream Resume
          </motion.h1>

          <motion.p
            className="text-base text-muted-foreground mb-6 max-w-sm leading-relaxed text-[#ef394b]"
            {...fade(0.15)}>
            
            The only resume app that{' '}
            <span className="text-foreground font-medium">coaches your interview</span>,{' '}
            <span className="text-foreground font-medium">scores your ATS match</span>, and{' '}
            <span className="text-foreground font-medium">builds your portfolio site</span> — all in one.
          </motion.p>

          {/* Primary CTA */}
          <motion.div className="w-full flex flex-col items-center gap-3" {...fade(0.2)}>
            {isAuthenticated ?
            <div className="flex flex-col gap-3 w-full max-w-md">
                <Button
                size="lg"
                className="h-14 text-base font-semibold btn-shimmer rounded-xl text-foreground hover:border-primary/40 active:scale-[0.98] transition-all shadow-sm"
                variant="ghost"
                onClick={() => {triggerHaptic.light();navigate('/dashboard');}}>
                
                  Dashboard
                </Button>
                <div className="flex flex-col items-center gap-2">
                  <button
                  className="w-full h-14 text-base font-semibold rounded-xl border-glow border-glow-pulse btn-shimmer text-foreground flex items-center justify-center gap-2 hover:border-primary/40 active:scale-[0.98] transition-all touch-manipulation"
                  onClick={() => {triggerHaptic.light();setTailorOpen(true);}}>
                  
                    <Sparkles className="w-4 h-4 text-primary" />
                    Tailor your resume in 10 minutes
                  </button>
                  <p className="text-xs text-muted-foreground">Paste a job link → get a perfectly matched resume</p>
                </div>
              </div> :

            <motion.div
              className="w-full max-w-sm"
              whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}>
              
                <button
                className="w-full h-14 text-lg font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all touch-manipulation shadow-[0_0_40px_-6px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_56px_-6px_hsl(var(--primary)/0.7)] btn-shimmer"
                onClick={handleCTA}>
                
                  Get Started
                </button>
              </motion.div>
            }
          </motion.div>

          <motion.div className="mt-5 flex items-center gap-3 sm:gap-4 text-xs text-muted-foreground flex-wrap justify-center" {...fade(0.25)}>
            {[
            { label: 'Free to start', icon: '✓' },
            { label: 'No credit card', icon: '✓' },
            { label: 'AI-powered', icon: '✓' }].
            map((item, i) =>
            <span key={item.label} className="flex items-center gap-1.5">
                {i > 0 && <span className="w-px h-3 bg-border mr-1.5 sm:mr-2 hidden xs:inline-block" />}
                <span className="w-4 h-4 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">{item.icon}</span>
                {item.label}
              </span>
            )}
          </motion.div>
        </section>

        {/* See It in Action */}
        <section className="px-4 sm:px-6 mb-10">
          <motion.h2
            className="text-2xl font-bold text-foreground text-center mb-2"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, ease: 'easeOut' }}>
            
            See It in Action
          </motion.h2>
          <motion.p
            className="text-sm text-muted-foreground text-center mb-6"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}>
            
            From AI resume writing to a shareable personal website
          </motion.p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {/* Card A — AI Resume Editor */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}>
              
              <Card className="p-5 border-t-2 border-border/30 border-t-primary/40 bg-card/50 backdrop-blur-sm h-full flex flex-col items-center gap-4">
                <div className="text-center">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
                    <Sparkles className="w-3 h-3" />
                    AI Resume Editor
                  </span>
                  <h3 className="text-lg font-bold text-foreground mb-1">AI-Powered Resume Writing</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-[240px] mx-auto">
                    Watch AI turn weak bullets into quantified achievements — with a live ATS score.
                  </p>
                </div>
                <Suspense fallback={<DemoFallback />}><LazyEditorDemo /></Suspense>
              </Card>
            </motion.div>

            {/* Card B — Public Portfolio */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}>
              
              <Card className="p-5 border-t-2 border-border/30 border-t-emerald-500/40 bg-card/50 backdrop-blur-sm h-full flex flex-col items-center gap-4">
                <div className="text-center">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-semibold mb-2">
                    <Globe className="w-3 h-3" />
                    Live Website
                  </span>
                  <h3 className="text-lg font-bold text-foreground mb-1">Public Portfolio Website</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-[240px] mx-auto">
                    Turn your resume into a beautiful personal site with themes, projects, and a shareable link.
                  </p>
                </div>
                <Suspense fallback={<DemoFallback />}><LazyPortfolioDemo /></Suspense>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* Features */}
        <section className="px-4 sm:px-6 mb-10 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-2xl font-bold text-foreground text-center mb-2">Why WiseResume?</h2>
          <p className="text-sm text-muted-foreground text-center mb-6 text-[#f53d4c]">Everything you need to land the job</p>
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl mx-auto overflow-hidden">
            {features.map((f) =>
            <Card key={f.title} className="p-4 border-border/30 bg-card/50 h-full">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-3`}>
                  <f.icon className={`w-5 h-5 ${f.iconColor}`} />
                </div>
                <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </Card>
            )}
          </div>
        </section>

        {/* Install on Device Section */}
        <section className="px-4 sm:px-6 py-8">
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
      </main>

      <QuickTailorSheet open={tailorOpen} onOpenChange={setTailorOpen} />
    </SpaceBackground>);

};

export default Index;