import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  variant?: 'default' | 'danger';
  className?: string;
}

export function SettingsSection({
  title,
  description,
  children,
  variant = 'default',
  className,
}: SettingsSectionProps) {
  return (
    <section className={cn('space-y-3', className)} aria-labelledby={`settings-section-${title.replace(/\s+/g, '-')}`}>
      <div className="px-1">
        <h2
          id={`settings-section-${title.replace(/\s+/g, '-')}`}
          className="settings-section__label"
        >
          {title}
        </h2>
        {description && <p className="settings-section__desc">{description}</p>}
      </div>
      <div
        className={cn(
          'space-y-3',
          variant === 'danger' && '[&_.rounded-2xl]:border-destructive/25 [&_.rounded-2xl]:bg-destructive/[0.03]',
        )}
      >
        {children}
      </div>
    </section>
  );
}
