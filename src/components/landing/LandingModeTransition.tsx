import { motion, AnimatePresence } from 'framer-motion';

export interface LandingModeTransitionProps {
  waveKey: number;
  waveColor: string;
  origin: { x: number; y: number };
  onWaveComplete?: () => void;
}

export function LandingModeTransition({ waveKey, origin, waveColor, onWaveComplete }: LandingModeTransitionProps) {
  if (waveKey === 0) return null;
  return (
    <AnimatePresence>
      <motion.div
        key={waveKey}
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          pointerEvents: 'none',
          background: `radial-gradient(ellipse 90% 55% at ${origin.x}px ${origin.y}px, ${waveColor} 0%, transparent 68%)`,
        }}
        initial={{ opacity: 0, scale: 0.82 }}
        animate={{ opacity: [0, 1, 0.65, 0], scale: [0.82, 1.04, 1.1, 1.15] }}
        transition={{ duration: 0.9, times: [0, 0.33, 0.65, 1], ease: 'easeOut' }}
        onAnimationComplete={onWaveComplete}
      />
    </AnimatePresence>
  );
}
