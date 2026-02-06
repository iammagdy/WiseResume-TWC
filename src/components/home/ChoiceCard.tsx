import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChoiceCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  delay?: number;
  className?: string;
}

export function ChoiceCard({
  icon: Icon,
  title,
  description,
  onClick,
  delay = 0,
  className,
}: ChoiceCardProps) {
  return (
    <motion.button
      className={cn(
        'w-full p-5 rounded-2xl glass-elevated text-left',
        'flex items-center gap-4 touch-manipulation transition-all',
        'border-glow hover:scale-[1.01] active:scale-[0.98]',
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
    >
      <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center shrink-0 shadow-[0_0_24px_-4px_hsl(var(--primary)/0.4)]">
        <Icon className="w-7 h-7 text-primary-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-base mb-0.5">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </motion.button>
  );
}
