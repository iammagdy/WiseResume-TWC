import { useParams, Link } from 'react-router-dom';
import { Sparkles, Clock, TrendingUp, ChevronDown, ChevronUp, Lightbulb, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useInterviewReportToken } from '@/hooks/useInterviewReportToken';
import { Button } from '@/components/ui/button';

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 8 ? 'bg-green-500/15 text-green-600 border-green-500/30'
    : score >= 6 ? 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30'
    : score >= 4 ? 'bg-orange-500/15 text-orange-600 border-orange-500/30'
    : 'bg-red-500/15 text-red-600 border-red-500/30';
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 text-xs font-bold rounded-full border', color)}>
      {score}/10
    </span>
  );
}

export default function InterviewReportPage() {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, error } = useInterviewReportToken(token);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading report…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-destructive/60" />
          <div>
            <h1 className="text-lg font-semibold text-foreground">Report Not Found</h1>
            <p className="text-sm text-muted-foreground mt-1">
              This report link may have expired (links are valid for 30 days) or the URL is incorrect.
            </p>
          </div>
          <Link to="/">
            <Button variant="outline">Go to WiseResume</Button>
          </Link>
        </div>
      </div>
    );
  }

  const report = data.report_data;
  const mins = Math.floor(report.duration / 60);
  const secs = report.duration % 60;
  const avgScore = report.scores.length > 0
    ? Math.round((report.scores.reduce((sum, s) => sum + s.score, 0) / report.scores.length) * 10) / 10
    : null;

  const scoreColor = report.overallScore != null
    ? report.overallScore >= 8 ? 'text-green-500 border-green-500/60'
      : report.overallScore >= 5 ? 'text-yellow-500 border-yellow-500/60'
      : 'text-red-500 border-red-500/60'
    : 'text-muted-foreground border-border';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">WiseResume</span>
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            Interview Report
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Score hero */}
        <div className="text-center space-y-3">
          <div className={cn(
            'w-24 h-24 mx-auto rounded-full border-2 flex flex-col items-center justify-center',
            scoreColor,
          )}>
            {report.overallScore != null ? (
              <>
                <span className={cn('text-3xl font-bold', scoreColor.split(' ')[0])}>{report.overallScore}</span>
                <span className="text-xs text-muted-foreground">/ 10</span>
              </>
            ) : (
              <span className="text-2xl text-muted-foreground">—</span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {report.candidateName ? `${report.candidateName}'s Interview` : 'Interview Report'}
            </h1>
            <div className="flex items-center justify-center gap-3 mt-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{mins}m {secs.toString().padStart(2, '0')}s</span>
              </div>
              {avgScore != null && (
                <>
                  <span>·</span>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Avg {avgScore}/10</span>
                  </div>
                </>
              )}
              {report.interviewType && (
                <>
                  <span>·</span>
                  <span className="capitalize">{report.interviewType.replace('-', ' ')}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* AI Summary */}
        {report.summary && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              AI Performance Summary
            </h2>
            <div className="prose prose-sm dark:prose-invert max-w-none [&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-primary [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-primary [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-foreground/80 [&_ul]:ml-4 [&_ul]:list-disc [&_li]:text-sm [&_li]:text-foreground/80 [&_strong]:text-foreground">
              <ReactMarkdown>{report.summary}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Per-answer breakdown */}
        {report.scores.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Answer Breakdown
            </h2>
            {report.scores.map((s, i) => (
              <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
                  className="w-full flex items-center justify-between px-4 py-3"
                >
                  <span className="text-sm font-medium text-foreground">Answer #{s.questionIndex}</span>
                  <div className="flex items-center gap-2">
                    <ScoreBadge score={s.score} />
                    {expandedIndex === i
                      ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                      : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                  </div>
                </button>
                {expandedIndex === i && (
                  <div className="px-4 pb-4 space-y-2.5 border-t border-border">
                    <div className="flex items-start gap-1.5 pt-3">
                      <Lightbulb className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground">{s.tip}</p>
                    </div>
                    {s.improvedAnswer && (
                      <div className="bg-muted rounded-lg p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Suggested improvement</p>
                        <p className="text-xs text-foreground/80 italic">"{s.improvedAnswer}"</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-4 border-t border-border space-y-3">
          <div className="flex items-center justify-center gap-1.5">
            <Sparkles className="w-3 h-3 text-primary/60" />
            <span className="text-xs text-muted-foreground">
              Generated by WiseResume AI · Link expires in 30 days
            </span>
          </div>
          <Link to="/">
            <Button variant="outline" size="sm">
              Try WiseResume for free
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
