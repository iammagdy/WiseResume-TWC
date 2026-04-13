import { memo } from 'react';
import { Upload, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface QuickActionChipsProps {
  onCreateNew: () => void;
}

const actions = [
  {
    icon: FileText,
    label: 'New Resume',
    action: 'create',
    iconColor: 'text-primary',
    iconBg: 'bg-primary/10'
  },
  {
    icon: Upload,
    label: 'Upload PDF',
    action: 'upload',
    iconColor: 'text-secondary',
    iconBg: 'bg-secondary/10'
  },
];

export const QuickActionChips = memo(function QuickActionChips({ onCreateNew }: QuickActionChipsProps) {
  const navigate = useNavigate();

  const handleAction = (action: string) => {
    haptics.light();
    switch (action) {
      case 'create':
        onCreateNew();
        break;
      case 'upload':
        navigate('/upload');
        break;
    }
  };

  return (
    <div className="px-4 pb-3">
      <div className="flex gap-2">
        {actions.map((item) => (
          <button
            key={item.label}
            onClick={() => handleAction(item.action)}
            className={cn(
              'flex items-center gap-2 py-2.5 px-4 rounded-2xl flex-1',
              'bg-card border border-border',
              'touch-manipulation active:scale-95 transition-all',
              'min-h-[48px] hover:shadow-soft-sm hover:border-primary/20'
            )}
          >
            <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', item.iconBg)}>
              <item.icon className={cn("w-3.5 h-3.5", item.iconColor)} />
            </div>
            <span className="text-sm font-medium text-foreground whitespace-nowrap">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
});
