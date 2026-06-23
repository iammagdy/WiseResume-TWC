import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Shield, Zap, Lock, ChevronRight } from 'lucide-react';
import { AIEngineBadge } from '@/components/editor/ai/AIEngineBadge';
import { useAICredits } from '@/hooks/useAICredits';
import { usePlan } from '@/hooks/usePlan';
import { useMe } from '@/hooks/useMe';
import { PLAN_CREDIT_LIMITS } from '@/lib/planConfig';
import type { PlanKey } from '@/lib/planConfig';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { Skeleton } from '@/components/ui/skeleton';

const FEATURES = [
  {
    icon: Sparkles,
    title: 'Best-in-class models',
    description: 'Tailoring, rewriting, and generation run on WiseResume’s managed AI pool.',
  },
  {
    icon: Zap,
    title: 'No setup required',
    description: 'No API keys or provider accounts — everything works out of the box.',
  },
  {
    icon: Lock,
    title: 'Private by design',
    description: 'Your resume content is used only for the request you make, then discarded.',
  },
] as const;

export const AIEngineSection = memo(function AIEngineSection() {
  const navigate = useNavigate();
  const { data: credits, isLoading: creditsLoading } = useAICredits();
  const { plan, isPremium } = usePlan();
  const { data: meData } = useMe();

  const used = credits?.daily_usage ?? 0;
  // Derive limit from plan if not set — never hardcode 20
  const effectivePlan = (meData?.subscription?.effective_plan ?? 'free') as PlanKey;
  const fallbackLimit = PLAN_CREDIT_LIMITS[effectivePlan] ?? PLAN_CREDIT_LIMITS.free;
  const rawLimit = credits?.daily_limit ?? fallbackLimit;
  const isUnlimited = rawLimit === Infinity || rawLimit === -1;
  const limit = isUnlimited ? null : rawLimit;
  const usagePct = limit ? Math.min((used / limit) * 100, 100) : 0;
  const usageHigh = usagePct > 80;

  const progressColor = usagePct > 80
    ? 'bg-destructive'
    : usagePct > 60
      ? 'bg-amber-500'
      : 'bg-emerald-500';

  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);

  return (
    <div className="rounded-2xl overflow-hidden border border-border shadow-soft bg-card">
      {/* Hero */}
      <div className="relative px-4 sm:px-5 pt-5 pb-4 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent"
          aria-hidden
        />
        {/* B4 perf: pre-baked radial-gradient glow instead of a live blur-3xl
            filter, which forced a large-radius re-rasterize on every scroll frame. */}
        <div
          className="pointer-events-none absolute -top-12 -right-8 h-40 w-40 rounded-full"
          style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.18), transparent 70%)' }}
          aria-hidden
        />
        <div className="relative flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0 shadow-soft">
            <Zap className="w-5 h-5 text-primary" aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary/90">
              AI Engine
            </p>
            <h3 className="text-lg font-semibold text-foreground leading-tight mt-0.5">
              WiseResume AI Pool
            </h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              All AI features run on our managed infrastructure — fast, secure, and always on.
            </p>
            <div className="inline-flex items-center gap-1.5 mt-2.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden />
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                Pool active
              </span>
            </div>
          </div>
        </div>
        <div className="relative mt-4 max-w-md">
          <AIEngineBadge />
        </div>
      </div>

      {/* Usage */}
      <div className="px-4 sm:px-5 py-4 border-t border-border/40 bg-muted/20">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-sm font-medium text-foreground">Today&apos;s AI usage</p>
          <span className="text-[11px] font-medium text-muted-foreground px-2 py-0.5 rounded-md bg-background/80 border border-border/50">
            {planLabel} plan
          </span>
        </div>
        {creditsLoading ? (
          <Skeleton className="h-2 w-full rounded-full" />
        ) : isUnlimited || isPremium ? (
          <p className="text-sm text-muted-foreground">
            {isPremium ? 'Unlimited AI actions on your plan.' : 'Generous daily limits included.'}
          </p>
        ) : (
          <>
            <div className="flex items-baseline justify-between text-xs text-muted-foreground mb-2">
              <span>{used} actions used</span>
              <span>{limit} daily limit</span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary/40">
              <div
                className={cn('h-full rounded-full transition-all duration-500', progressColor)}
                style={{ width: `${usagePct}%` }}
                role="progressbar"
                aria-valuenow={used}
                aria-valuemin={0}
                aria-valuemax={limit ?? 0}
                aria-label="Daily AI usage"
              />
            </div>
            {usageHigh && (
              <button
                type="button"
                onClick={() => {
                  haptics.light();
                  navigate('/subscription');
                }}
                className="mt-2.5 text-xs font-semibold text-primary hover:underline touch-manipulation"
              >
                Upgrade for higher limits →
              </button>
            )}
          </>
        )}
      </div>

      {/* Features */}
      <ul className="px-4 sm:px-5 py-1 divide-y divide-border/30">
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <li key={title} className="flex items-start gap-3 py-3.5 first:pt-4 last:pb-4">
            <div className="w-9 h-9 rounded-xl icon-glow flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-primary" aria-hidden />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-sm font-medium text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
            </div>
          </li>
        ))}
      </ul>

      {/* Privacy + AI Studio link */}
      <div className="px-4 sm:px-5 pb-4 space-y-3">
        <div className="flex items-start gap-2.5 px-3 py-3 rounded-xl bg-muted/40 border border-border/50">
          <Shield className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" aria-hidden />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            We never store your resume data for model training. Requests are processed securely and
            only used to generate your output.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            haptics.light();
            navigate('/ai-studio');
          }}
          className={cn(
            'flex items-center justify-between w-full px-4 py-3.5 rounded-xl',
            'bg-primary/5 border border-primary/15 hover:bg-primary/10 active:scale-[0.99]',
            'transition-all touch-manipulation text-left',
          )}
        >
          <div>
            <p className="text-sm font-semibold text-foreground">Open AI Studio</p>
            <p className="text-xs text-muted-foreground mt-0.5">Tailor, enhance, and more</p>
          </div>
          <ChevronRight className="w-4 h-4 text-primary shrink-0" aria-hidden />
        </button>
      </div>
    </div>
  );
});
