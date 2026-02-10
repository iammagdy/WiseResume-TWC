import { useNavigate } from 'react-router-dom';
import { Rocket, FileText, LogIn, User, LayoutDashboard, Settings, LogOut } from 'lucide-react';
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
  const { setCurrentResume, setCurrentResumeId } = useResumeStore();
  const { user, isAuthenticated, signOut } = useAuth();
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
    <section className="relative min-h-[85vh] flex flex-col items-center justify-center px-4 sm:px-6 py-16 overflow-hidden">
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
          className="absolute top-[max(1.5rem,env(safe-area-inset-top))] right-4 z-20 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors opacity-0 animate-fade-in"
          style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}
        >
          <LogIn className="w-4 h-4" />
          Sign In
        </button>
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md mx-auto w-full">
        {/* Planet logo */}
        <div className="mb-10 opacity-0 animate-scale-in" style={{ animationFillMode: 'forwards' }}>
          <PlanetLogo size="md" />
        </div>

        <h1
          className="font-display text-4xl sm:text-5xl font-bold mb-4 opacity-0 animate-fade-in"
          style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}
        >
          <span className="text-shimmer">WiseResume</span>
        </h1>

        <p
          className="text-muted-foreground text-lg mb-10 leading-relaxed opacity-0 animate-fade-in max-w-sm"
          style={{ animationDelay: '0.15s', animationFillMode: 'forwards' }}
        >
          AI-powered resumes that land interviews
        </p>

        {/* CTA buttons */}
        <div
          className="w-full space-y-3 glass-elevated p-5 rounded-2xl opacity-0 animate-fade-in"
          style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}
        >
          <Button
            size="lg"
            className="w-full h-14 text-lg font-semibold gap-3 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all duration-300 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]"
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
          className="text-sm text-muted-foreground mt-8 flex items-center gap-2 opacity-0 animate-fade-in"
          style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          Free · No credit card · 5 minutes
        </p>
      </div>
    </section>
  );
}
