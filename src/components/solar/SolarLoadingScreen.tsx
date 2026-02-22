export function SolarLoadingScreen() {
  return (
    <div className="fixed inset-0 bg-[hsl(240_20%_2%)] flex flex-col items-center justify-center z-50 overflow-hidden">
      {/* Twinkle star dots */}
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            width: 1.5 + Math.random() * 1.5,
            height: 1.5 + Math.random() * 1.5,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            opacity: 0.2 + Math.random() * 0.5,
            animation: `twinkle ${2 + Math.random() * 3}s ease-in-out ${Math.random() * 2}s infinite`,
          }}
        />
      ))}

      {/* Animated sun loader */}
      <div className="relative w-20 h-20 mb-8">
        {/* Outer corona ring */}
        <div
          className="absolute -inset-4 rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(33 100% 50% / 0.2) 0%, transparent 70%)',
            animation: 'sun-pulse 2.5s ease-in-out infinite',
          }}
        />
        {/* Main sun body */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle at 35% 35%, hsl(50 100% 92%) 0%, hsl(43 96% 75%) 25%, hsl(33 100% 50%) 55%, hsl(20 100% 40%) 85%)',
            boxShadow: '0 0 40px hsl(33 100% 50% / 0.5), 0 0 80px hsl(33 100% 50% / 0.2)',
            animation: 'solar-loader-scale 2.5s ease-in-out infinite',
          }}
        />
        {/* Spinning corona accent */}
        <div
          className="absolute -inset-3 rounded-full"
          style={{
            background: 'conic-gradient(from 0deg, transparent 0%, hsl(33 100% 50% / 0.25) 25%, transparent 50%)',
            animation: 'solar-loader-spin 3s linear infinite',
          }}
        />
      </div>

      <p className="text-sm font-display font-bold tracking-[0.3em] uppercase text-white/60">
        WISE AI
      </p>
      <p className="text-xs text-white/30 mt-2 tracking-wider">
        Initializing universe...
      </p>

      <style>{`
        @keyframes solar-loader-scale {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes solar-loader-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
