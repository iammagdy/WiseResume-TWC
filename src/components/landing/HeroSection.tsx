import { useNavigate } from 'react-router-dom';
import { Rocket, FileText, LogIn, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { PlanetLogo } from './PlanetLogo';
import triggerHaptic from '@/lib/haptics';
import { useResumeStore } from '@/store/resumeStore';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';

const particles = [
  { size: 4, x: '10%', y: '20%', blur: 6, color: 'var(--primary)', duration: 10, delay: 0 },
  { size: 8, x: '80%', y: '15%', blur: 10, color: 'var(--secondary)', duration: 13, delay: 2 },
  { size: 6, x: '25%', y: '75%', blur: 8, color: 'var(--accent)', duration: 11, delay: 4 },
  { size: 12, x: '70%', y: '60%', blur: 14, color: 'var(--primary)', duration: 15, delay: 1 },
  { size: 5, x: '50%', y: '30%', blur: 7, color: 'var(--secondary)', duration: 12, delay: 3 },
  { size: 7, x: '90%', y: '80%', blur: 9, color: 'var(--accent)', duration: 14, delay: 5 },
];

export function HeroSection() {
  const navigate = useNavigate();
  const { setCurrentResume, setCurrentResumeId } = useResumeStore();
  const { user, isAuthenticated } = useAuth();
  const { profile } = useProfile(user?.id, user);

  const getInitials = () => {
    if (profile?.fullName) {
      const parts = profile.fullName.trim().split(/\s+/);
      return (parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '');
    }
    if (user?.email) return user.email[0].toUpperCase();
    return null;
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
    <section className="relative min-h-[85vh] flex flex-col items-center justify-center px-4 sm:px-6 py-12 overflow-hidden">
      {/* Sign in / Avatar */}
      {isAuthenticated ? (
        <button
          onClick={() => { triggerHaptic.light(); navigate('/dashboard'); }}
          className="absolute top-6 right-4 z-20 opacity-0 animate-fade-in"
          style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}
        >
          <Avatar className="h-9 w-9 border-2 border-primary/30">
            <AvatarImage src={profile?.avatarUrl ?? undefined} />
            <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
              {getInitials() ?? <User className="w-4 h-4" />}
            </AvatarFallback>
          </Avatar>
        </button>
      ) : (
        <button
          onClick={() => { triggerHaptic.light(); navigate('/auth'); }}
          className="absolute top-6 right-4 z-20 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors opacity-0 animate-fade-in"
          style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}
        >
          <LogIn className="w-4 h-4" />
          Sign In
        </button>
      )}

      {/* Animated gradient mesh blobs */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute rounded-full animate-gradient-blob"
          style={{
            width: 400,
            height: 400,
            top: '-10%',
            left: '-5%',
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          className="absolute rounded-full animate-gradient-blob"
          style={{
            width: 350,
            height: 350,
            bottom: '5%',
            right: '-10%',
            background: 'radial-gradient(circle, hsl(var(--secondary) / 0.25) 0%, transparent 70%)',
            filter: 'blur(50px)',
            animationDelay: '7s',
            animationDuration: '25s',
          }}
        />
        <div
          className="absolute rounded-full animate-gradient-blob"
          style={{
            width: 300,
            height: 300,
            top: '40%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'radial-gradient(circle, hsl(var(--accent) / 0.2) 0%, transparent 70%)',
            filter: 'blur(55px)',
            animationDelay: '14s',
            animationDuration: '22s',
          }}
        />
      </div>

      {/* Floating particle orbs */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {particles.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-float-particle"
            style={{
              width: p.size,
              height: p.size,
              left: p.x,
              top: p.y,
              background: `hsl(${p.color})`,
              boxShadow: `0 0 ${p.blur}px hsl(${p.color} / 0.6)`,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md mx-auto w-full">
        {/* Planet logo with pulsing rings */}
        <div className="relative mb-8 opacity-0 animate-scale-in" style={{ animationFillMode: 'forwards' }}>
          {/* Pulsing concentric rings */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            aria-hidden="true"
          >
            <div
              className="absolute rounded-full border border-primary/20 animate-ring-pulse"
              style={{ width: 220, height: 220 }}
            />
            <div
              className="absolute rounded-full border border-secondary/15 animate-ring-pulse"
              style={{ width: 280, height: 280, animationDelay: '1.5s' }}
            />
          </div>
          <PlanetLogo size="lg" />
        </div>

        <h1
          className="font-display text-4xl sm:text-5xl font-bold mb-4 opacity-0 animate-fade-in"
          style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}
        >
          <span className="text-shimmer">WiseResume</span>
        </h1>

        <p
          className="text-muted-foreground text-lg mb-8 leading-relaxed opacity-0 animate-fade-in"
          style={{ animationDelay: '0.15s', animationFillMode: 'forwards' }}
        >
          Create an ATS-ready resume in minutes with AI-powered tailoring
        </p>

        {/* CTA buttons with rotating border */}
        <div
          className="w-full space-y-3 rotating-border glass-elevated p-4 rounded-2xl opacity-0 animate-fade-in"
          style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}
        >
          <Button
            size="lg"
            className="w-full h-14 text-lg font-semibold gap-3 bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] hover:bg-[position:100%_0] transition-all duration-300 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] animate-cta-glow"
            onClick={handleLaunch}
          >
            <Rocket className="w-5 h-5" />
            Create New Resume
          </Button>

          <Button
            variant="ghost"
            size="lg"
            className="w-full h-12 text-muted-foreground hover:text-foreground gap-2 border border-border/50 hover:border-primary/50 hover:bg-primary/5"
            onClick={handleUpload}
          >
            <FileText className="w-5 h-5" />
            Upload Existing Resume
          </Button>
        </div>

        {/* Trust text */}
        <p
          className="text-sm text-muted-foreground mt-6 flex items-center gap-2 opacity-0 animate-fade-in"
          style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          Free • No credit card • 5 minutes
        </p>
      </div>
    </section>
  );
}
