import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingStepProps {
  icon: LucideIcon;
  title: string;
  description: string;
  isActive: boolean;
  gradient: 'primary' | 'secondary' | 'accent';
}

const gradientClasses = {
  primary: 'from-primary to-accent',
  secondary: 'from-secondary to-primary',
  accent: 'from-accent to-primary',
};

export function OnboardingStep({
  icon: Icon,
  title,
  description,
  isActive,
  gradient,
}: OnboardingStepProps) {
  return (
    <motion.div
      className={cn(
        'flex flex-col items-center text-center px-8 py-12',
        'snap-start snap-always flex-shrink-0 w-full'
      )}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: isActive ? 1 : 0.5, scale: isActive ? 1 : 0.9 }}
      transition={{ duration: 0.3 }}
    >
      {/* Icon with gradient background */}
      <motion.div
        className={cn(
          'w-24 h-24 rounded-3xl flex items-center justify-center mb-8',
          'bg-gradient-to-br',
          gradientClasses[gradient]
        )}
        animate={isActive ? {
          scale: [1, 1.05, 1],
          rotate: [0, 5, -5, 0],
        } : {}}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatType: 'reverse',
        }}
      >
        <Icon className="w-12 h-12 text-white" />
      </motion.div>

      {/* Title */}
      <h2 className="text-2xl font-bold mb-4 gradient-text">
        {title}
      </h2>

      {/* Description */}
      <p className="text-muted-foreground text-lg max-w-xs">
        {description}
      </p>
    </motion.div>
  );
}
