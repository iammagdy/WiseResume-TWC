import { useState } from 'react';
import { WiseHireShell } from '@/components/wisehire/WiseHireShell';
import { BriefForm } from '@/components/wisehire/brief/BriefForm';
import { BriefOutput } from '@/components/wisehire/brief/BriefOutput';
import { BriefSkeleton } from '@/components/wisehire/brief/BriefSkeleton';
import { BriefShareModal } from '@/components/wisehire/brief/BriefShareModal';
import { useBriefs } from '@/hooks/wisehire/useBriefs';
import { usePipeline } from '@/hooks/wisehire/usePipeline';
import type { CandidateBrief } from '@/hooks/wisehire/useBriefs';
import { Button } from '@/components/ui/button';
import { Share2, Download, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { exportBriefToPdf } from '@/lib/wisehire/briefPdfExport';

export default function BriefGeneratorPage() {
  const [activeBrief, setActiveBrief] = useState<CandidateBrief | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const { data: briefs = [], isLoading: briefsLoading, revokeShareToken } = useBriefs();
  const { data: candidates = [] } = usePipeline();

  function handleResult(brief: CandidateBrief) {
    setActiveBrief(brief);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <WiseHireShell>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Candidate Brief Generator
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            AI evaluates candidates against a job description and generates a structured brief.
          </p>
        </div>

        {/* Active brief */}
        {activeBrief ? (
          <div className="space-y-3">
            {/* Actions */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400 dark:text-slate-500">Brief generated just now</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShareOpen(true)}
                >
                  <Share2 className="h-3.5 w-3.5 mr-1.5" />
                  Share
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportBriefToPdf(activeBrief, activeBrief.candidate?.name ?? 'Candidate')}
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Export PDF
                </Button>
              </div>
            </div>

            <BriefOutput brief={activeBrief} />

            <BriefShareModal
              brief={activeBrief}
              open={shareOpen}
              onClose={() => setShareOpen(false)}
              onRenew={() => revokeShareToken.mutate(activeBrief.id)}
              isRenewing={revokeShareToken.isPending}
            />
          </div>
        ) : null}

        {/* Form */}
        <BriefForm
          candidates={candidates.map((c) => ({
            id: c.id,
            name: c.name,
            role: c.role,
            role_id: c.role_id,
          }))}
          onResult={handleResult}
        />

        {/* Recent briefs */}
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Recent Briefs</h2>
          {briefsLoading ? (
            <BriefSkeleton />
          ) : briefs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">No briefs yet. Generate one above.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
              {briefs.slice(0, 10).map((brief) => (
                <Link
                  key={brief.id}
                  to={`/wisehire/briefs/${brief.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                      {brief.candidate?.name ?? 'Unknown Candidate'}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                      {brief.role?.title ?? 'No role'} · {formatDistanceToNow(new Date(brief.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {brief.match_score !== null && (
                    <span className={`text-xs font-bold rounded-full px-2 py-0.5 shrink-0 ${
                      brief.match_score >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : brief.match_score >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {brief.match_score}%
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </WiseHireShell>
  );
}
