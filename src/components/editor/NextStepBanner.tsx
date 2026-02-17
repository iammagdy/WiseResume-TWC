import { memo } from 'react';
import { X, Eye, Target, Mic } from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';

interface NextStepBannerProps {
  variant: 'preview' | 'tailor' | 'interview';
  onAction: () => void;
}

const config = {
  preview: {
    icon: Eye,
    text: 'Looking good! Tap Preview to see your resume.',
    actionLabel: 'Preview',
    settingsKey: 'hasSeenPreviewHint' as const
  },
  tailor: {
    icon: Target,
    text: 'Want to match this to a job? Try AI Tailor.',
    actionLabel: 'Tailor',
    settingsKey: 'hasSeenTailorHint' as const
  },
  interview: {
    icon: Mic,
    text: 'Ready to practice? Try AI Interview Prep.',
    actionLabel: 'Interview',
    settingsKey: 'hasSeenInterviewHint' as const
  }
};

export const NextStepBanner = memo(function NextStepBanner({ variant, onAction }: NextStepBannerProps) {
  const dismissed = useSettingsStore((state) => state[config[variant].settingsKey]);
  const setHasSeenPreviewHint = useSettingsStore((state) => state.setHasSeenPreviewHint);
  const setHasSeenTailorHint = useSettingsStore((state) => state.setHasSeenTailorHint);
  const setHasSeenInterviewHint = useSettingsStore((state) => state.setHasSeenInterviewHint);

  const { icon: Icon, text, actionLabel, settingsKey } = config[variant];

  const dismiss = () => {
    if (settingsKey === 'hasSeenPreviewHint') setHasSeenPreviewHint(true);
    if (settingsKey === 'hasSeenTailorHint') setHasSeenTailorHint(true);
    if (settingsKey === 'hasSeenInterviewHint') setHasSeenInterviewHint(true);
  };

  if (dismissed) return null;

  return (
    <div
      className="mx-4 items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-3 py-2.5 animate-in fade-in-0 slide-in-from-top-2 duration-200 pr-[2px] pl-[2px] pt-[5px] pb-[5px] ml-[10px] mr-[10px] flex flex-row mt-[2px] mb-px">

        <Icon className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="text-sm text-foreground flex-1 font-sans mb-0 pt-0 pr-0 text-left font-medium">{text}</span>
        <button
        onClick={onAction}
        className="text-xs font-semibold text-primary px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors touch-manipulation min-h-[44px] flex items-center">

          {actionLabel}
        </button>
        <button
        onClick={dismiss}
        className="p-1 rounded-full hover:bg-muted transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="Dismiss">

          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>);

});