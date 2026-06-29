import { useState } from 'react';
import { Zap, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useAIHealth } from '@/hooks/useAIHealth';
import { useAICredits } from '@/hooks/useAICredits';
import { useMe } from '@/hooks/useMe';
import { PLAN_CREDIT_LIMITS } from '@/lib/planConfig';
import type { PlanKey } from '@/lib/planConfig';
import { AIHealthBadge } from '@/components/ai/AIHealthBadge';
import { AICreditsIndicator } from '@/components/editor/ai/AICreditsIndicator';
import { TrialCountdownBadge } from '@/components/ui/TrialCountdownBadge';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { useLocale } from '@/i18n/LocaleProvider';

function StatusDot({ status }: { status: 'healthy' | 'degraded' | 'down' }) {
  if (status === 'healthy') return <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />;
  if (status === 'degraded') return <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />;
  return <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse flex-shrink-0" />;
}

export function DashboardStatusPopover() {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const { status } = useAIHealth();
  const { data: credits } = useAICredits();
  const { data: meData } = useMe();

  const trialPlan = meData?.subscription?.trial_plan ?? null;
  const trialExpiresAt = meData?.subscription?.trial_expires_at ?? null;
  const isActiveTrial = !!trialPlan && !!trialExpiresAt && new Date(trialExpiresAt) > new Date();

  // Derive limit from plan if not set — never hardcode 20
  const effectivePlan = (meData?.subscription?.effective_plan ?? 'free') as PlanKey;
  const fallbackLimit = PLAN_CREDIT_LIMITS[effectivePlan] ?? PLAN_CREDIT_LIMITS.free;
  const used = credits?.daily_usage ?? 0;
  const limit = credits?.daily_limit ?? fallbackLimit;
  const remaining = Math.max(0, isFinite(limit) ? limit - used : Infinity);
  const isLow = isFinite(remaining) && remaining <= 3;

  const StatusIcon = status === 'healthy' ? Wifi : status === 'degraded' ? AlertTriangle : WifiOff;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={() => { haptics.light(); setOpen(v => !v); }}
          className={cn(
            'flex sm:hidden items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[11px] font-semibold',
            'transition-all duration-150 active:scale-95 cursor-pointer select-none min-h-[30px]',
            status === 'healthy'
              ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400'
              : status === 'degraded'
                ? 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400'
                : 'bg-red-500/10 border-red-500/25 text-red-500'
          )}
          aria-label="View AI status and credits"
        >
          <StatusDot status={status} />
          {isActiveTrial && (
            <Zap className="w-3 h-3 flex-shrink-0" />
          )}
          {!isActiveTrial && isLow && (
            <span className="font-bold">{remaining}</span>
          )}
          {!isActiveTrial && !isLow && (
            <StatusIcon className="w-3 h-3 flex-shrink-0" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-auto p-0 flex flex-col gap-0 overflow-hidden border border-border/60 shadow-xl"
      >
        <div className="px-3 pt-2 pb-1 border-b border-border/40">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('common.status', 'Status')}</p>
        </div>
        {isActiveTrial && (
          <div className="px-3 py-2 border-b border-border/40">
            <TrialCountdownBadge />
          </div>
        )}
        <div className="px-3 py-2 border-b border-border/40">
          <AICreditsIndicator />
        </div>
        <div className="px-3 py-2">
          <AIHealthBadge />
        </div>
      </PopoverContent>
    </Popover>
  );
}
