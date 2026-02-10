import { useNavigate } from 'react-router-dom';
import { Rocket, FileText, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlanetLogo } from './PlanetLogo';
import triggerHaptic from '@/lib/haptics';
import { useResumeStore } from '@/store/resumeStore';

export function HeroSection() {
  const navigate = useNavigate();
  const { setCurrentResume, setCurrentResumeId } = useResumeStore();

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
    <section className="relative min-h-[85vh] flex flex-col items-center justify-center px-4 sm:px-6 py-12">
      {/* Sign in link */}
      <button
        onClick={() => { triggerHaptic.light(); navigate('/auth'); }}
        className="absolute top-6 right-4 z-20 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors opacity-0 animate-fade-in"
        style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}
      >
        <LogIn className="w-4 h-4" />
        Sign In
      </button>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md mx-auto w-full">
        <div className="mb-8 opacity-0 animate-scale-in" style={{ animationFillMode: 'forwards' }}>
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

        {/* CTA buttons */}
        <div
          className="w-full space-y-3 glass-elevated p-4 rounded-2xl opacity-0 animate-fade-in"
          style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}
        >
          <Button
            size="lg"
            className="w-full h-14 text-lg font-semibold gap-3 bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] hover:bg-[position:100%_0] transition-all duration-300 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98]"
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
