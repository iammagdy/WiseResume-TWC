import { memo } from 'react';
import { Upload, FileText, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { preloadLazy } from '@/lib/preloadLazy';

interface QuickActionChipsProps {
  onCreateNew: () => void;
  onImportProfile?: () => void;
}

export const QuickActionChips = memo(function QuickActionChips({ onCreateNew, onImportProfile }: QuickActionChipsProps) {
  const navigate = useNavigate();

  return (
    <div className="px-4 pb-3">
      <div className="flex gap-2">
        <button
          onPointerEnter={preloadLazy(() => import('@/components/dashboard/CreateResumeDialog'))}
          onClick={() => { haptics.light(); onCreateNew(); }}
          className={cn(
            'flex items-center gap-2 py-2.5 px-4 rounded-2xl flex-1',
            'bg-card border border-border',
            'touch-manipulation active:scale-95 transition-all',
            'min-h-[48px] hover:shadow-soft-sm hover:border-primary/20',
          )}
        >
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <FileText className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground whitespace-nowrap">New Resume</span>
        </button>

        <button
          onClick={() => { haptics.light(); navigate('/upload'); }}
          className={cn(
            'flex items-center gap-2 py-2.5 px-4 rounded-2xl flex-1',
            'bg-card border border-border',
            'touch-manipulation active:scale-95 transition-all',
            'min-h-[48px] hover:shadow-soft-sm hover:border-primary/20',
          )}
        >
          <div className="w-7 h-7 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
            <Upload className="w-3.5 h-3.5 text-secondary" />
          </div>
          <span className="text-sm font-medium text-foreground whitespace-nowrap">Upload PDF</span>
        </button>

        {onImportProfile && (
          <button
            onPointerEnter={preloadLazy(() => import('@/components/settings/LinkedInImportSheet'))}
            onClick={() => { haptics.light(); onImportProfile(); }}
            className={cn(
              'flex items-center gap-2 py-2.5 px-4 rounded-2xl flex-1',
              'bg-card border border-border',
              'touch-manipulation active:scale-95 transition-all',
              'min-h-[48px] hover:shadow-soft-sm hover:border-primary/20',
            )}
          >
            <div className="w-7 h-7 rounded-lg bg-[#0A66C2]/10 flex items-center justify-center shrink-0">
              <Download className="w-3.5 h-3.5 text-[#0A66C2]" />
            </div>
            <span className="text-sm font-medium text-foreground whitespace-nowrap">Import</span>
          </button>
        )}
      </div>
    </div>
  );
});
