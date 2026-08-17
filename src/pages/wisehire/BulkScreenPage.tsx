import { useState } from 'react';
import { FileSearch, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { WiseHireShell } from '@/components/wisehire/WiseHireShell';
import { ResumeDropzone } from '@/components/wisehire/bulk-screen/ResumeDropzone';
import { BulkResultsTable } from '@/components/wisehire/bulk-screen/BulkResultsTable';
import { BulkScreenSkeleton } from '@/components/wisehire/bulk-screen/BulkScreenSkeleton';
import { BiasToggle } from '@/components/wisehire/BiasToggle';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useJDs } from '@/hooks/wisehire/useJDs';
import {
  useRunBulkScreen,
  useLatestBulkJobs,
  useAddCandidateFromScreen,
  type ScreenResult,
} from '@/hooks/wisehire/useBulkScreen';
import { useBiasMode } from '@/hooks/wisehire/useBiasMode';
import type { PipelineStage } from '@/hooks/wisehire/usePipeline';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function BulkScreenPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [jdText, setJdText] = useState('');
  const [roleId, setRoleId] = useState<string>('');
  const [results, setResults] = useState<ScreenResult[] | null>(null);
  const [addedRanks, setAddedRanks] = useState<Set<number>>(new Set());
  const [addingRank, setAddingRank] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { biasMode, toggleBiasMode } = useBiasMode();
  const { data: roles = [] } = useJDs();
  const { data: pastJobs = [] } = useLatestBulkJobs(roleId || undefined);

  const runScreen = useRunBulkScreen();
  const addToP = useAddCandidateFromScreen();

  const canSubmit = files.length > 0 && jdText.trim().length >= 20 && !runScreen.isPending;

  const handleScreen = async () => {
    setResults(null);
    try {
      const data = await runScreen.mutateAsync({ files, jdText, roleId: roleId || undefined });
      setResults(data.results);
      setAddedRanks(new Set());
    } catch {
      // The mutation owns user-visible errors and privacy-cancellation state.
    }
  };

  const handleAddToPipeline = async (result: ScreenResult, stage: PipelineStage) => {
    setAddingRank(String(result.rank));
    try {
      await addToP.mutateAsync({
        name: result.filename_name,
        roleId: roleId || undefined,
        stage,
        resumeSummary: `Evidence alignment estimate: ${result.match_score ?? 'not rated'}${result.match_score === null ? '' : '%'}\n\nSupported evidence:\n${result.strengths.join('\n')}\n\nQuestions to verify:\n${result.concerns.join('\n')}\n\nAI summary for human review: ${result.summary}`,
      });
      setAddedRanks((prev) => new Set([...prev, result.rank]));
    } finally {
      setAddingRank(null);
    }
  };

  return (
    <WiseHireShell>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileSearch className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              Bulk Resume Review
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create AI evidence summaries for up to 10 resumes against one role. Results require human review.
            </p>
          </div>
          <BiasToggle biasMode={biasMode} onToggle={toggleBiasMode} />
        </div>

        {/* Upload form */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          {roles.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="role-select">Role (optional)</Label>
              <Select value={roleId} onValueChange={setRoleId}>
                <SelectTrigger id="role-select" className="w-full sm:w-64">
                  <SelectValue placeholder="Select a role…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No specific role</SelectItem>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.title ?? r.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Resumes (PDF)</Label>
            <ResumeDropzone
              files={files}
              onChange={setFiles}
              disabled={runScreen.isPending}
              maxFiles={10}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="jd-text">
              Job Description{' '}
              <span className="text-muted-foreground font-normal">({jdText.length} / 8000)</span>
            </Label>
            <Textarea
              id="jd-text"
              placeholder="Paste the job description here…"
              value={jdText}
              onChange={(e) => setJdText(e.target.value.slice(0, 8000))}
              rows={6}
              disabled={runScreen.isPending}
              className="resize-none"
            />
          </div>

          <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs leading-relaxed text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
            After you accept the AI privacy disclosure, readable PDF text and the job description are sent to WiseHire&apos;s configured AI provider. The estimates are decision-support only; verify the source resumes and make every hiring decision through human review.
          </p>

          <Button
            onClick={handleScreen}
            disabled={!canSubmit}
            className="w-full sm:w-auto gap-2 bg-blue-700 hover:bg-blue-800 text-white"
          >
            {runScreen.isPending ? (
              <>
                <MiniSpinner size={16} />
                Reviewing {files.length} resume{files.length !== 1 ? 's' : ''}…
              </>
            ) : (
              <>
                <FileSearch className="h-4 w-4" />
                Review All ({files.length})
              </>
            )}
          </Button>
        </div>

        {/* Results */}
        {runScreen.isPending && <BulkScreenSkeleton />}

        {results && !runScreen.isPending && (
          <BulkResultsTable
            results={results}
            biasMode={biasMode}
            roleId={roleId || undefined}
            onAddToPipeline={handleAddToPipeline}
            addingId={addingRank}
            addedIds={addedRanks}
          />
        )}

        {/* Past sessions */}
        {pastJobs.length > 0 && (
          <div className="rounded-xl border bg-card overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium hover:bg-muted/30 transition-colors"
              onClick={() => setHistoryOpen((o) => !o)}
              aria-expanded={historyOpen}
            >
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Previous Sessions ({pastJobs.length})
              </span>
              {historyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {historyOpen && (
              <ul className="divide-y border-t">
                {pastJobs.map((job) => (
                  <li
                    key={job.id}
                    className={cn(
                      'px-5 py-3 flex items-center justify-between gap-4 cursor-pointer hover:bg-muted/20 transition-colors',
                    )}
                    onClick={() => job.results && setResults(job.results)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && job.results && setResults(job.results)}
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {job.resume_count} resume{job.resume_count !== 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(job.created_at), 'MMM d, yyyy · h:mm a')}
                      </p>
                    </div>
                    <Badge
                      variant={job.status === 'done' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {job.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </WiseHireShell>
  );
}
