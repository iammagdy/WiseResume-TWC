import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TailorStepCardProps {
  step: number;
  title: string;
  subtitle?: string;
  active?: boolean;
  className?: string;
  children: ReactNode;
}

export function TailorStepCard({
  step,
  title,
  subtitle,
  active = false,
  className,
  children,
}: TailorStepCardProps) {
  return (
    <section
      className={cn('tailor-step-card', className)}
      data-active={active ? 'true' : 'false'}
      aria-labelledby={`tailor-step-${step}-title`}
    >
      <div className="tailor-step-card__accent" aria-hidden />
      <div className="tailor-step-card__body">
        <div className="tailor-step-card__head">
          <span className="tailor-step-card__num" aria-hidden>
            {step}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/85">
              Step {step}
            </p>
            <h3 id={`tailor-step-${step}-title`} className="text-sm font-semibold text-foreground leading-snug mt-0.5">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="space-y-3">{children}</div>
      </div>
    </section>
  );
}
