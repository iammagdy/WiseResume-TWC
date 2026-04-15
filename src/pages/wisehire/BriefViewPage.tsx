import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { WiseHireShell } from '@/components/wisehire/WiseHireShell';
import { BriefOutput } from '@/components/wisehire/brief/BriefOutput';
import { BriefSkeleton } from '@/components/wisehire/brief/BriefSkeleton';
import { BriefShareModal } from '@/components/wisehire/brief/BriefShareModal';
import { useBrief, useBriefs } from '@/hooks/wisehire/useBriefs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Share2, Download } from 'lucide-react';
import { exportBriefToPdf } from '@/lib/wisehire/briefPdfExport';

export default function BriefViewPage() {
  const { briefId } = useParams<{ briefId: string }>();
  const { data: brief, isLoading } = useBrief(briefId);
  const { revokeShareToken } = useBriefs();
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <WiseHireShell>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link
            to="/wisehire/briefs"
            className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            All Briefs
          </Link>
          {brief && (
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
                onClick={() => exportBriefToPdf(brief, brief.candidate?.name ?? 'Candidate')}
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Export PDF
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <BriefSkeleton />
        ) : brief ? (
          <>
            <BriefOutput brief={brief} />
            <BriefShareModal
              brief={brief}
              open={shareOpen}
              onClose={() => setShareOpen(false)}
              onRenew={() => revokeShareToken.mutate(brief.id)}
              isRenewing={revokeShareToken.isPending}
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Brief not found</p>
            <p className="text-xs text-slate-400">It may have been deleted or you don't have access.</p>
          </div>
        )}
      </div>
    </WiseHireShell>
  );
}
