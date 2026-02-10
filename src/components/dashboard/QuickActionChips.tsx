import { motion } from 'framer-motion';
import { Upload, FileText, Mic } from 'lucide-react';
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
    bg: 'bg-primary/10',
    iconColor: 'text-primary',
    borderColor: 'border-primary/20',
  },
  {
    icon: Upload,
    label: 'Upload PDF',
    action: 'upload',
    bg: 'bg-secondary/10',
    iconColor: 'text-secondary',
    borderColor: 'border-secondary/20',
  },
  {
    icon: Mic,
    label: 'Interview',
    action: 'interview',
    bg: 'bg-success/10',
    iconColor: 'text-success',
    borderColor: 'border-success/20',
  },
];

export function QuickActionChips({ onCreateNew }: QuickActionChipsProps) {
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
      case 'interview':
        navigate('/interview');
        break;
    }
  };

  return (
    <div className="px-4 pb-3">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide scroll-fade-x -mx-1 px-1">
        {actions.map((item, i) => (
          <motion.button
            key={item.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.06 }}
            onClick={() => handleAction(item.action)}
            className={cn(
              'flex flex-col items-center gap-1.5 px-5 py-3 rounded-2xl',
              'border whitespace-nowrap',
              item.bg, item.borderColor,
              'touch-manipulation active:scale-95 transition-transform',
              'min-h-[64px] min-w-[80px] flex-shrink-0'
            )}
            whileTap={{ scale: 0.93 }}
          >
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              item.bg,
            )}>
              <item.icon className={cn('w-5 h-5', item.iconColor)} />
            </div>
            <span className="text-[11px] font-medium text-foreground">{item.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
