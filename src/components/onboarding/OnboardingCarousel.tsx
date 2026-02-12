import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Sparkles, ChevronRight, FilePlus, Layout,
  Contact, FileText, Briefcase, GraduationCap, Lightbulb,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppIcon } from '@/components/brand/AppIcon';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

const aiFeatures = [
  { title: 'Watch as AI writes your professional summary', description: 'Intelligent content generation tailored to your experience' },
  { title: 'Get instant optimization suggestions', description: 'Real-time feedback to strengthen every bullet point' },
  { title: 'Tailor your resume to any job in seconds', description: 'One-click customization for any job description' },
];

const processSteps = [
  { icon: Contact, label: 'Contact' },
  { icon: FileText, label: 'Summary' },
  { icon: Briefcase, label: 'Work' },
  { icon: GraduationCap, label: 'Education' },
  { icon: Lightbulb, label: 'Skills' },
];

export type OnboardingChoice = 'scratch' | 'upload' | 'template';

interface OnboardingCarouselProps {
  onComplete: () => void;
  onSkip: () => void;
  onChoice?: (choice: OnboardingChoice) => void;
}

export function OnboardingCarousel({ onComplete, onSkip, onChoice }: OnboardingCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const totalScreens = 4;

  // AI feature cycling for screen 3
  const [featureIndex, setFeatureIndex] = useState(0);
  useEffect(() => {
    if (activeIndex !== 2) return;
    const interval = setInterval(() => {
      setFeatureIndex(prev => (prev + 1) % aiFeatures.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [activeIndex]);

  // Scroll tracking
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const handleScroll = () => {
      const newIndex = Math.round(scrollEl.scrollLeft / scrollEl.offsetWidth);
      if (newIndex !== activeIndex && newIndex >= 0 && newIndex < totalScreens) {
        setActiveIndex(newIndex);
        haptics.selection();
      }
    };
    scrollEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', handleScroll);
  }, [activeIndex]);

  const scrollToIndex = useCallback((index: number) => {
    scrollRef.current?.scrollTo({ left: index * scrollRef.current.offsetWidth, behavior: 'smooth' });
  }, []);

  const handleNext = () => {
    haptics.light();
    if (activeIndex < totalScreens - 1) {
      scrollToIndex(activeIndex + 1);
    }
  };

  const handleChoice = (choice: OnboardingChoice) => {
    haptics.success();
    onChoice?.(choice);
    onComplete();
  };

  const isLastScreen = activeIndex === totalScreens - 1;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Skip */}
      <div className="flex justify-end p-4 pt-safe">
        <Button variant="ghost" onClick={() => { haptics.light(); onSkip(); }} className="text-muted-foreground">
          Skip Tour
        </Button>
      </div>

      {/* Carousel */}
      <div ref={scrollRef} className="flex-1 flex overflow-x-auto snap-x snap-mandatory scrollbar-hide">
        {/* Screen 1: Welcome */}
        <div className="snap-start snap-always flex-shrink-0 w-full flex flex-col items-center justify-center text-center px-8">
          <motion.div
            animate={{ scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="mb-8"
            style={{ filter: 'drop-shadow(0 0 24px hsl(var(--primary) / 0.4))' }}
          >
            <AppIcon size={96} />
          </motion.div>
          <h1 className="text-2xl font-bold mb-3 gradient-text">
            AI-powered resumes that land interviews
          </h1>
          <p className="text-muted-foreground text-lg max-w-xs">
            Create professional resumes in 5 minutes with intelligent suggestions
          </p>
        </div>

        {/* Screen 2: Five-Step Process */}
        <div className="snap-start snap-always flex-shrink-0 w-full flex flex-col items-center justify-center text-center px-8">
          <h2 className="text-2xl font-bold mb-2 gradient-text">Follow our proven framework</h2>
          <p className="text-muted-foreground mb-8 max-w-xs">
            We'll guide you through each section with smart suggestions and examples
          </p>
          <div className="relative flex flex-col items-center gap-1">
            {/* Animated vertical line */}
            <svg className="absolute left-1/2 -translate-x-1/2 top-0 h-full w-1 overflow-visible" aria-hidden>
              <motion.line
                x1="2" y1="0" x2="2" y2="100%"
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                strokeDasharray="200"
                initial={{ strokeDashoffset: 200 }}
                animate={activeIndex === 1 ? { strokeDashoffset: 0 } : { strokeDashoffset: 200 }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
              />
            </svg>
            {processSteps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.label}
                  className="flex items-center gap-4 relative z-10"
                  initial={{ opacity: 0, x: -20 }}
                  animate={activeIndex === 1 ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.2 + i * 0.15 }}
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium w-20 text-left">{step.label}</span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Screen 3: AI Showcase */}
        <div className="snap-start snap-always flex-shrink-0 w-full flex flex-col items-center justify-center text-center px-8">
          <h2 className="text-2xl font-bold mb-2 gradient-text">Powered by Wise AI</h2>
          <p className="text-muted-foreground mb-8 max-w-xs">
            Intelligent tools that make every word count
          </p>
          <div className="relative w-full max-w-xs h-40">
            <AnimatePresence mode="wait">
              <motion.div
                key={featureIndex}
                className="absolute inset-0 flex flex-col items-center justify-center p-6 rounded-2xl glass-elevated border-glow"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                <motion.div
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                >
                  <Sparkles className="w-8 h-8 text-primary mb-3" />
                </motion.div>
                <p className="font-semibold text-sm">{aiFeatures[featureIndex].title}</p>
                <p className="text-xs text-muted-foreground mt-1">{aiFeatures[featureIndex].description}</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Screen 4: Choose Starting Point */}
        <div className="snap-start snap-always flex-shrink-0 w-full flex flex-col items-center justify-center text-center px-8">
          <h2 className="text-2xl font-bold mb-2 gradient-text">Choose your starting point</h2>
          <p className="text-muted-foreground mb-8 max-w-xs">
            Pick the path that works best for you
          </p>
          <div className="w-full max-w-xs space-y-3">
            {([
              { choice: 'scratch' as const, icon: FilePlus, label: 'Start from Scratch', desc: 'Build a new resume step by step' },
              { choice: 'upload' as const, icon: Upload, label: 'Upload Existing Resume', desc: 'Import and improve your current resume' },
              { choice: 'template' as const, icon: Layout, label: 'Use a Template', desc: 'Start with a professionally designed layout' },
            ]).map((opt, i) => (
              <motion.button
                key={opt.choice}
                onClick={() => handleChoice(opt.choice)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl glass-elevated border-glow text-left active:scale-[0.97] transition-all touch-manipulation"
                initial={{ opacity: 0, y: 20 }}
                animate={activeIndex === 3 ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.15 + i * 0.1 }}
                whileTap={{ scale: 0.97 }}
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                  <opt.icon className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto flex-shrink-0" />
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Dots + CTA */}
      <div className="p-6 pb-safe space-y-6">
        {/* Dots */}
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalScreens }).map((_, index) => (
            <button
              key={index}
              onClick={() => { haptics.selection(); scrollToIndex(index); }}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                index === activeIndex ? 'w-8 bg-primary' : 'w-2 bg-muted-foreground/30'
              )}
            />
          ))}
        </div>

        {/* CTA - hidden on last screen since choices act as CTA */}
        {!isLastScreen && (
          <Button
            size="lg"
            onClick={handleNext}
            className="w-full h-14 text-lg font-semibold gradient-primary"
            style={{ boxShadow: '0 8px 32px -8px hsl(var(--primary) / 0.5)' }}
          >
            {activeIndex === 0 ? 'Get Started' : 'Next'}
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default OnboardingCarousel;
