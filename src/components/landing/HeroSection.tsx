import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, FileText, ChevronDown, Star, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { PlanetLogo } from './PlanetLogo';
import triggerHaptic from '@/lib/haptics';
import { useResumeStore } from '@/store/resumeStore';

const jobTitles = ['Software Engineer', 'Product Manager', 'UX Designer', 'Data Scientist', 'Marketing Lead'];

const testimonials = [
  { text: 'Got 3 interviews in a week!', author: 'Sarah K.' },
  { text: 'Landed my dream job!', author: 'Mike T.' },
];

export function HeroSection() {
  const navigate = useNavigate();
  const { setCurrentResume, setCurrentResumeId } = useResumeStore();
  const [currentJobIndex, setCurrentJobIndex] = useState(0);

  // Deferred auth check - not on critical path
  const [deferredUser, setDeferredUser] = useState<{ email?: string } | null>(null);
  const [deferredProfile, setDeferredProfile] = useState<{ avatarUrl?: string; fullName?: string } | null>(null);

  useEffect(() => {
    // Defer auth check until after first paint
    const loadAuth = async () => {
      const { supabase } = await import('@/integrations/supabase/safeClient');
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setDeferredUser({ email: session.user.email });
        // Load profile lazily
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('user_id', session.user.id)
          .maybeSingle();
        if (profile) {
          setDeferredProfile({ avatarUrl: profile.avatar_url ?? undefined, fullName: profile.full_name ?? undefined });
        }
      }
    };

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(loadAuth);
    } else {
      setTimeout(loadAuth, 200);
    }
  }, []);

  // Typing effect for job titles - deferred to avoid blocking
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentJobIndex((prev) => (prev + 1) % jobTitles.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleProfileClick = () => {
    triggerHaptic.light();
    navigate(deferredUser ? '/dashboard' : '/auth');
  };

  const handleLaunch = () => {
    triggerHaptic.medium();
    setCurrentResume({
      contactInfo: {
        fullName: '',
        email: '',
        phone: '',
        location: '',
        linkedin: '',
        portfolio: '',
      },
      summary: '',
      experience: [],
      education: [],
      skills: [],
      certifications: [],
      templateId: 'modern',
    });
    setCurrentResumeId(null);
    navigate('/editor');
  };

  const handleUpload = () => {
    triggerHaptic.light();
    navigate('/upload');
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-12">
      {/* Profile button */}
      <button
        onClick={handleProfileClick}
        className="absolute top-6 right-4 z-20 opacity-0 animate-fade-in"
        style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}
        aria-label={deferredUser ? 'Go to dashboard' : 'Sign in'}
      >
        <Avatar className="w-10 h-10 border-2 border-primary/30 shadow-lg">
          {deferredProfile?.avatarUrl ? (
            <AvatarImage src={deferredProfile.avatarUrl} alt="Profile" />
          ) : null}
          <AvatarFallback className="bg-primary/20 text-primary">
            {deferredUser ? (
              deferredProfile?.fullName?.charAt(0).toUpperCase() || 
              deferredUser.email?.charAt(0).toUpperCase() || 
              <User className="w-5 h-5" />
            ) : (
              <User className="w-5 h-5" />
            )}
          </AvatarFallback>
        </Avatar>
      </button>

      {/* Static testimonial badges */}
      <div
        className="absolute top-24 -left-2 sm:left-8 glass-card px-3 py-2 rounded-xl text-xs max-w-[140px] hidden sm:block opacity-0 animate-fade-in"
        style={{ animationDelay: '0.8s', animationFillMode: 'forwards' }}
      >
        <div className="flex items-center gap-1 mb-1">
          <Star className="w-3 h-3 text-warning fill-warning" />
          <Star className="w-3 h-3 text-warning fill-warning" />
          <Star className="w-3 h-3 text-warning fill-warning" />
        </div>
        <p className="text-foreground/90">"{testimonials[0].text}"</p>
        <p className="text-muted-foreground mt-1">— {testimonials[0].author}</p>
      </div>

      <div
        className="absolute top-40 -right-2 sm:right-8 glass-card px-3 py-2 rounded-xl text-xs max-w-[140px] hidden sm:block opacity-0 animate-fade-in"
        style={{ animationDelay: '1s', animationFillMode: 'forwards' }}
      >
        <div className="flex items-center gap-1 mb-1">
          <Star className="w-3 h-3 text-warning fill-warning" />
          <Star className="w-3 h-3 text-warning fill-warning" />
          <Star className="w-3 h-3 text-warning fill-warning" />
        </div>
        <p className="text-foreground/90">"{testimonials[1].text}"</p>
        <p className="text-muted-foreground mt-1">— {testimonials[1].author}</p>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md mx-auto w-full">
        <div className="mb-8 opacity-0 animate-scale-in" style={{ animationFillMode: 'forwards' }}>
          <PlanetLogo size="lg" />
        </div>

        <p
          className="text-secondary text-sm font-medium tracking-wider uppercase mb-2 opacity-0 animate-fade-in"
          style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}
        >
          ✨ Welcome to
        </p>

        <h1
          className="font-display text-4xl sm:text-5xl font-bold mb-4 opacity-0 animate-fade-in"
          style={{ animationDelay: '0.15s', animationFillMode: 'forwards' }}
        >
          <span className="text-shimmer">WiseResume</span>
        </h1>

        {/* Animated job title - simple CSS transition */}
        <p
          className="text-muted-foreground text-lg mb-8 leading-relaxed h-14 opacity-0 animate-fade-in"
          style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}
        >
          Tailor your resume for{' '}
          <span key={currentJobIndex} className="text-primary font-medium inline-block animate-fade-in">
            {jobTitles[currentJobIndex]}
          </span>
          {' '}in seconds with AI
        </p>

        {/* Feature badges */}
        <div
          className="flex flex-wrap justify-center gap-2 mb-8 opacity-0 animate-fade-in"
          style={{ animationDelay: '0.25s', animationFillMode: 'forwards' }}
        >
          {['4 AI Recruiters', 'Voice Interviews', 'ATS Optimized'].map((badge) => (
            <span
              key={badge}
              className="px-3 py-1.5 rounded-full text-xs font-medium glass-surface text-primary border border-primary/20 flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              {badge}
            </span>
          ))}
        </div>

        {/* CTA buttons */}
        <div
          className="w-full space-y-4 glass-elevated p-4 rounded-2xl opacity-0 animate-fade-in"
          style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}
        >
          <Button
            size="lg"
            className="w-full h-14 text-lg font-semibold gap-3 bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] hover:bg-[position:100%_0] transition-all duration-300 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98]"
            onClick={handleLaunch}
          >
            <Rocket className="w-5 h-5" />
            Launch Your Resume
          </Button>

          <Button
            variant="ghost"
            size="lg"
            className="w-full h-12 text-muted-foreground hover:text-foreground gap-2 border border-border/50 hover:border-primary/50 hover:bg-primary/5"
            onClick={handleUpload}
          >
            <FileText className="w-5 h-5" />
            Upload existing resume
          </Button>
        </div>

        {/* Trust text */}
        <p
          className="text-sm text-muted-foreground mt-8 flex items-center gap-2 opacity-0 animate-fade-in"
          style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          Free • No credit card • 5 minutes
        </p>
      </div>

      {/* Scroll indicator */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-0 animate-fade-in"
        style={{ animationDelay: '0.6s', animationFillMode: 'forwards' }}
      >
        <div className="flex flex-col items-center gap-1 text-muted-foreground/50 animate-bounce-gentle">
          <span className="text-xs">Explore</span>
          <ChevronDown className="w-5 h-5" />
        </div>
      </div>
    </section>
  );
}
