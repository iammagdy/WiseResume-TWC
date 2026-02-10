import { motion } from 'framer-motion';
import { Upload, FileText, Mic, Linkedin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface QuickActionChipsProps {
  onCreateNew: () => void;
}

const actions = [
  { icon: FileText, label: 'New Resume', gradient: 'from-primary/20 to-accent/20', textColor: 'text-primary', action: 'create' },
  { icon: Upload, label: 'Upload PDF', gradient: 'from-secondary/20 to-primary/20', textColor: 'text-secondary', action: 'upload' },
  { icon: Mic, label: 'Interview', gradient: 'from-success/20 to-secondary/20', textColor: 'text-success', action: 'interview' },
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
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.06 }}
            onClick={() => handleAction(item.action)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-full',
              'bg-gradient-to-r whitespace-nowrap',
              item.gradient,
              'border border-border/30',
              'touch-manipulation active:scale-95 transition-transform',
              'min-h-[44px] flex-shrink-0'
            )}
            whileTap={{ scale: 0.95 }}
          >
            <item.icon className={cn('w-4 h-4', item.textColor)} />
            <span className="text-sm font-medium">{item.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
