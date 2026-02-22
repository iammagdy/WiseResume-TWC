import { cn } from '@/lib/utils';

interface MiniSpinnerProps {
  size?: number;
  className?: string;
}

export function MiniSpinner({ size = 16, className }: MiniSpinnerProps) {
  const borderWidth = Math.max(1.5, size * 0.12);
  
  return (
    <span
      className={cn('inline-flex items-center justify-center relative', className)}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    >
      {/* Outer ring - clockwise */}
      <span
        className="absolute inset-0 rounded-full"
        style={{
          border: `${borderWidth}px solid hsl(var(--primary) / 0.15)`,
          borderTopColor: 'hsl(var(--primary))',
          animation: 'mini-spin-cw 0.8s linear infinite',
        }}
      />
      {/* Inner ring - counter-clockwise */}
      <span
        className="absolute rounded-full"
        style={{
          width: size * 0.6,
          height: size * 0.6,
          border: `${borderWidth}px solid hsl(var(--primary) / 0.1)`,
          borderBottomColor: 'hsl(var(--primary) / 0.7)',
          animation: 'mini-spin-ccw 0.6s linear infinite',
        }}
      />
      <style>{`
        @keyframes mini-spin-cw {
          to { transform: rotate(360deg); }
        }
        @keyframes mini-spin-ccw {
          to { transform: rotate(-360deg); }
        }
      `}</style>
    </span>
  );
}
