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

  const pupilOffsetX = isTyping ? Math.min(Math.max((textLength - 10) * 0.5, -5), 5) : 0;
  const pupilOffsetY = isTyping ? 3 : 0;

  const handY = isPassword && !showPassword ? -45 : 0;
  const leftHandY = isPassword && showPassword ? -35 : handY;
  const rightHandY = handY;

  const eyesClosed = isPassword && !showPassword;
  const leftEyeScaleY = isPassword && showPassword ? 0.3 : 1;

  const smilePath = success
    ? 'M88 112 Q100 126 112 112'
    : shake
    ? 'M92 112 Q100 116 108 112'
    : 'M90 112 Q100 122 110 112';

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
        <ellipse cx="100" cy="172" rx="38" ry="32" fill="white" stroke="#1A1A2E" strokeWidth="2" />
        {/* Black side patches on body */}
        <path d="M62 168 Q64 148 78 142 Q68 155 66 170 Q64 180 68 190 Q58 185 62 168Z" fill="#1A1A2E" />
        <path d="M138 168 Q136 148 122 142 Q132 155 134 170 Q136 180 132 190 Q142 185 138 168Z" fill="#1A1A2E" />
        {/* White belly */}
        <ellipse cx="100" cy="176" rx="22" ry="20" fill="white" />

        {/* === FEET === */}
        {/* Left foot */}
        <ellipse cx="80" cy="200" rx="16" ry="10" fill="#1A1A2E" />
        <ellipse cx="80" cy="202" rx="10" ry="6" fill="#2D2D44" />
        <circle cx="74" cy="198" r="2" fill="#2D2D44" />
        <circle cx="80" cy="196" r="2" fill="#2D2D44" />
        <circle cx="86" cy="198" r="2" fill="#2D2D44" />
        {/* Right foot */}
        <ellipse cx="120" cy="200" rx="16" ry="10" fill="#1A1A2E" />
        <ellipse cx="120" cy="202" rx="10" ry="6" fill="#2D2D44" />
        <circle cx="114" cy="198" r="2" fill="#2D2D44" />
        <circle cx="120" cy="196" r="2" fill="#2D2D44" />
        <circle cx="126" cy="198" r="2" fill="#2D2D44" />

        {/* === LEFT ARM/PAW === */}
        <motion.g
          animate={{ y: leftHandY }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        >
          <path
            d="M62 160 Q46 148 42 130 Q40 118 46 114 Q52 112 54 124 Q56 140 62 152 Z"
            fill="#1A1A2E"
          />
          <ellipse cx="44" cy="112" rx="10" ry="8" fill="#1A1A2E" />
          {/* Paw pad */}
          <ellipse cx="44" cy="113" rx="6" ry="5" fill="#2D2D44" />
          <circle cx="39" cy="108" r="2" fill="#2D2D44" />
          <circle cx="44" cy="106" r="2" fill="#2D2D44" />
          <circle cx="49" cy="108" r="2" fill="#2D2D44" />
        </motion.g>

        {/* === RIGHT ARM/PAW === */}
        <motion.g
          animate={{ y: rightHandY }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        >
          <path
            d="M138 160 Q154 148 158 130 Q160 118 154 114 Q148 112 146 124 Q144 140 138 152 Z"
            fill="#1A1A2E"
          />
          <ellipse cx="156" cy="112" rx="10" ry="8" fill="#1A1A2E" />
          {/* Paw pad */}
          <ellipse cx="156" cy="113" rx="6" ry="5" fill="#2D2D44" />
          <circle cx="151" cy="108" r="2" fill="#2D2D44" />
          <circle cx="156" cy="106" r="2" fill="#2D2D44" />
          <circle cx="161" cy="108" r="2" fill="#2D2D44" />
        </motion.g>

        {/* === HEAD === */}
        <circle cx="100" cy="78" r="48" fill="white" stroke="#1A1A2E" strokeWidth="2" />

        {/* === EARS === */}
        <circle cx="58" cy="42" r="18" fill="#1A1A2E" />
        <circle cx="58" cy="42" r="9" fill="#2D2D44" />
        <circle cx="142" cy="42" r="18" fill="#1A1A2E" />
        <circle cx="142" cy="42" r="9" fill="#2D2D44" />

        {/* === HAIR TUFT === */}
        <path
          d="M92 32 Q96 18 100 28 Q104 16 108 28 Q112 20 110 32"
          stroke="#1A1A2E"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* === EYE PATCHES === */}
        <ellipse cx="80" cy="82" rx="16" ry="14" fill="#1A1A2E"
          transform="rotate(-8 80 82)"
        />
        <ellipse cx="120" cy="82" rx="16" ry="14" fill="#1A1A2E"
          transform="rotate(8 120 82)"
        />

        {/* === EYE WHITES === */}
        <motion.ellipse
          cx="80"
          cy="82"
          rx="8"
          ry="9"
          fill="white"
          animate={{ scaleY: eyesClosed ? 0.08 : leftEyeScaleY }}
          style={{ transformOrigin: '80px 82px' }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        />
        <motion.ellipse
          cx="120"
          cy="82"
          rx="8"
          ry="9"
          fill="white"
          animate={{ scaleY: eyesClosed ? 0.08 : 1 }}
          style={{ transformOrigin: '120px 82px' }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        />

        {/* === PUPILS === */}
        <motion.g
          animate={{ opacity: eyesClosed ? 0 : 1 }}
          transition={{ duration: 0.12 }}
        >
          {/* Left pupil */}
          <motion.g
            animate={{ scaleY: leftEyeScaleY }}
            style={{ transformOrigin: '80px 82px' }}
          >
            <motion.circle
              cx={80}
              cy={82}
              r="3.5"
              fill="#1A1A2E"
              animate={{ cx: 80 + pupilOffsetX, cy: 82 + pupilOffsetY }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            />
            <motion.circle
              cx={78}
              cy={80}
              r="1.5"
              fill="white"
              animate={{ cx: 78 + pupilOffsetX * 0.5, cy: 80 + pupilOffsetY * 0.5 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            />
          </motion.g>
          {/* Right pupil */}
          <motion.circle
            cx={120}
            cy={82}
            r="3.5"
            fill="#1A1A2E"
            animate={{ cx: 120 + pupilOffsetX, cy: 82 + pupilOffsetY }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          />
          <motion.circle
            cx={118}
            cy={80}
            r="1.5"
            fill="white"
            animate={{ cx: 118 + pupilOffsetX * 0.5, cy: 80 + pupilOffsetY * 0.5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          />
        </motion.g>

        {/* === NOSE === */}
        <ellipse cx="100" cy="98" rx="5" ry="3.5" fill="#1A1A2E" />

        {/* === MOUTH === */}
        <motion.path
          d={smilePath}
          stroke="#1A1A2E"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          animate={{ d: smilePath }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        />

        {/* === CHEEK BLUSH === */}
        <circle cx="64" cy="94" r="6" fill="#FFB7C5" opacity="0.4" />
        <circle cx="136" cy="94" r="6" fill="#FFB7C5" opacity="0.4" />

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
