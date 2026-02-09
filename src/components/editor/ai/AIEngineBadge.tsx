import { memo, useState } from 'react';
import { Sparkles, Diamond, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIProviderInfo } from '@/hooks/useAIProviderInfo';
import { haptics } from '@/lib/haptics';
import { AISettingsSheet } from '@/components/settings/AISettingsSheet';
import './AIEngineBadge.css';

interface AIEngineBadgeProps {
  showSettingsLink?: boolean;
  className?: string;
}

export const AIEngineBadge = memo(function AIEngineBadge({
  showSettingsLink = false,
  className,
}: AIEngineBadgeProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const providerInfo = useAIProviderInfo();

  const handleClick = () => {
    if (showSettingsLink) {
      haptics.light();
      setSheetOpen(true);
    }
  };

  const isGemini = providerInfo.provider === 'gemini';
  const IconComponent = isGemini ? Diamond : Sparkles;

  return (
    <>
      <button
        onClick={handleClick}
        disabled={!showSettingsLink}
        className={cn(
          'ai-engine-badge',
          showSettingsLink && 'cursor-pointer active:scale-[0.98]',
          !showSettingsLink && 'cursor-default',
          className
        )}
      >
        <div className="ai-engine-badge-inner">
          {/* Floating particles */}
          <span className="ai-engine-particle" />
          <span className="ai-engine-particle" />

          {/* Pulsing icon */}
          <IconComponent 
            className="w-4 h-4 ai-engine-icon text-primary" 
          />

          {/* Shimmer text */}
          <span className="ai-engine-text text-sm font-medium">
            Powered by {providerInfo.name}
          </span>

          {/* Settings gear */}
          {showSettingsLink && (
            <Settings className="w-4 h-4 ai-engine-settings text-muted-foreground" />
          )}
        </div>
      </button>

      <AISettingsSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
});
