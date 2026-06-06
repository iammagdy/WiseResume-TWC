import { useMemo } from 'react';
import { TrendingUp, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with','by','from','as',
  'is','was','are','were','been','be','have','has','had','do','does','did','will','would',
  'could','should','may','might','shall','can','need','must','we','you','they','he','she',
  'it','i','me','my','your','our','their','this','that','these','those','not','no','all',
  'each','every','any','few','more','most','other','some','such','than','too','very','just',
  'about','above','after','again','also','am','because','before','between','both','during',
  'here','how','if','into','its','let','like','make','many','much','new','now','only','over',
  'own','same','so','then','there','through','under','up','what','when','where','which',
  'while','who','whom','why','work','working','ability','experience','including','within',
  'well','strong','excellent','required','preferred','etc','role','position','company','team',
  'join','looking','seeking','candidate','ideal','using','used','use','based','related','across',
]);

export function extractKeywords(text: string, limit = 40): string[] {
  const words = text.toLowerCase().replace(/[^a-z0-9\s\-+#.]/g, ' ').split(/\s+/);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of words) {
    if (w.length >= 3 && !STOP_WORDS.has(w) && !seen.has(w)) {
      seen.add(w);
      out.push(w);
      if (out.length >= limit) break;
    }
  }
  return out;
}

export function computeMatch(jobDesc: string, resumeText: string): {
  score: number;
  matched: string[];
  missing: string[];
} {
  if (!jobDesc.trim() || !resumeText.trim()) return { score: 0, matched: [], missing: [] };
  const jobKws = extractKeywords(jobDesc, 40);
  if (jobKws.length === 0) return { score: 0, matched: [], missing: [] };
  const lower = resumeText.toLowerCase();
  const matched = jobKws.filter((kw) => lower.includes(kw));
  const missing = jobKws.filter((kw) => !lower.includes(kw)).slice(0, 8);
  const score = Math.round((matched.length / jobKws.length) * 100);
  return { score, matched, missing };
}

interface MatchAnalysisSummaryProps {
  jobDescription: string;
  resumeText: string;
  className?: string;
}

export function MatchAnalysisSummary({ jobDescription, resumeText, className }: MatchAnalysisSummaryProps) {
  const { score, matched, missing } = useMemo(
    () => computeMatch(jobDescription, resumeText),
    [jobDescription, resumeText],
  );

  if (!jobDescription.trim() || !resumeText.trim()) return null;

  const color =
    score >= 70 ? 'text-emerald-500' :
    score >= 40 ? 'text-amber-500' :
    'text-rose-500';

  const ringStroke =
    score >= 70 ? 'hsl(142 55% 45%)' :
    score >= 40 ? 'hsl(38 92% 50%)' :
    'hsl(0 84% 60%)';

  const label =
    score >= 70 ? 'Good baseline match' :
    score >= 40 ? 'Moderate match — AI will boost it' :
    'Low match — great tailoring opportunity';

  const circumference = 2 * Math.PI * 22;
  const dash = (score / 100) * circumference;

  return (
    <div className={cn('rounded-xl border border-border/60 bg-card/85 overflow-hidden', className)}>
      {/* Score row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <svg width="52" height="52" viewBox="0 0 52 52" className="-rotate-90 shrink-0">
          <circle cx="26" cy="26" r="22" fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
          <circle
            cx="26" cy="26" r="22" fill="none"
            stroke={ringStroke}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            className="transition-all duration-700"
          />
        </svg>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1">
            <span className={cn('text-2xl font-bold tabular-nums', color)}>{score}</span>
            <span className="text-sm text-muted-foreground font-medium">%</span>
            <span className="ml-1 text-xs text-muted-foreground">current match</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{label}</p>
        </div>
        <div className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground">
          <Info className="w-3 h-3" aria-hidden />
          <span>Estimated</span>
        </div>
      </div>

      {/* Matched keywords */}
      {matched.length > 0 && (
        <div className="px-4 pb-3 border-t border-border/40 pt-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" aria-hidden />
            {matched.length} matching keywords
          </p>
          <div className="flex flex-wrap gap-1.5">
            {matched.slice(0, 10).map((kw) => (
              <span
                key={kw}
                className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
              >
                {kw}
              </span>
            ))}
            {matched.length > 10 && (
              <span className="px-2 py-0.5 rounded-md text-[11px] text-muted-foreground border border-border/50">
                +{matched.length - 10}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Missing keywords */}
      {missing.length > 0 && (
        <div className="px-4 pb-3 border-t border-border/40 pt-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-amber-500" aria-hidden />
            Keywords to add
          </p>
          <div className="flex flex-wrap gap-1.5">
            {missing.map((kw) => (
              <span
                key={kw}
                className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/8 text-amber-700 dark:text-amber-400 border border-amber-500/20"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* AI boost hint */}
      <div className="px-4 py-2.5 border-t border-border/40 bg-primary/4 flex items-center gap-2">
        <TrendingUp className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden />
        <p className="text-[11px] text-primary/80 leading-snug">
          AI tailoring typically boosts this score to <strong>70–90%</strong>
        </p>
      </div>
    </div>
  );
}
