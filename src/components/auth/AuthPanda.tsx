import { motion, useAnimation } from 'framer-motion';
import { useEffect } from 'react';

interface AuthPandaProps {
  focusedField: 'email' | 'phone' | 'password' | null;
  showPassword: boolean;
  textLength: number;
  shake: boolean;
  success: boolean;
}

export function AuthPanda({ focusedField, showPassword, textLength, shake, success }: AuthPandaProps) {
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

  const pupilOffsetX = isTyping ? Math.min(Math.max((textLength - 10) * 0.4, -3), 3) : 0;
  const pupilOffsetY = isTyping ? 2 : 0;

  const handY = isPassword && !showPassword ? -50 : 0;
  const leftHandY = isPassword && showPassword ? -38 : handY;
  const rightHandY = handY;

  const eyesClosed = isPassword && !showPassword;
  const leftEyeScaleY = isPassword && showPassword ? 0.3 : 1;

  const C = '#1A3A2A'; // dark forest green
  const C2 = '#254A36'; // slightly lighter green for pads

  const smilePath = success
    ? 'M90 106 Q100 118 110 106'
    : shake
    ? 'M94 104 Q100 108 106 104'
    : 'M92 104 Q100 114 108 104';

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
        {/* === BODY === */}
        <ellipse cx="100" cy="170" rx="42" ry="34" fill={C} />
        {/* White belly */}
        <ellipse cx="100" cy="174" rx="26" ry="24" fill="white" />

        {/* === FEET (splayed outward) === */}
        {/* Left foot */}
        <ellipse cx="72" cy="200" rx="18" ry="11" fill={C} transform="rotate(-15 72 200)" />
        <ellipse cx="72" cy="202" rx="10" ry="6" fill={C2} transform="rotate(-15 72 202)" />
        <circle cx="64" cy="196" r="2.5" fill={C2} />
        <circle cx="70" cy="193" r="2.5" fill={C2} />
        <circle cx="77" cy="194" r="2.5" fill={C2} />
        {/* Right foot */}
        <ellipse cx="128" cy="200" rx="18" ry="11" fill={C} transform="rotate(15 128 200)" />
        <ellipse cx="128" cy="202" rx="10" ry="6" fill={C2} transform="rotate(15 128 202)" />
        <circle cx="123" cy="194" r="2.5" fill={C2} />
        <circle cx="130" cy="193" r="2.5" fill={C2} />
        <circle cx="136" cy="196" r="2.5" fill={C2} />

        {/* === LEFT ARM/PAW === */}
        <motion.g
          animate={{ y: leftHandY }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        >
          <path
            d="M58 158 Q42 148 38 128 Q36 116 42 112 Q48 110 50 122 Q52 138 58 150 Z"
            fill={C}
          />
          <ellipse cx="40" cy="110" rx="10" ry="8" fill={C} />
          <ellipse cx="40" cy="111" rx="6" ry="5" fill={C2} />
          <circle cx="34" cy="106" r="2" fill={C2} />
          <circle cx="40" cy="104" r="2" fill={C2} />
          <circle cx="46" cy="106" r="2" fill={C2} />
        </motion.g>

        {/* === RIGHT ARM/PAW === */}
        <motion.g
          animate={{ y: rightHandY }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        >
          <path
            d="M142 158 Q158 148 162 128 Q164 116 158 112 Q152 110 150 122 Q148 138 142 150 Z"
            fill={C}
          />
          <ellipse cx="160" cy="110" rx="10" ry="8" fill={C} />
          <ellipse cx="160" cy="111" rx="6" ry="5" fill={C2} />
          <circle cx="154" cy="106" r="2" fill={C2} />
          <circle cx="160" cy="104" r="2" fill={C2} />
          <circle cx="166" cy="106" r="2" fill={C2} />
        </motion.g>

        {/* === HEAD === */}
        <circle cx="100" cy="76" r="50" fill="white" stroke={C} strokeWidth="2.5" />

        {/* === EARS === */}
        <circle cx="56" cy="38" r="20" fill={C} />
        <circle cx="56" cy="38" r="9" fill={C2} />
        <circle cx="144" cy="38" r="20" fill={C} />
        <circle cx="144" cy="38" r="9" fill={C2} />

        {/* === LEAF SPRIGS on ears === */}
        <g>
          <path d="M56 16 Q54 8 48 6 Q54 10 54 16" fill="#4CAF50" stroke="#388E3C" strokeWidth="0.8" />
          <line x1="56" y1="18" x2="54" y2="10" stroke="#388E3C" strokeWidth="0.8" />
        </g>
        <g>
          <path d="M144 16 Q146 8 152 6 Q146 10 146 16" fill="#4CAF50" stroke="#388E3C" strokeWidth="0.8" />
          <line x1="144" y1="18" x2="146" y2="10" stroke="#388E3C" strokeWidth="0.8" />
        </g>

        {/* === EYE PATCHES (large, tilted inward) === */}
        <ellipse cx="78" cy="80" rx="18" ry="16" fill={C} transform="rotate(-10 78 80)" />
        <ellipse cx="122" cy="80" rx="18" ry="16" fill={C} transform="rotate(10 122 80)" />

        {/* === EYES (small dots, not bug eyes) === */}
        <motion.ellipse
          cx="78"
          cy="80"
          rx="4"
          ry="5"
          fill="white"
          animate={{ scaleY: eyesClosed ? 0.08 : leftEyeScaleY }}
          style={{ transformOrigin: '78px 80px' }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        />
        <motion.ellipse
          cx="122"
          cy="80"
          rx="4"
          ry="5"
          fill="white"
          animate={{ scaleY: eyesClosed ? 0.08 : 1 }}
          style={{ transformOrigin: '122px 80px' }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        />

        {/* === PUPILS (tiny dots) === */}
        <motion.g
          animate={{ opacity: eyesClosed ? 0 : 1 }}
          transition={{ duration: 0.12 }}
        >
          <motion.g
            animate={{ scaleY: leftEyeScaleY }}
            style={{ transformOrigin: '78px 80px' }}
          >
            <motion.circle
              cx={78}
              cy={80}
              r="2"
              fill={C}
              animate={{ cx: 78 + pupilOffsetX, cy: 80 + pupilOffsetY }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            />
            <motion.circle
              cx={77}
              cy={79}
              r="0.8"
              fill="white"
              animate={{ cx: 77 + pupilOffsetX * 0.5, cy: 79 + pupilOffsetY * 0.5 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            />
          </motion.g>
          <motion.circle
            cx={122}
            cy={80}
            r="2"
            fill={C}
            animate={{ cx: 122 + pupilOffsetX, cy: 80 + pupilOffsetY }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          />
          <motion.circle
            cx={121}
            cy={79}
            r="0.8"
            fill="white"
            animate={{ cx: 121 + pupilOffsetX * 0.5, cy: 79 + pupilOffsetY * 0.5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          />
        </motion.g>

        {/* === NOSE === */}
        <ellipse cx="100" cy="94" rx="4" ry="3" fill={C} />

        {/* === MOUTH === */}
        <motion.path
          d={smilePath}
          stroke={C}
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          animate={{ d: smilePath }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        />

        {/* === CHEEK BLUSH === */}
        <circle cx="62" cy="92" r="6" fill="#FFB7C5" opacity="0.35" />
        <circle cx="138" cy="92" r="6" fill="#FFB7C5" opacity="0.35" />

        {/* === SUCCESS SPARKLES === */}
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
