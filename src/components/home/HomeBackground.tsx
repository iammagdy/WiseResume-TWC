interface HomeBackgroundProps {
  children: React.ReactNode;
}

export function HomeBackground({ children }: HomeBackgroundProps) {
  return (
    <div className="relative min-h-full">
      {/* Subtle gradient overlays */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Top-left primary gradient */}
        <div 
          className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full opacity-[0.08]"
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)',
          }}
        />
        {/* Bottom-right secondary gradient */}
        <div 
          className="absolute -bottom-1/4 -right-1/4 w-[500px] h-[500px] rounded-full opacity-[0.06]"
          style={{
            background: 'radial-gradient(circle, hsl(var(--secondary)) 0%, transparent 70%)',
          }}
        />
        {/* Center accent glow */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] opacity-[0.03]"
          style={{
            background: 'radial-gradient(ellipse, hsl(var(--accent)) 0%, transparent 60%)',
          }}
        />
      </div>
      
      {/* Content layer */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
