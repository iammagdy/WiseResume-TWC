import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { FileText, Wand2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { useLocale } from '@/i18n/LocaleProvider';

interface DashboardHeroProps {
  hasResumes: boolean;
  onBuild: () => void;
  onTailor: () => void;
  onContinueEditing?: () => void;
}

export const DashboardHero = memo(function DashboardHero({
  hasResumes,
  onBuild,
  onTailor,
  onContinueEditing,
}: DashboardHeroProps) {
  const shouldReduceMotion = useReducedMotion();
  const { t, locale } = useLocale();

  if (hasResumes) {
    return (
      <motion.section
        initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        aria-label="Quick actions"
        className="relative mx-4 mb-6 overflow-hidden rounded-2xl border border-primary/25 bg-card shadow-soft-md"
      >
        <div className="h-1 w-full bg-primary" aria-hidden />
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" aria-hidden />

        <div className="relative px-5 py-5 sm:py-6">
          <p className="text-label text-primary mb-1 normal-case tracking-wide">
            {t('app.dashboardHero.recommendedNextStep', 'Recommended next step')}
          </p>
          <h2 className="text-h3 text-foreground mb-4 [text-wrap:balance] leading-snug">
            {t('app.dashboardHero.tailorResume', 'Tailor a resume for your next application')}
          </h2>

          <div
            data-testid="returning-user-cta-grid"
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            <Button
              size="lg"
              className="h-12 gap-2.5 justify-center font-semibold shadow-soft-md active:scale-[0.98] touch-manipulation sm:col-span-2"
              onClick={() => { haptics.light(); onTailor(); }}
            >
              <Wand2 className="w-5 h-5 shrink-0" />
              {t('app.dashboardHero.optimizeJob', 'Optimize for a Job')}
              <ArrowRight
                className="w-4 h-4 ml-auto opacity-80 hidden sm:block"
                style={{ transform: locale === 'ar' ? 'rotate(180deg)' : undefined }}
              />
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="h-11 gap-2 justify-center border-border bg-background hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98] touch-manipulation"
              onClick={() => { haptics.light(); onBuild(); }}
            >
              <FileText className="w-4 h-4 shrink-0" />
              {t('app.dashboardHero.buildResume', 'Build a Resume')}
            </Button>

            {onContinueEditing ? (
              <Button
                variant="outline"
                size="lg"
                className="h-11 gap-2 justify-center border-border bg-background hover:border-primary/40 active:scale-[0.98] touch-manipulation"
                onClick={() => { haptics.light(); onContinueEditing(); }}
              >
                {t('app.dashboardHero.continueEditing', 'Continue editing')}
              </Button>
            ) : (
              <div className="hidden sm:block" aria-hidden />
            )}
          </div>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      aria-label="Get started"
      className="relative mx-4 mt-2 mb-6 overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-soft-lg"
    >
      <div className="h-1.5 w-full bg-primary" aria-hidden />
      <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-primary/15 blur-3xl pointer-events-none" aria-hidden />

      <div className="relative px-6 py-8 sm:px-8 sm:py-10 text-center sm:text-left">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-4">
          <Wand2 className="w-3.5 h-3.5" aria-hidden />
          {t('app.dashboardHero.aiPowered', 'AI-powered resume studio')}
        </span>
        <h2 className="text-h1 text-foreground mb-3 leading-tight">
          {t('app.dashboardHero.optimizeResumeTitle', 'Optimize your resume. Get more interviews.')}
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground mb-8 max-w-md mx-auto sm:mx-0 leading-relaxed">
          {t('app.dashboardHero.optimizeResumeSubtitle', 'Start in under two minutes — match any job posting or build a polished CV from scratch.')}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto sm:mx-0">
          <div className="flex flex-col gap-2 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <Button
              size="lg"
              className={cn(
                'h-12 gap-2.5 justify-center font-semibold shadow-soft-md',
                'active:scale-[0.98] touch-manipulation w-full',
              )}
              onClick={() => { haptics.light(); onTailor(); }}
            >
              <Wand2 className="w-5 h-5 shrink-0" />
              {t('app.dashboardHero.optimizeJob', 'Optimize for a Job')}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center leading-snug">
              {t('app.dashboardHero.matchKeywords', 'Match keywords and bullets to a specific role')}
            </p>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl border border-border bg-muted/30 p-4">
            <Button
              size="lg"
              variant="outline"
              className="h-12 gap-2.5 justify-center border-border bg-card hover:border-primary/35 active:scale-[0.98] touch-manipulation w-full"
              onClick={() => { haptics.light(); onBuild(); }}
            >
              <FileText className="w-5 h-5 shrink-0" />
              {t('app.dashboardHero.buildResume', 'Build a Resume')}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center leading-snug">
              {t('app.dashboardHero.professionalTemplates', 'Professional templates with guided sections')}
            </p>
          </div>
        </div>
      </div>
    </motion.section>
  );
});


