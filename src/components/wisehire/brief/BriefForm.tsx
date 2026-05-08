import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Sparkles, KeyRound, AlertCircle } from 'lucide-react';
import { edgeFunctions } from '@/lib/edgeFunctions';
import type { CandidateBrief } from '@/hooks/wisehire/useBriefs';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

interface Candidate {
  id: string;
  name: string;
  role?: { title: string } | null;
  role_id: string | null;
}

interface BriefFormProps {
  candidates: Candidate[];
  defaultCandidateId?: string;
  defaultJd?: string;
  onResult: (brief: CandidateBrief) => void;
}

export function BriefForm({ candidates, defaultCandidateId, defaultJd, onResult }: BriefFormProps) {
  const [candidateId, setCandidateId] = useState(defaultCandidateId ?? '');
  const [jdText, setJdText] = useState(defaultJd ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requiresKey, setRequiresKey] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  const canSubmit = candidateId && jdText.trim().length >= 20 && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    setRequiresKey(false);

    try {
      const { data, error: fnErr } = await edgeFunctions.invoke('wisehire-generate-brief', {
        body: { candidate_id: candidateId, jd_text: jdText.trim() },
      });

      if (fnErr) {
        if ((fnErr as { status?: number }).status === 402) { setRequiresKey(true); return; }
        throw new Error(fnErr.message);
      }
      if (!data?.brief) throw new Error('No brief returned. Please try again.');

      queryClient.invalidateQueries({ queryKey: ['wisehire-briefs', userId] });
      onResult(data.brief as CandidateBrief);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-0.5">Generate Candidate Brief</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">AI will score and analyse the candidate against the job description.</p>
      </div>

      {/* Candidate select */}
      <div className="space-y-1.5">
        <Label>Candidate</Label>
        {candidates.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No candidates yet.{' '}
            <a href="/wisehire/pipeline" className="underline text-blue-600 dark:text-blue-400">Add candidates</a>{' '}
            to the pipeline first.
          </p>
        ) : (
          <Select value={candidateId} onValueChange={setCandidateId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a candidate…" />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}{c.role?.title ? ` — ${c.role.title}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* JD Text */}
      <div className="space-y-1.5">
        <Label>Job Description</Label>
        <Textarea
          placeholder="Paste the full job description here…"
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          rows={6}
          className="resize-none text-sm"
          disabled={loading}
        />
        <p className="text-xs text-slate-400">{jdText.trim().length} chars (min 20)</p>
      </div>

      {requiresKey && (
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-sm">
          <KeyRound className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-700 dark:text-amber-400 mb-0.5">AI key required</p>
            <p className="text-amber-700/80 dark:text-amber-400/80">
              Add an OpenAI or Anthropic key in{' '}
              <a href="/wisehire/settings" className="underline font-medium">Settings</a>{' '}
              to generate briefs on the Starter plan.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={!canSubmit}
        className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold"
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating brief…</>
        ) : (
          <><Sparkles className="h-4 w-4 mr-2" /> Generate Brief</>
        )}
      </Button>
    </form>
  );
}
