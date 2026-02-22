import { motion, useReducedMotion } from 'framer-motion';

const particles = Array.from({ length: 6 }, (_, i) => ({
  id: i,
  angle: (360 / 6) * i,
  delay: i * 0.3,
  radius: 52,
}));

export function PageLoadingSpinner() {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-background flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-primary" />
          </div>
          <span className="text-sm text-muted-foreground">Loading...</span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background flex items-center justify-center">
      <motion.div
        className="flex flex-col items-center gap-6"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* Spinner container */}
        <div className="relative w-28 h-28 flex items-center justify-center">
          {/* Outer glow */}
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/5"
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Orbital ring 1 */}
          <motion.div
            className="absolute inset-2 rounded-full border border-primary/30"
            style={{ borderTopColor: 'hsl(var(--primary))' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
          />

          {/* Orbital ring 2 — tilted */}
          <motion.div
            className="absolute inset-4 rounded-full border border-primary/20"
            style={{
              borderTopColor: 'hsl(var(--primary))',
              transform: 'rotateX(60deg)',
            }}
            animate={{ rotate: -360 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
          />

          {/* Orbital ring 3 — opposite tilt */}
          <motion.div
            className="absolute inset-3 rounded-full border border-primary/15"
            style={{
              borderRightColor: 'hsl(var(--primary) / 0.6)',
              transform: 'rotateY(55deg)',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />

          {/* Pulsing core */}
          <motion.div
            className="relative w-6 h-6 rounded-full bg-primary shadow-[0_0_20px_hsl(var(--primary)/0.5)]"
            animate={{
              scale: [1, 1.25, 1],
              boxShadow: [
                '0 0 15px hsl(var(--primary) / 0.4)',
                '0 0 30px hsl(var(--primary) / 0.7)',
                '0 0 15px hsl(var(--primary) / 0.4)',
              ],
            }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Particles */}
          {particles.map((p) => {
            const rad = (p.angle * Math.PI) / 180;
            const x = Math.cos(rad) * p.radius;
            const y = Math.sin(rad) * p.radius;
            return (
              <motion.div
                key={p.id}
                className="absolute w-1.5 h-1.5 rounded-full bg-primary/60"
                style={{
                  left: '50%',
                  top: '50%',
                  marginLeft: -3,
                  marginTop: -3,
                }}
                animate={{
                  x: [0, x, 0],
                  y: [0, y, 0],
                  opacity: [0, 0.8, 0],
                  scale: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  delay: p.delay,
                  ease: 'easeInOut',
                }}
              />
            );
          })}
        </div>

        {/* Shimmer text */}
        <motion.span
          className="text-sm font-medium text-muted-foreground"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          Loading...
        </motion.span>
      </motion.div>
    </div>
  );
}
