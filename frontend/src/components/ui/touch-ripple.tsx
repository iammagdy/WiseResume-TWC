import { useState, useCallback, ReactNode, MouseEvent, TouchEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface RippleEffect {
  id: number;
  x: number;
  y: number;
  size: number;
}

interface TouchRippleProps {
  children: ReactNode;
  className?: string;
  color?: 'primary' | 'secondary' | 'white' | 'muted';
  disabled?: boolean;
  onClick?: () => void;
  as?: keyof JSX.IntrinsicElements;
}

const colorClasses = {
  primary: 'bg-primary/30',
  secondary: 'bg-secondary/30',
  white: 'bg-white/30',
  muted: 'bg-foreground/10',
};

export function TouchRipple({
  children,
  className,
  color = 'primary',
  disabled = false,
  onClick,
  as: Component = 'button',
}: TouchRippleProps) {
  const [ripples, setRipples] = useState<RippleEffect[]>([]);

  const createRipple = useCallback((clientX: number, clientY: number, target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const x = clientX - rect.left - size / 2;
    const y = clientY - rect.top - size / 2;
    
    const newRipple: RippleEffect = {
      id: Date.now(),
      x,
      y,
      size,
    };
    
    setRipples(prev => [...prev, newRipple]);
    
    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 600);
  }, []);

  const handleMouseDown = useCallback((e: MouseEvent<HTMLElement>) => {
    if (disabled) return;
    createRipple(e.clientX, e.clientY, e.currentTarget);
  }, [createRipple, disabled]);

  const handleTouchStart = useCallback((e: TouchEvent<HTMLElement>) => {
    if (disabled) return;
    const touch = e.touches[0];
    createRipple(touch.clientX, touch.clientY, e.currentTarget);
  }, [createRipple, disabled]);

  const Comp = Component as any;

  return (
    <Comp
      className={cn(
        'relative overflow-hidden touch-manipulation',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
      <AnimatePresence>
        {ripples.map(ripple => (
          <motion.span
            key={ripple.id}
            className={cn(
              'absolute rounded-full pointer-events-none',
              colorClasses[color]
            )}
            style={{
              left: ripple.x,
              top: ripple.y,
              width: ripple.size,
              height: ripple.size,
            }}
            initial={{ scale: 0, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        ))}
      </AnimatePresence>
    </Comp>
  );
}
