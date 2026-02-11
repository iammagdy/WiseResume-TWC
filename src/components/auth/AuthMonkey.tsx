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

  const pupilOffsetX = isTyping ? Math.min(Math.max((textLength - 10) * 0.5, -5), 5) : 0;
  const pupilOffsetY = isTyping ? 3 : 0;

  const handY = isPassword && !showPassword ? -32 : 0;
  const leftHandY = isPassword && showPassword ? -22 : handY;
  const rightHandY = handY;

  const eyesClosed = isPassword && !showPassword;
  const leftEyeScaleY = isPassword && showPassword ? 0.35 : 1;

  const smilePath = success
    ? 'M88 108 Q100 124 112 108'
    : shake
    ? 'M92 108 Q100 113 108 108'
    : 'M90 108 Q100 118 110 108';

  return (
    <motion.div animate={controls} className="flex justify-center mb-4">
      <motion.svg
        width="160"
        height="180"
        viewBox="0 0 200 220"
        fill="none"
        animate={success ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.5 }}
      >
        {/* Tail */}
        <path
          d="M148 170 Q168 165 172 148 Q176 130 165 120 Q158 115 155 122 Q152 132 155 145 Q157 155 148 162"
          stroke="#7A5C2E"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Body */}
        <ellipse cx="100" cy="168" rx="34" ry="30" fill="#8B6914" />
        {/* Belly patch */}
        <ellipse cx="100" cy="172" rx="22" ry="20" fill="#DEB860" />

        {/* Left arm + hand (behind body) */}
        <motion.g
          animate={{ y: leftHandY }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        >
          <path
            d="M66 155 Q52 145 48 128 Q46 118 52 114 Q58 112 58 122 Q58 135 64 148 Z"
            fill="#8B6914"
          />
          <ellipse cx="52" cy="112" rx="8" ry="6" fill="#8B6914" />
        </motion.g>

        {/* Right arm + hand (behind body) */}
        <motion.g
          animate={{ y: rightHandY }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        >
          <path
            d="M134 155 Q148 145 152 128 Q154 118 148 114 Q142 112 142 122 Q142 135 136 148 Z"
            fill="#8B6914"
          />
          <ellipse cx="148" cy="112" rx="8" ry="6" fill="#8B6914" />
        </motion.g>

        {/* Feet */}
        <ellipse cx="82" cy="196" rx="12" ry="6" fill="#7A5C2E" />
        <ellipse cx="118" cy="196" rx="12" ry="6" fill="#7A5C2E" />

        {/* Neck */}
        <rect x="90" y="130" width="20" height="14" rx="6" fill="#8B6914" />

        {/* Head */}
        <circle cx="100" cy="80" r="52" fill="#8B6914" />

        {/* Ears - attached to head edge */}
        <circle cx="50" cy="68" r="16" fill="#8B6914" />
        <circle cx="50" cy="68" r="9" fill="#E8A0A0" />
        <circle cx="150" cy="68" r="16" fill="#8B6914" />
        <circle cx="150" cy="68" r="9" fill="#E8A0A0" />

        {/* Face (lighter area) */}
        <ellipse cx="100" cy="88" rx="36" ry="34" fill="#DEB860" />

        {/* Hair tuft */}
        <path
          d="M90 32 Q95 20 100 30 Q105 18 110 30 Q115 22 112 34"
          stroke="#7A5C2E"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />

        {/* Eyebrows */}
        <motion.path
          d="M78 68 Q83 62 90 66"
          stroke="#5C4033"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          animate={{
            d: shake
              ? 'M78 64 Q83 58 90 62'
              : success
              ? 'M78 66 Q83 60 90 64'
              : 'M78 68 Q83 62 90 66',
          }}
          transition={{ type: 'spring', stiffness: 300 }}
        />
        <motion.path
          d="M110 66 Q117 62 122 68"
          stroke="#5C4033"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          animate={{
            d: shake
              ? 'M110 62 Q117 58 122 64'
              : success
              ? 'M110 64 Q117 60 122 66'
              : 'M110 66 Q117 62 122 68',
          }}
          transition={{ type: 'spring', stiffness: 300 }}
        />

        {/* Eye whites */}
        <motion.ellipse
          cx="86"
          cy="80"
          rx="9"
          ry="10"
          fill="white"
          stroke="#5C4033"
          strokeWidth="0.8"
          animate={{ scaleY: eyesClosed ? 0.08 : leftEyeScaleY }}
          style={{ transformOrigin: '86px 80px' }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        />
        <motion.ellipse
          cx="114"
          cy="80"
          rx="9"
          ry="10"
          fill="white"
          stroke="#5C4033"
          strokeWidth="0.8"
          animate={{ scaleY: eyesClosed ? 0.08 : 1 }}
          style={{ transformOrigin: '114px 80px' }}
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
            style={{ transformOrigin: '86px 80px' }}
          >
            <motion.circle
              cx={86}
              cy={80}
              r="3.5"
              fill="#3D2B1F"
              animate={{ cx: 86 + pupilOffsetX, cy: 80 + pupilOffsetY }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            />
            <motion.circle
              cx={84}
              cy={78}
              r="1.5"
              fill="white"
              animate={{ cx: 84 + pupilOffsetX * 0.5, cy: 78 + pupilOffsetY * 0.5 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            />
          </motion.g>
          {/* Right pupil */}
          <motion.circle
            cx={114}
            cy={80}
            r="3.5"
            fill="#3D2B1F"
            animate={{ cx: 114 + pupilOffsetX, cy: 80 + pupilOffsetY }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          />
          <motion.circle
            cx={112}
            cy={78}
            r="1.5"
            fill="white"
            animate={{ cx: 112 + pupilOffsetX * 0.5, cy: 78 + pupilOffsetY * 0.5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          />
        </motion.g>

        {/* Nose */}
        <ellipse cx="100" cy="96" rx="5" ry="3.5" fill="#5C4033" />

        {/* Mouth */}
        <motion.path
          d={smilePath}
          stroke="#5C4033"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          animate={{ d: smilePath }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        />

        {/* Cheek blush */}
        <circle cx="72" cy="96" r="6" fill="#E8A0A0" opacity="0.35" />
        <circle cx="128" cy="96" r="6" fill="#E8A0A0" opacity="0.35" />

        {/* Success sparkles */}
        {success && (
          <>
            <motion.circle cx="30" cy="30" r="3" fill="#FFD700"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
              transition={{ duration: 0.8, delay: 0.1 }}
            />
            <motion.circle cx="170" cy="25" r="2.5" fill="#FF6B6B"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
              transition={{ duration: 0.8, delay: 0.2 }}
            />
            <motion.circle cx="20" cy="60" r="2" fill="#4ECDC4"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
              transition={{ duration: 0.8, delay: 0.3 }}
            />
            <motion.circle cx="180" cy="55" r="2.5" fill="#FFD700"
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
