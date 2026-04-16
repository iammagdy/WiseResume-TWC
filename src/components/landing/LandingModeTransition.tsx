import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LandingModeTransitionProps {
  waveKey: number;
  waveColor: string;
  origin: { x: number; y: number };
  onWaveComplete?: () => void;
}

export function LandingModeTransition({
  waveKey,
  waveColor,
  origin,
  onWaveComplete,
}: LandingModeTransitionProps) {
  const callbackRef = useRef(onWaveComplete);

  useEffect(() => {
    callbackRef.current = onWaveComplete;
  });

  return (
    <AnimatePresence>
      {waveKey > 0 && (
        <motion.div
          key={waveKey}
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 50,
            background: `radial-gradient(circle at ${origin.x}px ${origin.y}px, ${waveColor} 0%, transparent 70%)`,
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 2.5 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          onAnimationComplete={() => {
            callbackRef.current?.();
          }}
        />
      )}
    </AnimatePresence>
  );
}
