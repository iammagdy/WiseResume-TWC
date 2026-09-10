import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { FileText, Plus, Upload, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/i18n/LocaleProvider';

export interface EmptyStateProps {
  onCreateNew: () => void;
  onUploadResume?: () => void;
  checklist?: ReactNode;
}

export function EmptyState({ onCreateNew, onUploadResume, checklist }: EmptyStateProps) {
  const shouldReduceMotion = useReducedMotion();
  const { t } = useLocale();

  return (
    <div className="relative w-full max-w-lg mx-auto flex flex-col items-center justify-center text-center py-6 sm:py-10 px-4">
      {/* Subtle Background Glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center -z-10" aria-hidden="true">
        <div
          className="w-72 sm:w-96 h-72 sm:h-96 rounded-full opacity-60 blur-3xl"
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Main Single Composition Card */}
      <motion.div
        initial={shouldReduceMotion ? undefined : { opacity: 0, y: 12 }}
        animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full rounded-2xl border border-border/80 bg-card/90 shadow-soft-md p-6 sm:p-8 flex flex-col items-center"
      >
        {/* Clean Icon Container */}
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4 shadow-soft-sm">
          <FileText className="w-8 h-8" />
        </div>

        {/* Heading & Subtitle */}
        <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight mb-2">
          {t('app.emptyState.buildFirstResume', 'Build your first resume')}
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mb-6 leading-relaxed">
          {t(
            'app.emptyState.subtitle',
            'Start fresh with ATS-ready templates or upload an existing resume to enhance with AI.',
          )}
        </p>

        {/* Primary Action Buttons Only */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm justify-center">
          <Button
            size="lg"
            onClick={onCreateNew}
            className="w-full sm:w-auto flex-1 h-11 rounded-xl text-xs sm:text-sm font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            {t('app.emptyState.createResume', 'Create Resume')}
          </Button>

          {onUploadResume && (
            <Button
              size="lg"
              variant="outline"
              onClick={onUploadResume}
              className="w-full sm:w-auto flex-1 h-11 rounded-xl text-xs sm:text-sm font-medium border-border/80 hover:bg-muted/50"
            >
              <Upload className="w-4 h-4 mr-1.5" />
              {t('app.emptyState.uploadResume', 'Upload Existing Resume')}
            </Button>
          )}
        </div>

        {/* Concise Value Badges */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-6 pt-5 border-t border-border/50 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            {t('app.emptyState.badgeAts', 'ATS-optimized')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            {t('app.emptyState.badgeAi', 'AI tailoring')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            {t('app.emptyState.badgeExport', 'Instant PDF export')}
          </span>
        </div>
      </motion.div>

      {/* Contextual Getting Started Checklist Slot */}
      {checklist && <div className="w-full mt-4">{checklist}</div>}
    </div>
  );
}
