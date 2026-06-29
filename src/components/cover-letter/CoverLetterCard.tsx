import { memo } from 'react';
import { motion, useMotionValue, useTransform, animate, useReducedMotion, PanInfo } from 'framer-motion';
import { MoreVertical, FileText, Trash2, Copy } from 'lucide-react';
import { safeFormatDistanceToNow } from '@/lib/dateUtils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CoverLetterRecord } from '@/hooks/useCoverLetters';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { useLocale } from '@/i18n/LocaleProvider';

interface CoverLetterCardProps {
  letter: CoverLetterRecord;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onMenuOpen: (id: string) => void;
}

const SWIPE_THRESHOLD = 80;

export const CoverLetterCard = memo(function CoverLetterCard({
  letter,
  onEdit,
  onDuplicate,
  onDelete,
  onMenuOpen,
}: CoverLetterCardProps) {
  const { t } = useLocale();
  const x = useMotionValue(0);
  const prefersReducedMotion = useReducedMotion();
  const deleteOpacity = useTransform(x, [-SWIPE_THRESHOLD, -20], [1, 0]);
  const duplicateOpacity = useTransform(x, [20, SWIPE_THRESHOLD], [0, 1]);
  let isDragging = false;

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    isDragging = false;
    const settle = prefersReducedMotion
      ? { duration: 0 }
      : { duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] };
    if (info.offset.x <= -SWIPE_THRESHOLD) {
      haptics.warning();
      animate(x, 0, settle);
      onDelete(letter.id);
    } else if (info.offset.x >= SWIPE_THRESHOLD) {
      haptics.success();
      animate(x, 0, settle);
      onDuplicate(letter.id);
    } else {
      animate(x, 0, settle);
    }
  };

  const toneColors: Record<string, string> = {
    professional: 'bg-primary/10 text-primary',
    enthusiastic: 'bg-warning/10 text-warning',
    conversational: 'bg-secondary/10 text-secondary',
  };

  // template_style → user-facing label. Legacy 'minimal' aliases to
  // Classic; null hides the badge so old cards look identical.
  const styleLabels: Record<string, string> = {
    professional: t('app.coverLetters.styleClassic', 'Classic'),
    minimal: t('app.coverLetters.styleClassic', 'Classic'),
    modern: t('app.coverLetters.styleModern', 'Modern'),
    compact: t('app.coverLetters.styleCompact', 'Compact'),
    creative: t('app.coverLetters.styleCreative', 'Creative'),
  };
  const styleLabel = letter.template_style ? styleLabels[letter.template_style] : null;

  // Per-style icon mini-thumbnail. Null/unknown keeps the legacy look.
  const normalisedStyle =
    letter.template_style === 'minimal' ? 'professional' : letter.template_style;
  const styleThumbClass: Record<string, string> = {
    professional:
      'bg-card border border-border before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-primary before:rounded-t-xl',
    modern: 'bg-primary text-primary-foreground border border-primary',
    compact: 'bg-card border border-border [&>svg]:scale-90 [&>svg]:opacity-80',
    creative: 'border border-border bg-gradient-to-br from-primary/20 via-card to-accent/20',
  };
  const thumbExtra = normalisedStyle ? styleThumbClass[normalisedStyle] : null;

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Swipe backgrounds */}
      <div className="absolute inset-0 flex">
        <motion.div
          className="flex-1 bg-success/15 backdrop-blur-sm flex items-center pl-4"
          style={{ opacity: duplicateOpacity }}
        >
          <div className="flex items-center gap-2 text-success">
            <Copy className="w-5 h-5" />
            <span className="font-medium text-sm">{t('common.duplicate', 'Duplicate')}</span>
          </div>
        </motion.div>
        <motion.div
          className="flex-1 bg-destructive/15 backdrop-blur-sm flex items-center justify-end pr-4"
          style={{ opacity: deleteOpacity }}
        >
          <div className="flex items-center gap-2 text-destructive">
            <span className="font-medium text-sm">{t('common.delete', 'Delete')}</span>
            <Trash2 className="w-5 h-5" />
          </div>
        </motion.div>
      </div>

      <motion.div
        className="relative bg-card border border-border shadow-soft p-4 touch-manipulation cursor-pointer active:bg-muted transition-all"
        style={{ x, touchAction: 'pan-y' }}
        drag="x"
        dragConstraints={{ left: -150, right: 150 }}
        dragElastic={0.5}
        onDragStart={() => { isDragging = true; }}
        onDragEnd={handleDragEnd}
        onClick={() => {
          if (!isDragging) {
            haptics.light();
            onEdit(letter.id);
          }
        }}
        whileTap={{ scale: isDragging ? 1 : 0.98 }}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'relative w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden',
              thumbExtra ?? 'bg-card border border-border',
            )}
            aria-hidden
          >
            <FileText
              className={cn(
                'w-5 h-5',
                normalisedStyle === 'modern'
                  ? 'text-primary-foreground'
                  : 'text-accent',
              )}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{letter.title || letter.job_title}</h3>
            <p className="text-sm text-muted-foreground truncate">
              {letter.company || t('app.coverLetters.noCompany', 'No company')} · {safeFormatDistanceToNow(letter.created_at, { addSuffix: true }, '')}
            </p>
            {letter.resume_title && (
              <p className="text-[11px] text-muted-foreground/80 truncate mt-0.5">
                {t('app.coverLetters.fromResume', 'From:')} {letter.resume_title}
                {letter.resume_id === null && (
                  <span className="ml-1 italic opacity-75">({t('app.coverLetters.deleted', 'deleted')})</span>
                )}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0 h-5 capitalize', toneColors[letter.tone || 'professional'])}>
                {letter.tone || t('app.coverLetters.toneProfessional', 'professional')}
              </Badge>
              {styleLabel && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-normal text-muted-foreground border-border/60">
                  {styleLabel}
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              haptics.light();
              onMenuOpen(letter.id);
            }}
            aria-label={t('common.moreOptions', 'More options')}
          >
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
});
