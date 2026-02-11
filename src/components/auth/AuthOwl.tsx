import { motion, useAnimation } from 'framer-motion';
import { useEffect } from 'react';

interface AuthOwlProps {
  focusedField: 'email' | 'phone' | 'password' | null;
  showPassword: boolean;
  textLength: number;
  shake: boolean;
  success: boolean;
}

export function AuthOwl({ focusedField, showPassword, textLength, shake, success }: AuthOwlProps) {
  const controls = useAnimation();

  // Shake animation on error
  useEffect(() => {
    if (shake) {
      controls.start({
        x: [0, -8, 8, -6, 6, -3, 3, 0],
        transition: { duration: 0.5 },
      });
    }
  }, [shake, controls]);

  // Success bounce
  useEffect(() => {
    if (success) {
      controls.start({
        y: [0, -16, 0, -8, 0],
        transition: { duration: 0.6, ease: 'easeOut' },
      });
    }
  }, [success, controls]);

  const isPassword = focusedField === 'password';
  const isTyping = focusedField === 'email' || focusedField === 'phone';

  // Pupil tracking based on text length (maps 0-30 chars to -6..6 px offset)
  const pupilOffset = isTyping ? Math.min(Math.max((textLength - 10) * 0.5, -6), 6) : 0;

  // Wing/hand Y position: down = 0, covering eyes = -28
  const handY = isPassword && !showPassword ? -28 : 0;

  // Squint for "show password" (one eye narrower)
  const leftEyeScaleY = isPassword && showPassword ? 0.35 : 1;
  const rightEyeScaleY = 1;

  // Eye openness
  const eyeHeight = isPassword && !showPassword ? 0 : 14;

  return (
    <motion.div
      animate={controls}
      className="flex justify-center mb-4"
    >
      <motion.svg
        width="140"
        height="140"
        viewBox="0 0 140 140"
        fill="none"
        animate={success ? { scale: [1, 1.15, 1] } : {}}
        transition={{ duration: 0.5 }}
      >
        {/* Body */}
        <motion.ellipse
          cx="70"
          cy="85"
          rx="42"
          ry="45"
          fill="hsl(var(--primary) / 0.18)"
          stroke="hsl(var(--primary) / 0.4)"
          strokeWidth="2"
        />
        {/* Inner body lighter */}
        <ellipse cx="70" cy="90" rx="30" ry="32" fill="hsl(var(--primary) / 0.08)" />

        {/* Ears / Tufts */}
        <motion.path
          d="M38 48 L28 22 L48 40 Z"
          fill="hsl(var(--primary) / 0.25)"
          stroke="hsl(var(--primary) / 0.4)"
          strokeWidth="1.5"
          animate={{ rotate: shake ? [0, -8, 8, 0] : 0 }}
          style={{ originX: '38px', originY: '48px' }}
        />
        <motion.path
          d="M102 48 L112 22 L92 40 Z"
          fill="hsl(var(--primary) / 0.25)"
          stroke="hsl(var(--primary) / 0.4)"
          strokeWidth="1.5"
          animate={{ rotate: shake ? [0, 8, -8, 0] : 0 }}
          style={{ originX: '102px', originY: '48px' }}
        />

        {/* Eye sockets (white) */}
        <circle cx="52" cy="68" r="16" fill="hsl(var(--foreground) / 0.95)" />
        <circle cx="88" cy="68" r="16" fill="hsl(var(--foreground) / 0.95)" />

        {/* Eye outlines */}
        <circle cx="52" cy="68" r="16" fill="none" stroke="hsl(var(--primary) / 0.3)" strokeWidth="1.5" />
        <circle cx="88" cy="68" r="16" fill="none" stroke="hsl(var(--primary) / 0.3)" strokeWidth="1.5" />

        {/* Eyelids (close over eyes when password) */}
        <motion.rect
          x="36"
          y="52"
          width="32"
          height="32"
          rx="16"
          fill="hsl(var(--primary) / 0.22)"
          initial={{ scaleY: 0 }}
          animate={{
            scaleY: isPassword && !showPassword ? 1 : 0,
            originY: '52px',
          }}
          style={{ transformOrigin: '52px 52px' }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        />
        <motion.rect
          x="72"
          y="52"
          width="32"
          height="32"
          rx="16"
          fill="hsl(var(--primary) / 0.22)"
          initial={{ scaleY: 0 }}
          animate={{
            scaleY: isPassword && !showPassword ? 1 : 0,
          }}
          style={{ transformOrigin: '88px 52px' }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        />

        {/* Pupils - track text when typing */}
        <motion.g
          animate={{ opacity: isPassword && !showPassword ? 0 : 1 }}
          transition={{ duration: 0.15 }}
        >
          {/* Left eye */}
          <motion.g animate={{ scaleY: leftEyeScaleY }} style={{ transformOrigin: '52px 68px' }}>
            <motion.circle
              cx={52}
              cy={68}
              r="7"
              fill="hsl(var(--background))"
              animate={{ cx: 52 + pupilOffset }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            />
            {/* Highlight */}
            <motion.circle
              cx={49}
              cy={65}
              r="2.5"
              fill="hsl(var(--foreground) / 0.4)"
              animate={{ cx: 49 + pupilOffset * 0.6 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            />
          </motion.g>

          {/* Right eye */}
          <motion.g animate={{ scaleY: rightEyeScaleY }} style={{ transformOrigin: '88px 68px' }}>
            <motion.circle
              cx={88}
              cy={68}
              r="7"
              fill="hsl(var(--background))"
              animate={{ cx: 88 + pupilOffset }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            />
            <motion.circle
              cx={85}
              cy={65}
              r="2.5"
              fill="hsl(var(--foreground) / 0.4)"
              animate={{ cx: 85 + pupilOffset * 0.6 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            />
          </motion.g>
        </motion.g>

        {/* Eyebrows */}
        <motion.line
          x1="40"
          y1="50"
          x2="58"
          y2="52"
          stroke="hsl(var(--primary) / 0.5)"
          strokeWidth="2.5"
          strokeLinecap="round"
          animate={{
            y1: shake ? 46 : isPassword ? 48 : 50,
            y2: shake ? 48 : isPassword ? 50 : 52,
          }}
          transition={{ type: 'spring', stiffness: 300 }}
        />
        <motion.line
          x1="100"
          y1="50"
          x2="82"
          y2="52"
          stroke="hsl(var(--primary) / 0.5)"
          strokeWidth="2.5"
          strokeLinecap="round"
          animate={{
            y1: shake ? 46 : isPassword ? 48 : 50,
            y2: shake ? 48 : isPassword ? 50 : 52,
          }}
          transition={{ type: 'spring', stiffness: 300 }}
        />

        {/* Beak */}
        <path
          d="M64 82 L70 90 L76 82 Z"
          fill="hsl(var(--warning))"
          stroke="hsl(var(--warning) / 0.6)"
          strokeWidth="1"
        />

        {/* Wings / Hands */}
        <motion.g
          animate={{ y: handY }}
          transition={{ type: 'spring', stiffness: 250, damping: 18 }}
        >
          {/* Left wing */}
          <motion.path
            d="M28 95 Q22 85 26 75 Q30 82 34 88 Q30 92 28 95Z"
            fill="hsl(var(--primary) / 0.3)"
            stroke="hsl(var(--primary) / 0.4)"
            strokeWidth="1.5"
            animate={shake ? { rotate: [0, -15, 15, -10, 10, 0] } : {}}
            style={{ transformOrigin: '30px 88px' }}
          />
          {/* Right wing */}
          <motion.path
            d="M112 95 Q118 85 114 75 Q110 82 106 88 Q110 92 112 95Z"
            fill="hsl(var(--primary) / 0.3)"
            stroke="hsl(var(--primary) / 0.4)"
            strokeWidth="1.5"
            animate={shake ? { rotate: [0, 15, -15, 10, -10, 0] } : {}}
            style={{ transformOrigin: '110px 88px' }}
          />
        </motion.g>

        {/* Feet */}
        <ellipse cx="58" cy="128" rx="8" ry="4" fill="hsl(var(--warning) / 0.7)" />
        <ellipse cx="82" cy="128" rx="8" ry="4" fill="hsl(var(--warning) / 0.7)" />

        {/* Success sparkles */}
        {success && (
          <>
            <motion.circle
              cx="30"
              cy="30"
              r="3"
              fill="hsl(var(--warning))"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
              transition={{ duration: 0.8, delay: 0.1 }}
            />
            <motion.circle
              cx="110"
              cy="25"
              r="2.5"
              fill="hsl(var(--secondary))"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
              transition={{ duration: 0.8, delay: 0.2 }}
            />
            <motion.circle
              cx="20"
              cy="55"
              r="2"
              fill="hsl(var(--accent))"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
              transition={{ duration: 0.8, delay: 0.3 }}
            />
            <motion.circle
              cx="120"
              cy="50"
              r="2"
              fill="hsl(var(--primary))"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
              transition={{ duration: 0.8, delay: 0.15 }}
            />
          </>
        )}
      </motion.svg>
    </motion.div>
  );
}
