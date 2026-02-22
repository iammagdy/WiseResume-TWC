export function SolarLoadingScreen() {
  return (
    <div className="fixed inset-0 bg-[hsl(240_20%_2%)] flex flex-col items-center justify-center z-50">
      {/* Animated sun loader */}
      <div className="relative w-20 h-20 mb-8">
        <div
          className="absolute inset-0 rounded-full animate-pulse"
          style={{
            background: 'radial-gradient(circle, hsl(43 96% 80%) 0%, hsl(33 100% 50%) 40%, hsl(20 100% 45%) 70%, transparent 100%)',
          }}
        />
        <div
          className="absolute -inset-3 rounded-full animate-spin"
          style={{
            background: 'conic-gradient(from 0deg, transparent 0%, hsl(33 100% 50% / 0.3) 25%, transparent 50%)',
            animationDuration: '3s',
          }}
        />
      </div>

      <p className="text-sm font-display font-bold tracking-[0.3em] uppercase text-white/60">
        WISE AI
      </p>
      <p className="text-xs text-white/30 mt-2 tracking-wider">
        Initializing universe...
      </p>
    </div>
  );
}
