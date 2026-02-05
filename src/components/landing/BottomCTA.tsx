import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function BottomCTA() {
  const navigate = useNavigate();

  return (
    <section className="py-16 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-md mx-auto text-center"
      >
        <h2 className="font-display text-2xl font-bold text-foreground mb-4">
          Ready to land more interviews?
        </h2>

        <p className="text-muted-foreground mb-8">
          Join thousands who've upgraded their job search
        </p>

        <Button
          size="lg"
          className="w-full h-14 text-lg font-semibold gap-2 group hover:scale-[1.02] active:scale-[0.98] transition-transform"
          onClick={() => navigate('/editor')}
        >
          Get Started Free
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Button>

        <button
          onClick={() => navigate('/auth')}
          className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Already have an account? <span className="text-primary font-medium">Sign in</span>
        </button>
      </motion.div>
    </section>
  );
}
