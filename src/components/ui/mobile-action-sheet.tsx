import { ReactNode } from 'react';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';

interface ActionSheetOption {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'success';
  disabled?: boolean;
}

interface MobileActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  options: ActionSheetOption[];
  cancelLabel?: string;
}

const DRAG_CLOSE_THRESHOLD = 100;

export function MobileActionSheet({
  open,
  onOpenChange,
  title,
  description,
  options,
  cancelLabel = 'Cancel',
}: MobileActionSheetProps) {
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, DRAG_CLOSE_THRESHOLD], [1, 0.3]);
  const scale = useTransform(y, [0, DRAG_CLOSE_THRESHOLD], [1, 0.95]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > DRAG_CLOSE_THRESHOLD || info.velocity.y > 500) {
      haptics.light();
      onOpenChange(false);
    }
  };

  const handleOptionClick = (option: ActionSheetOption) => {
    if (option.disabled) return;
    
    if (option.variant === 'destructive') {
      haptics.warning();
    } else if (option.variant === 'success') {
      haptics.success();
    } else {
      haptics.medium();
    }
    
    option.onClick();
    onOpenChange(false);
  };

  const variantClasses = {
    default: 'text-foreground hover:bg-muted/50 active:bg-muted',
    destructive: 'text-destructive hover:bg-destructive/10 active:bg-destructive/20',
    success: 'text-success hover:bg-success/10 active:bg-success/20',
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              haptics.light();
              onOpenChange(false);
            }}
          />

          {/* Action Sheet */}
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 px-4 pb-safe"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          >
            <motion.div
              className="glass-elevated rounded-t-3xl overflow-hidden"
              style={{ y, opacity, scale }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/40" />
              </div>

              {/* Header */}
              {(title || description) && (
                <div className="px-4 pb-3 text-center border-b border-border/30">
                  {title && <h3 className="font-semibold text-foreground">{title}</h3>}
                  {description && (
                    <p className="text-sm text-muted-foreground mt-1">{description}</p>
                  )}
                </div>
              )}

              {/* Options */}
              <div className="py-2">
                {options.map((option, index) => (
                  <motion.button
                    key={index}
                    className={cn(
                      'w-full flex items-center justify-center gap-3 py-4 px-6',
                      'text-base font-medium transition-colors touch-manipulation',
                      'border-b border-border/20 last:border-b-0',
                      variantClasses[option.variant || 'default'],
                      option.disabled && 'opacity-50 cursor-not-allowed'
                    )}
                    onClick={() => handleOptionClick(option)}
                    whileTap={!option.disabled ? { scale: 0.98 } : {}}
                    disabled={option.disabled}
                  >
                    {option.icon && <span className="w-5 h-5">{option.icon}</span>}
                    {option.label}
                  </motion.button>
                ))}
              </div>

              {/* Cancel button - separated */}
              <div className="mt-2 mb-4 px-4">
                <motion.button
                  className={cn(
                    'w-full py-4 rounded-2xl glass-surface',
                    'text-base font-semibold text-foreground',
                    'transition-colors touch-manipulation',
                    'hover:bg-muted/50 active:bg-muted'
                  )}
                  onClick={() => {
                    haptics.light();
                    onOpenChange(false);
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  {cancelLabel}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
