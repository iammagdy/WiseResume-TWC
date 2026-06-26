import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Scorecard } from '@/hooks/wisehire/useScorecards';

interface ScorecardViewProps {
  scorecard: Scorecard;
  candidateName?: string;
  roleName?: string;
}

function OverallRing({ score }: { score: number }) {
  const max = 5;
  const pct = score / max;
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  const colour = score >= 4 ? '#16a34a' : score >= 3 ? '#d97706' : '#dc2626';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="96" height="96" viewBox="0 0 96 96" aria-label={`Overall score ${score} out of 5`}>
        <circle cx="48" cy="48" r={r} fill="none" stroke="currentColor"
          strokeWidth="8" className="text-muted/30" />
        <circle cx="48" cy="48" r={r} fill="none" stroke={colour}
          strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          strokeDashoffset={circ / 4}
          style={{ transition: 'stroke-dasharray 0.6s ease' }} />
        <text x="48" y="52" textAnchor="middle" fontSize="20" fontWeight="700"
          fill={colour}>{score.toFixed(1)}</text>
      </svg>
      <p className="text-xs text-muted-foreground">out of 5</p>
    </div>
  );
}

function StarDisplay({ value }: { value: number | null }) {
  const v = value ?? 0;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={cn(
            'h-4 w-4',
            s <= v ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-muted-foreground/30'
          )}
        />
      ))}
    </div>
  );
}

export function ScorecardView({ scorecard, candidateName, roleName }: ScorecardViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {scorecard.overall_score !== null && (
          <OverallRing score={scorecard.overall_score} />
        )}
        <div>
          {candidateName && (
            <h2 className="text-xl font-bold">{candidateName}</h2>
          )}
          {roleName && (
            <p className="text-sm text-muted-foreground">{roleName}</p>
          )}
          {scorecard.submitted_at && (
            <p className="text-xs text-muted-foreground mt-1">
              Submitted{' '}
              {new Date(scorecard.submitted_at).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {scorecard.questions.map((q, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 space-y-2">
            <p className="text-sm font-medium">
              <span className="text-muted-foreground mr-2 font-normal">Q{i + 1}.</span>
              {q}
            </p>
            <StarDisplay value={scorecard.ratings?.[i] ?? null} />
            {scorecard.notes?.[i] && (
              <p className="text-sm text-muted-foreground italic bg-muted/40 rounded-lg px-3 py-2">
                {scorecard.notes[i]}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
