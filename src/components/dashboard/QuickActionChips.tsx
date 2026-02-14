import { motion } from 'framer-motion';
import { Upload, FileText, Mic, Mail } from 'lucide-react';
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
    icon: Mail,
    label: 'Cover Letter',
    action: 'cover-letters',
    iconColor: 'text-accent',
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
      case 'cover-letters':
        navigate('/cover-letters');
        break;
      case 'interview':
        navigate('/interview');
        break;
    }
  };

  return (
    <div className="px-4 pb-3">
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
              'flex-1 flex flex-col items-center gap-2 py-3 rounded-2xl',
              'glass-surface border-glow',
              'touch-manipulation active:scale-95 transition-transform',
              'min-h-[72px]'
            )}
            whileTap={{ scale: 0.93 }}
          >
            <div className="w-11 h-11 rounded-xl glass-elevated flex items-center justify-center">
              <item.icon className={cn('w-5 h-5', item.iconColor)} />
            </div>
            <span className="text-[11px] font-medium text-foreground">{item.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
