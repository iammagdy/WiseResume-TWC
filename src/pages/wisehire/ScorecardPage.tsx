import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Share2, ClipboardList, LayoutTemplate, ChevronDown } from 'lucide-react';
import { WiseHireShell } from '@/components/wisehire/WiseHireShell';
import { ScorecardForm } from '@/components/wisehire/scorecard/ScorecardForm';
import { ScorecardView } from '@/components/wisehire/scorecard/ScorecardView';
import { ScorecardSkeleton } from '@/components/wisehire/scorecard/ScorecardSkeleton';
import { ScorecardShareModal } from '@/components/wisehire/scorecard/ScorecardShareModal';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/safeClient';
import {
  useScorecards,
  useCreateScorecard,
  useSaveScorecard,
  useRevokeShareToken,
} from '@/hooks/wisehire/useScorecards';
import { useScorecardTemplates } from '@/hooks/wisehire/useScorecardTemplates';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// WiseHire tables live in a separate schema not yet reflected in the generated DB types.
// This helper provides a single, narrowed access point for those tables.
type WiseHireTableName = 'wisehire_candidates' | 'wisehire_candidate_briefs' | 'wisehire_scorecards';
function wiseHireFrom(table: WiseHireTableName) {
  return (supabase as unknown as { from(t: WiseHireTableName): ReturnType<typeof supabase.from> }).from(table);
}

export default function ScorecardPage() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const [searchParams] = useSearchParams();
  const briefId = searchParams.get('briefId') ?? undefined;

  const [shareOpen, setShareOpen] = useState(false);
  const [candidateName, setCandidateName] = useState('');
  const [briefQuestions, setBriefQuestions] = useState<string[]>([]);
  const [resolving, setResolving] = useState(true);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);
  const [fallbackDismissed, setFallbackDismissed] = useState(false);

  const { data: scorecards = [], isLoading } = useScorecards(candidateId ?? '');
  const { data: templates = [] } = useScorecardTemplates();
  const createScorecard = useCreateScorecard();
  const saveScorecard = useSaveScorecard();
  const revokeToken = useRevokeShareToken();
  const qc = useQueryClient();

  const scorecard = scorecards[0] ?? null;
  const isSubmitted = Boolean(scorecard?.submitted_at);

  useEffect(() => {
    if (!candidateId) { setResolving(false); return; }

    async function load() {
      setResolving(true);
      try {
        const { data: candidate } = await wiseHireFrom('wisehire_candidates')
          .select('name')
          .eq('id', candidateId)
          .maybeSingle();
        if ((candidate as { name?: string } | null)?.name) setCandidateName((candidate as { name: string }).name);

        if (briefId) {
          const { data: brief } = await wiseHireFrom('wisehire_candidate_briefs')
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

    const isFallback = briefQuestions.length === 0;
    const questions = isFallback
      ? [
          'Tell me about your most relevant experience for this role.',
          'How do you approach problem-solving under pressure?',
          'Describe a situation where you had to collaborate cross-functionally.',
          'What accomplishment are you most proud of professionally?',
          'How do you stay current with industry trends?',
          'Describe a time you had to manage competing priorities.',
          'What questions do you have about this role or team?',
          'Where do you see yourself in 3 years?',
        ]
      : briefQuestions;

    if (isFallback) setUsedFallback(true);
    createScorecard.mutate({ candidateId, briefId, questions });
  }, [resolving, isLoading, scorecard, candidateId, briefId, briefQuestions]);

  async function handleApplyTemplate(templateId: string) {
    if (!scorecard) return;
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    setApplyingTemplate(true);
    try {
      const { error } = await wiseHireFrom('wisehire_scorecards')
        .update({
          questions: template.questions,
          ratings: new Array(template.questions.length).fill(null),
          notes: new Array(template.questions.length).fill(''),
        })
        .eq('id', scorecard.id);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ['scorecards', candidateId] });
      toast.success(`Template "${template.title}" applied.`);
    } catch {
      toast.error('Failed to apply template.');
    } finally {
      setApplyingTemplate(false);
    }
  }

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

          <div className="flex items-center gap-2">
            {/* Template picker — only when not submitted */}
            {!isSubmitted && templates.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5" disabled={applyingTemplate}>
                    <LayoutTemplate className="h-3.5 w-3.5" />
                    {applyingTemplate ? 'Applying…' : 'Use Template'}
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {templates.map((t) => (
                    <DropdownMenuItem
                      key={t.id}
                      onClick={() => handleApplyTemplate(t.id)}
                      className="flex flex-col items-start gap-0.5"
                    >
                      <span className="font-medium text-sm">{t.title}</span>
                      <span className="text-xs text-muted-foreground">{t.questions.length} questions</span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/wisehire/scorecard-templates" className="text-xs text-muted-foreground gap-1.5">
                      <LayoutTemplate className="h-3.5 w-3.5" />
                      Manage templates
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

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
        </div>

        {/* Fallback questions notice */}
        {usedFallback && !fallbackDismissed && !isSubmitted && (
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
            <AlertDescription className="flex items-start justify-between gap-3 text-sm text-amber-800 dark:text-amber-300">
              <span>
                No candidate brief found — using default questions. You can edit these before submitting.
              </span>
              <button
                onClick={() => setFallbackDismissed(true)}
                className="shrink-0 text-amber-600 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 font-medium text-xs underline"
              >
                Dismiss
              </button>
            </AlertDescription>
          </Alert>
        )}

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
