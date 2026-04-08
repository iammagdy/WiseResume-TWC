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
      <span
        className="absolute inset-0 rounded-full"
        style={{
          border: `${borderWidth}px solid hsl(var(--muted))`,
          borderTopColor: 'hsl(var(--primary))',
          animation: 'mini-spin-cw 0.7s linear infinite',
        }}
      />
      <style>{`
        @keyframes mini-spin-cw {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </span>
  );
}
