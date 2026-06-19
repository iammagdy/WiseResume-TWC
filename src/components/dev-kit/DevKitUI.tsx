import React, { type ElementType, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// DevKit Vercel-style admin UI kit
// ─────────────────────────────────────────────────────────────────────────────
//
// These primitives replace the old AI-looking, white/blue tinted cards with
// the app’s dark semantic tokens: near-black surfaces, subtle borders, and
// color-coded status accents. Use them for every panel so the DevKit feels
// like a cohesive, world-class admin dashboard.
// ─────────────────────────────────────────────────────────────────────────────

export type DevKitStatusVariant =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral'
  | 'live'
  | 'needs-function'
  | 'needs-schema'
  | 'planned';

const STATUS_META: Record<
  DevKitStatusVariant,
  { label: string; className: string; dot?: string }
> = {
  success: {
    label: 'Healthy',
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  warning: {
    label: 'Warning',
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    dot: 'bg-amber-500',
  },
  error: {
    label: 'Critical',
    className: 'bg-red-500/10 text-red-400 border-red-500/20',
    dot: 'bg-red-500',
  },
  info: {
    label: 'Info',
    className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    dot: 'bg-blue-500',
  },
  neutral: {
    label: 'Neutral',
    className: 'bg-muted text-muted-foreground border-border',
  },
  live: {
    label: 'Live',
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  planned: {
    label: 'Planned',
    className: 'bg-muted text-muted-foreground border-border',
  },
  'needs-function': {
    label: 'Needs Function',
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    dot: 'bg-amber-500',
  },
  'needs-schema': {
    label: 'Needs Schema',
    className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    dot: 'bg-blue-500',
  },
};

export function DevKitStatusBadge({
  variant,
  label,
  className,
  showDot = true,
}: {
  variant: DevKitStatusVariant;
  label?: string;
  className?: string;
  showDot?: boolean;
}) {
  const meta = STATUS_META[variant];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        meta.className,
        className,
      )}
    >
      {showDot && meta.dot && (
        <span className={cn('relative flex h-1.5 w-1.5', meta.dot)}>
          {variant === 'live' && (
            <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-40', meta.dot)} />
          )}
          <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', meta.dot)} />
        </span>
      )}
      {label ?? meta.label}
    </span>
  );
}

