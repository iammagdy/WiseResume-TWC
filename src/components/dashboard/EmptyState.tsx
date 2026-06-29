import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { FileText, Plus, Sparkles, Download, Upload, ArrowRight, LayoutGrid, Lightbulb, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TemplateId } from '@/types/resume';
import { MiniTemplateThumbnail } from './MiniTemplateThumbnail';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useLocale } from '@/i18n/LocaleProvider';

interface EmptyStateProps {
  onCreateNew: () => void;
  onBrowseTemplates?: () => void;
  onStartOnboarding?: () => void;
  onImportProfile?: () => void;
}

const templatePreviews: Array<{ id: TemplateId; name: string; popular: boolean }> = [
  { id: 'modern', name: 'Modern', popular: true },
  { id: 'classic', name: 'Classic', popular: false },
  { id: 'minimal', name: 'Minimal', popular: false },
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

export function EmptyState({ onCreateNew, onBrowseTemplates, onStartOnboarding, onImportProfile }: EmptyStateProps) {
  const shouldReduceMotion = useReducedMotion();
  const { t, locale } = useLocale();

  const steps = [
    { icon: Upload, label: t('app.emptyState.step1Label', 'Create or Upload'), description: t('app.emptyState.step1Desc', 'Start from scratch or import a PDF') },
    { icon: Sparkles, label: t('app.emptyState.step2Label', 'AI Enhances It'), description: t('app.emptyState.step2Desc', 'Tailor content for any job posting') },
    { icon: Download, label: t('app.emptyState.step3Label', 'Download PDF'), description: t('app.emptyState.step3Desc', 'Export an ATS-ready resume instantly') },
  ];

  const carouselTips = [
    t('app.emptyState.tip1', 'Keep your resume to 1-2 pages maximum'),
    t('app.emptyState.tip2', 'Use action verbs to describe achievements'),
    t('app.emptyState.tip3', 'Tailor your resume for each job'),
    t('app.emptyState.tip4', 'Include quantifiable results'),
  ];
  const [activeTipIndex, setActiveTipIndex] = useState(0);
  const [tipPaused, setTipPaused] = useState(false);

  useEffect(() => {
    if (tipPaused || shouldReduceMotion) return;
    const interval = setInterval(() => {
      setActiveTipIndex(prev => (prev + 1) % carouselTips.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [tipPaused, shouldReduceMotion]);

  return (
    <motion.div
      initial={shouldReduceMotion ? undefined : 'hidden'}
      animate={shouldReduceMotion ? undefined : 'visible'}
      variants={shouldReduceMotion ? undefined : containerVariants}
      className="relative flex-1 flex flex-col items-center justify-center px-6 py-8 text-center"
    >
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <div
          className="w-80 h-80 rounded-full"
          style={{
            background:
              'radial-gradient(circle, hsl(var(--primary) / 0.14) 0%, transparent 68%)',
          }}
        />
      </div>

      <motion.div
        variants={shouldReduceMotion ? undefined : itemVariants}
        className="bg-card border border-primary/30 shadow-soft-lg rounded-2xl px-6 py-8 w-full max-w-md mb-6 relative overflow-hidden"
      >
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary via-[hsl(340,68%,52%)] to-primary/70" aria-hidden />
        <span className="dashboard-atlas-eyebrow mb-4">{t('app.emptyState.startHere', 'Start here')}</span>
        <motion.div
          initial={shouldReduceMotion ? undefined : { scale: 0.8, y: 8 }}
          animate={shouldReduceMotion ? undefined : { scale: 1, y: 0 }}
          transition={{
            scale: { delay: 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
            y: { duration: 0.6, ease: 'easeOut' },
          }}
          className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-5 relative shadow-soft-lg mt-2"
        >
          <FileText className="w-9 h-9 text-primary-foreground" />
        </motion.div>

        <h2 className="text-h1 text-foreground mb-2">{t('app.emptyState.noResumesYet', 'No resumes yet')}</h2>

        {onStartOnboarding ? (
          <button
            onClick={onStartOnboarding}
            className="text-muted-foreground max-w-sm text-sm underline decoration-dashed underline-offset-4 hover:text-foreground transition-colors"
            aria-label={t('app.emptyState.startTourAria', 'Start onboarding tour')}
          >
            {t('app.emptyState.getStartedSteps', 'Get started in 3 simple steps')}
          </button>
        ) : (
          <p className="text-muted-foreground max-w-sm text-sm">
            {t('app.emptyState.getStartedSteps', 'Get started in 3 simple steps')}
          </p>
        )}
      </motion.div>

      {/* How it works steps — glass card */}
      <motion.div
        variants={shouldReduceMotion ? undefined : itemVariants}
        className="bg-card border border-border shadow-soft rounded-2xl px-5 py-4 w-full max-w-xs mb-5"
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
            aria-label={t('app.emptyState.createResumeWithTemplate', 'Create resume with {{name}} template', { name: t('app.templates.' + tpl.id, tpl.name) })}
            whileTap={{ scale: 0.95 }}
          >
            {tpl.popular && (
              <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 text-[8px] px-1.5 py-0 h-4 bg-primary text-primary-foreground pointer-events-none">
                {t('app.emptyState.popular', 'Popular')}
              </Badge>
            )}
            <div
              className="rounded-xl overflow-hidden border border-border transition-all duration-200 group-hover:scale-105 group-hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)] group-hover:border-primary/40 group-active:scale-95"
              style={{ width: '96px', aspectRatio: '8.5/11' }}
            >
              <ErrorBoundary fallback={<div className="w-full h-full bg-muted rounded-xl" />}>
                <MiniTemplateThumbnail templateId={tpl.id} />
              </ErrorBoundary>
            </div>
            <span className="text-[10px] text-muted-foreground font-medium group-hover:text-foreground transition-colors">{t('app.templates.' + tpl.id, tpl.name)}</span>
          </motion.button>
        ))}
      </motion.div>

      {/* CTA Buttons */}
      <motion.div
        variants={shouldReduceMotion ? undefined : itemVariants}
        className="flex flex-col gap-3 w-full max-w-xs"
      >
        <motion.div animate={shouldReduceMotion ? undefined : { scale: [1, 1.02, 1] }} transition={{ times: [0, 0.5, 1], duration: 0.6, repeat: shouldReduceMotion ? 0 : 1 }}>
          <Button
            size="lg"
            onClick={onCreateNew}
            className="h-12 px-6 text-base font-semibold w-full shadow-soft-md"
            aria-label={t('app.emptyState.createFirstResume', 'Create Your First Resume')}
          >
            <Plus className="w-5 h-5 mr-2" />
            {t('app.emptyState.createFirstResume', 'Create Your First Resume')}
          </Button>
        </motion.div>

        {onImportProfile && (
          <Button
            variant="outline"
            onClick={onImportProfile}
            className="gap-2"
            aria-label={t('app.emptyState.importProfile', 'Import Profile')}
          >
            <FileDown className="w-4 h-4" />
            {t('app.emptyState.importProfile', 'Import Profile')}
          </Button>
        )}
        {onBrowseTemplates && (
          <Button
            variant="outline"
            onClick={onBrowseTemplates}
            className="gap-2"
            aria-label={t('app.emptyState.browseTemplates', 'Browse All Templates')}
          >
            <LayoutGrid className="w-4 h-4" />
            {t('app.emptyState.browseTemplates', 'Browse All Templates')}
            <ArrowRight
              className="w-4 h-4"
              style={{ transform: locale === 'ar' ? 'rotate(180deg)' : undefined }}
            />
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
              aria-label={t('app.emptyState.showTipNum', 'Show tip {{num}}', { num: i + 1 })}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
