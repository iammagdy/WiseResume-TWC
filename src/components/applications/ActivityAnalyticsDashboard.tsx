import { memo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import { motion, useReducedMotion } from 'framer-motion';
import { useJobActivityStats, JobActivityStats } from '@/hooks/useJobActivityStats';
import { TrendingUp } from 'lucide-react';

function RatePill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex-1 flex flex-col items-center gap-1 bg-muted/40 rounded-xl py-3 px-2">
      <span className={`text-lg font-bold ${color}`}>{value}%</span>
      <span className="text-[10px] text-muted-foreground text-center leading-tight">{label}</span>
    </div>
  );
}

interface Props {
  stats?: JobActivityStats;
}

export const ActivityAnalyticsDashboard = memo(function ActivityAnalyticsDashboard({ stats: statsProp }: Props) {
  const statsFromHook = useJobActivityStats();
  const stats = statsProp ?? statsFromHook;
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

  const funnelData = [
    { name: 'Applied', count: stats.appliedCount, fill: 'hsl(var(--primary))' },
    { name: 'Screening', count: stats.screeningCount, fill: 'hsl(217, 91%, 60%)' },
    { name: 'Interviewing', count: stats.interviewsScheduled, fill: 'hsl(var(--warning))' },
    { name: 'Offer', count: stats.offersReceived, fill: 'hsl(var(--success))' },
  ];
  const funnelMax = Math.max(...funnelData.map(s => s.count), 1);

  const hasWeeklyData = stats.weeklyTrend.some(w => w.count > 0);

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
      className="space-y-3"
    >
      {/* Conversion Funnel — Recharts horizontal BarChart */}
      <div className="bg-card border border-border shadow-soft rounded-2xl p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Application Pipeline
        </p>

        {/* Drop-off annotations above chart */}
        <div className="flex gap-2 text-[10px] text-muted-foreground mb-1 pl-[88px]">
          {funnelData.slice(1).map((step, i) => {
            const prev = funnelData[i];
            const dropOff = prev.count > 0
              ? Math.round(((prev.count - step.count) / prev.count) * 100)
              : 0;
            return dropOff > 0 ? (
              <span key={step.name} className="flex-1 text-center">-{dropOff}%</span>
            ) : <span key={step.name} className="flex-1" />;
          })}
        </div>

        <ResponsiveContainer width="100%" height={120}>
          <BarChart layout="vertical" data={funnelData} margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
            <XAxis type="number" hide domain={[0, funnelMax]} />
            <YAxis
              type="category"
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11 }}
              width={88}
            />
            <Tooltip
              formatter={(v: number) => [v, 'Applications']}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
              cursor={{ fill: 'hsl(var(--muted))' }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22}>
              {funnelData.map((step, i) => (
                <Cell key={i} fill={step.fill} />
              ))}
              <LabelList dataKey="count" position="right" style={{ fontSize: 11, fontWeight: 600 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Rate pills */}
        <div className="flex gap-2 mt-3">
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
