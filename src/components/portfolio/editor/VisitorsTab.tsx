import { useMemo } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Globe, Users, TrendingUp, Share2, Eye, Monitor, Smartphone, Tablet } from 'lucide-react';
import { usePortfolioAnalytics } from '@/hooks/usePortfolioAnalytics';

interface VisitorsTabProps {
  username: string | null;
  portfolioCanonicalUrl: string;
  onShare: () => void;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD}d ago`;
  return `${Math.floor(diffD / 30)}mo ago`;
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds < 1) return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function countryFlag(country: string | null): string {
  if (!country) return '🌍';
  const flagMap: Record<string, string> = {
    'US': '🇺🇸', 'United States': '🇺🇸',
    'GB': '🇬🇧', 'United Kingdom': '🇬🇧',
    'CA': '🇨🇦', 'Canada': '🇨🇦',
    'AU': '🇦🇺', 'Australia': '🇦🇺',
    'IN': '🇮🇳', 'India': '🇮🇳',
    'DE': '🇩🇪', 'Germany': '🇩🇪',
    'FR': '🇫🇷', 'France': '🇫🇷',
    'NL': '🇳🇱', 'Netherlands': '🇳🇱',
    'SE': '🇸🇪', 'Sweden': '🇸🇪',
    'SG': '🇸🇬', 'Singapore': '🇸🇬',
    'BR': '🇧🇷', 'Brazil': '🇧🇷',
    'JP': '🇯🇵', 'Japan': '🇯🇵',
    'KR': '🇰🇷', 'South Korea': '🇰🇷',
    'CN': '🇨🇳', 'China': '🇨🇳',
    'MX': '🇲🇽', 'Mexico': '🇲🇽',
    'ES': '🇪🇸', 'Spain': '🇪🇸',
    'IT': '🇮🇹', 'Italy': '🇮🇹',
    'PL': '🇵🇱', 'Poland': '🇵🇱',
    'UA': '🇺🇦', 'Ukraine': '🇺🇦',
    'ZA': '🇿🇦', 'South Africa': '🇿🇦',
    'NG': '🇳🇬', 'Nigeria': '🇳🇬',
    'EG': '🇪🇬', 'Egypt': '🇪🇬',
    'PK': '🇵🇰', 'Pakistan': '🇵🇰',
    'BD': '🇧🇩', 'Bangladesh': '🇧🇩',
    'PH': '🇵🇭', 'Philippines': '🇵🇭',
    'ID': '🇮🇩', 'Indonesia': '🇮🇩',
  };
  return flagMap[country] || '🌍';
}

function last7DaysData(visits: Array<{ visited_at: string }>): Array<{ day: string; count: number; date: string }> {
  const days: Array<{ day: string; count: number; date: string }> = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
    days.push({ day: label, count: 0, date: dateStr });
  }
  visits.forEach(v => {
    const vDate = v.visited_at.slice(0, 10);
    const entry = days.find(d => d.date === vDate);
    if (entry) entry.count++;
  });
  return days;
}

function topSections(visits: Array<{ sections_viewed: string[] }>): Array<{ section: string; count: number }> {
  const tally: Record<string, number> = {};
  visits.forEach(v => {
    (v.sections_viewed || []).forEach(s => {
      tally[s] = (tally[s] || 0) + 1;
    });
  });
  return Object.entries(tally)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([section, count]) => ({ section, count }));
}

function last7DayCount(visits: Array<{ visited_at: string }>): number {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return visits.filter(v => new Date(v.visited_at).getTime() >= cutoff).length;
}

export function VisitorsTab({ username, portfolioCanonicalUrl, onShare }: VisitorsTabProps) {
  const { data: analytics, isLoading } = usePortfolioAnalytics(username ?? undefined);

  const chartData = useMemo(() => last7DaysData(analytics?.visits ?? []), [analytics?.visits]);
  const topSectionsData = useMemo(() => topSections(analytics?.visits ?? []), [analytics?.visits]);
  const week7Count = useMemo(() => last7DayCount(analytics?.visits ?? []), [analytics?.visits]);

  const totalViews = analytics?.summary.total_visits ?? 0;
  const avgTime = analytics?.summary.avg_time_seconds ?? null;
  const recentVisits = (analytics?.visits ?? []).slice(0, 10);

  const isEmpty = !isLoading && totalViews === 0;

  if (!username) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
        <Globe className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Set a username to start tracking visitors.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-20 rounded-xl bg-muted/40" />
        <div className="h-32 rounded-xl bg-muted/40" />
        <div className="h-40 rounded-xl bg-muted/40" />
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Users className="w-7 h-7 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold">No visitors yet</p>
          <p className="text-xs text-muted-foreground max-w-[220px]">Share your portfolio link to start seeing who visits.</p>
        </div>
        <button
          onClick={onShare}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold active:scale-95 transition-all touch-manipulation"
        >
          <Share2 className="w-4 h-4" />
          Share your portfolio
        </button>
        {portfolioCanonicalUrl && (
          <p className="text-[11px] text-muted-foreground font-mono break-all max-w-[260px]">{portfolioCanonicalUrl}</p>
        )}
      </div>
    );
  }


  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center justify-center gap-0.5 py-3 px-2 rounded-xl bg-card border border-border text-center">
          <p className="text-xl font-black">{totalViews.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">Total views</p>
        </div>
        <div className="flex flex-col items-center justify-center gap-0.5 py-3 px-2 rounded-xl bg-card border border-border text-center">
          <p className="text-xl font-black">{week7Count}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">Last 7 days</p>
        </div>
        <div className="flex flex-col items-center justify-center gap-0.5 py-3 px-2 rounded-xl bg-card border border-border text-center">
          <p className="text-xl font-black">{formatDuration(avgTime)}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">Avg. time</p>
        </div>
      </div>

      {/* 7-day sparkline chart */}
      <div className="rounded-xl bg-card border border-border p-3">
        <div className="flex items-center gap-1.5 mb-3">
          <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Views — last 7 days</p>
        </div>
        <ResponsiveContainer width="100%" height={80}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -24, bottom: 0 }} barCategoryGap="30%">
            <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
              labelStyle={{ fontWeight: 600 }}
              formatter={(v: number) => [v, 'Views']}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.count > 0 ? 'var(--primary, #e84545)' : 'var(--muted, #374151)'} opacity={entry.count > 0 ? 1 : 0.3} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top sections */}
      {topSectionsData.length > 0 && (
        <div className="rounded-xl bg-card border border-border p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Top Sections</p>
          {topSectionsData.map(({ section, count }) => (
            <div key={section} className="flex items-center gap-2">
              <span className="text-xs capitalize min-w-[90px] text-foreground font-medium">{section.replace(/-/g, ' ')}</span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.round((count / (topSectionsData[0]?.count || 1)) * 100)}%`,
                    background: 'var(--primary, #e84545)',
                  }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground min-w-[24px] text-right">{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Recent visits */}
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 pt-3 pb-2">Recent Visits</p>
        <div className="divide-y divide-border">
          {recentVisits.map((visit) => (
            <div key={visit.id} className="flex items-center gap-2 px-3 py-2.5">
              <span className="text-base leading-none" title={visit.country || 'Unknown'}>{countryFlag(visit.country)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(visit.sections_viewed || []).slice(0, 3).map(s => (
                    <span
                      key={s}
                      className="text-[9px] px-1.5 py-0.5 rounded-full font-medium capitalize"
                      style={{ background: 'var(--primary, #e84545)', color: '#fff', opacity: 0.85 }}
                    >
                      {s.replace(/-/g, ' ')}
                    </span>
                  ))}
                  {(visit.sections_viewed || []).length > 3 && (
                    <span className="text-[9px] text-muted-foreground">+{visit.sections_viewed.length - 3}</span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(visit.visited_at)}</p>
              </div>
              <div className="flex flex-col items-end gap-0.5 shrink-0">
                {visit.device === 'mobile' && <Smartphone className="w-3 h-3 text-muted-foreground" aria-label="Mobile" />}
                {visit.device === 'tablet' && <Tablet className="w-3 h-3 text-muted-foreground" aria-label="Tablet" />}
                {(visit.device === 'desktop' || !visit.device) && <Monitor className="w-3 h-3 text-muted-foreground" aria-label="Desktop" />}
                <div className="flex items-center gap-0.5">
                  <Eye className="w-2.5 h-2.5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">{formatDuration(visit.time_spent_seconds)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Share CTA */}
      <button
        onClick={onShare}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors active:scale-[0.98] touch-manipulation"
      >
        <Share2 className="w-4 h-4" />
        Share your portfolio
      </button>
    </div>
  );
}
