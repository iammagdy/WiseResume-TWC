import { X, Eye, Target } from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';
import { motion, AnimatePresence } from 'framer-motion';

interface NextStepBannerProps {
  variant: 'preview' | 'tailor';
  onAction: () => void;
}

const config = {
  preview: {
    icon: Eye,
    text: 'Looking good! Tap Preview to see your resume.',
    actionLabel: 'Preview',
    settingsKey: 'hasSeenPreviewHint' as const,
  },
  tailor: {
    icon: Target,
    text: 'Want to match this to a job? Try AI Tailor.',
    actionLabel: 'Tailor',
    settingsKey: 'hasSeenTailorHint' as const,
  },
};

export function NextStepBanner({ variant, onAction }: NextStepBannerProps) {
  const settings = useSettingsStore();
  const { icon: Icon, text, actionLabel, settingsKey } = config[variant];

  const dismissed = settings[settingsKey];
  const dismiss = () => {
    if (settingsKey === 'hasSeenPreviewHint') settings.setHasSeenPreviewHint(true);
    if (settingsKey === 'hasSeenTailorHint') settings.setHasSeenTailorHint(true);
  };

  if (dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="mx-4 mb-2 flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-3 py-2.5"
      >
        <Icon className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="text-sm text-foreground flex-1">{text}</span>
        <button
          onClick={onAction}
          className="text-xs font-semibold text-primary px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors touch-manipulation min-h-[32px]"
        >
          {actionLabel}
        </button>
        <button
          onClick={dismiss}
          className="p-1 rounded-full hover:bg-muted transition-colors touch-manipulation min-w-[28px] min-h-[28px] flex items-center justify-center"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
