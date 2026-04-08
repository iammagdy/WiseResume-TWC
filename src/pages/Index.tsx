import { useNavigate } from 'react-router-dom';
import { Sparkles, Target, Wand2, Mic, User, LayoutDashboard, Settings, LogOut, Globe, ArrowRight, FileText, BarChart3, PenTool, CheckCircle2 } from 'lucide-react';
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
import { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/safeClient';
import { QuickTailorSheet } from '@/components/landing/QuickTailorSheet';
import { useTheme } from '@/hooks/use-theme';
import { InstallButton } from '@/components/pwa/InstallButton';
import { useThemeLogo } from '@/hooks/useThemeLogo';
import { Sun, Moon } from 'lucide-react';

const LazyEditorDemo = lazy(() => import('@/components/landing/EditorDemo').then((m) => ({ default: m.EditorDemo })));
const LazyPortfolioDemo = lazy(() => import('@/components/landing/PortfolioDemo').then((m) => ({ default: m.PortfolioDemo })));

const DemoFallback = () =>
  <div className="w-[260px] h-[280px] rounded-2xl border border-border bg-muted/50 animate-pulse" />;

const features = [
  { icon: Sparkles, title: 'AI Resume Writing', desc: 'AI rewrites vague bullets into quantified achievements that recruiters remember.', color: 'text-primary', bg: 'bg-primary/10' },
  { icon: Target, title: 'ATS Score Analysis', desc: 'Real-time ATS match percentage against any job posting — fix gaps instantly.', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
  { icon: Wand2, title: 'Smart Tailoring', desc: 'Paste a job description and AI rewrites your resume to match in 30 seconds.', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
  { icon: Mic, title: 'Interview Coaching', desc: 'Real voice interview practice with AI that listens, responds, and scores you live.', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10' },
  { icon: PenTool, title: 'Cover Letters', desc: 'Generate tailored cover letters that match your resume and the job requirements.', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10' },
  { icon: BarChart3, title: 'Application Tracker', desc: 'Track all your job applications in one place with status updates and analytics.', color: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-500/10' },
];

const stats = [
  { value: '50K+', label: 'Resumes created' },
  { value: '92%', label: 'ATS pass rate' },
  { value: '4.8', label: 'User rating' },
  { value: '30s', label: 'Avg. tailor time' },
];

const Index = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, signOut } = useAuth();
  const { profile } = useProfile(isAuthenticated ? user?.id : undefined, user);
  const prefersReducedMotion = useReducedMotion();
  const themeLogo = useThemeLogo();
  const { isDark, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
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

  const handleCTA = () => {
    triggerHaptic.medium();
    kindeRegister();
  };

  if (authLoading) {
    return <PageLoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-0 left-0 right-0 h-[2px] z-[60] pointer-events-none" style={{ display: 'none' }}>
        <div ref={progressRef} className="h-full bg-primary transition-[width] duration-75 ease-out" />
      </div>

      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-background/95 backdrop-blur-sm border-b border-border shadow-soft-sm' : 'bg-transparent'
        }`}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 h-14 max-w-5xl mx-auto">
          <button
            onClick={() => { triggerHaptic.light(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="flex items-center gap-2.5 touch-manipulation"
          >
            <img alt="WiseResume" loading="lazy" className="w-8 h-8 object-contain rounded-lg" src={themeLogo} />
            <span className="font-display font-bold text-sm text-foreground">WiseResume</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="touch-manipulation active:scale-95 transition-transform">
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

      <main className="max-w-5xl mx-auto w-full">
        <section className="flex flex-col items-center text-center px-4 sm:px-6 pt-[calc(7rem+env(safe-area-inset-top))] pb-16">
          <motion.div className="mb-8" {...fade(0)}>
            <img
              alt="WiseResume"
              className="w-20 h-20 sm:w-24 sm:h-24 object-contain rounded-2xl shadow-soft-lg"
              loading="eager"
              src={themeLogo}
            />
          </motion.div>

          <motion.h1
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] tracking-tight mb-4 max-w-3xl"
            {...fade(0.1)}
          >
            Your AI-Powered{' '}
            <span className="text-primary">Career Platform</span>
          </motion.h1>

          <motion.p
            className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-xl leading-relaxed"
            {...fade(0.15)}
          >
            Build standout resumes, practice interviews, track applications, and launch your portfolio — all in one place.
          </motion.p>

          <motion.div className="w-full flex flex-col items-center gap-4" {...fade(0.2)}>
            {isAuthenticated ? (
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
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
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                <Button
                  size="lg"
                  onClick={handleCTA}
                  className="h-12 text-base font-semibold rounded-xl flex-1 shadow-soft-lg"
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

          <motion.div className="mt-6 flex items-center gap-4 sm:gap-6 text-sm text-muted-foreground flex-wrap justify-center" {...fade(0.25)}>
            {['Free to start', 'No credit card', 'AI-powered'].map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                {item}
              </span>
            ))}
          </motion.div>
        </section>

        <section className="px-4 sm:px-6 py-12">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                className="flex flex-col items-center text-center"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.4, delay: i * 0.08, ease: 'easeOut' }}
              >
                <span className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                  {stat.value}
                </span>
                <span className="text-sm text-muted-foreground mt-1">{stat.label}</span>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="px-4 sm:px-6 py-12">
          <motion.div
            className="text-center mb-10"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-3">
              See It in Action
            </h2>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              From AI resume writing to a shareable personal website
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <motion.div
              className="rounded-2xl border border-border bg-card shadow-soft p-6 flex flex-col items-center gap-4"
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.97 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
            >
              <div className="text-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
                  <Sparkles className="w-3 h-3" />
                  AI Resume Editor
                </span>
                <h3 className="text-lg font-bold text-foreground mb-1">AI-Powered Resume Writing</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-[260px] mx-auto">
                  Watch AI turn weak bullets into quantified achievements — with a live ATS score.
                </p>
              </div>
              <Suspense fallback={<DemoFallback />}><LazyEditorDemo /></Suspense>
            </motion.div>

            <motion.div
              className="rounded-2xl border border-border bg-card shadow-soft p-6 flex flex-col items-center gap-4"
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.97 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ duration: 0.4, delay: 0.15, ease: 'easeOut' }}
            >
              <div className="text-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-3">
                  <Globe className="w-3 h-3" />
                  Live Website
                </span>
                <h3 className="text-lg font-bold text-foreground mb-1">Public Portfolio Website</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-[260px] mx-auto">
                  Turn your resume into a beautiful personal site with themes, projects, and a shareable link.
                </p>
              </div>
              <Suspense fallback={<DemoFallback />}><LazyPortfolioDemo /></Suspense>
            </motion.div>
          </div>
        </section>

        <section className="px-4 sm:px-6 py-12">
          <motion.div
            className="text-center mb-10"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-3">
              Everything You Need
            </h2>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              One platform for your entire job search
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="rounded-2xl border border-border bg-card shadow-soft p-5 hover:shadow-soft-md transition-shadow"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-20px' }}
                transition={{ duration: 0.4, delay: i * 0.06, ease: 'easeOut' }}
              >
                <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center mb-3`}>
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="px-4 sm:px-6 py-12">
          <motion.div
            className="text-center mb-10"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-3">
              Simple Pricing
            </h2>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              Start free, upgrade when you need more
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <motion.div
              className="rounded-2xl border border-border bg-card shadow-soft p-6 flex flex-col"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ duration: 0.4, delay: 0.05, ease: 'easeOut' }}
            >
              <h3 className="text-lg font-bold text-foreground mb-1">Free</h3>
              <p className="text-3xl font-bold text-foreground mb-1">$0<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
              <p className="text-sm text-muted-foreground mb-5">Perfect to get started</p>
              <ul className="space-y-2.5 mb-6 flex-1">
                {['1 resume', 'Basic AI suggestions', 'ATS score check', 'PDF export', 'Portfolio site'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button variant="outline" size="lg" className="w-full h-11 rounded-xl" onClick={handleCTA}>
                Get Started
              </Button>
            </motion.div>

            <motion.div
              className="rounded-2xl border-2 border-primary bg-card shadow-soft-lg p-6 flex flex-col relative"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
            >
              <span className="absolute -top-3 left-6 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                Popular
              </span>
              <h3 className="text-lg font-bold text-foreground mb-1">Pro</h3>
              <p className="text-3xl font-bold text-foreground mb-1">$9<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
              <p className="text-sm text-muted-foreground mb-5">For serious job seekers</p>
              <ul className="space-y-2.5 mb-6 flex-1">
                {['Unlimited resumes', 'Advanced AI tools', 'Smart tailoring', 'Interview coaching', 'Cover letter generator', 'Application tracker', 'Priority support'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button size="lg" className="w-full h-11 rounded-xl" onClick={handleCTA}>
                Start Free Trial
              </Button>
            </motion.div>
          </div>
        </section>

        <section className="px-4 sm:px-6 py-12">
          <div className="flex flex-col items-center text-center gap-5 p-8 rounded-2xl border border-border bg-card shadow-soft max-w-md mx-auto">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Get the App</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Install WiseResume for quick access — works like a native app, no app store needed.
              </p>
            </div>
            <InstallButton className="w-full max-w-xs" />
          </div>
        </section>

        {!isAuthenticated && (
          <section className="px-4 sm:px-6 py-16">
            <div className="flex flex-col items-center text-center gap-6 max-w-lg mx-auto">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                Ready to Land Your Dream Job?
              </h2>
              <p className="text-lg text-muted-foreground">
                Join thousands of professionals building better resumes with AI.
              </p>
              <Button
                size="lg"
                onClick={handleCTA}
                className="h-12 text-base font-semibold rounded-xl px-8 shadow-soft-lg"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </section>
        )}

        <Footer />
      </main>

      <QuickTailorSheet open={tailorOpen} onOpenChange={setTailorOpen} />
    </div>
  );
};

export default Index;
