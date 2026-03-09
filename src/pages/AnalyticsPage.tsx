import { useMemo } from 'react';
import { BackButton } from '@/components/ui/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Target, Briefcase, Flame, Download, TrendingUp, TrendingDown, Award, Calendar } from 'lucide-react';
import { useResumes, dbToResumeData } from '@/hooks/useResumes';
import { useJobApplications } from '@/hooks/useJobApplications';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useResumeScore, backgroundScore } from '@/hooks/useResumeScore';
import { useATSScoreHistoryStore } from '@/store/atsScoreHistoryStore';
import { ATSScoreTrendChart } from '@/components/dashboard/ATSScoreTrendChart';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { format, formatDistanceToNow } from 'date-fns';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id, user);
  const { data: resumes = [] } = useResumes();
  const { data: applications = [] } = useJobApplications();
  const { getCachedScore } = useResumeScore();

  const stats = useMemo(() => {
    const scores = resumes
      .map(r => ({ id: r.id, title: r.title, score: getCachedScore(r.id, r.updated_at)?.overallScore }))
      .filter((s): s is { id: string; title: string; score: number } => s.score != null);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b.score, 0) / scores.length) : 0;
    const bestResume = scores.length > 0 ? scores.reduce((a, b) => a.score > b.score ? a : b) : null;
    const worstResume = scores.length > 1 ? scores.reduce((a, b) => a.score < b.score ? a : b) : null;

    // Resume with content completeness
    const completionScores = resumes.map(r => {
      let filled = 0;
      let total = 5;
      if (r.summary) filled++;
      if ((r.experience as unknown as unknown[])?.length > 0) filled++;
      if ((r.education as unknown as unknown[])?.length > 0) filled++;
      if ((r.skills as unknown as string[])?.length > 0) filled++;
      if (r.contact_info && (r.contact_info as unknown as { fullName?: string })?.fullName) filled++;
      return Math.round((filled / total) * 100);
    });
    const avgCompletion = completionScores.length > 0 ? Math.round(completionScores.reduce((a, b) => a + b, 0) / completionScores.length) : 0;

    // Most recent activity
    const lastUpdated = resumes.length > 0 ? resumes[0].updated_at : null;

    return {
      totalResumes: resumes.length,
      avgScore,
      totalApps: applications.length,
      streak: profile?.loginStreak ?? 0,
      bestResume,
      worstResume,
      avgCompletion,
      lastUpdated,
    };
  }, [resumes, applications, getCachedScore, profile]);

  // Application funnel with percentages
  const funnel = useMemo(() => {
    const total = applications.length;
    const applied = applications.filter(a => a.status === 'applied').length;
    const interviewing = applications.filter(a => a.status === 'interviewing').length;
    const offer = applications.filter(a => a.status === 'offer').length;
    const rejected = applications.filter(a => a.status === 'rejected').length;
    return [
      { stage: 'Applied', count: applied || total, pct: total > 0 ? Math.round(((applied || total) / total) * 100) : 0 },
      { stage: 'Interview', count: interviewing, pct: total > 0 ? Math.round((interviewing / total) * 100) : 0 },
      { stage: 'Offer', count: offer, pct: total > 0 ? Math.round((offer / total) * 100) : 0 },
      { stage: 'Rejected', count: rejected, pct: total > 0 ? Math.round((rejected / total) * 100) : 0 },
    ];
  }, [applications]);

  // Score history from store (all resumes combined)
  const scoreHistory = useMemo(() => {
    const store = useATSScoreHistoryStore.getState();
    const allEntries = resumes.flatMap(r => store.getHistory(r.id) ?? []);
    return allEntries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [resumes]);

  // Conversion rate
  const conversionRate = useMemo(() => {
    if (applications.length === 0) return null;
    const interviews = applications.filter(a => a.status === 'interviewing' || a.status === 'offer').length;
    return Math.round((interviews / applications.length) * 100);
  }, [applications]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="pt-safe sticky top-0 z-10 pb-2 px-4 glass-header backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="text-page-title">Analytics</h1>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9"
            onClick={() => { haptics.light(); toast('Report export coming soon!', { icon: '📊' }); }}
            aria-label="Export report"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Resumes', value: stats.totalResumes, icon: FileText, color: 'text-primary' },
              { label: 'Avg ATS', value: `${stats.avgScore}%`, icon: Target, color: 'text-accent-foreground' },
              { label: 'Applications', value: stats.totalApps, icon: Briefcase, color: 'text-secondary-foreground' },
              { label: 'Day Streak', value: stats.streak, icon: Flame, color: 'text-destructive' },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-bold truncate">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Insights Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Best Resume */}
            {stats.bestResume && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-xs font-medium text-muted-foreground">Best ATS Score</span>
                  </div>
                  <p className="text-lg font-bold">{stats.bestResume.score}%</p>
                  <p className="text-xs text-muted-foreground truncate">{stats.bestResume.title}</p>
                </CardContent>
              </Card>
            )}

            {/* Avg Completion */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Award className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">Avg Completeness</span>
                </div>
                <p className="text-lg font-bold">{stats.avgCompletion}%</p>
                <p className="text-xs text-muted-foreground">Content filled across resumes</p>
              </CardContent>
            </Card>

            {/* Conversion Rate or Last Activity */}
            {conversionRate !== null ? (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-4 h-4 text-accent-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Interview Rate</span>
                  </div>
                  <p className="text-lg font-bold">{conversionRate}%</p>
                  <p className="text-xs text-muted-foreground">Applications → interviews</p>
                </CardContent>
              </Card>
            ) : stats.lastUpdated ? (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Last Activity</span>
                  </div>
                  <p className="text-sm font-bold">{formatDistanceToNow(new Date(stats.lastUpdated), { addSuffix: true })}</p>
                  <p className="text-xs text-muted-foreground">Resume updated</p>
                </CardContent>
              </Card>
            ) : null}
          </div>

          {/* Charts — side by side on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Score Trend */}
            {scoreHistory.length >= 2 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">ATS Score Trend</CardTitle>
                </CardHeader>
                <CardContent className="h-48">
                  <ATSScoreTrendChart history={scoreHistory} mode="full" />
                </CardContent>
              </Card>
            )}

            {/* Application Funnel */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Application Funnel</CardTitle>
              </CardHeader>
              <CardContent className="h-48">
                <ChartContainer config={{ count: { label: 'Count', color: 'hsl(var(--primary))' } }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnel} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="stage" width={70} tick={{ fontSize: 12 }} />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Worst Resume — improvement nudge */}
          {stats.worstResume && stats.bestResume && stats.worstResume.id !== stats.bestResume.id && (
            <Card className="border-amber-500/20 bg-amber-500/[0.03]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <TrendingDown className="w-5 h-5 text-amber-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Needs improvement: <span className="text-muted-foreground">{stats.worstResume.title}</span></p>
                    <p className="text-xs text-muted-foreground">ATS score {stats.worstResume.score}% — try Smart Tailor or Enhance to boost it.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Activity Streak */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Flame className="w-5 h-5 text-destructive shrink-0" />
                <div>
                  <p className="text-sm font-medium">{stats.streak}-day streak</p>
                  <p className="text-xs text-muted-foreground">Keep logging in daily to build your streak!</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
