import { memo } from 'react';
import { Upload, FileText, BarChart3, Trophy } from 'lucide-react';
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
  {
    icon: BarChart3,
    label: 'Analytics',
    action: 'analytics',
    iconColor: 'text-accent-foreground',
    iconBg: 'bg-accent/10'
  },
  {
    icon: Trophy,
    label: 'Badges',
    action: 'achievements',
    iconColor: 'text-destructive',
    iconBg: 'bg-destructive/10'
  }
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
      case 'analytics':
        navigate('/analytics');
        break;
      case 'achievements':
        navigate('/achievements');
        break;
    }
  };

  return (
    <div className="px-4 pb-4">
      <div className="grid grid-cols-4 gap-2">
        {actions.map((item) => (
          <button
            key={item.label}
            onClick={() => handleAction(item.action)}
            className={cn(
              'flex flex-col items-center gap-1.5 py-3 rounded-2xl',
              'bg-card border border-border',
              'touch-manipulation active:scale-95 transition-all',
              'min-h-[68px] hover:shadow-soft-sm'
            )}
          >
            <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', item.iconBg)}>
              <item.icon className={cn("w-4 h-4", item.iconColor)} />
            </div>
            <span className="text-[11px] font-medium text-foreground">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
});
