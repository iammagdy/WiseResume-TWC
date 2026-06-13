import { useMemo, useState } from 'react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Globe, Users, TrendingUp, Share2, Eye, Monitor, Smartphone, Tablet, Building2, FlaskConical, Trophy, Link2, Plus, Copy, Trash2, Check, ChevronRight } from 'lucide-react';
import { usePortfolioAnalytics, useShortLinks, useCreateShortLink, useDeleteShortLink, type ShortLink } from '@/hooks/usePortfolioAnalytics';
import { PORTFOLIO_THEMES } from '@/lib/portfolioThemes';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { haptics } from '@/lib/haptics';

interface VisitorsTabProps {
  username: string | null;
  portfolioCanonicalUrl: string;
  onShare: () => void;
  portfolioStyle?: string;
  abChallengerTheme?: string;
  onPickWinner?: (winnerId: string) => void;
  userId?: string;
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
  };
  return flagMap[country] ?? '🌍';
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

/** Returns top sections sorted by avg dwell time (seconds) when timing data exists,
 *  falling back to raw visit-count when no timing data is available yet. */
function topSections(visits: Array<{ sections_viewed: string[]; sections_timing?: Record<string, number> }>): Array<{ section: string; value: number; unit: 'sec' | 'count' }> {
  const dwellTotal: Record<string, number> = {};
  const dwellCount: Record<string, number> = {};
  visits.forEach(v => {
    const timing = v.sections_timing ?? {};
    Object.entries(timing).forEach(([s, secs]) => {
      dwellTotal[s] = (dwellTotal[s] || 0) + (secs as number);
      dwellCount[s] = (dwellCount[s] || 0) + 1;
    });
  });
  const hasDwellData = Object.keys(dwellTotal).length > 0;
  if (hasDwellData) {
    return Object.entries(dwellTotal)
      .map(([s, total]) => ({ section: s, value: Math.round(total / dwellCount[s]), unit: 'sec' as const }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }
  const tally: Record<string, number> = {};
  visits.forEach(v => {
    (v.sections_viewed || []).forEach(s => { tally[s] = (tally[s] || 0) + 1; });
  });
  return Object.entries(tally)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([section, count]) => ({ section, value: count, unit: 'count' as const }));
}

function last7DayCount(visits: Array<{ visited_at: string }>): number {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return visits.filter(v => new Date(v.visited_at).getTime() >= cutoff).length;
}

// ── ShortLinkRow ──────────────────────────────────────────────────────────────
function ShortLinkRow({ link, userId, visitCount, canonicalBase, onDelete }: {
  link: ShortLink;
  userId: string;
  visitCount: number;
  canonicalBase: string;
  onDelete: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const { mutate: deleteLink, isPending: deleting } = useDeleteShortLink();
  const fullUrl = `${canonicalBase}/l/${link.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullUrl).then(() => {
      haptics.light();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDelete = () => {
    haptics.medium();
    deleteLink({ id: link.id, userId }, { onSuccess: () => onDelete(link.id) });
  };

  return (
    <div className="flex items-center gap-2 py-2.5 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">{link.label}</p>
        <p className="text-[10px] text-muted-foreground font-mono truncate">/l/{link.id}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[10px] text-muted-foreground">{visitCount} visit{visitCount !== 1 ? 's' : ''}</span>
        <button onClick={handleCopy} className="p-1 rounded-md hover:bg-muted transition-colors" title="Copy link">
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
        </button>
        <button onClick={handleDelete} disabled={deleting} className="p-1 rounded-md hover:bg-muted transition-colors" title="Delete link">
          <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
        </button>
      </div>
    </div>
  );
}

// ── Main VisitorsTab ──────────────────────────────────────────────────────────
export function VisitorsTab({ username, portfolioCanonicalUrl, onShare, portfolioStyle, abChallengerTheme, onPickWinner, userId }: VisitorsTabProps) {
  const { data: analytics, isLoading } = usePortfolioAnalytics(username ?? undefined);
  const { data: shortLinks = [], isLoading: linksLoading } = useShortLinks(userId, username ?? undefined);
  const { mutate: createLink, isPending: creating } = useCreateShortLink();
  const queryClient = useQueryClient();

  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [showCreateLink, setShowCreateLink] = useState(false);

  const chartData = useMemo(() => last7DaysData(analytics?.visits ?? []), [analytics?.visits]);
  const topSectionsData = useMemo(() => topSections(analytics?.visits ?? []), [analytics?.visits]);
  const week7Count = useMemo(() => last7DayCount(analytics?.visits ?? []), [analytics?.visits]);

  // Source attribution: count visits per short_link_id
  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = { direct: 0 };
    (analytics?.visits ?? []).forEach(v => {
      if (v.short_link_id) {
        counts[v.short_link_id] = (counts[v.short_link_id] || 0) + 1;
      } else {
        counts.direct++;
      }
    });
    return counts;
  }, [analytics?.visits]);

  const totalViews = analytics?.summary.total_visits ?? 0;
  const avgTime = analytics?.summary.avg_time_seconds ?? null;
  const recentVisits = (analytics?.visits ?? []).slice(0, 10);

  const isEmpty = !isLoading && totalViews === 0;

  const handleCreate = () => {
    if (!newLinkLabel.trim() || !userId || !username) return;
    haptics.light();
    createLink(
      { userId, portfolioUsername: username, label: newLinkLabel.trim() },
      {
        onSuccess: () => {
          setNewLinkLabel('');
          setShowCreateLink(false);
        },
      }
    );
  };

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
      <div className="space-y-4">
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

        {/* Short Links — available even before first visit */}
        {userId && (
          <div className="rounded-xl bg-card border border-border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-primary" />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Trackable Links</p>
              </div>
              <button
                className="text-[11px] text-primary font-medium flex items-center gap-0.5"
                onClick={() => { haptics.light(); setShowCreateLink(v => !v); }}
              >
                <Plus className="w-3 h-3" />New
              </button>
            </div>
            <AnimatePresence>
              {showCreateLink && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 pt-1">
                    <p className="text-[11px] text-muted-foreground">Label this link (e.g. "LinkedIn Bio")</p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g. LinkedIn Bio"
                        value={newLinkLabel}
                        onChange={e => setNewLinkLabel(e.target.value)}
                        className="h-8 text-xs"
                        onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
                        maxLength={50}
                      />
                      <Button onClick={handleCreate} disabled={creating || !newLinkLabel.trim()} className="h-8 px-3 text-xs rounded-lg shrink-0">
                        {creating ? <MiniSpinner size={12} /> : 'Create'}
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <ChevronRight className="w-3 h-3" />
                      Creates a trackable short link for this channel
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {linksLoading ? (
              <Skeleton className="h-10 rounded-lg" />
            ) : shortLinks.length === 0 && !showCreateLink ? (
              <p className="text-[11px] text-muted-foreground text-center py-2">
                Create trackable links for different channels (LinkedIn, email, etc.)
              </p>
            ) : (
              shortLinks.map(link => (
                <ShortLinkRow
                  key={link.id}
                  link={link}
                  userId={userId}
                  visitCount={sourceCounts[link.id] ?? 0}
                  canonicalBase="https://wiseresume.app"
                  onDelete={(id) => {
                    queryClient.setQueryData<ShortLink[]>(['short-links', userId], old => old?.filter(l => l.id !== id) ?? []);
                  }}
                />
              ))
            )}
          </div>
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

      {/* Trackable Links + Source Breakdown */}
      {userId && (
        <div className="rounded-xl bg-card border border-border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-primary" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Trackable Links</p>
            </div>
            <button
              className="text-[11px] text-primary font-medium flex items-center gap-0.5"
              onClick={() => { haptics.light(); setShowCreateLink(v => !v); }}
            >
              <Plus className="w-3 h-3" />New
            </button>
          </div>

          <AnimatePresence>
            {showCreateLink && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] text-muted-foreground">Label this link (e.g. "LinkedIn Bio", "Email Signature")</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. LinkedIn Bio"
                      value={newLinkLabel}
                      onChange={e => setNewLinkLabel(e.target.value)}
                      className="h-8 text-xs"
                      onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
                      maxLength={50}
                    />
                    <Button onClick={handleCreate} disabled={creating || !newLinkLabel.trim()} className="h-8 px-3 text-xs rounded-lg shrink-0">
                      {creating ? <MiniSpinner size={12} /> : 'Create'}
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <ChevronRight className="w-3 h-3" />
                    Share this link on each channel to see which one sends you the most views
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Source breakdown: direct + named links */}
          {(shortLinks.length > 0 || sourceCounts.direct > 0) && (
            <div className="space-y-1.5 pt-1">
              {/* Direct visits */}
              {sourceCounts.direct > 0 && (
                <div className="flex items-center gap-2">
                  <Globe className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="text-[11px] text-muted-foreground flex-1">Direct / Other</span>
                  <span className="text-[11px] text-muted-foreground">{sourceCounts.direct}</span>
                  <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-muted-foreground/40" style={{ width: `${Math.round((sourceCounts.direct / totalViews) * 100)}%` }} />
                  </div>
                </div>
              )}
              {/* Named link visits */}
              {shortLinks.map(link => {
                const count = sourceCounts[link.id] ?? 0;
                return (
                  <div key={link.id} className="flex items-center gap-2">
                    <Link2 className="w-3 h-3 text-primary shrink-0" />
                    <span className="text-[11px] text-foreground font-medium flex-1 truncate">{link.label}</span>
                    <span className="text-[11px] text-muted-foreground">{count}</span>
                    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: totalViews > 0 ? `${Math.round((count / totalViews) * 100)}%` : '0%' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Short link management rows */}
          {linksLoading ? (
            <Skeleton className="h-10 rounded-lg mt-2" />
          ) : shortLinks.length === 0 ? (
            <p className="text-[11px] text-muted-foreground text-center py-2">
              No trackable links yet — create one to see which channel sends you the most visitors.
            </p>
          ) : (
            <div className="border-t border-border mt-1 pt-1">
              {shortLinks.map(link => (
                <ShortLinkRow
                  key={link.id}
                  link={link}
                  userId={userId}
                  visitCount={sourceCounts[link.id] ?? 0}
                  canonicalBase="https://wiseresume.app"
                  onDelete={(id) => {
                    queryClient.setQueryData<ShortLink[]>(['short-links', userId], old => old?.filter(l => l.id !== id) ?? []);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Section Heatmap — dwell time per section */}
      {topSectionsData.length > 0 && (
        <div className="rounded-xl bg-card border border-border p-3 space-y-2">
          <div className="flex items-center gap-1.5 mb-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Section Heatmap</p>
            <span className="text-[10px] text-muted-foreground">
              ({topSectionsData[0]?.unit === 'sec' ? 'avg time on section' : 'visits'})
            </span>
          </div>
          {topSectionsData.map(({ section, value, unit }) => (
            <div key={section} className="flex items-center gap-2">
              <span className="text-xs capitalize min-w-[90px] text-foreground font-medium">{section.replace(/-/g, ' ')}</span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.round((value / (topSectionsData[0]?.value || 1)) * 100)}%`,
                    background: 'var(--primary, #e84545)',
                  }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground min-w-[28px] text-right">
                {unit === 'sec' ? `${value}s` : value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* A/B Theme Test Results — only shown if challenger theme is configured */}
      {abChallengerTheme && (() => {
        const summary = analytics?.summary;
        const aName = PORTFOLIO_THEMES.find(t => t.id === portfolioStyle)?.name ?? (portfolioStyle || 'Current');
        const bName = PORTFOLIO_THEMES.find(t => t.id === abChallengerTheme)?.name ?? abChallengerTheme;
        const aTime = summary?.avg_time_variant_a ?? null;
        const bTime = summary?.avg_time_variant_b ?? null;
        const aVisits = summary?.visits_variant_a ?? 0;
        const bVisits = summary?.visits_variant_b ?? 0;
        const hasData = aVisits > 0 || bVisits > 0;
        const aWins = aTime !== null && bTime !== null && aTime >= bTime;
        const bWins = aTime !== null && bTime !== null && bTime > aTime;

        return (
          <div className="rounded-xl bg-card border border-border p-3 space-y-2.5">
            <div className="flex items-center gap-1.5">
              <FlaskConical className="w-3.5 h-3.5 text-primary" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">A/B Theme Test</p>
            </div>
            {hasData ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { variant: 'A (Current)', theme: aName, time: aTime, visits: aVisits, wins: aWins, id: portfolioStyle },
                    { variant: 'B (Challenger)', theme: bName, time: bTime, visits: bVisits, wins: bWins, id: abChallengerTheme },
                  ].map(v => (
                    <div key={v.variant} className={`rounded-lg p-2.5 border text-center ${v.wins ? 'border-emerald-400/40 bg-emerald-400/5' : 'border-border bg-muted/30'}`}>
                      <p className="text-[10px] text-muted-foreground mb-0.5">{v.variant}</p>
                      <p className="text-[11px] font-semibold text-foreground truncate">{v.theme}</p>
                      <p className="text-base font-black mt-0.5">{formatDuration(v.time)}</p>
                      <p className="text-[10px] text-muted-foreground">{v.visits} visit{v.visits !== 1 ? 's' : ''}</p>
                      {v.wins && <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">▲ Winning</p>}
                    </div>
                  ))}
                </div>
                {(aWins || bWins) && onPickWinner && (
                  <button
                    onClick={() => {
                      const winnerId = aWins ? portfolioStyle! : abChallengerTheme;
                      onPickWinner(winnerId);
                      toast.success(`"${aWins ? aName : bName}" set as your main theme!`);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 active:scale-95 transition-all"
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    Pick {aWins ? 'A' : 'B'} as Winner
                  </button>
                )}
              </>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                No A/B data yet — visitors are being split 50/50. Results will appear after the first few visits.
              </p>
            )}
          </div>
        );
      })()}

      {/* Recent visits */}
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 pt-3 pb-2">Recent Visits</p>
        <div className="divide-y divide-border">
          {recentVisits.map((visit) => (
            <div key={visit.id} className="flex items-center gap-2 px-3 py-2.5">
              <span className="text-base leading-none" title={visit.country || 'Unknown'}>{countryFlag(visit.country)}</span>
              <div className="flex-1 min-w-0">
                {visit.company_name && (
                  <p className="text-[10px] text-primary font-medium flex items-center gap-0.5 mb-0.5">
                    <Building2 className="w-2.5 h-2.5 shrink-0" />
                    {visit.company_name}
                  </p>
                )}
                {visit.short_link_id && shortLinks.find(l => l.id === visit.short_link_id) && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 mb-0.5">
                    <Link2 className="w-2.5 h-2.5 shrink-0" />
                    via {shortLinks.find(l => l.id === visit.short_link_id)!.label}
                  </p>
                )}
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
