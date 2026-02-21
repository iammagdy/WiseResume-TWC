import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { FileText, Plus, Sparkles, Download, Upload, ArrowRight, LayoutGrid, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface EmptyStateProps {
  onCreateNew: () => void;
  onBrowseTemplates?: () => void;
  onStartOnboarding?: () => void;
}

const steps = [
  { icon: Upload, label: 'Create or Upload', description: 'Start from scratch or import a PDF' },
  { icon: Sparkles, label: 'AI Enhances It', description: 'Tailor content for any job posting' },
  { icon: Download, label: 'Download PDF', description: 'Export an ATS-ready resume instantly' },
];

const templatePreviews = [
  { id: 'modern', name: 'Modern', headerColor: 'hsl(var(--primary))', popular: true },
  { id: 'classic', name: 'Classic', headerColor: 'hsl(var(--foreground))', popular: false },
  { id: 'minimal', name: 'Minimal', headerColor: 'hsl(var(--muted-foreground))', popular: false },
];

const carouselTips = [
  'Keep your resume to 1-2 pages maximum',
  'Use action verbs to describe achievements',
  'Tailor your resume for each job',
  'Include quantifiable results',
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const } },
};

export function EmptyState({ onCreateNew, onBrowseTemplates, onStartOnboarding }: EmptyStateProps) {
  const shouldReduceMotion = useReducedMotion();
  const [activeTipIndex, setActiveTipIndex] = useState(0);
  const [tipPaused, setTipPaused] = useState(false);

  // Auto-cycle tips carousel
  useEffect(() => {
    if (tipPaused) return;
    const interval = setInterval(() => {
      setActiveTipIndex(prev => (prev + 1) % carouselTips.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [tipPaused]);

  const motionProps = shouldReduceMotion
    ? { initial: undefined, animate: undefined, variants: undefined }
    : {};

  return (
    <motion.div
      initial={shouldReduceMotion ? undefined : 'hidden'}
      animate={shouldReduceMotion ? undefined : 'visible'}
      variants={shouldReduceMotion ? undefined : containerVariants}
      className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center"
    >
      {/* Animated Floating Icon */}
      <motion.div
        variants={shouldReduceMotion ? undefined : itemVariants}
      >
        <motion.div
          initial={shouldReduceMotion ? undefined : { scale: 0.8, y: 8 }}
          animate={shouldReduceMotion ? undefined : { scale: 1, y: 0 }}
          transition={{
            scale: { delay: 0.1, type: 'spring', stiffness: 200 },
            y: { duration: 0.6, ease: 'easeOut' },
          }}
          className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-5 relative"
          style={{ boxShadow: '0 20px 40px -10px hsl(var(--primary) / 0.4)' }}
        >
          <FileText className="w-8 h-8 text-primary-foreground" />
        </motion.div>
      </motion.div>

      <motion.div variants={shouldReduceMotion ? undefined : itemVariants}>
        <h2 className="text-2xl font-semibold mb-1">No Resumes Yet</h2>
      </motion.div>

      {/* Clickable steps subtitle */}
      <motion.div variants={shouldReduceMotion ? undefined : itemVariants}>
        {onStartOnboarding ? (
          <button
            onClick={onStartOnboarding}
            className="text-muted-foreground mb-6 max-w-sm text-sm underline decoration-dashed underline-offset-4 hover:text-foreground transition-colors"
            aria-label="Start onboarding tour"
          >
            Get started in 3 simple steps
          </button>
        ) : (
          <p className="text-muted-foreground mb-6 max-w-sm text-sm">
            Get started in 3 simple steps
          </p>
        )}
      </motion.div>

      {/* How it works steps with dotted connectors */}
      <motion.div
        variants={shouldReduceMotion ? undefined : itemVariants}
        className="flex flex-col w-full max-w-xs mb-6"
      >
        {steps.map((step, i) => (
          <div key={step.label}>
            <div className="flex items-center gap-3 text-left">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <step.icon className="w-4.5 h-4.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{i + 1}. {step.label}</p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </div>
            {/* Dotted connector line */}
            {i < steps.length - 1 && (
              <div className="ml-[18px] h-3 border-l-2 border-dashed border-primary/20" />
            )}
          </div>
        ))}
      </motion.div>

      {/* Template preview row */}
      <motion.div
        variants={shouldReduceMotion ? undefined : itemVariants}
        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x mb-6 w-full max-w-xs justify-center"
      >
        {templatePreviews.map((tpl, i) => (
          <motion.button
            key={tpl.id}
            onClick={onCreateNew}
            className="flex flex-col items-center gap-1.5 snap-center flex-shrink-0 group relative"
            aria-label={`Create resume with ${tpl.name} template`}
          >
            {tpl.popular && (
              <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 text-[8px] px-1.5 py-0 h-4 bg-primary text-primary-foreground">
                Popular
              </Badge>
            )}
            <div
              className="w-[96px] rounded-xl border border-border bg-card overflow-hidden transition-all duration-200 group-hover:scale-105 group-hover:shadow-xl group-active:scale-95"
              style={{ aspectRatio: '8.5/11' }}
            >
              <div className="h-3 w-full" style={{ backgroundColor: tpl.headerColor }} />
              <div className="p-2 space-y-1.5">
                <div className="h-1.5 w-3/4 rounded-full bg-muted-foreground/20" />
                <div className="h-1 w-full rounded-full bg-muted-foreground/10" />
                <div className="h-1 w-full rounded-full bg-muted-foreground/10" />
                <div className="h-1 w-5/6 rounded-full bg-muted-foreground/10" />
                <div className="h-1.5 w-2/3 rounded-full bg-muted-foreground/20 mt-2" />
                <div className="h-1 w-full rounded-full bg-muted-foreground/10" />
                <div className="h-1 w-4/5 rounded-full bg-muted-foreground/10" />
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">{tpl.name}</span>
          </motion.button>
        ))}
      </motion.div>

      {/* CTA Buttons */}
      <motion.div
        variants={shouldReduceMotion ? undefined : itemVariants}
        className="flex flex-col gap-3 w-full max-w-xs"
      >
        <motion.div
          animate={shouldReduceMotion ? undefined : { scale: [1, 1.03, 1] }}
          transition={{ times: [0, 0.5, 1], duration: 0.6, repeat: 2 }}
        >
          <Button
            size="lg"
            onClick={onCreateNew}
            className="gradient-primary h-12 px-6 text-base font-semibold w-full"
            style={{ boxShadow: '0 8px 32px -8px hsl(var(--primary) / 0.5)' }}
            aria-label="Create your first resume"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Your First Resume
          </Button>
        </motion.div>

        {onBrowseTemplates && (
          <Button
            variant="outline"
            onClick={onBrowseTemplates}
            className="gap-2"
            aria-label="Browse all resume templates"
          >
            <LayoutGrid className="w-4 h-4" />
            Browse All Templates
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </motion.div>

      {/* Tips Carousel */}
      <motion.div
        variants={shouldReduceMotion ? undefined : itemVariants}
        className="mt-6 w-full max-w-xs"
        onMouseEnter={() => setTipPaused(true)}
        onMouseLeave={() => setTipPaused(false)}
        onTouchStart={() => setTipPaused(true)}
        onTouchEnd={() => setTipPaused(false)}
      >
        <div className="glass-surface rounded-xl p-3 min-h-[52px] flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-warning/10 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-3.5 h-3.5 text-warning" />
          </div>
          <AnimatePresence mode="wait">
            <motion.p
              key={activeTipIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="text-[11px] text-muted-foreground leading-relaxed flex-1"
            >
              {carouselTips[activeTipIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
        {/* Navigation dots */}
        <div className="flex justify-center gap-1.5 mt-2">
          {carouselTips.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveTipIndex(i)}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${i === activeTipIndex ? 'bg-primary' : 'bg-muted-foreground/30'}`}
              aria-label={`Show tip ${i + 1}`}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
