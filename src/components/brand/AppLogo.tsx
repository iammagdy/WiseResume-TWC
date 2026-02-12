import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { AppIcon } from './AppIcon';

interface AppLogoProps {
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg';
  hideText?: boolean;
}

export function AppLogo({ showTagline = true, size = 'lg', hideText = false }: AppLogoProps) {
  const sizeClasses = {
    sm: {
      icon: 'w-10 h-10',
      iconInner: 'w-5 h-5',
      sparkle: 'w-3 h-3',
      name: 'text-xl',
      tagline: 'text-xs',
    },
    md: {
      icon: 'w-14 h-14',
      iconInner: 'w-7 h-7',
      sparkle: 'w-4 h-4',
      name: 'text-2xl',
      tagline: 'text-sm',
    },
    lg: {
      icon: 'w-16 h-16',
      iconInner: 'w-8 h-8',
      sparkle: 'w-4 h-4',
      name: 'text-3xl',
      tagline: 'text-sm',
    },
  };

  const s = sizeClasses[size];

  return (
    <motion.div
      className={`flex flex-col items-center ${showTagline ? 'gap-3' : 'gap-2'}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Logo Icon */}
      <motion.div
        className="relative"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{
          filter: 'drop-shadow(0 8px 24px hsl(var(--primary) / 0.4))',
        }}
      >
        <AppIcon size={s.icon === 'w-16 h-16' ? 64 : s.icon === 'w-14 h-14' ? 56 : 40} />
      </motion.div>

      {/* App Name */}
      {!hideText && (
        <div className="text-center">
          <h1 className={`${s.name} font-display font-bold gradient-text`}>
            WiseResume
          </h1>
          
          {showTagline && (
            <motion.p
              className={`${s.tagline} text-muted-foreground mt-1`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Your AI Career Partner
            </motion.p>
          )}
        </div>
      )}
    </motion.div>
  );
}
