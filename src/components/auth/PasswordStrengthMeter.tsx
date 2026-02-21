import { cn } from '@/lib/utils';

interface PasswordStrengthMeterProps {
  password: string;
}

const checks = [
  { test: (p: string) => p.length >= 8, label: '8+ chars' },
  { test: (p: string) => /[A-Z]/.test(p), label: 'Uppercase' },
  { test: (p: string) => /[a-z]/.test(p), label: 'Lowercase' },
  { test: (p: string) => /[0-9]/.test(p), label: 'Number' },
];

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  if (!password) return null;

  const passed = checks.filter((c) => c.test(password)).length;
  const label = passed <= 1 ? 'Weak' : passed === 2 ? 'Fair' : passed === 3 ? 'Good' : 'Strong';
  const color = passed <= 1 ? 'bg-destructive' : passed === 2 ? 'bg-amber-500' : 'bg-success';

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors duration-200',
              i < passed ? color : 'bg-muted'
            )}
          />
        ))}
      </div>
      <p className={cn(
        'text-xs',
        passed <= 1 ? 'text-destructive' : passed === 2 ? 'text-amber-500' : 'text-success'
      )}>
        {label}
      </p>
    </div>
  );
}
