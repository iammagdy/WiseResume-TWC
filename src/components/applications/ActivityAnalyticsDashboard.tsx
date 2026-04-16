import { memo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { motion, useReducedMotion } from 'framer-motion';
import { useJobActivityStats } from '@/hooks/useJobActivityStats';
import { TrendingUp } from 'lucide-react';

function RatePill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex-1 flex flex-col items-center gap-1 bg-muted/40 rounded-xl py-3 px-2">
      <span className={`text-lg font-bold ${color}`}>{value}%</span>
      <span className="text-[10px] text-muted-foreground text-center leading-tight">{label}</span>
    </div>
  );
}

export const ActivityAnalyticsDashboard = memo(function ActivityAnalyticsDashboard() {
  const stats = useJobActivityStats();
  const shouldReduceMotion = useReducedMotion();

  if (stats.isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-40 rounded-2xl bg-muted animate-pulse" />
        <div className="h-24 rounded-2xl bg-muted animate-pulse" />
      </div>
    );
  }

  const totalTracked = stats.applicationsSubmitted + stats.interviewsScheduled + stats.offersReceived;
  if (totalTracked === 0) return null;

  const funnelSteps = [
    { label: 'Applied', count: stats.appliedCount, colorClass: 'bg-primary' },
    { label: 'Screening', count: stats.screeningCount, colorClass: 'bg-blue-500' },
    { label: 'Interviewing', count: stats.interviewsScheduled, colorClass: 'bg-warning' },
    { label: 'Offer', count: stats.offersReceived, colorClass: 'bg-success' },
  ];
  const maxCount = Math.max(...funnelSteps.map(s => s.count), 1);

  const hasWeeklyData = stats.weeklyTrend.some(w => w.count > 0);

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
      className="space-y-3"
    >
      {/* Conversion Funnel */}
      <div className="bg-card border border-border shadow-soft rounded-2xl p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Application Pipeline
        </p>
        <div className="space-y-2.5">
          {funnelSteps.map((step, i) => {
            const pct = Math.round((step.count / maxCount) * 100);
            const dropOff = i > 0 && funnelSteps[i - 1].count > 0
              ? Math.round(((funnelSteps[i - 1].count - step.count) / funnelSteps[i - 1].count) * 100)
              : null;
            return (
              <div key={step.label} className="flex items-center gap-2.5">
                <span className="text-[11px] text-muted-foreground w-[74px] shrink-0">{step.label}</span>
                <div className="flex-1 h-6 bg-muted/50 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${step.colorClass}`}
                    initial={shouldReduceMotion ? false : { width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, delay: i * 0.1 + 0.2, ease: 'easeOut' }}
                  />
                </div>
                <span className="text-xs font-semibold w-5 text-right shrink-0">{step.count}</span>
                {dropOff !== null && dropOff > 0 && (
                  <span className="text-[10px] text-muted-foreground w-[34px] shrink-0 text-right">
                    -{dropOff}%
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Rate pills */}
        <div className="flex gap-2 mt-4">
          <RatePill label="Response Rate" value={stats.responseRate} color="text-primary" />
          <RatePill label="Interview Rate" value={stats.interviewRate} color="text-warning" />
          <RatePill label="Offer Rate" value={stats.offerRate} color="text-success" />
        </div>
      </div>

      {/* Weekly bar chart */}
      {hasWeeklyData && (
        <div className="bg-card border border-border shadow-soft rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Applications — Last 8 Weeks
            </p>
          </div>
          <ResponsiveContainer width="100%" height={110}>
            <BarChart data={stats.weeklyTrend} margin={{ top: 4, right: 4, left: -32, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={1}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(v: number) => [v, 'Applications']}
                cursor={{ fill: 'hsl(var(--muted))' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={28}>
                {stats.weeklyTrend.map((_, i) => (
                  <Cell
                    key={i}
                    fill={
                      i === stats.weeklyTrend.length - 1
                        ? 'hsl(var(--primary))'
                        : 'hsl(var(--muted-foreground) / 0.35)'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
});
