import { motion, useAnimation } from 'framer-motion';
import { useEffect } from 'react';

interface AuthMonkeyProps {
  focusedField: 'email' | 'phone' | 'password' | null;
  showPassword: boolean;
  textLength: number;
  shake: boolean;
  success: boolean;
}

export function AuthMonkey({ focusedField, showPassword, textLength, shake, success }: AuthMonkeyProps) {
  const controls = useAnimation();

  useEffect(() => {
    if (shake) {
      controls.start({
        x: [0, -8, 8, -6, 6, -3, 3, 0],
        transition: { duration: 0.5 },
      });
    }
  }, [shake, controls]);

  useEffect(() => {
    if (success) {
      controls.start({
        y: [0, -18, 0, -10, 0],
        transition: { duration: 0.6, ease: 'easeOut' },
      });
    }
  }, [success, controls]);

  const isPassword = focusedField === 'password';
  const isTyping = focusedField === 'email' || focusedField === 'phone';

  // Pupil horizontal tracking
  const pupilOffsetX = isTyping ? Math.min(Math.max((textLength - 10) * 0.5, -6), 6) : 0;
  // Look down when typing in email/phone
  const pupilOffsetY = isTyping ? 4 : 0;

  // Hands: resting at sides (0) or covering eyes (-38)
  const handY = isPassword && !showPassword ? -38 : 0;
  // Peeking: left hand drops a bit
  const leftHandY = isPassword && showPassword ? -28 : handY;
  const rightHandY = handY;

  // Eye visibility
  const eyesClosed = isPassword && !showPassword;
  const leftEyeScaleY = isPassword && showPassword ? 0.35 : 1;

  // Mouth
  const smilePath = success
    ? 'M68 108 Q80 122 92 108' // big grin
    : shake
    ? 'M72 108 Q80 112 88 108' // sad
    : 'M70 108 Q80 116 90 108'; // normal smile

  return (
    <motion.div animate={controls} className="flex justify-center mb-4">
      <motion.svg
        width="160"
        height="160"
        viewBox="0 0 160 160"
        fill="none"
        animate={success ? { scale: [1, 1.12, 1] } : {}}
        transition={{ duration: 0.5 }}
      >
        {/* Body */}
        <ellipse cx="80" cy="138" rx="28" ry="18" fill="#7A5C2E" />
        <ellipse cx="80" cy="138" rx="20" ry="13" fill="#DEB860" />

        {/* Arms/Hands - behind head */}
        <motion.g
          animate={{ y: leftHandY }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        >
          {/* Left arm */}
          <path
            d="M38 110 Q28 100 30 85 Q32 78 38 76 Q42 78 40 88 Q38 98 42 108 Z"
            fill="#8B6914"
            stroke="#7A5C2E"
            strokeWidth="1"
          />
          {/* Left hand (fingers) */}
          <ellipse cx="34" cy="76" rx="7" ry="5" fill="#8B6914" stroke="#7A5C2E" strokeWidth="1" />
          <circle cx="30" cy="74" r="3" fill="#8B6914" />
          <circle cx="34" cy="72" r="3" fill="#8B6914" />
          <circle cx="38" cy="73" r="3" fill="#8B6914" />
        </motion.g>

        <motion.g
          animate={{ y: rightHandY }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        >
          {/* Right arm */}
          <path
            d="M122 110 Q132 100 130 85 Q128 78 122 76 Q118 78 120 88 Q122 98 118 108 Z"
            fill="#8B6914"
            stroke="#7A5C2E"
            strokeWidth="1"
          />
          {/* Right hand (fingers) */}
          <ellipse cx="126" cy="76" rx="7" ry="5" fill="#8B6914" stroke="#7A5C2E" strokeWidth="1" />
          <circle cx="122" cy="73" r="3" fill="#8B6914" />
          <circle cx="126" cy="72" r="3" fill="#8B6914" />
          <circle cx="130" cy="74" r="3" fill="#8B6914" />
        </motion.g>

        {/* Head */}
        <circle cx="80" cy="72" r="42" fill="#8B6914" />

        {/* Face area */}
        <ellipse cx="80" cy="78" rx="30" ry="28" fill="#DEB860" />

        {/* Ears - outer */}
        <circle cx="34" cy="58" r="14" fill="#8B6914" stroke="#7A5C2E" strokeWidth="1.5" />
        <circle cx="126" cy="58" r="14" fill="#8B6914" stroke="#7A5C2E" strokeWidth="1.5" />
        {/* Ears - inner pink */}
        <circle cx="34" cy="58" r="8" fill="#E8A0A0" />
        <circle cx="126" cy="58" r="8" fill="#E8A0A0" />

        {/* Eyebrows */}
        <motion.path
          d="M58 58 Q64 52 72 56"
          stroke="#5C4033"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          animate={{
            d: shake
              ? 'M58 54 Q64 48 72 52'
              : success
              ? 'M58 56 Q64 50 72 54'
              : 'M58 58 Q64 52 72 56',
          }}
          transition={{ type: 'spring', stiffness: 300 }}
        />
        <motion.path
          d="M88 56 Q96 52 102 58"
          stroke="#5C4033"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          animate={{
            d: shake
              ? 'M88 52 Q96 48 102 54'
              : success
              ? 'M88 54 Q96 50 102 56'
              : 'M88 56 Q96 52 102 58',
          }}
          transition={{ type: 'spring', stiffness: 300 }}
        />

        {/* Eye whites */}
        <motion.ellipse
          cx="66"
          cy="72"
          rx="11"
          ry="12"
          fill="white"
          stroke="#5C4033"
          strokeWidth="1"
          animate={{ scaleY: eyesClosed ? 0.08 : leftEyeScaleY }}
          style={{ transformOrigin: '66px 72px' }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        />
        <motion.ellipse
          cx="94"
          cy="72"
          rx="11"
          ry="12"
          fill="white"
          stroke="#5C4033"
          strokeWidth="1"
          animate={{ scaleY: eyesClosed ? 0.08 : 1 }}
          style={{ transformOrigin: '94px 72px' }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        />

        {/* Pupils */}
        <motion.g
          animate={{ opacity: eyesClosed ? 0 : 1 }}
          transition={{ duration: 0.12 }}
        >
          {/* Left pupil */}
          <motion.g
            animate={{ scaleY: leftEyeScaleY }}
            style={{ transformOrigin: '66px 72px' }}
          >
            <motion.circle
              cx={66}
              cy={72}
              r="5"
              fill="#3D2B1F"
              animate={{ cx: 66 + pupilOffsetX, cy: 72 + pupilOffsetY }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            />
            <motion.circle
              cx={63}
              cy={69}
              r="2"
              fill="white"
              animate={{ cx: 63 + pupilOffsetX * 0.5, cy: 69 + pupilOffsetY * 0.5 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            />
          </motion.g>
          {/* Right pupil */}
          <motion.circle
            cx={94}
            cy={72}
            r="5"
            fill="#3D2B1F"
            animate={{ cx: 94 + pupilOffsetX, cy: 72 + pupilOffsetY }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          />
          <motion.circle
            cx={91}
            cy={69}
            r="2"
            fill="white"
            animate={{ cx: 91 + pupilOffsetX * 0.5, cy: 69 + pupilOffsetY * 0.5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          />
        </motion.g>

        {/* Nose */}
        <ellipse cx="80" cy="88" rx="5" ry="3.5" fill="#5C4033" />

        {/* Mouth */}
        <motion.path
          d={smilePath}
          stroke="#5C4033"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          animate={{ d: smilePath }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        />

        {/* Cheek blush */}
        <circle cx="52" cy="88" r="6" fill="#E8A0A0" opacity="0.4" />
        <circle cx="108" cy="88" r="6" fill="#E8A0A0" opacity="0.4" />

        {/* Success sparkles */}
        {success && (
          <>
            <motion.circle cx="30" cy="30" r="3" fill="#FFD700"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
              transition={{ duration: 0.8, delay: 0.1 }}
            />
            <motion.circle cx="130" cy="25" r="2.5" fill="#FF6B6B"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
              transition={{ duration: 0.8, delay: 0.2 }}
            />
            <motion.circle cx="20" cy="55" r="2" fill="#4ECDC4"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
              transition={{ duration: 0.8, delay: 0.3 }}
            />
            <motion.circle cx="140" cy="50" r="2.5" fill="#FFD700"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
              transition={{ duration: 0.8, delay: 0.15 }}
            />
            <motion.path
              d="M25 42 L28 38 L31 42 L28 40 Z"
              fill="#FF6B6B"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0], rotate: [0, 180] }}
              transition={{ duration: 0.8, delay: 0.25 }}
            />
            <motion.path
              d="M135 38 L138 34 L141 38 L138 36 Z"
              fill="#4ECDC4"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0], rotate: [0, -180] }}
              transition={{ duration: 0.8, delay: 0.35 }}
            />
          </>
        )}
      </motion.svg>
    </motion.div>
  );
}
