import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';

interface PlanetLogoProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-20 h-20',
  md: 'w-28 h-28',
  lg: 'w-36 h-36',
};

const iconSizes = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
};

export function PlanetLogo({ size = 'lg' }: PlanetLogoProps) {
  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Orbital ring */}
      <motion.div
        className="absolute rounded-full border border-primary/30"
        style={{
          width: size === 'lg' ? '180px' : size === 'md' ? '140px' : '100px',
          height: size === 'lg' ? '60px' : size === 'md' ? '45px' : '32px',
          transform: 'rotateX(70deg)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      />
      
      {/* Outer glow */}
      <motion.div
        className={`absolute ${sizeClasses[size]} rounded-full`}
        style={{
          background: 'radial-gradient(circle, hsl(270 100% 65% / 0.3) 0%, transparent 70%)',
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Planet body */}
      <motion.div
        className={`relative ${sizeClasses[size]} rounded-full overflow-hidden`}
        style={{
          background: `
            radial-gradient(circle at 30% 30%, hsl(270 80% 50%) 0%, hsl(270 60% 30%) 50%, hsl(240 40% 15%) 100%)
          `,
          boxShadow: `
            inset -10px -10px 30px hsl(240 40% 10% / 0.8),
            inset 5px 5px 20px hsl(270 80% 70% / 0.3),
            0 0 40px hsl(270 100% 65% / 0.4),
            0 0 80px hsl(270 100% 65% / 0.2)
          `,
        }}
        animate={{
          y: [0, -8, 0],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Surface texture */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            background: `
              radial-gradient(ellipse at 60% 40%, hsl(185 100% 50% / 0.5) 0%, transparent 30%),
              radial-gradient(ellipse at 30% 70%, hsl(330 100% 65% / 0.3) 0%, transparent 25%)
            `,
          }}
        />
        
        {/* Document icon in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <FileText className={`${iconSizes[size]} text-primary-foreground/80`} />
        </div>
        
        {/* Atmosphere glow on edge */}
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle at 80% 20%, hsl(185 100% 70% / 0.2) 0%, transparent 40%)',
          }}
        />
      </motion.div>

      {/* Small orbiting moon */}
      <motion.div
        className="absolute w-3 h-3 rounded-full bg-gradient-to-br from-muted to-muted-foreground/50"
        style={{
          boxShadow: '0 0 10px hsl(var(--muted) / 0.5)',
        }}
        animate={{
          rotate: 360,
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        initial={{ x: size === 'lg' ? 80 : size === 'md' ? 60 : 45 }}
      />
    </div>
  );
}
