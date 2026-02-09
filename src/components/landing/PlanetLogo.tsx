import { motion } from 'framer-motion';
import { AppIcon } from '@/components/brand/AppIcon';

interface PlanetLogoProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizeConfig = {
  sm: { planet: 80, icon: 40, orbit: 100, moon: 8 },
  md: { planet: 112, icon: 56, orbit: 140, moon: 10 },
  lg: { planet: 144, icon: 72, orbit: 180, moon: 12 },
};

export function PlanetLogo({ size = 'lg' }: PlanetLogoProps) {
  const config = sizeConfig[size];
  
  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Orbital ring */}
      <motion.div
        className="absolute rounded-full border border-primary/30"
        style={{
          width: config.orbit,
          height: config.orbit * 0.35,
          transform: 'rotateX(70deg)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      />
      
      {/* Outer glow */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: config.planet * 1.3,
          height: config.planet * 1.3,
          background: 'radial-gradient(circle, hsl(270 100% 65% / 0.35) 0%, transparent 70%)',
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Planet body with gradient */}
      <motion.div
        className="relative rounded-full overflow-hidden flex items-center justify-center"
        style={{
          width: config.planet,
          height: config.planet,
          background: `
            radial-gradient(circle at 30% 30%, hsl(270 80% 55%) 0%, hsl(270 60% 35%) 50%, hsl(240 40% 18%) 100%)
          `,
          boxShadow: `
            inset -12px -12px 35px hsl(240 40% 10% / 0.8),
            inset 6px 6px 25px hsl(270 80% 70% / 0.35),
            0 0 50px hsl(270 100% 65% / 0.45),
            0 0 100px hsl(270 100% 65% / 0.2)
          `,
        }}
        animate={{
          y: [0, -10, 0],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Surface texture highlights */}
        <div 
          className="absolute inset-0 opacity-25"
          style={{
            background: `
              radial-gradient(ellipse at 65% 35%, hsl(185 100% 55% / 0.5) 0%, transparent 30%),
              radial-gradient(ellipse at 25% 70%, hsl(330 100% 65% / 0.35) 0%, transparent 25%)
            `,
          }}
        />
        
        {/* App Icon in center */}
        <div className="relative z-10">
          <AppIcon size={config.icon} showSparkle={true} />
        </div>
        
        {/* Atmosphere glow on edge */}
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle at 85% 15%, hsl(185 100% 75% / 0.25) 0%, transparent 40%)',
          }}
        />
      </motion.div>

      {/* Orbiting particles */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: config.moon - i * 2,
            height: config.moon - i * 2,
            background: `linear-gradient(135deg, hsl(var(--muted)) 0%, hsl(var(--muted-foreground) / 0.5) 100%)`,
            boxShadow: `0 0 ${8 - i * 2}px hsl(var(--muted) / 0.5)`,
          }}
          animate={{
            rotate: 360,
          }}
          transition={{ 
            duration: 8 + i * 4, 
            repeat: Infinity, 
            ease: 'linear',
            delay: i * 2,
          }}
          initial={{ 
            x: (config.planet / 2 + 15 + i * 12) * Math.cos((i * 120) * Math.PI / 180),
            y: (config.planet / 2 + 15 + i * 12) * Math.sin((i * 120) * Math.PI / 180) * 0.4,
          }}
        />
      ))}
    </div>
  );
}
