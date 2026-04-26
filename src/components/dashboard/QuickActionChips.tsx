import { memo } from 'react';
import { Upload, FileText, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { haptics } from '@/lib/haptics';
import { preloadLazy } from '@/lib/preloadLazy';

interface QuickActionChipsProps {
  onCreateNew: () => void;
  onImportProfile?: () => void;
}

const actions = [
  {
    icon: FileText,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    label: 'New Resume',
    key: 'new',
  },
  {
    icon: Upload,
    iconBg: 'bg-secondary/10',
    iconColor: 'text-secondary',
    label: 'Upload PDF',
    key: 'upload',
  },
  {
    icon: Download,
    iconBg: 'bg-[#0A66C2]/10',
    iconColor: 'text-[#0A66C2]',
    label: 'Import',
    key: 'import',
  },
];

export const QuickActionChips = memo(function QuickActionChips({ onCreateNew, onImportProfile }: QuickActionChipsProps) {
  const navigate = useNavigate();

  const handleAction = (key: string) => {
    haptics.light();
    if (key === 'new') {
      onCreateNew();
    } else if (key === 'upload') {
      navigate('/upload');
    } else if (key === 'import') {
      onImportProfile?.();
    }
  };

  const visibleActions = onImportProfile ? actions : actions.filter(a => a.key !== 'import');

  return (
    <div className="px-4 pb-3">
      <div className={`grid gap-2.5 ${visibleActions.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {visibleActions.map((action) => (
          <button
            key={action.key}
            onPointerEnter={
              action.key === 'new'
                ? preloadLazy(() => import('@/components/dashboard/CreateResumeDialog'))
                : action.key === 'import'
                ? preloadLazy(() => import('@/components/settings/LinkedInImportSheet'))
                : undefined
            }
            onClick={() => handleAction(action.key)}
            className="flex flex-col items-center gap-2 py-4 px-2 rounded-2xl bg-card border border-border hover:border-primary/20 active:scale-95 transition-all touch-manipulation"
          >
            <div className={`w-10 h-10 rounded-xl ${action.iconBg} flex items-center justify-center shrink-0`}>
              <action.icon className={`w-5 h-5 ${action.iconColor}`} />
            </div>
            <span className="text-[12px] font-medium text-foreground text-center leading-tight">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
});
