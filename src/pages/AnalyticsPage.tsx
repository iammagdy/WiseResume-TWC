import { useMemo } from 'react';
import { BackButton } from '@/components/ui/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Target, Briefcase, Flame, Download } from 'lucide-react';
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

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id, user);
  const { data: resumes = [] } = useResumes();
  const { data: applications = [] } = useJobApplications();
  const { getCachedScore } = useResumeScore();

  const stats = useMemo(() => {
    const scores = resumes
      .map(r => getCachedScore(r.id, r.updated_at)?.overallScore)
      .filter((s): s is number => s != null);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    return {
      totalResumes: resumes.length,
      avgScore,
      totalApps: applications.length,
      streak: profile?.loginStreak ?? 0,
    };
  }, [resumes, applications, getCachedScore, profile]);

  // Application funnel
  const funnel = useMemo(() => {
    const applied = applications.filter(a => a.status === 'applied').length;
    const interviewing = applications.filter(a => a.status === 'interviewing').length;
    const offer = applications.filter(a => a.status === 'offer').length;
    return [
      { stage: 'Applied', count: applied || applications.length },
      { stage: 'Interview', count: interviewing },
      { stage: 'Offer', count: offer },
    ];
  }, [applications]);

  // Score history from store (all resumes combined)
  const scoreHistory = useMemo(() => {
    const store = useATSScoreHistoryStore.getState();
    const allEntries = resumes.flatMap(r => store.getHistory(r.id) ?? []);
    return allEntries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [resumes]);

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

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 pb-24">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Resumes', value: stats.totalResumes, icon: FileText, color: 'text-primary' },
            { label: 'Avg ATS', value: `${stats.avgScore}%`, icon: Target, color: 'text-accent-foreground' },
            { label: 'Applications', value: stats.totalApps, icon: Briefcase, color: 'text-secondary' },
            { label: 'Day Streak', value: stats.streak, icon: Flame, color: 'text-destructive' },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-lg font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

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

        {/* Activity Overview */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Flame className="w-5 h-5 text-destructive" />
              <div>
                <p className="text-sm font-medium">{stats.streak}-day streak</p>
                <p className="text-xs text-muted-foreground">Keep logging in daily to build your streak!</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
