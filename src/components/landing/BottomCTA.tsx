import { useNavigate } from 'react-router-dom';
import { Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import triggerHaptic from '@/lib/haptics';

export function BottomCTA() {
  const navigate = useNavigate();

  const handleLaunch = () => {
    triggerHaptic.medium();
    navigate('/editor');
  };

  return (
    <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 relative overflow-hidden">
      {/* Subtle nebula glow */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, hsl(270 60% 30% / 0.5) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <div className="max-w-md mx-auto text-center relative z-10 animate-fade-in-up">
        <div
          className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-primary to-accent mb-4 sm:mb-6"
          style={{
            boxShadow: '0 0 40px hsl(var(--primary) / 0.4), 0 0 80px hsl(var(--primary) / 0.2)',
          }}
        >
          <Rocket className="w-7 h-7 sm:w-8 sm:h-8 text-primary-foreground" />
        </div>

        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-3 sm:mb-4">
          Ready for Takeoff? 🚀
        </h2>

        <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8 leading-relaxed px-2">
          Join thousands of astronauts navigating their career galaxy with AI-powered resumes
        </p>

        <Button
          size="lg"
          className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold gap-2 sm:gap-3 bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] hover:bg-[position:100%_0] transition-all duration-300 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] touch-manipulation"
          onClick={handleLaunch}
        >
          <Rocket className="w-4 h-4 sm:w-5 sm:h-5" />
          Begin Your Mission
        </Button>

        <button
          onClick={() => navigate('/auth')}
          className="mt-6 sm:mt-8 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors touch-manipulation p-2"
        >
          Already aboard? <span className="text-primary font-medium">Sign in</span>
        </button>
      </div>
    </section>
  );
}
