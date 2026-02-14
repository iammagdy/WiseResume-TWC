import { memo } from 'react';
import { motion, useMotionValue, useTransform, animate, PanInfo } from 'framer-motion';
import { MoreVertical, FileText, Trash2, Copy } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CoverLetterRecord } from '@/hooks/useCoverLetters';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

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
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-SWIPE_THRESHOLD, -20], [1, 0]);
  const duplicateOpacity = useTransform(x, [20, SWIPE_THRESHOLD], [0, 1]);
  let isDragging = false;

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    isDragging = false;
    if (info.offset.x <= -SWIPE_THRESHOLD) {
      haptics.warning();
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 });
      onDelete(letter.id);
    } else if (info.offset.x >= SWIPE_THRESHOLD) {
      haptics.success();
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 });
      onDuplicate(letter.id);
    } else {
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 });
    }
  };

  const toneColors: Record<string, string> = {
    professional: 'bg-primary/10 text-primary',
    enthusiastic: 'bg-warning/10 text-warning',
    conversational: 'bg-secondary/10 text-secondary',
  };

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
            <span className="font-medium text-sm">Duplicate</span>
          </div>
        </motion.div>
        <motion.div
          className="flex-1 bg-destructive/15 backdrop-blur-sm flex items-center justify-end pr-4"
          style={{ opacity: deleteOpacity }}
        >
          <div className="flex items-center gap-2 text-destructive">
            <span className="font-medium text-sm">Delete</span>
            <Trash2 className="w-5 h-5" />
          </div>
        </motion.div>
      </div>

      <motion.div
        className="relative glass-elevated p-4 touch-manipulation cursor-pointer active:bg-muted/30 transition-all"
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
          <div className="w-10 h-10 rounded-xl glass-surface flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{letter.title || letter.job_title}</h3>
            <p className="text-sm text-muted-foreground truncate">
              {letter.company || 'No company'} · {letter.created_at ? formatDistanceToNow(new Date(letter.created_at), { addSuffix: true }) : ''}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0 h-5 capitalize', toneColors[letter.tone || 'professional'])}>
                {letter.tone || 'professional'}
              </Badge>
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
            aria-label="More options"
          >
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
});
