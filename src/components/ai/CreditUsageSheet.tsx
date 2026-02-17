import { memo, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Zap, Clock, History } from 'lucide-react';
import { useAICredits } from '@/hooks/useAICredits';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from '@/hooks/useAuth';
import { CreditRing } from './CreditRing';
import { format } from 'date-fns';

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

export const CreditUsageSheet = memo(function CreditUsageSheet({
  open,
  onOpenChange,
}: CreditUsageSheetProps) {
  const { user } = useAuth();
  const { data: credits } = useAICredits();

  const used = credits?.daily_usage ?? 0;
  const limit = credits?.daily_limit ?? 20;
  const totalLifetime = credits?.total_usage ?? 0;

  // Recent activity: last 10 user-initiated AI actions (today only)
  const { data: recentActivity } = useQuery({
    queryKey: ['ai-usage-breakdown', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('ai_usage_logs')
        .select('action_type, created_at')
        .eq('user_id', user.id)
        .gte('created_at', `${today}T00:00:00`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data ?? [])
        .filter((log) => log.created_at)
        .map((log) => ({
          type: log.action_type,
          label: CATEGORY_LABELS[log.action_type] || log.action_type,
          time: log.created_at,
        }));
    },
    enabled: !!user && open,
  });

  // Midnight countdown
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

        <div className="space-y-6 pb-6 overflow-y-auto">
          {/* Main ring */}
          <div className="flex flex-col items-center gap-3">
            <CreditRing used={used} limit={limit} size={80} />
            <div className="text-center">
              <p className="text-2xl font-bold">{used} <span className="text-muted-foreground font-normal text-base">/ {limit}</span></p>
              <p className="text-xs text-muted-foreground">credits used today</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              Resets in {timeUntilReset}
            </div>
          </div>

          {/* Recent activity history */}
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              Today's Activity
            </h3>
            {recentActivity && recentActivity.length > 0 ? (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {recentActivity.map((item, i) => (
                  <div
                    key={`${item.time}-${i}`}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/30"
                  >
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {(() => {
                        const d = new Date(item.time);
                        return isNaN(d.getTime()) ? '--:--' : format(d, 'h:mm a');
                      })()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-4">
                No AI actions used yet today. Start creating!
              </p>
            )}
          </div>

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
