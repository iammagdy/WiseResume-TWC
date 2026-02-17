import { memo, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Zap, Clock, History, Eye } from 'lucide-react';
import { useAICredits } from '@/hooks/useAICredits';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from '@/hooks/useAuth';
import { CreditRing } from './CreditRing';
import { getAICost } from '@/lib/aiCostEstimates';
import { format } from 'date-fns';
import { Json } from '@/integrations/supabase/types';

interface CreditUsageSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  enhance: 'Enhance',
  tailor: 'Tailor',
  score: 'ATS Score',
  proofread: 'Proofread',
  'cover-letter': 'Cover Letter',
  interview: 'Interview',
  'career-assessment': 'Career',
  'detect-humanize': 'Humanize',
  'one-page': '1-Page',
  linkedin: 'LinkedIn',
  'gap-explain': 'Gap Explain',
  'gap-fill': 'Gap Fill',
  'recruiter-sim': 'Recruiter Sim',
  'agentic-chat': 'AI Chat',
};

interface ActivityEntry {
  type: string;
  label: string;
  time: string;
  isBackground: boolean;
  cost: number;
}

function isBackground(metadata: Json | null, actionType?: string): boolean {
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    return (metadata as Record<string, unknown>).background === true;
  }
  // Defensive fallback: score entries with null metadata are background
  if (actionType === 'score' && metadata == null) return true;
  return false;
}

function formatTime(time: string): string {
  const d = new Date(time);
  return isNaN(d.getTime()) ? '--:--' : format(d, 'h:mm a');
}

export const CreditUsageSheet = memo(function CreditUsageSheet({
  open,
  onOpenChange,
}: CreditUsageSheetProps) {
  const { user } = useAuth();
  const { data: credits } = useAICredits();

  const used = credits?.daily_usage ?? 0;
  const limit = credits?.daily_limit ?? 20;
  const isUnlimited = !isFinite(limit);
  const totalLifetime = credits?.total_usage ?? 0;

  const { data: allActivity } = useQuery({
    queryKey: ['ai-usage-breakdown', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('ai_usage_logs')
        .select('action_type, created_at, metadata')
        .eq('user_id', user.id)
        .gte('created_at', `${today}T00:00:00`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data ?? [])
        .filter((log) => log.created_at)
        .map((log): ActivityEntry => {
          const bg = isBackground(log.metadata, log.action_type);
          return {
            type: log.action_type,
            label: CATEGORY_LABELS[log.action_type] || log.action_type,
            time: log.created_at,
            isBackground: bg,
            cost: bg ? 0 : getAICost(log.action_type),
          };
        });
    },
    enabled: !!user && open,
    refetchOnMount: 'always',
    staleTime: 0,
  });

  const credited = useMemo(() => allActivity?.filter((a) => !a.isBackground) ?? [], [allActivity]);
  const background = useMemo(() => allActivity?.filter((a) => a.isBackground) ?? [], [allActivity]);

  const timeUntilReset = useMemo(() => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const diff = midnight.getTime() - now.getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[75vh]">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Zap className="w-5 h-5 text-primary" />
            AI Credit Usage
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 pb-6 overflow-y-auto">
          {/* Main ring */}
          <div className="flex flex-col items-center gap-3">
            <CreditRing used={used} limit={limit} size={80} />
            <div className="text-center">
              {isUnlimited ? (
                <>
                  <p className="text-2xl font-bold text-primary">Unlimited</p>
                  <p className="text-xs text-muted-foreground">using your own API key</p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold">
                    {used} <span className="text-muted-foreground font-normal text-base">/ {limit}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">credits used today</p>
                </>
              )}
            </div>
            {!isUnlimited && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                Resets in {timeUntilReset}
              </div>
            )}
          </div>

          {/* Credited activity */}
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Credited Activity
            </h3>
            {credited.length > 0 ? (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {credited.map((item, i) => (
                  <div
                    key={`c-${item.time}-${i}`}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/30"
                  >
                    <span className="text-sm font-medium">{item.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-destructive">
                        -{item.cost} credit{item.cost > 1 ? 's' : ''}
                      </span>
                      <span className="text-xs text-muted-foreground w-16 text-right">
                        {formatTime(item.time)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-4">
                No credited AI actions yet today. Start creating!
              </p>
            )}
          </div>

          {/* Background activity */}
          {background.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                Background Activity
              </h3>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {background.map((item, i) => (
                  <div
                    key={`b-${item.time}-${i}`}
                    className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-muted/15"
                  >
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-muted-foreground/60 italic">Free</span>
                      <span className="text-[11px] text-muted-foreground/60 w-16 text-right">
                        {formatTime(item.time)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lifetime stat */}
          <div className="flex items-center justify-between px-3 py-3 rounded-xl glass-surface">
            <span className="text-sm text-muted-foreground">Lifetime usage</span>
            <span className="text-sm font-semibold">{totalLifetime} credits</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
});
