import { memo, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Zap, Clock } from 'lucide-react';
import { useAICredits } from '@/hooks/useAICredits';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from '@/hooks/useAuth';
import { CreditRing } from './CreditRing';
import { cn } from '@/lib/utils';

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
  const remaining = Math.max(0, limit - used);
  const totalLifetime = credits?.total_usage ?? 0;

  // Per-category breakdown from ai_usage_logs (today only)
  const { data: breakdown } = useQuery({
    queryKey: ['ai-usage-breakdown', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('ai_usage_logs')
        .select('action_type')
        .eq('user_id', user.id)
        .gte('created_at', `${today}T00:00:00`);

      if (error) throw error;

      const counts: Record<string, number> = {};
      (data ?? []).forEach((log) => {
        const type = log.action_type || 'other';
        counts[type] = (counts[type] || 0) + 1;
      });

      return Object.entries(counts)
        .map(([type, count]) => ({ type, count, label: CATEGORY_LABELS[type] || type }))
        .sort((a, b) => b.count - a.count);
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
  }, [open]); // recalculate when sheet opens

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

          {/* Per-category breakdown */}
          {breakdown && breakdown.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Today's Breakdown
              </h3>
              {breakdown.map(({ type, count, label }) => (
                <div
                  key={type}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-muted/30"
                >
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-sm text-muted-foreground">{count} credit{count > 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          )}

          {breakdown && breakdown.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">
              No AI actions used yet today. Start creating!
            </p>
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
