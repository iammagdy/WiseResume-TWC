import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/store/settingsStore';

type Theme = 'light' | 'dark' | 'system';

/* ── Animated Sun/Moon SVG Icon ─────────────────────────────── */

function ThemeIcon({ theme }: { theme: Theme }) {
  const resolved =
    theme === 'system'
      ? 'system'
      : theme;

  if (resolved === 'system') {
    return (
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.6, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 26 }}
      >
        <Monitor className="w-4 h-4" />
      </motion.div>
    );
  }

  return (
    <motion.svg
      key={resolved}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ rotate: resolved === 'dark' ? -90 : 90, scale: 0.5, opacity: 0 }}
      animate={{ rotate: 0, scale: 1, opacity: 1 }}
      exit={{ rotate: resolved === 'dark' ? 90 : -90, scale: 0.5, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
    >
      {resolved === 'light' ? (
        /* Sun: circle + rays */
        <>
          <motion.circle
            cx="12"
            cy="12"
            r="5"
            fill="currentColor"
            stroke="none"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.05, type: 'spring', stiffness: 500, damping: 20 }}
          />
          {[...Array(8)].map((_, i) => {
            const angle = (i * 45 * Math.PI) / 180;
            const x1 = 12 + Math.cos(angle) * 8;
            const y1 = 12 + Math.sin(angle) * 8;
            const x2 = 12 + Math.cos(angle) * 10;
            const y2 = 12 + Math.sin(angle) * 10;
            return (
              <motion.line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                strokeWidth="2"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay: 0.08 + i * 0.03, type: 'spring', stiffness: 400, damping: 18 }}
              />
            );
          })}
        </>
      ) : (
        /* Moon: circle with crescent mask */
        <>
          <motion.circle
            cx="12"
            cy="12"
            r="5"
            fill="currentColor"
            stroke="none"
            initial={{ scale: 0.4 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          />
          <motion.circle
            cx="16"
            cy="8"
            r="4"
            fill="hsl(var(--background))"
            stroke="none"
            initial={{ x: 6, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 350, damping: 22 }}
          />
          {/* Stars */}
          {[
            { cx: 19, cy: 5, r: 0.8 },
            { cx: 21, cy: 10, r: 0.6 },
            { cx: 17, cy: 15, r: 0.5 },
          ].map((star, i) => (
            <motion.circle
              key={i}
              cx={star.cx}
              cy={star.cy}
              r={star.r}
              fill="currentColor"
              stroke="none"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.7 }}
              transition={{ delay: 0.2 + i * 0.06, type: 'spring', stiffness: 500, damping: 20 }}
            />
          ))}
        </>
      )}
    </motion.svg>
  );
}

/* ── Theme Toggle Component ─────────────────────────────────── */

interface ThemeToggleProps {
  className?: string;
}

const glowMap: Record<Theme, string> = {
  light: '0 0 12px hsl(45 100% 55% / 0.5)',
  dark: '0 0 12px hsl(270 100% 65% / 0.5)',
  system: '0 0 12px hsl(210 100% 55% / 0.4)',
};


export function ThemeToggle({ className }: ThemeToggleProps) {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const handleChange = useCallback(
    (newTheme: Theme, e: React.MouseEvent) => {
      if (newTheme === theme) return;
      haptics.selection();
      setTheme(newTheme);
    },
    [theme, setTheme]
  );

  const themes: { value: Theme; label: string }[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'Auto' },
  ];

  return (
    <>
      <div
        className={cn(
          'relative flex items-center gap-0.5 p-1 rounded-xl bg-muted/60 backdrop-blur-sm',
          className
        )}
      >
        {themes.map(({ value, label }) => {
          const isActive = theme === value;
          return (
            <button
              key={value}
              onClick={(e) => handleChange(value, e)}
              className={cn(
                'relative flex items-center gap-1.5 px-3 py-2 rounded-lg',
                'text-sm font-medium transition-colors duration-200',
                'touch-manipulation min-h-[40px]',
                isActive
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {/* Sliding pill background */}
              {isActive && (
                <motion.div
                  layoutId="theme-pill"
                  className="absolute inset-0 rounded-lg gradient-primary"
                  style={{ boxShadow: glowMap[value] }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                />
              )}

              <span className="relative z-10 flex items-center gap-1.5">
                <AnimatePresence mode="wait">
                  <ThemeIcon key={value} theme={value} />
                </AnimatePresence>
                <span>{label}</span>
              </span>
            </button>
          );
        })}
      </div>

    </>
  );
}
