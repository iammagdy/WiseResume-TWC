import { useNavigate } from 'react-router-dom';
import { Rocket, FileText, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { PlanetLogo } from './PlanetLogo';
import triggerHaptic from '@/lib/haptics';
import { useResumeStore } from '@/store/resumeStore';

export function HeroSection() {
  const navigate = useNavigate();
  const { setCurrentResume, setCurrentResumeId } = useResumeStore();

  const handleLaunch = () => {
    triggerHaptic.medium();
    // Create a new blank resume before navigating
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
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 py-12">
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md mx-auto">
        {/* Planet Logo with glow */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="mb-8"
        >
          <PlanetLogo size="lg" />
        </motion.div>

        {/* Welcome text */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-secondary text-sm font-medium tracking-wider uppercase mb-2"
        >
          ✨ Welcome to
        </motion.p>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="font-display text-4xl sm:text-5xl font-bold text-foreground mb-4"
        >
          <span className="gradient-text">WiseResume</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-muted-foreground text-lg mb-10 leading-relaxed"
        >
          Your AI Career Companion in the{' '}
          <span className="text-primary font-medium">Wise Universe</span>
        </motion.p>

        {/* Primary CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="w-full space-y-4"
        >
          <Button
            size="lg"
            className="w-full h-14 text-lg font-semibold gap-3 bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] hover:bg-[position:100%_0] transition-all duration-300 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98]"
            onClick={handleLaunch}
          >
            <Rocket className="w-5 h-5" />
            Launch Your Resume
          </Button>

          {/* Secondary CTA */}
          <Button
            variant="ghost"
            size="lg"
            className="w-full h-12 text-muted-foreground hover:text-foreground gap-2 border border-border/50 hover:border-primary/50 hover:bg-primary/5"
            onClick={handleUpload}
          >
            <FileText className="w-5 h-5" />
            Upload existing resume
          </Button>
        </motion.div>

        {/* Trust text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="text-sm text-muted-foreground mt-8 flex items-center gap-2"
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          Free • No credit card • 5 minutes
        </motion.p>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="flex flex-col items-center gap-1 text-muted-foreground/50"
        >
          <span className="text-xs">Explore</span>
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </motion.div>
    </section>
  );
}
