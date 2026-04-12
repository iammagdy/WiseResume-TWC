import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Monitor } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/store/settingsStore';

type Theme = 'light' | 'dark' | 'system';

/* ── Wave SVG — pure CSS animation, zero JS cost ───────────── */

function WaveSurface() {
  return (
    <span
      aria-hidden
      className="theme-wave-surface"
    >
      <svg
        viewBox="0 0 200 12"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        className="theme-wave-svg"
      >
        <path
          d="M0 6 C25 0, 50 12, 75 6 C100 0, 125 12, 150 6 C175 0, 200 12, 200 6 L200 12 L0 12 Z"
          fill="currentColor"
          opacity="0.25"
        />
        <path
          d="M0 6 C25 0, 50 12, 75 6 C100 0, 125 12, 150 6 C175 0, 200 12, 200 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.5"
        />
      </svg>
    </span>
  );
}

/* ── Simple icon — single motion.div, opacity + scale only ─── */

function ThemeIcon({ theme }: { theme: Theme }) {
  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
  return (
    <motion.span
      key={theme}
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.5, opacity: 0 }}
      transition={{ duration: 0.18, ease: [0.34, 1.56, 0.64, 1] }}
      style={{ display: 'flex' }}
    >
      <Icon className="w-4 h-4" />
    </motion.span>
  );
}

/* ── Water-fill pill background ─────────────────────────────── */

const glowMap: Record<Theme, string> = {
  light: '0 0 12px hsl(45 100% 55% / 0.5)',
  dark: '0 0 12px hsl(270 100% 65% / 0.5)',
  system: '0 0 12px hsl(210 100% 55% / 0.4)',
};

function WaterFillPill({ theme }: { theme: Theme }) {
  return (
    <motion.div
      className="absolute inset-0 rounded-lg gradient-primary overflow-hidden"
      style={{ boxShadow: glowMap[theme], transformOrigin: 'bottom' }}
      initial={{ scaleY: 0, opacity: 0.6 }}
      animate={{ scaleY: 1, opacity: 1 }}
      exit={{ scaleY: 0, opacity: 0 }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
    >
      <WaveSurface />
    </motion.div>
  );
}

/* ── Theme Toggle Component ─────────────────────────────────── */

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const handleChange = useCallback(
    (newTheme: Theme) => {
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
    <div
      className={cn(
        'relative flex items-center gap-0.5 p-1 rounded-xl bg-muted backdrop-blur-sm',
        className
      )}
    >
      {themes.map(({ value, label }) => {
        const isActive = theme === value;
        return (
          <button
            key={value}
            onClick={() => handleChange(value)}
            className={cn(
              'relative flex items-center gap-1.5 px-3 py-2 rounded-lg',
              'text-sm font-medium',
              'touch-manipulation min-h-[40px]',
              isActive
                ? 'text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <AnimatePresence initial={false}>
              {isActive && (
                <WaterFillPill key={value} theme={value} />
              )}
            </AnimatePresence>

            <span className="relative z-10 flex items-center gap-1.5">
              <AnimatePresence mode="wait" initial={false}>
                <ThemeIcon key={`icon-${value}-${isActive}`} theme={value} />
              </AnimatePresence>
              <span>{label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
