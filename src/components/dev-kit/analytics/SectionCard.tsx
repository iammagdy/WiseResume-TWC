import { cn } from '@/lib/utils';

interface Props {
  title: string;
  description?: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function SectionCard({ title, description, icon: Icon, action, children, className }: Props) {
  return (
    <section className={cn('rounded-xl border border-border bg-card p-5 shadow-sm space-y-4', className)}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-primary" />}
            {title}
          </h3>
          {description && <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
