import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Eye, TrendingUp, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useNavigate } from 'react-router-dom';
import { haptics } from '@/lib/haptics';

interface DayCount {
  date: string;
  count: number;
}

function SparkBar({ data }: { data: DayCount[] }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {data.map((day, i) => (
        <motion.div
          key={day.date}
          className="flex-1 rounded-sm bg-primary/40 min-w-[4px]"
          style={{ height: `${Math.max((day.count / max) * 100, 8)}%` }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: i * 0.04, duration: 0.3, ease: 'easeOut' }}
          style-origin="bottom"
        />
      ))}
    </div>
  );
}

export function PortfolioActivityCard() {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id, user);
  const navigate = useNavigate();

  const username = profile?.username;
  const portfolioEnabled = profile?.portfolioEnabled;

  const { data: activityData } = useQuery({
    queryKey: ['portfolio-activity', username],
    queryFn: async () => {
      if (!username) return null;

      // Last 7 days
      const days: DayCount[] = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return { date: d.toISOString().split('T')[0], count: 0 };
      });

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data } = await supabase
        .from('portfolio_visits')
        .select('visited_at')
        .eq('username', username)
        .gte('visited_at', sevenDaysAgo.toISOString());

      if (data) {
        data.forEach(row => {
          const dateStr = row.visited_at.split('T')[0];
          const found = days.find(d => d.date === dateStr);
          if (found) found.count++;
        });
      }

      const totalThisWeek = days.reduce((sum, d) => sum + d.count, 0);
      return { days, totalThisWeek };
    },
    enabled: !!username && !!portfolioEnabled,
    staleTime: 300_000,
  });

  // Don't render if portfolio not enabled or no data
  if (!portfolioEnabled || !username || !activityData) return null;

  const { days, totalThisWeek } = activityData;
  const hasActivity = totalThisWeek > 0;

  return (
    <motion.button
      onClick={() => { haptics.light(); navigate('/portfolio?tab=analytics'); }}
      className="mx-4 mb-3 w-[calc(100%-2rem)] glass-elevated rounded-2xl p-4 text-left active:scale-[0.98] transition-transform"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Portfolio Activity</span>
        </div>
        <div className="flex items-center gap-1.5">
          {hasActivity && (
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          )}
          <span className="text-xs text-muted-foreground">7 days</span>
        </div>
      </div>

      <div className="flex items-end gap-4">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold tabular-nums">{totalThisWeek}</span>
            <Eye className="w-4 h-4 text-muted-foreground mb-1" />
          </div>
          <p className="text-xs text-muted-foreground">
            {hasActivity ? 'people viewed your portfolio' : 'views this week — share to get seen!'}
          </p>
        </div>

        <div className="flex-1">
          <SparkBar data={days} />
        </div>
      </div>

      {hasActivity && (
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/30">
          <TrendingUp className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs text-primary font-medium">View detailed analytics →</span>
        </div>
      )}
    </motion.button>
  );
}
