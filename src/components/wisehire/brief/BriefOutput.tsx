import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CandidateBrief } from '@/hooks/wisehire/useBriefs';
import { formatDistanceToNow } from 'date-fns';

interface BriefOutputProps {
  brief: CandidateBrief;
  candidateName?: string;
}

function ScoreRing({ score }: { score: number | null }) {
  const displayScore = score ?? 0;
  const color = displayScore >= 80 ? '#059669' : displayScore >= 60 ? '#d97706' : '#dc2626';
  const label = score === null ? 'No score' : displayScore >= 80 ? 'Strong match' : displayScore >= 60 ? 'Moderate match' : 'Weak match';
  const circumference = 2 * Math.PI * 28;
  const strokeDash = (displayScore / 100) * circumference;

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-16 h-16 shrink-0">
        <svg viewBox="0 0 64 64" className="-rotate-90 w-full h-full">
          <circle cx="32" cy="32" r="28" fill="none" stroke="#e2e8f0" strokeWidth="6" className="dark:stroke-slate-700" />
          <circle
            cx="32" cy="32" r="28"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeDasharray={`${strokeDash} ${circumference}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-extrabold" style={{ color }}>
            {score !== null ? `${score}` : '—'}
          </span>
        </div>
      </div>
      <div>
        <p className="text-lg font-extrabold text-slate-900 dark:text-white">Match Score</p>
        <p className="text-sm" style={{ color }}>{label}</p>
      </div>
    </div>
  );
}

function Chip({ text, variant }: { text: string; variant: 'strength' | 'concern' }) {
  const cls = variant === 'strength'
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  return (
    <span className={`inline-flex items-center rounded-xl px-3 py-1 text-xs font-medium ${cls}`}>
      {variant === 'strength' ? '✓ ' : '⚠ '}{text}
    </span>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
      {children}
    </h3>
  );
}

export function BriefOutput({ brief, candidateName }: BriefOutputProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            {candidateName ?? brief.candidate?.name ?? 'Candidate Brief'}
          </h2>
          {brief.role?.title && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {brief.role.title}
            </p>
          )}
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
          {formatDistanceToNow(new Date(brief.created_at), { addSuffix: true })}
        </p>
      </div>

      {/* Score */}
      <ScoreRing score={brief.match_score} />

      {/* Strengths */}
      {(brief.strengths?.length ?? 0) > 0 && (
        <div>
          <SectionHeader>Strengths</SectionHeader>
          <div className="flex flex-wrap gap-2">
            {(brief.strengths ?? []).map((s, i) => <Chip key={i} text={s} variant="strength" />)}
          </div>
        </div>
      )}

      {/* Concerns */}
      {(brief.concerns?.length ?? 0) > 0 && (
        <div>
          <SectionHeader>Concerns</SectionHeader>
          <div className="flex flex-wrap gap-2">
            {(brief.concerns ?? []).map((c, i) => <Chip key={i} text={c} variant="concern" />)}
          </div>
        </div>
      )}

      {/* Interview Questions */}
      {(brief.interview_questions?.length ?? 0) > 0 && (
        <div>
          <SectionHeader>Interview Questions</SectionHeader>
          <ol className="space-y-2">
            {(brief.interview_questions ?? []).map((q, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                <span className="shrink-0 font-semibold text-blue-600 dark:text-blue-400 w-5 text-right">
                  {i + 1}.
                </span>
                <span>{q}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Employment Notes */}
      {brief.employment_notes && (
        <div>
          <SectionHeader>Hiring Notes</SectionHeader>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed border border-blue-500/30">
            {brief.employment_notes}
          </div>
        </div>
      )}

      {brief.ai_model_used && (
        <p className="text-[10px] text-slate-300 dark:text-slate-600">AI: {brief.ai_model_used}</p>
      )}

      {/* Scorecard CTA */}
      {brief.candidate_id && (
        <div className="border-t pt-4">
          <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto" asChild>
            <Link to={`/wisehire/scorecards/${brief.candidate_id}?briefId=${brief.id}`}>
              <ClipboardList className="h-4 w-4" />
              Open Interview Scorecard
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
