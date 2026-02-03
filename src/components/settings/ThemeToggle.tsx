import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

type Theme = 'light' | 'dark' | 'system';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark';
    return (localStorage.getItem('theme') as Theme) || 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.remove('light', 'dark');
      root.classList.add(systemTheme);
    } else {
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
    }
    
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleChange = (newTheme: Theme) => {
    haptics.selection();
    setTheme(newTheme);
  };

  const themes: { value: Theme; icon: React.ElementType; label: string }[] = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
  ];

  return (
    <div className={cn('flex items-center gap-1 p-1 rounded-lg bg-muted', className)}>
      {themes.map(({ value, icon: Icon, label }) => (
        <Button
          key={value}
          variant="ghost"
          size="sm"
          onClick={() => handleChange(value)}
          className={cn(
            'relative flex items-center gap-2 px-3 py-2',
            theme === value && 'bg-background shadow-sm'
          )}
        >
          <Icon className="w-4 h-4" />
          <span className="text-sm">{label}</span>
          {theme === value && (
            <motion.div
              layoutId="theme-indicator"
              className="absolute inset-0 rounded-md border border-border"
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          )}
        </Button>
      ))}
    </div>
  );
}
