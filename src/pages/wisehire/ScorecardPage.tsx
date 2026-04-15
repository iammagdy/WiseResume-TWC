import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Share2, ClipboardList } from 'lucide-react';
import { WiseHireShell } from '@/components/wisehire/WiseHireShell';
import { ScorecardForm } from '@/components/wisehire/scorecard/ScorecardForm';
import { ScorecardView } from '@/components/wisehire/scorecard/ScorecardView';
import { ScorecardSkeleton } from '@/components/wisehire/scorecard/ScorecardSkeleton';
import { ScorecardShareModal } from '@/components/wisehire/scorecard/ScorecardShareModal';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import {
  useScorecards,
  useCreateScorecard,
  useSaveScorecard,
  useRevokeShareToken,
} from '@/hooks/wisehire/useScorecards';

export default function ScorecardPage() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const [searchParams] = useSearchParams();
  const briefId = searchParams.get('briefId') ?? undefined;

  const [shareOpen, setShareOpen] = useState(false);
  const [candidateName, setCandidateName] = useState('');
  const [briefQuestions, setBriefQuestions] = useState<string[]>([]);
  const [resolving, setResolving] = useState(true);

  const { data: scorecards = [], isLoading } = useScorecards(candidateId ?? '');
  const createScorecard = useCreateScorecard();
  const saveScorecard = useSaveScorecard();
  const revokeToken = useRevokeShareToken();

  const scorecard = scorecards[0] ?? null;

  useEffect(() => {
    if (!candidateId) { setResolving(false); return; }

    async function load() {
      setResolving(true);
      try {
        const { data: candidate } = await supabase
          .from('wisehire_candidates')
          .select('name')
          .eq('id', candidateId)
          .maybeSingle();
        if (candidate?.name) setCandidateName(candidate.name);

        if (briefId) {
          const { data: brief } = await supabase
            .from('wisehire_candidate_briefs')
            .select('interview_questions')
            .eq('id', briefId)
            .maybeSingle();
          if (brief?.interview_questions?.length) {
            setBriefQuestions(brief.interview_questions);
          }
        }
      } finally {
        setResolving(false);
      }
    }

    load();
  }, [candidateId, briefId]);

  useEffect(() => {
    if (resolving || isLoading) return;
    if (scorecard) return;
    if (!candidateId) return;

    const questions = briefQuestions.length
      ? briefQuestions
      : [
          'Tell me about your most relevant experience for this role.',
          'How do you approach problem-solving under pressure?',
          'Describe a situation where you had to collaborate cross-functionally.',
          'What accomplishment are you most proud of professionally?',
          'How do you stay current with industry trends?',
          'Describe a time you had to manage competing priorities.',
          'What questions do you have about this role or team?',
          'Where do you see yourself in 3 years?',
        ];

    createScorecard.mutate({ candidateId, briefId, questions });
  }, [resolving, isLoading, scorecard, candidateId, briefId, briefQuestions]);

  const isSubmitted = Boolean(scorecard?.submitted_at);

  if (resolving || isLoading || createScorecard.isPending) {
    return (
      <WiseHireShell>
        <div className="max-w-3xl mx-auto px-4 py-6">
          <ScorecardSkeleton />
        </div>
      </WiseHireShell>
    );
  }

  if (!scorecard) {
    return (
      <WiseHireShell>
        <div className="max-w-3xl mx-auto px-4 py-6 text-center">
          <p className="text-muted-foreground">Could not create scorecard. Please try again.</p>
        </div>
      </WiseHireShell>
    );
  }

  return (
    <WiseHireShell>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/wisehire/pipeline" aria-label="Back to pipeline">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <ClipboardList className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                Interview Scorecard
              </h1>
              {candidateName && (
                <p className="text-sm text-muted-foreground mt-0.5">{candidateName}</p>
              )}
            </div>
          </div>

          {isSubmitted && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShareOpen(true)}
              className="gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          )}
        </div>

        {/* Form or view */}
        <div className="rounded-xl border bg-card p-5">
          {isSubmitted ? (
            <ScorecardView
              scorecard={scorecard}
              candidateName={candidateName || undefined}
            />
          ) : (
            <ScorecardForm
              scorecard={scorecard}
              onSave={(ratings, notes, submit) =>
                saveScorecard.mutate({ id: scorecard.id, ratings, notes, submit })
              }
              isSaving={saveScorecard.isPending}
            />
          )}
        </div>

        {scorecard && shareOpen && (
          <ScorecardShareModal
            open={shareOpen}
            onClose={() => setShareOpen(false)}
            scorecard={scorecard}
            onRevoke={() => revokeToken.mutate(scorecard.id)}
            isRevoking={revokeToken.isPending}
          />
        )}
      </div>
    </WiseHireShell>
  );
}
