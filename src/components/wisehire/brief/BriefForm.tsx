import { useState } from 'react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Sparkles, AlertCircle } from 'lucide-react';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import type { CandidateBrief } from '@/hooks/wisehire/useBriefs';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useAIAction } from '@/hooks/useAIAction';

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
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { execute: executeAI } = useAIAction({ operation: 'wisehire_candidate_brief' });
  const userId = user?.id;

  const canSubmit = candidateId && jdText.trim().length >= 20 && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError('');

    try {
      const data = await executeAI(async () => {
        const response = await appwriteFunctions.invoke<{ brief: CandidateBrief }>('wisehire-generate-brief', {
          body: { candidate_id: candidateId, jd_text: jdText.trim() },
        });
        if (response.error) {
          throw Object.assign(new Error(response.error.message), {
            status: response.error.status ?? 500,
            code: response.error.code,
          });
        }
        return response.data;
      }, { silent: true });
      if (!data) return;
      if (!data.brief) throw new Error('No brief returned. Please try again.');

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
        <p className="text-sm text-slate-500 dark:text-slate-400">AI will summarize explicit role-alignment evidence for human review.</p>
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
          onChange={(e) => setJdText(e.target.value.slice(0, 8000))}
          rows={6}
          className="resize-none text-sm"
          disabled={loading}
        />
        <p className="text-xs text-slate-400">{jdText.trim().length} / 8000 chars (min 20)</p>
      </div>

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
          <><MiniSpinner size={16} className="mr-2" /> Generating brief…</>
        ) : (
          <><Sparkles className="h-4 w-4 mr-2" /> Generate Brief</>
        )}
      </Button>
    </form>
  );
}
