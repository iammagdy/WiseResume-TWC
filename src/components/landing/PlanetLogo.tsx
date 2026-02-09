import { AppIcon } from '@/components/brand/AppIcon';

interface PlanetLogoProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizeConfig = {
  sm: { planet: 100, icon: 64, orbit: 130 },
  md: { planet: 140, icon: 90, orbit: 175 },
  lg: { planet: 180, icon: 115, orbit: 220 },
};

export function PlanetLogo({ size = 'lg' }: PlanetLogoProps) {
  const config = sizeConfig[size];
  
  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Orbital ring - CSS animation */}
      <div
        className="absolute rounded-full border border-primary/30 animate-orbit-rotate"
        style={{
          width: config.orbit,
          height: config.orbit * 0.35,
        }}
      />
      
      {/* Outer glow - CSS animation */}
      <div
        className="absolute rounded-full animate-glow-pulse"
        style={{
          width: config.planet * 1.3,
          height: config.planet * 1.3,
          background: 'radial-gradient(circle, hsl(270 100% 65% / 0.35) 0%, transparent 70%)',
        }}
      />

      {/* Planet body - CSS float */}
      <div
        className="relative rounded-full overflow-hidden flex items-center justify-center animate-float-gentle"
        style={{
          width: config.planet,
          height: config.planet,
          background: `radial-gradient(circle at 30% 30%, hsl(270 80% 55%) 0%, hsl(270 60% 35%) 50%, hsl(240 40% 18%) 100%)`,
          boxShadow: `
            inset -12px -12px 35px hsl(240 40% 10% / 0.8),
            inset 6px 6px 25px hsl(270 80% 70% / 0.35),
            0 0 50px hsl(270 100% 65% / 0.45),
            0 0 100px hsl(270 100% 65% / 0.2)
          `,
        }}
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
      </div>
    </div>
  );
}
