import { motion } from 'framer-motion';
import { FileText, Sparkles } from 'lucide-react';

interface AppLogoProps {
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function AppLogo({ showTagline = true, size = 'lg' }: AppLogoProps) {
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
      className="flex flex-col items-center gap-3"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Logo Icon */}
      <div className="relative">
        <motion.div
          className={`${s.icon} rounded-2xl gradient-primary flex items-center justify-center shadow-lg`}
          style={{
            boxShadow: '0 8px 32px -8px hsl(var(--primary) / 0.5)',
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <FileText className={`${s.iconInner} text-primary-foreground`} />
        </motion.div>
        
        {/* Sparkle overlay */}
        <motion.div
          className="absolute -top-1 -right-1"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Sparkles className={`${s.sparkle} text-primary`} />
        </motion.div>
      </div>

      {/* App Name */}
      <div className="text-center">
        <h1 className={`${s.name} font-display font-bold gradient-text`}>
          ResumeAI
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
    </motion.div>
  );
}
