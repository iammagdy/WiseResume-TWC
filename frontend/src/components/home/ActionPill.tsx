import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import haptics from '@/lib/haptics';

type PillColor = 'purple' | 'emerald' | 'orange' | 'cyan' | 'pink';

interface ActionPillProps {
  icon: LucideIcon;
  label: string;
  color?: PillColor;
  onClick: () => void;
  className?: string;
}

const colorStyles: Record<PillColor, { bg: string; icon: string; glow: string }> = {
  purple: {
    bg: 'bg-primary/10 border-primary/20',
    icon: 'text-primary',
    glow: 'group-hover:shadow-[0_0_20px_-4px_hsl(var(--primary)/0.4)]',
  },
  emerald: {
    bg: 'bg-success/10 border-success/20',
    icon: 'text-success',
    glow: 'group-hover:shadow-[0_0_20px_-4px_hsl(var(--success)/0.4)]',
  },
  orange: {
    bg: 'bg-warning/10 border-warning/20',
    icon: 'text-warning',
    glow: 'group-hover:shadow-[0_0_20px_-4px_hsl(var(--warning)/0.4)]',
  },
  cyan: {
    bg: 'bg-secondary/10 border-secondary/20',
    icon: 'text-secondary',
    glow: 'group-hover:shadow-[0_0_20px_-4px_hsl(var(--secondary)/0.4)]',
  },
  pink: {
    bg: 'bg-accent/10 border-accent/20',
    icon: 'text-accent',
    glow: 'group-hover:shadow-[0_0_20px_-4px_hsl(var(--accent)/0.4)]',
  },
};

export function ActionPill({
  icon: Icon,
  label,
  color = 'purple',
  onClick,
  className,
}: ActionPillProps) {
  const styles = colorStyles[color];

  const handleClick = () => {
    haptics.light();
    onClick();
  };

  return (
    <motion.button
      className={cn(
        'group flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all duration-300',
        'touch-manipulation active:scale-[0.95] min-w-[72px]',
        styles.bg,
        styles.glow,
        className
      )}
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300',
          'group-hover:scale-110',
          styles.bg
        )}
      >
        <Icon className={cn('w-5 h-5', styles.icon)} />
      </div>
      <span className="text-xs font-medium text-foreground/80">{label}</span>
    </motion.button>
  );
}
