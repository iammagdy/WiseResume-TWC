import { Info, Activity } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { useAICredits } from '@/hooks/useAICredits';
import { useMe } from '@/hooks/useMe';
import { PLAN_CREDIT_LIMITS } from '@/lib/planConfig';
import type { PlanKey } from '@/lib/planConfig';
import { cn } from '@/lib/utils';

export default function AICreditsRow({ onOpenAISettings }: { onOpenAISettings: () => void }) {
    const { data: credits } = useAICredits();
    const { data: meData } = useMe();
    const used = credits?.daily_usage || 0;
    // Derive limit from plan if not set — never hardcode 20
    const effectivePlan = (meData?.subscription?.effective_plan ?? 'free') as PlanKey;
    const fallbackLimit = PLAN_CREDIT_LIMITS[effectivePlan] ?? PLAN_CREDIT_LIMITS.free;
    const limit = credits?.daily_limit ?? fallbackLimit;
    const percentage = Math.min((used / limit) * 100, 100);

    const progressColor = percentage > 80
        ? 'bg-destructive'
        : percentage > 60
            ? 'bg-amber-500'
            : 'bg-emerald-500';

    return (
        <div className="flex items-center gap-3 px-4 py-3.5 min-h-[56px]">
            <div className="w-8 h-8 rounded-lg icon-glow flex items-center justify-center text-primary flex-shrink-0">
                <Activity className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium">AI Credits</p>
                    <TooltipProvider delayDuration={100}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button type="button" className="touch-manipulation rounded-full ring-blue-500 hover:bg-muted p-0.5 transition-colors">
                                    <Info className="w-[14px] h-[14px] text-muted-foreground hover:text-foreground" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[200px] text-xs leading-relaxed z-[100]">
                                <p>1 credit is used per AI action like Rewriting, Tailoring, or generating content.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {used} / {limit} used today
                </p>
                <div className="relative h-1.5 mt-1.5 w-full overflow-hidden rounded-full bg-secondary/30">
                    <div
                        className={cn("h-full rounded-full transition-all duration-500", progressColor)}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                {percentage > 80 && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onOpenAISettings(); }}
                        className="text-[11px] text-primary hover:underline mt-1 inline-block"
                    >
                        Get unlimited with your own key →
                    </button>
                )}
            </div>
        </div>
    );
}
