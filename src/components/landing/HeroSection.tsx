import { useNavigate } from 'react-router-dom';
import { Sparkles, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/brand/AppLogo';

export function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[85vh] flex flex-col items-center justify-center px-6 py-12 overflow-hidden">
      {/* Animated gradient background */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/20 bg-[length:400%_400%] animate-gradient-shift"
        aria-hidden="true"
      />
      
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" aria-hidden="true" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md mx-auto">
        {/* Logo with glow */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-6 animate-glow-pulse rounded-full"
        >
          <AppLogo size="lg" />
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4"
        >
          Land Your Dream Job Faster
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-muted-foreground text-lg mb-8"
        >
          AI-powered resumes that get past ATS and impress recruiters
        </motion.p>

        {/* Primary CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="w-full space-y-4"
        >
          <Button
            size="lg"
            className="w-full h-14 text-lg font-semibold gap-2 hover:scale-[1.02] active:scale-[0.98] transition-transform"
            onClick={() => navigate('/editor')}
          >
            <Sparkles className="w-5 h-5" />
            Create Your Resume
          </Button>

          {/* Secondary CTA */}
          <Button
            variant="ghost"
            size="lg"
            className="w-full h-12 text-muted-foreground hover:text-foreground gap-2"
            onClick={() => navigate('/upload')}
          >
            <FileText className="w-5 h-5" />
            I have a resume to upload
          </Button>
        </motion.div>

        {/* Trust text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-sm text-muted-foreground mt-6"
        >
          Free • No credit card • 5 minutes
        </motion.p>
      </div>
    </section>
  );
}
