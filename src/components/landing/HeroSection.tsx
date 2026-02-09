import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, FileText, ChevronDown, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { PlanetLogo } from './PlanetLogo';
import triggerHaptic from '@/lib/haptics';
import { useResumeStore } from '@/store/resumeStore';

const jobTitles = ['Software Engineer', 'Product Manager', 'UX Designer', 'Data Scientist', 'Marketing Lead'];

const testimonials = [
  { text: 'Got 3 interviews in a week!', author: 'Sarah K.' },
  { text: 'Landed my dream job!', author: 'Mike T.' },
  { text: 'Best resume tool ever!', author: 'Alex R.' },
];

export function HeroSection() {
  const navigate = useNavigate();
  const { setCurrentResume, setCurrentResumeId } = useResumeStore();
  const [currentJobIndex, setCurrentJobIndex] = useState(0);

  // Typing effect for job titles
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentJobIndex((prev) => (prev + 1) % jobTitles.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

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
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-12">
      {/* Floating testimonial badges */}
      <motion.div
        className="absolute top-24 -left-2 sm:left-8 glass-card px-3 py-2 rounded-xl text-xs max-w-[140px] hidden sm:block"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0, y: [0, -8, 0] }}
        transition={{ 
          opacity: { delay: 1.5 },
          y: { duration: 4, repeat: Infinity, ease: 'easeInOut' }
        }}
      >
        <div className="flex items-center gap-1 mb-1">
          <Star className="w-3 h-3 text-warning fill-warning" />
          <Star className="w-3 h-3 text-warning fill-warning" />
          <Star className="w-3 h-3 text-warning fill-warning" />
        </div>
        <p className="text-foreground/90">"{testimonials[0].text}"</p>
        <p className="text-muted-foreground mt-1">— {testimonials[0].author}</p>
      </motion.div>

      <motion.div
        className="absolute top-40 -right-2 sm:right-8 glass-card px-3 py-2 rounded-xl text-xs max-w-[140px] hidden sm:block"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0, y: [0, 10, 0], rotate: [1, -1, 1] }}
        transition={{ 
          opacity: { delay: 2 },
          y: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
          rotate: { duration: 6, repeat: Infinity, ease: 'easeInOut' }
        }}
      >
        <div className="flex items-center gap-1 mb-1">
          <Star className="w-3 h-3 text-warning fill-warning" />
          <Star className="w-3 h-3 text-warning fill-warning" />
          <Star className="w-3 h-3 text-warning fill-warning" />
        </div>
        <p className="text-foreground/90">"{testimonials[1].text}"</p>
        <p className="text-muted-foreground mt-1">— {testimonials[1].author}</p>
      </motion.div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md mx-auto w-full">
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

        {/* Headline with shimmer */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="font-display text-4xl sm:text-5xl font-bold mb-4"
        >
          <span className="text-shimmer">WiseResume</span>
        </motion.h1>

        {/* Animated subheadline with typing effect */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-muted-foreground text-lg mb-8 leading-relaxed h-14"
        >
          Tailor your resume for{' '}
          <AnimatePresence mode="wait">
            <motion.span
              key={currentJobIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-primary font-medium inline-block"
            >
              {jobTitles[currentJobIndex]}
            </motion.span>
          </AnimatePresence>
          {' '}in seconds with AI
        </motion.p>

        {/* Feature badges with icons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.55 }}
          className="flex flex-wrap justify-center gap-2 mb-8"
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
        </motion.div>

        {/* Glassmorphism CTA container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="w-full space-y-4 glass-elevated p-4 rounded-2xl"
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
