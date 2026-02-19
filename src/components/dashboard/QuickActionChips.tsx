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
    iconColor: 'text-primary',
  },
  {
    icon: Upload,
    label: 'Upload PDF',
    action: 'upload',
    iconColor: 'text-secondary',
  },
  {
    icon: Mic,
    label: 'Interview',
    action: 'interview',
    iconColor: 'text-success',
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
    <div className="px-4 pb-4">
      <div className="flex gap-2">
        {actions.map((item, i) => (
          <motion.button
            key={item.label}
            style={{ touchAction: 'pan-y' }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.06 }}
            onClick={() => handleAction(item.action)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full',
              'glass-surface border-glow',
              'touch-manipulation active:scale-95 transition-transform',
              'min-h-[44px]'
            )}
            whileTap={{ scale: 0.93 }}
          >
            <item.icon className={cn('w-4 h-4', item.iconColor)} />
            <span className="text-xs font-medium text-foreground">{item.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
