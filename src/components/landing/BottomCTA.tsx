import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
    <section className="py-20 px-6 relative overflow-hidden">
      {/* Subtle nebula glow */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, hsl(270 60% 30% / 0.5) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-md mx-auto text-center relative z-10"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent mb-6"
          style={{
            boxShadow: '0 0 40px hsl(var(--primary) / 0.4), 0 0 80px hsl(var(--primary) / 0.2)',
          }}
        >
          <Rocket className="w-8 h-8 text-primary-foreground" />
        </motion.div>

        <h2 className="font-display text-3xl font-bold text-foreground mb-4">
          Ready for Takeoff? 🚀
        </h2>

        <p className="text-muted-foreground mb-8 leading-relaxed">
          Join thousands of astronauts navigating their career galaxy with AI-powered resumes
        </p>

        <Button
          size="lg"
          className="w-full h-14 text-lg font-semibold gap-3 bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] hover:bg-[position:100%_0] transition-all duration-300 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98]"
          onClick={handleLaunch}
        >
          <Rocket className="w-5 h-5" />
          Begin Your Mission
        </Button>

        <button
          onClick={() => navigate('/auth')}
          className="mt-8 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Already aboard? <span className="text-primary font-medium">Sign in</span>
        </button>
      </motion.div>
    </section>
  );
}
