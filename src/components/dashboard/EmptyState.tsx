import { useState, useEffect, useRef, Suspense } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { FileText, Plus, Sparkles, Download, Upload, ArrowRight, LayoutGrid, Lightbulb, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TemplateId, ResumeData } from '@/types/resume';
import { templateComponents } from '@/components/editor/TemplateThumbnail';
import { sampleResumeData } from '@/lib/templateData';

interface EmptyStateProps {
  onCreateNew: () => void;
  onBrowseTemplates?: () => void;
  onStartOnboarding?: () => void;
  onImportProfile?: () => void;
}

const steps = [
  { icon: Upload, label: 'Create or Upload', description: 'Start from scratch or import a PDF' },
  { icon: Sparkles, label: 'AI Enhances It', description: 'Tailor content for any job posting' },
  { icon: Download, label: 'Download PDF', description: 'Export an ATS-ready resume instantly' },
];

const templatePreviews: Array<{ id: TemplateId; name: string; popular: boolean }> = [
  { id: 'modern', name: 'Modern', popular: true },
  { id: 'classic', name: 'Classic', popular: false },
  { id: 'minimal', name: 'Minimal', popular: false },
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

function MiniTemplateThumbnail({ templateId }: { templateId: TemplateId }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.165);

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setScale(containerRef.current.offsetWidth / 612);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const TemplateComponent = templateComponents[templateId];
  if (!TemplateComponent) return null;

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden bg-white rounded-xl"
    >
      <Suspense fallback={<div className="w-full h-full bg-gray-100 animate-pulse rounded-xl" />}>
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: '612px',
            height: '792px',
            pointerEvents: 'none',
          }}
        >
          <TemplateComponent resume={sampleResumeData as ResumeData} />
        </div>
      </Suspense>
    </div>
  );
}

export function EmptyState({ onCreateNew, onBrowseTemplates, onStartOnboarding, onImportProfile }: EmptyStateProps) {
  const shouldReduceMotion = useReducedMotion();
  const [activeTipIndex, setActiveTipIndex] = useState(0);
  const [tipPaused, setTipPaused] = useState(false);

  useEffect(() => {
    if (tipPaused) return;
    const interval = setInterval(() => {
      setActiveTipIndex(prev => (prev + 1) % carouselTips.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [tipPaused]);

  return (
    <motion.div
      initial={shouldReduceMotion ? undefined : 'hidden'}
      animate={shouldReduceMotion ? undefined : 'visible'}
      variants={shouldReduceMotion ? undefined : containerVariants}
      className="relative flex-1 flex flex-col items-center justify-center px-6 py-8 text-center"
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <div
          className="w-72 h-72 rounded-full"
          style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.08) 0%, transparent 70%)' }}
        />
      </div>

      {/* Title block — glass container */}
      <motion.div
        variants={shouldReduceMotion ? undefined : itemVariants}
        className="bg-card border border-primary/20 shadow-soft rounded-2xl px-6 py-6 w-full max-w-xs mb-5 relative"
        style={{ boxShadow: '0 8px 32px -8px hsl(var(--primary) / 0.15), inset 0 1px 0 hsl(var(--foreground) / 0.05)' }}
      >
        <motion.div
          initial={shouldReduceMotion ? undefined : { scale: 0.8, y: 8 }}
          animate={shouldReduceMotion ? undefined : { scale: 1, y: 0 }}
          transition={{
            scale: { delay: 0.1, type: 'spring', stiffness: 200 },
            y: { duration: 0.6, ease: 'easeOut' },
          }}
          className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 relative"
          style={{ boxShadow: '0 20px 40px -10px hsl(var(--primary) / 0.4)' }}
        >
          <FileText className="w-8 h-8 text-primary-foreground" />
        </motion.div>

        <h2 className="text-2xl font-semibold mb-1">No Resumes Yet</h2>

        {onStartOnboarding ? (
          <button
            onClick={onStartOnboarding}
            className="text-muted-foreground max-w-sm text-sm underline decoration-dashed underline-offset-4 hover:text-foreground transition-colors"
            aria-label="Start onboarding tour"
          >
            Get started in 3 simple steps
          </button>
        ) : (
          <p className="text-muted-foreground max-w-sm text-sm">
            Get started in 3 simple steps
          </p>
        )}
      </motion.div>

      {/* How it works steps — glass card */}
      <motion.div
        variants={shouldReduceMotion ? undefined : itemVariants}
        className="bg-card backdrop-blur-sm border border-border rounded-2xl px-5 py-4 w-full max-w-xs mb-5"
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
            {i < steps.length - 1 && (
              <div className="ml-[18px] h-3 border-l-2 border-dashed border-primary/20" />
            )}
          </div>
        ))}
      </motion.div>

      {/* Real template preview row */}
      <motion.div
        variants={shouldReduceMotion ? undefined : itemVariants}
        className="flex gap-3 overflow-x-auto scrollbar-hide snap-x mb-5 w-full max-w-xs justify-center"
      >
        {templatePreviews.map((tpl) => (
          <motion.button
            key={tpl.id}
            onClick={onCreateNew}
            className="flex flex-col items-center gap-1.5 snap-center flex-shrink-0 group relative"
            aria-label={`Create resume with ${tpl.name} template`}
            whileTap={{ scale: 0.95 }}
          >
            {tpl.popular && (
              <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 text-[8px] px-1.5 py-0 h-4 bg-primary text-primary-foreground pointer-events-none">
                Popular
              </Badge>
            )}
            <div
              className="rounded-xl overflow-hidden border border-border transition-all duration-200 group-hover:scale-105 group-hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)] group-hover:border-primary/40 group-active:scale-95"
              style={{ width: '96px', aspectRatio: '8.5/11' }}
            >
              <MiniTemplateThumbnail templateId={tpl.id} />
            </div>
            <span className="text-[10px] text-muted-foreground font-medium group-hover:text-foreground transition-colors">{tpl.name}</span>
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

        {onImportProfile && (
          <Button
            variant="outline"
            onClick={onImportProfile}
            className="gap-2"
            aria-label="Import from LinkedIn or another platform"
          >
            <FileDown className="w-4 h-4" />
            Import Profile
          </Button>
        )}
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
        className="mt-5 w-full max-w-xs"
        onMouseEnter={() => setTipPaused(true)}
        onMouseLeave={() => setTipPaused(false)}
        onTouchStart={() => setTipPaused(true)}
        onTouchEnd={() => setTipPaused(false)}
      >
        <div className="bg-card border border-border rounded-xl p-3 min-h-[52px] flex items-center gap-2.5">
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