export function DevKitPanelHeader({
  title,
  description,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

export function DevKitSection({
  title,
  description,
  icon: Icon,
  action,
  status,
  children,
  className,
  contentClassName,
}: {
  title?: ReactNode;
  description?: ReactNode;
  icon?: ElementType;
  action?: ReactNode;
  status?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const statusVariant: DevKitStatusVariant | undefined =
    status === 'success' ? 'success'
    : status === 'warning' ? 'warning'
    : status === 'error' ? 'error'
    : status === 'info' ? 'info'
    : status === 'neutral' ? 'neutral'
    : undefined;

  return (
    <Card className={cn('overflow-hidden', className)}>
      {(title || description || action || Icon || statusVariant) && (
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
          <div className="space-y-1">
            {title && (
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                {title}
              </CardTitle>
            )}
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {statusVariant && <DevKitStatusBadge variant={statusVariant} showDot={false} />}
            {action && <div>{action}</div>}
          </div>
        </CardHeader>
      )}
      <CardContent className={cn(title || description || action || Icon || statusVariant ? 'pt-0' : '', contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}

export function DevKitMetricCard({
  icon: Icon,
  label,
  value,
  subtext,
  status,
  onClick,
  loading = false,
  className,
  children,
}: {
  icon?: ElementType;
  label: string;
  value?: ReactNode;
  subtext?: string;
  status?: 'success' | 'warning' | 'error' | 'neutral' | 'info';
  onClick?: () => void;
  loading?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const borderColor =
    status === 'success'
      ? 'border-emerald-500/20'
      : status === 'warning'
        ? 'border-amber-500/20'
        : status === 'error'
          ? 'border-red-500/20'
          : status === 'info'
            ? 'border-blue-500/20'
            : 'border-border';

  const dotColor =
    status === 'success'
      ? 'bg-emerald-500'
      : status === 'warning'
        ? 'bg-amber-500'
        : status === 'error'
          ? 'bg-red-500'
          : status === 'info'
            ? 'bg-blue-500'
            : 'bg-muted-foreground';

  return (
    <Card
      className={cn(
        'border-l-4 transition-colors',
        borderColor,
        onClick && 'cursor-pointer hover:bg-muted/50',
        className,
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-muted-foreground">
          {status && <span className={cn('h-1.5 w-1.5 rounded-full', dotColor)} />}
          {Icon && <Icon className="h-4 w-4" />}
          <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
        </div>
        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-7 w-24" />
          ) : (
            <div className="text-2xl font-semibold tracking-tight text-foreground">{value ?? '—'}</div>
          )}
          {loading ? (
            <Skeleton className="mt-2 h-3 w-32" />
          ) : (
            subtext && <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>
          )}
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

export function DevKitEmpty({
  icon: Icon = Activity,
  title,
  description,
  action,
}: {
  icon?: ElementType;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-10 text-center">
      <div className="rounded-full bg-muted p-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function DevKitSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-5 space-y-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-3 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function DevKitLoading({ text = 'Loading…' }: { text?: string }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card text-muted-foreground">
      <div className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-40" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
      </div>
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}

export interface DevKitTab {
  id: string;
  label: string;
  icon?: ElementType;
  badge?: number | string;
}

export function DevKitTabBar<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: readonly { id: T; label: string; icon?: ElementType; badge?: number | string }[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'inline-flex w-full items-center gap-1 rounded-xl border border-border bg-muted p-1 sm:w-auto',
        className,
      )}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all sm:flex-initial',
              active
                ? 'bg-card text-foreground shadow-soft-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted-foreground/5',
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label}</span>
            {tab.badge !== undefined && tab.badge !== 0 && (
              <Badge variant="secondary" className="ml-0.5 h-4 px-1.5 text-[10px]">
                {tab.badge}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function DevKitNavItem({
  icon: Icon,
  label,
  active,
  onClick,
  badge,
  status,
  className,
}: {
  icon: ElementType;
  label: string;
  active?: boolean;
  onClick?: () => void;
  badge?: number | string;
  status?: DevKitStatusVariant;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
        active
          ? 'bg-muted text-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        className,
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-foreground' : 'text-muted-foreground/60 group-hover:text-foreground')} />
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      {badge !== undefined && badge !== 0 ? (
        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
          {badge}
        </span>
      ) : status ? (
        <DevKitStatusBadge variant={status} label={status === 'live' ? 'Live' : undefined} className="ml-auto" showDot={false} />
      ) : null}
    </button>
  );
}

export function DevKitSidebarGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <h3 className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </h3>
      {children}
    </div>
  );
}

export function DevKitTable({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('w-full overflow-hidden rounded-xl border border-border', className)}>
      <table className="w-full text-sm text-left">{children}</table>
    </div>
  );
}

export function DevKitTableHead({ children, className }: { children: ReactNode; className?: string }) {
  return <thead className={cn('bg-muted text-xs font-semibold uppercase tracking-wider text-muted-foreground', className)}>{children}</thead>;
}

export function DevKitTableRow({ children, className }: { children: ReactNode; className?: string }) {
  return <tr className={cn('border-b border-border last:border-0 transition-colors hover:bg-muted/50', className)}>{children}</tr>;
}

export function DevKitTableCell({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn('px-4 py-3 text-foreground', className)}>{children}</td>;
}

export function DevKitTableHeaderCell({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn('px-4 py-3', className)}>{children}</th>;
}

export function DevKitListItem({
  title,
  description,
  meta,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50',
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <div className="text-sm font-medium text-foreground">{title}</div>
        {description && <div className="text-xs text-muted-foreground">{description}</div>}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {meta && <div className="text-xs text-muted-foreground">{meta}</div>}
        {action}
      </div>
    </div>
  );
}
