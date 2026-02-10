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
    <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6">
      <div className="max-w-md mx-auto text-center animate-fade-in-up">
        <div
          className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-primary to-accent mb-4 sm:mb-6"
          style={{
            boxShadow: '0 0 40px hsl(var(--primary) / 0.4)',
          }}
        >
          <Rocket className="w-7 h-7 sm:w-8 sm:h-8 text-primary-foreground" />
        </div>

        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-3 sm:mb-4">
          Ready to Get Started?
        </h2>

        <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8 leading-relaxed px-2">
          Join thousands building better resumes with AI
        </p>

        <Button
          size="lg"
          className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold gap-2 sm:gap-3 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all duration-300 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] touch-manipulation"
          onClick={handleLaunch}
        >
          <Rocket className="w-4 h-4 sm:w-5 sm:h-5" />
          Get Started Free
        </Button>
      </div>
    </section>
  );
}
