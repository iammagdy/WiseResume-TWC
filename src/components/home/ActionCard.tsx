import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'secondary';
  className?: string;
}

export function ActionCard({
  icon: Icon,
  title,
  description,
  onClick,
  variant = 'default',
  className,
}: ActionCardProps) {
  return (
    <motion.button
      className={cn(
        'flex flex-col items-start p-4 rounded-2xl text-left transition-all min-h-[120px]',
        'touch-manipulation active:scale-[0.98]',
        variant === 'default' && 'bg-card border border-border hover:border-primary/50',
        variant === 'primary' && 'gradient-primary text-primary-foreground',
        variant === 'secondary' && 'bg-secondary text-secondary-foreground',
        className
      )}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
    >
      <div
        className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center mb-3',
          variant === 'default' && 'bg-primary/10',
          variant === 'primary' && 'bg-white/20',
          variant === 'secondary' && 'bg-primary/10'
        )}
      >
        <Icon
          className={cn(
            'w-6 h-6',
            variant === 'default' && 'text-primary',
            variant === 'primary' && 'text-white',
            variant === 'secondary' && 'text-primary'
          )}
        />
      </div>
      <h3 className="font-semibold text-base mb-1">{title}</h3>
      <p
        className={cn(
          'text-sm',
          variant === 'default' && 'text-muted-foreground',
          variant === 'primary' && 'text-white/80',
          variant === 'secondary' && 'text-muted-foreground'
        )}
      >
        {description}
      </p>
    </motion.button>
  );
}
