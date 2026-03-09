import { useState, useRef, useCallback } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Check, ShieldCheck } from 'lucide-react';
import { useIsDark } from '@/hooks/useIsDark';

interface SlideCaptchaProps {
  onVerified: () => void;
  verified: boolean;
}

export function SlideCaptcha({ onVerified, verified }: SlideCaptchaProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const x = useMotionValue(0);
  const isDark = useIsDark();

  const HANDLE_SIZE = 44;
  const getMaxX = () => (trackRef.current?.clientWidth ?? 280) - HANDLE_SIZE;

  const progressOpacity = useTransform(x, [0, getMaxX() * 0.5, getMaxX()], [0.6, 0.3, 0]);
  const progressWidth = useTransform(x, (v) => v + HANDLE_SIZE);

  const handleDragEnd = useCallback(() => {
    setDragging(false);
    const max = getMaxX();
    if (x.get() >= max * 0.85) {
      animate(x, max, { type: 'spring', stiffness: 400, damping: 30 });
      onVerified();
    } else {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 25 });
    }
  }, [x, onVerified]);

  // Theme-aware colors
  const trackBg = isDark ? 'hsl(0 0% 100% / 0.06)' : 'hsl(0 0% 0% / 0.06)';
  const trackBorder = isDark ? 'hsl(0 0% 100% / 0.1)' : 'hsl(0 0% 0% / 0.1)';
  const verifiedBg = isDark ? 'hsl(142 70% 45% / 0.15)' : 'hsl(142 70% 45% / 0.12)';
  const verifiedBorder = isDark ? 'hsl(142 70% 45% / 0.3)' : 'hsl(142 70% 45% / 0.35)';

  if (verified) {
    return (
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex items-center justify-center gap-2 h-[44px] rounded-xl"
        style={{
          background: verifiedBg,
          border: `1px solid ${verifiedBorder}`,
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 15, delay: 0.1 }}
        >
          <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
        </motion.div>
        <span className="text-sm font-medium text-green-600 dark:text-green-400">Verified</span>
      </motion.div>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">Slide to verify you're human</p>
      <div
        ref={trackRef}
        className="relative h-[44px] rounded-xl overflow-hidden select-none touch-none"
        style={{
          background: trackBg,
          border: `1px solid ${trackBorder}`,
        }}
      >
        {/* Progress fill */}
        <motion.div
          className="absolute inset-y-0 left-0 rounded-xl"
          style={{
            width: progressWidth,
            background: 'linear-gradient(90deg, hsl(355 85% 52% / 0.2), hsl(355 85% 52% / 0.08))',
          }}
        />

        {/* Hint text */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ opacity: progressOpacity }}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground/70">→ → →</span>
          </div>
        </motion.div>

        {/* Draggable handle */}
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: getMaxX() }}
          dragElastic={0}
          dragMomentum={false}
          onDragStart={() => setDragging(true)}
          onDragEnd={handleDragEnd}
          style={{ x }}
          className="absolute top-0 left-0 h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
          whileTap={{ scale: 1.05 }}
        >
          <div
            className="w-[44px] h-[36px] mx-[4px] rounded-lg flex items-center justify-center transition-shadow"
            style={{
              background: dragging
                ? 'linear-gradient(135deg, hsl(355 85% 55%), hsl(355 85% 45%))'
                : 'linear-gradient(135deg, hsl(355 85% 52%), hsl(330 70% 45%))',
              boxShadow: dragging
                ? '0 0 16px hsl(355 85% 52% / 0.5)'
                : '0 2px 8px hsl(355 85% 52% / 0.3)',
            }}
          >
            <Check className="w-4 h-4 text-white" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
