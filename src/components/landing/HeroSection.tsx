import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, LogIn, User, LayoutDashboard, Settings, LogOut } from 'lucide-react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { PlanetLogo } from './PlanetLogo';
import triggerHaptic from '@/lib/haptics';
import { useResumeStore } from '@/store/resumeStore';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';

export function HeroSection() {
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLElement>(null);
  const { setCurrentResume, setCurrentResumeId } = useResumeStore();
  const { user, isAuthenticated, signOut } = useAuth();
  const { profile } = useProfile(user?.id, user);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });

  const none = 0;
  const yLogo = useTransform(scrollYProgress, [0, 1], [0, prefersReducedMotion ? none : -30]);
  const yText = useTransform(scrollYProgress, [0, 1], [0, prefersReducedMotion ? none : -15]);
  const yButton = useTransform(scrollYProgress, [0, 1], [0, prefersReducedMotion ? none : -5]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, prefersReducedMotion ? 1 : 0.85]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, prefersReducedMotion ? 1 : 0.98]);

  const getInitials = () => {
    if (profile?.fullName) {
      const parts = profile.fullName.trim().split(/\s+/);
      return (parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '');
    }
    if (user?.email) return user.email[0].toUpperCase();
    return null;
  };

  const handleGetStarted = () => {
    triggerHaptic.medium();
    navigate(isAuthenticated ? '/dashboard' : '/auth');
  };

  return (
    <section ref={sectionRef} className="relative min-h-[85vh] flex flex-col items-center justify-center px-4 sm:px-6 py-16 overflow-hidden">
      {/* Sign in / Avatar */}
      {isAuthenticated ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="absolute top-[max(1.5rem,env(safe-area-inset-top))] right-4 z-20 animate-fade-in"
              style={{ animationFillMode: 'backwards', animationDelay: '0.3s' }}
            >
              <Avatar className="h-9 w-9 border-2 border-primary/30">
                <AvatarImage src={profile?.avatarUrl ?? undefined} />
                <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                  {getInitials() ?? <User className="w-4 h-4" />}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => { triggerHaptic.light(); navigate('/dashboard'); }}>
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { triggerHaptic.light(); navigate('/settings'); }}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={async () => { triggerHaptic.medium(); await signOut(); navigate('/'); }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <button
          onClick={() => { triggerHaptic.light(); navigate('/auth'); }}
          className="absolute top-[max(1.5rem,env(safe-area-inset-top))] right-4 z-20 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors animate-fade-in"
          style={{ animationFillMode: 'backwards', animationDelay: '0.3s' }}
        >
          <LogIn className="w-4 h-4" />
          Sign In
        </button>
      )}

      {/* Content */}
      <motion.div className="relative z-10 flex flex-col items-center text-center max-w-md mx-auto w-full" style={{ opacity, scale }}>
        {/* Planet logo */}
        <motion.div className="mb-10 animate-scale-in" style={{ animationFillMode: 'backwards', y: yLogo }}>
          <PlanetLogo size="md" />
        </motion.div>

        <motion.div style={{ y: yText }}>
          <h1
            className="text-h1 mb-4 animate-fade-in"
            style={{ animationDelay: '0.1s', animationFillMode: 'backwards' }}
          >
            <span className="text-shimmer">WiseResume</span>
          </h1>

          <p
            className="text-muted-foreground text-body mb-10 animate-fade-in max-w-sm mx-auto"
            style={{ animationDelay: '0.15s', animationFillMode: 'backwards' }}
          >
            AI-powered resumes that land interviews
          </p>
        </motion.div>

        <motion.div style={{ y: yButton }}>
          {/* CTA button */}
          <div
            className="w-full animate-fade-in"
            style={{ animationDelay: '0.2s', animationFillMode: 'backwards' }}
          >
            <Button
              size="lg"
              className="w-full h-14 text-lg font-semibold gap-3 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all duration-300 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]"
              onClick={handleGetStarted}
            >
              <Rocket className="w-5 h-5" />
              {isAuthenticated ? 'Go to Dashboard' : 'Get Started'}
            </Button>
          </div>

          {/* Trust text */}
          <p
            className="text-sm text-muted-foreground mt-8 flex items-center gap-2 animate-fade-in"
            style={{ animationDelay: '0.3s', animationFillMode: 'backwards' }}
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Free · No credit card · 5 minutes
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
}
