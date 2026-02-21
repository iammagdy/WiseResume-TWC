import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, FileText, ScanSearch, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { useSettingsStore } from '@/store/settingsStore';

interface AIFloatingButtonProps {
  onClick: () => void;
  hasNotification?: boolean;
  className?: string;
  showQuickActions?: boolean;
  onNewResume?: () => void;
  onScanJob?: () => void;
  onExport?: () => void;
}

export function AIFloatingButton({
  onClick,
  hasNotification = false,
  className,
  showQuickActions = false,
  onNewResume,
  onScanJob,
  onExport,
}: AIFloatingButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleMainClick = () => {
    haptics.medium();
    if (showQuickActions) {
      setIsExpanded(!isExpanded);
    } else {
      onClick();
    }
  };

  const quickActions = [
    { icon: FileText, label: 'New Resume', action: onNewResume, color: 'bg-secondary' },
    { icon: ScanSearch, label: 'Scan Job', action: onScanJob, color: 'bg-accent' },
    { icon: Download, label: 'Export', action: onExport, color: 'bg-success' },
  ].filter(a => a.action);

  return (
    <div className={cn('fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-4 z-40', className)}>
      {/* Quick action buttons */}
      <AnimatePresence>
        {isExpanded && showQuickActions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-16 right-0 flex flex-col gap-2 items-end"
          >
            {quickActions.map((action, index) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, x: 20, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.8 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => {
                  haptics.light();
                  action.action?.();
                  setIsExpanded(false);
                }}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 rounded-full shadow-lg',
                  'touch-manipulation active:scale-95 transition-transform',
                  action.color
                )}
              >
                <action.icon className="w-5 h-5 text-white" />
                <span className="text-sm font-medium text-white whitespace-nowrap">
                  {action.label}
                </span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        className={cn(
          'w-14 h-14 rounded-full',
          'gradient-primary shadow-lg flex items-center justify-center',
          'touch-manipulation active:scale-95 transition-transform'
        )}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleMainClick}
        style={{
          boxShadow: '0 8px 32px -8px hsl(var(--primary) / 0.5)',
        }}
      >
        <motion.div
          animate={{ rotate: isExpanded ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {isExpanded ? (
            <X className="w-6 h-6 text-primary-foreground" />
          ) : (
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          )}
        </motion.div>
        
        {/* Notification dot */}
        {hasNotification && !isExpanded && (
          <span className="absolute top-0 right-0 w-3 h-3 bg-destructive rounded-full border-2 border-background" />
        )}
        
      </motion.button>
    </div>
  );
}
