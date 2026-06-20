import React, { type ElementType, type ReactNode } from "react";
import { Activity } from "lucide-react";
import { MiniSpinner } from "@/components/ui/MiniSpinner";
import { cn } from "@/lib/utils";

type MetricStatus = "success" | "warning" | "error" | "neutral" | "info";

const STATUS_STYLES: Record<
  MetricStatus,
  { border: string; bg: string; text: string; dot: string }
> = {
  success: {
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/5",
    text: "text-emerald-400",
    dot: "bg-emerald-500",
  },
  warning: {
    border: "border-amber-500/20",
    bg: "bg-amber-500/5",
    text: "text-amber-400",
    dot: "bg-amber-500",
  },
  error: {
    border: "border-red-500/20",
    bg: "bg-red-500/5",
    text: "text-red-400",
    dot: "bg-red-500",
  },
  info: {
    border: "border-blue-500/20",
    bg: "bg-blue-500/5",
    text: "text-blue-400",
    dot: "bg-blue-500",
  },
  neutral: {
    border: "border-white/10",
    bg: "bg-white/[0.03]",
    text: "text-white/45",
    dot: "bg-white/25",
  },
};

export function DevKitLoading({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
      <div className="flex items-center gap-3 text-white/60">
        <MiniSpinner size={20} />
        <span className="text-sm font-semibold">{text}</span>
      </div>
    </div>
  );
}

export function DevKitMetricCard({
  icon: Icon,
  label,
  value,
  subtext,
  status = "neutral",
  onClick,
  loading = false,
  className,
  children,
}: {
  icon?: ElementType;
  label: string;
  value?: ReactNode;
  subtext?: string;
  status?: MetricStatus;
  onClick?: () => void;
  loading?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const style = STATUS_STYLES[status];

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 space-y-3 shadow-sm transition-all",
        style.border,
        style.bg,
        onClick && "cursor-pointer hover:brightness-110",
        className,
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex items-center gap-2 text-white/40">
        <span
          className={cn("h-2 w-2 shrink-0 rounded-full shadow-sm", style.dot)}
        />
        {Icon && <Icon className={cn("h-4 w-4", style.text)} />}
        <span className="truncate text-[11px] font-bold uppercase tracking-widest">
          {label}
        </span>
      </div>
      <div className="space-y-1">
        {loading ? (
          <div className="h-8 w-24 animate-pulse rounded-lg bg-white/10" />
        ) : (
          <div className="text-2xl font-black tracking-tight text-white">
            {value ?? "-"}
          </div>
        )}
        {loading ? (
          <div className="h-3 w-32 animate-pulse rounded bg-white/10" />
        ) : (
          subtext && <p className="truncate text-xs text-white/35">{subtext}</p>
        )}
        {children}
      </div>
    </div>
  );
}

export function DevKitSection({
  title,
  description,
  icon: Icon = Activity,
  action,
  status = "neutral",
  children,
  className,
  contentClassName,
}: {
  title?: ReactNode;
  description?: ReactNode;
  icon?: ElementType;
  action?: ReactNode;
  status?: MetricStatus;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const style = STATUS_STYLES[status];

  return (
    <section
      className={cn(
        "rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4",
        className,
      )}
    >
      {(title || description || action) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            {title && (
              <h3 className="flex items-center gap-2 text-sm font-black text-white">
                <Icon className={cn("h-4 w-4", style.text)} />
                {title}
              </h3>
            )}
            {description && (
              <p className="text-xs leading-relaxed text-white/45">
                {description}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={contentClassName}>{children}</div>
    </section>
  );
}

export function DevKitTabBar<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: readonly {
    id: T;
    label: string;
    icon?: ElementType;
    badge?: number | string;
  }[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1",
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
              "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all",
              active
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                : "text-white/50 hover:bg-white/5 hover:text-white",
            )}
          >
            {Icon && <Icon size={15} />}
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.badge !== undefined && tab.badge !== 0 && (
              <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-black leading-tight text-white">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
